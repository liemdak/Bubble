import { NextRequest, NextResponse } from 'next/server'
import { sendTokens, waitForTx } from '@/lib/circle/transactions'
import { getCircleClient } from '@/lib/circle/client'
import { getSession } from '@/lib/auth/session'
import { checkAndIncrementRateLimit } from '@/lib/firebase/rateLimit'
import type { PaymentIntent, SwapIntent, BridgeIntent } from '@/types/intent'

/**
 * POST /api/execute
 * Executes a confirmed payment intent via Circle Developer-Controlled Wallets + App Kit.
 *
 * Security rules (enforced server-side):
 *  1. User must be authenticated (valid session)
 *  2. Wallet resolved from session — never trusted from client body
 *  3. Address validated (0x + 40 hex chars)
 *  4. Amount validated (positive number)
 *  5. Token validated (USDC | EURC | USYC)
 *
 * Transaction history is available on ArcScan — no need to store locally.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────────────────────
    const session = await getSession()
    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const intent: PaymentIntent = body.intent

    if (!intent) {
      return NextResponse.json({ error: 'No intent provided' }, { status: 400 })
    }

    // ── Rate limit check ─────────────────────────────────────────────
    // Skip for balance reads (get_balance is read-only, not a transaction)
    if (intent.type !== 'get_balance') {
      const rl = await checkAndIncrementRateLimit(session.address)
      if (!rl.allowed) {
        const resetIn = Math.ceil((rl.resetAt - Date.now()) / 60_000)
        return NextResponse.json(
          { error: `Rate limit reached. You've hit the 10 transactions/hour limit. Try again in ~${resetIn} min.` },
          { status: 429 }
        )
      }
    }

    // Pass session wallet info — never resolve from client body
    const walletInfo = session.circleWalletId && session.circleWalletAddress
      ? { id: session.circleWalletId, address: session.circleWalletAddress }
      : null

    switch (intent.type) {
      case 'send_payment':  return await executeSend(intent, walletInfo)
      case 'swap_tokens':   return await executeSwap(intent, walletInfo)
      case 'bridge_tokens': return await executeBridge(intent, walletInfo)
      case 'get_balance':   return await executeBalance(walletInfo?.address ?? session.address)
      default:
        return NextResponse.json(
          { error: `Intent type '${(intent as PaymentIntent).type}' execution not yet implemented` },
          { status: 422 }
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed'
    console.error('[/api/execute]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Send ─────────────────────────────────────────────────────────────────────

async function executeSend(
  intent: Extract<PaymentIntent, { type: 'send_payment' }>,
  sessionWallet: WalletInfo | null,
) {
  // 1. Validate address
  const addr = intent.recipient_address
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return NextResponse.json(
      { error: 'Invalid recipient address. Must be a 0x Ethereum address.' },
      { status: 400 }
    )
  }

  // 2. Validate amount
  const amount = parseFloat(intent.amount)
  if (!intent.amount || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  // 3. Validate token
  const ALLOWED_TOKENS = ['USDC', 'EURC', 'USYC'] as const
  if (!ALLOWED_TOKENS.includes(intent.token as typeof ALLOWED_TOKENS[number])) {
    return NextResponse.json({ error: 'Unsupported token' }, { status: 400 })
  }

  // 4. Use wallet from session (already verified server-side) or fallback to API lookup
  const wallet = sessionWallet ?? await resolveUserWallet(intent.chain ?? 'arc')
  if (!wallet) {
    return NextResponse.json(
      { error: 'No Circle wallet found. Please log out and log in again to set up your wallet.' },
      { status: 404 }
    )
  }

  // 5. Balance check — read on-chain balance before attempting the transaction
  try {
    const { readWalletBalances } = await import('@/lib/viem/balanceReader')
    const balances = await readWalletBalances(wallet.address)
    const tokenBalance = balances.find(b => b.token === intent.token)
    const available = parseFloat(tokenBalance?.amount ?? '0')

    if (amount > available) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ${available.toFixed(2)} ${intent.token} but tried to send ${intent.amount} ${intent.token}. ` +
                 `Deposit more ${intent.token} to your Circle wallet first.`,
        },
        { status: 400 }
      )
    }
  } catch {
    // Balance check failed — proceed anyway (don't block on RPC error)
    console.warn('[executeSend] Balance pre-check failed, proceeding')
  }

  // 6. Execute transaction
  const result = await sendTokens({
    walletId: wallet.id,
    destinationAddress: addr,
    amount: intent.amount,
    tokenSymbol: intent.token,
    chain: (intent.chain as 'arc') ?? 'arc',
  })

  // 7. Wait for confirmation (Arc is sub-second — max 15s to be safe)
  let finalResult = result
  if (result.circleId && result.status !== 'COMPLETE') {
    try {
      finalResult = await waitForTx(result.circleId, 15_000)
    } catch {
      // Return initiated state if wait times out
    }
  }

  const txHash = finalResult.txHash ?? finalResult.circleId

  return NextResponse.json({
    txHash,
    message:    `✅ Sent ${intent.amount} ${intent.token} successfully!`,
    arcScanUrl: finalResult.arcScanUrl,
    status:     finalResult.status,
  })
}

// ── Swap ──────────────────────────────────────────────────────────────────────

async function executeSwap(intent: SwapIntent, sessionWallet: WalletInfo | null) {
  const { createCircleWalletsAdapter } = await import('@circle-fin/adapter-circle-wallets')
  const { AppKit, SwapChain } = await import('@circle-fin/app-kit')

  const apiKey       = process.env.CIRCLE_API_KEY
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET
  const kitKey       = process.env.CIRCLE_KIT_KEY

  if (!apiKey || !entitySecret) {
    return NextResponse.json({ error: 'Circle credentials not configured.' }, { status: 500 })
  }

  const wallet = sessionWallet ?? await resolveUserWallet(intent.chain ?? 'arc')
  if (!wallet) {
    return NextResponse.json({
      error: 'No Circle wallet found. Please log out and log in again.',
    }, { status: 404 })
  }

  // Map app chain names → App Kit SwapChain enum values
  const SWAP_CHAIN_MAP: Record<string, typeof SwapChain[keyof typeof SwapChain]> = {
    arc:      SwapChain.Arc_Testnet,
    ethereum: SwapChain.Ethereum,
    base:     SwapChain.Base,
    solana:   SwapChain.Solana,
  }
  const fromChain = SWAP_CHAIN_MAP[intent.chain ?? 'arc'] ?? SwapChain.Arc_Testnet

  try {
    const adapter = createCircleWalletsAdapter({ apiKey, entitySecret })
    const kit = new AppKit()

    const result = await kit.swap({
      from: {
        adapter,
        chain:   fromChain,
        address: wallet.address,
      },
      tokenIn:  intent.token_in,
      tokenOut: intent.token_out,
      amountIn: intent.amount_in,
      ...(kitKey ? { config: { kitKey } } : {}),
    })

    const explorerBase = process.env.NEXT_PUBLIC_ARC_EXPLORER ?? 'https://testnet.arcscan.app'
    const arcScanUrl = result.txHash ? `${explorerBase}/tx/${result.txHash}` : undefined

    return NextResponse.json({
      txHash:     result.txHash,
      message:    `✅ Swapped ${result.amountIn} ${intent.token_in} → ${result.amountOut ?? '?'} ${intent.token_out}`,
      arcScanUrl,
      status:     'complete',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Swap failed'
    console.error('[executeSwap]', err)

    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      return NextResponse.json({
        error: `Insufficient ${intent.token_in} in your Circle wallet to complete this swap. Fund your Circle wallet first.`,
      }, { status: 400 })
    }
    if (msg.toLowerCase().includes('unsupported') || msg.toLowerCase().includes('route')) {
      return NextResponse.json({
        error: `This swap route (${intent.token_in} → ${intent.token_out}) is not supported on Arc Testnet yet.`,
      }, { status: 400 })
    }
    return NextResponse.json({ error: `Swap failed: ${msg}` }, { status: 500 })
  }
}

// ── Bridge ────────────────────────────────────────────────────────────────────

async function executeBridge(intent: BridgeIntent, sessionWallet: WalletInfo | null) {
  const { createCircleWalletsAdapter } = await import('@circle-fin/adapter-circle-wallets')
  const { AppKit, BridgeChain } = await import('@circle-fin/app-kit')

  const apiKey       = process.env.CIRCLE_API_KEY
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET

  if (!apiKey || !entitySecret) {
    return NextResponse.json({ error: 'Circle credentials not configured.' }, { status: 500 })
  }

  // Bridge only supports USDC (EURC is not supported by CCTP)
  if (intent.token !== 'USDC') {
    return NextResponse.json({
      error: `Only USDC can be bridged via CCTP. ${intent.token} bridging is not supported.`,
    }, { status: 400 })
  }

  const wallet = sessionWallet ?? await resolveUserWallet(intent.from_chain ?? 'arc')
  if (!wallet) {
    return NextResponse.json({
      error: 'No Circle wallet found. Please log out and log in again.',
    }, { status: 404 })
  }

  // Map app chain names → App Kit BridgeChain enum values
  const BRIDGE_CHAIN_MAP: Record<string, typeof BridgeChain[keyof typeof BridgeChain]> = {
    arc:      BridgeChain.Arc_Testnet,
    ethereum: BridgeChain.Ethereum_Sepolia,
    base:     BridgeChain.Base_Sepolia,
    solana:   BridgeChain.Solana_Devnet,
    arbitrum: BridgeChain.Arbitrum_Sepolia,
  }
  const fromChain = BRIDGE_CHAIN_MAP[intent.from_chain ?? 'arc']  ?? BridgeChain.Arc_Testnet
  const toChain   = BRIDGE_CHAIN_MAP[intent.to_chain   ?? 'ethereum'] ?? BridgeChain.Ethereum_Sepolia

  try {
    const adapter = createCircleWalletsAdapter({ apiKey, entitySecret })
    const kit = new AppKit()

    const result = await kit.bridge({
      from: {
        adapter,
        chain:   fromChain,
        address: wallet.address,
      },
      to: {
        adapter,
        chain:   toChain,
        address: wallet.address,  // Same Circle wallet, different chain
      },
      amount: intent.amount,
      token:  'USDC',
      config: { transferSpeed: 'FAST' },
    })

    // BridgeResult has no top-level txHash — get it from the first successful step
    const explorerBase = process.env.NEXT_PUBLIC_ARC_EXPLORER ?? 'https://testnet.arcscan.app'
    const burnStep  = result.steps.find((s) => s.txHash && s.state === 'success')
    const txHash    = burnStep?.txHash
    const arcScanUrl = txHash ? `${explorerBase}/tx/${txHash}` : burnStep?.explorerUrl

    return NextResponse.json({
      txHash,
      message:    `✅ Bridged ${intent.amount} USDC from ${intent.from_chain} → ${intent.to_chain} (~20s)`,
      arcScanUrl,
      status:     result.state === 'success' ? 'complete' : result.state,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bridge failed'
    console.error('[executeBridge]', err)

    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      return NextResponse.json({
        error: `Insufficient USDC in your Circle wallet on ${intent.from_chain}. Fund your Circle wallet first.`,
      }, { status: 400 })
    }
    return NextResponse.json({ error: `Bridge failed: ${msg}` }, { status: 500 })
  }
}

// ── Balance shortcut ──────────────────────────────────────────────────────────

async function executeBalance(walletAddress: string) {
  try {
    const { readWalletBalances, formatBalanceMessage } = await import('@/lib/viem/balanceReader')
    const balances = await readWalletBalances(walletAddress)
    return NextResponse.json({
      txHash:  null,
      message: formatBalanceMessage(balances, walletAddress),
      status:  'complete',
    })
  } catch {
    return NextResponse.json({ txHash: null, message: '💰 Could not fetch balance.', status: 'complete' })
  }
}

// ── Wallet resolver ───────────────────────────────────────────────────────────

interface WalletInfo {
  id: string
  address: string
}

/**
 * Fallback: get the primary Circle developer-controlled wallet for a given chain.
 * Used only when session doesn't have wallet info (e.g. old sessions).
 */
async function resolveUserWallet(chain: string): Promise<WalletInfo | null> {
  const envWalletId      = process.env.CIRCLE_DEMO_WALLET_ID
  const envWalletAddress = process.env.CIRCLE_DEMO_WALLET_ADDRESS
  if (envWalletId && envWalletAddress) return { id: envWalletId, address: envWalletAddress }

  const CHAIN_MAP: Record<string, string> = {
    arc:      'ARC-TESTNET',
    ethereum: 'ETH-SEPOLIA',
    base:     'BASE-SEPOLIA',
    solana:   'SOL-DEVNET',
  }
  const blockchain = CHAIN_MAP[chain] ?? 'ARC-TESTNET'

  try {
    const client = getCircleClient()
    const res    = await client.listWallets({ blockchain: blockchain as 'ARC-TESTNET', pageSize: 1 })
    const wallet = res.data?.wallets?.[0]
    if (!wallet?.id || !wallet?.address) return null
    return { id: wallet.id, address: wallet.address }
  } catch (err) {
    console.error('[resolveUserWallet]', err)
    return null
  }
}
