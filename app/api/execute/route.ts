import { NextRequest, NextResponse } from 'next/server'
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
 *
 * Note: bridge_tokens is handled client-side (bridgeViaMetaMask.ts) — not routed here.
 */

// ── Token contract addresses on Arc Testnet ───────────────────────────────────
// Used by sendTokenDirect() for raw ERC-20 transfer calldata approach,
// which is more reliable than kit.send() (bypasses viem RPC calls).
const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  USYC: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
}


/**
 * Transfer any ERC-20 token from the agent wallet via Circle createContractExecutionTransaction.
 * Uses abiFunctionSignature + abiParameters — the correct Circle API method for ERC-20 calls.
 * Docs: https://docs.arc.io/arc/tutorials/interact-with-contracts#transfer-tokens
 *
 * @param rawAmountStr - If provided, used directly as the transfer amount (avoids float-rounding
 *   errors). Pass this when withdrawing the full balance — balanceReader.toFixed(2) can round UP
 *   (e.g. 5.006 → "5.01" → 5010000 raw), which exceeds the real balance and causes INSUFFICIENT_TOKEN.
 */
async function sendTokenDirect(
  walletId: string,
  recipientAddress: string,
  amount: string,
  contractAddress: string,
  rawAmountStr?: string,
): Promise<string> {
  const client = getCircleClient()

  // Use raw bigint from balanceOf when available — avoids rounding errors.
  // Fallback: compute from human-readable amount (USDC/EURC/USYC all use 6 decimals on Arc).
  const amountWei = rawAmountStr
    ? rawAmountStr
    : BigInt(Math.round(parseFloat(amount) * 1_000_000)).toString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (client as any).createContractExecutionTransaction({
    walletId,
    contractAddress,
    abiFunctionSignature: 'transfer(address,uint256)',
    abiParameters:        [recipientAddress, amountWei],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })

  const txId = res.data?.id
  if (!txId) throw new Error('No transaction ID returned from Circle')

  // Poll until confirmed (max ~60s)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const txRes = await client.getTransaction({ id: txId })
    const tx    = txRes.data?.transaction
    if (!tx) continue
    if (tx.state === 'CONFIRMED' && tx.txHash) return tx.txHash
    if (tx.state === 'FAILED') {
      throw new Error(`Transfer failed on-chain: ${tx.errorReason ?? 'unknown reason'}`)
    }
  }
  throw new Error('Transaction timeout — check ArcScan for the latest status')
}
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
      case 'refund_agent':  return await executeRefundAgent(intent, walletInfo, session.address)
      case 'swap_tokens':   return await executeSwap(intent, walletInfo)
      case 'bridge_tokens': return await executeBridge(intent, walletInfo)
      case 'get_balance':   return await executeBalance(session.address)
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

  // 4. Resolve agent wallet from session
  const wallet = sessionWallet ?? await resolveUserWallet(intent.chain ?? 'arc')
  if (!wallet) {
    return NextResponse.json(
      { error: 'No Circle wallet found. Please log out and log in again.' },
      { status: 404 }
    )
  }

  const apiKey       = process.env.CIRCLE_API_KEY
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET
  if (!apiKey || !entitySecret) {
    return NextResponse.json({ error: 'Circle credentials not configured.' }, { status: 500 })
  }

  const explorerBase = process.env.NEXT_PUBLIC_ARC_EXPLORER ?? 'https://testnet.arcscan.app'

  // 5a. EURC / USYC — kit.send() does not resolve these on Arc Testnet
  //     Use direct ERC-20 transfer via Circle contract execution API instead
  if (intent.token === 'EURC' || intent.token === 'USYC') {
    const contractAddress = TOKEN_CONTRACTS[intent.token]
    try {
      const txHash = await sendTokenDirect(wallet.id, addr, intent.amount, contractAddress)
      return NextResponse.json({
        txHash,
        message:    `✅ Sent ${intent.amount} ${intent.token} successfully!`,
        arcScanUrl: `${explorerBase}/tx/${txHash}`,
        status:     'complete',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      console.error('[executeSend EURC/USYC]', err)
      return NextResponse.json({ error: `Send failed: ${msg}` }, { status: 500 })
    }
  }

  // 5b. USDC — use kit.send() as before
  try {
    const { createCircleWalletsAdapter } = await import('@circle-fin/adapter-circle-wallets')
    const { AppKit } = await import('@circle-fin/app-kit')

    const adapter = createCircleWalletsAdapter({ apiKey, entitySecret })
    const kit = new AppKit()

    const result = await kit.send({
      from: { adapter, chain: 'Arc_Testnet', address: wallet.address },
      to:     addr,
      amount: intent.amount,
      token:  intent.token,
    })

    const arcScanUrl = result.txHash ? `${explorerBase}/tx/${result.txHash}` : result.explorerUrl

    return NextResponse.json({
      txHash:     result.txHash,
      message:    `✅ Sent ${intent.amount} ${intent.token} successfully!`,
      arcScanUrl,
      status:     result.state,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Send failed'
    console.error('[executeSend]', err)

    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      return NextResponse.json({
        error: `Insufficient ${intent.token} in your agent wallet. Fund the agent wallet first via "Fund Agent".`,
      }, { status: 400 })
    }
    return NextResponse.json({ error: `Send failed: ${msg}` }, { status: 500 })
  }
}

// ── Refund agent → user's main wallet ────────────────────────────────────────

async function executeRefundAgent(
  intent: Extract<PaymentIntent, { type: 'refund_agent' }>,
  sessionWallet: WalletInfo | null,
  userAddress: string,         // MetaMask address (destination)
) {
  const ALLOWED_TOKENS = ['USDC', 'EURC', 'USYC'] as const
  if (!ALLOWED_TOKENS.includes(intent.token as typeof ALLOWED_TOKENS[number])) {
    return NextResponse.json({ error: 'Unsupported token' }, { status: 400 })
  }

  const wallet = sessionWallet ?? await resolveUserWallet('arc')
  if (!wallet) {
    return NextResponse.json({ error: 'No Circle wallet found.' }, { status: 404 })
  }

  // ── Session guard: destination must NOT equal the agent wallet (broken-session bug) ──
  // Old sessions stored session.address = Circle wallet address instead of MetaMask address.
  // If they match, look up the wallet's refId (which was set to MetaMask address at creation).
  let destination = userAddress
  if (destination.toLowerCase() === wallet.address.toLowerCase()) {
    console.warn('[executeRefundAgent] session.address === agent wallet — attempting refId recovery')
    try {
      const walletRes = await getCircleClient().getWallet({ id: wallet.id })
      const refId = walletRes.data?.wallet?.refId
      if (refId && /^0x[0-9a-fA-F]{40}$/.test(refId)) {
        destination = refId
        console.log('[executeRefundAgent] Recovered MetaMask address:', destination)
      } else {
        return NextResponse.json({
          error: 'Could not resolve your main wallet address. Please log out and log in again, then retry.',
        }, { status: 400 })
      }
    } catch (err) {
      console.error('[executeRefundAgent] refId lookup failed', err)
      return NextResponse.json({
        error: 'Session error: source and destination are the same wallet. Please log out and log in again.',
      }, { status: 400 })
    }
  }

  const explorerBase = process.env.NEXT_PUBLIC_ARC_EXPLORER ?? 'https://testnet.arcscan.app'

  // ── Resolve actual on-chain balance via viem — never trust intent.amount ──
  // Claude may produce "9999", "all", or a stale value — always use real balance.
  // We keep both the human-readable amount (for display) and the raw bigint string
  // (for the transfer call) to avoid float-rounding errors with toFixed(2).
  let finalAmount: string
  let finalRaw: string | undefined = undefined

  try {
    const { readWalletBalances } = await import('@/lib/viem/balanceReader')
    const balances = await readWalletBalances(wallet.address)
    const found    = balances.find(b => b.token === intent.token)
    const actual   = parseFloat(found?.amount ?? '0')

    if (actual <= 0) {
      return NextResponse.json(
        { error: `No ${intent.token} in agent wallet to withdraw.` },
        { status: 400 }
      )
    }

    finalAmount = found!.amount    // human-readable for display (e.g. "5.01")
    finalRaw    = found!.raw       // exact on-chain bigint string (e.g. "5006000")
    console.log(`[executeRefundAgent] withdrawing real balance: ${finalAmount} ${intent.token} (raw: ${finalRaw})`)
  } catch (err) {
    console.error('[executeRefundAgent] balance fetch failed:', err)
    // Fallback: use intent.amount only if it looks like a real number ≤ 10k
    const parsed = parseFloat(intent.amount)
    if (isNaN(parsed) || parsed <= 0 || parsed > 10_000) {
      return NextResponse.json(
        { error: 'Could not determine withdrawal amount. Please try again.' },
        { status: 400 }
      )
    }
    finalAmount = intent.amount
    // finalRaw stays undefined → sendTokenDirect will compute from float
  }

  // ── Execute transfer ──────────────────────────────────────────────────────

  // All tokens (USDC, EURC, USYC) — use sendTokenDirect with the exact raw balance.
  // Passing finalRaw bypasses float conversion and avoids INSUFFICIENT_TOKEN from rounding.
  const contractAddress = TOKEN_CONTRACTS[intent.token]
  if (!contractAddress) {
    return NextResponse.json({ error: `No contract for ${intent.token}` }, { status: 400 })
  }

  try {
    const txHash = await sendTokenDirect(wallet.id, destination, finalAmount, contractAddress, finalRaw)
    return NextResponse.json({
      txHash,
      message:    `Withdrew ${finalAmount} ${intent.token} back to your wallet!`,
      arcScanUrl: `${explorerBase}/tx/${txHash}`,
      status:     'complete',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Withdraw failed'
    console.error('[executeRefundAgent]', err)
    return NextResponse.json({ error: `Withdraw failed: ${msg}` }, { status: 500 })
  }
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
