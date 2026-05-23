import { NextRequest, NextResponse } from 'next/server'
import { sendTokens, waitForTx } from '@/lib/circle/transactions'
import { getCircleClient } from '@/lib/circle/client'
import type { PaymentIntent } from '@/types/intent'

/**
 * POST /api/execute
 * Executes a confirmed payment intent via Circle Developer-Controlled Wallets.
 *
 * Body: { intent: PaymentIntent, resolved_address?: string }
 *
 * Security rules (enforced server-side):
 *  1. Address must match 0x + 40 hex chars
 *  2. Amount must be positive
 *  3. Token must be USDC | EURC | USYC
 *  4. walletId resolved from server (never trusted from client)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const intent: PaymentIntent = body.intent

    if (!intent) {
      return NextResponse.json({ error: 'No intent provided' }, { status: 400 })
    }

    switch (intent.type) {
      case 'send_payment':  return await executeSend(intent)
      case 'get_balance':   return await executeBalance()
      default:
        return NextResponse.json(
          { error: `Intent type '${intent.type}' execution not yet implemented` },
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

async function executeSend(intent: Extract<PaymentIntent, { type: 'send_payment' }>) {
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

  // 4. Resolve the sending wallet from server (never trust client)
  const walletId = await resolveUserWallet(intent.chain ?? 'arc')
  if (!walletId) {
    return NextResponse.json(
      { error: 'No wallet found for this chain. Please set up a Circle wallet first.' },
      { status: 404 }
    )
  }

  // 5. Execute transaction
  const result = await sendTokens({
    walletId,
    destinationAddress: addr,
    amount: intent.amount,
    tokenSymbol: intent.token,
    chain: (intent.chain as 'arc') ?? 'arc',
  })

  // 6. Wait for confirmation (Arc is sub-second — max 15s to be safe)
  let finalResult = result
  if (result.circleId && result.status !== 'COMPLETE') {
    try {
      finalResult = await waitForTx(result.circleId, 15_000)
    } catch {
      // Return initiated state if wait times out
    }
  }

  return NextResponse.json({
    txHash:     finalResult.txHash ?? finalResult.circleId,
    message:    `Sent ${intent.amount} ${intent.token} successfully!`,
    arcScanUrl: finalResult.arcScanUrl,
    status:     finalResult.status,
  })
}

// ── Balance shortcut ──────────────────────────────────────────────────────────

async function executeBalance() {
  const { getUnifiedBalance } = await import('@/lib/circle/balance')
  const unified = await getUnifiedBalance()
  return NextResponse.json({
    txHash:  null,
    message: `You have ${unified.totalUsdc} USDC · ${unified.totalEurc} EURC · ${unified.totalUsyc} USYC across ${unified.wallets.length} wallet(s). Total ≈ $${unified.totalEquivalent}.`,
    status:  'complete',
  })
}

// ── Wallet resolver ───────────────────────────────────────────────────────────

/**
 * Get the primary wallet ID for a given chain.
 * In Phase 1 (no auth): uses CIRCLE_DEMO_WALLET_ID env var,
 * or falls back to the first wallet on that chain.
 */
async function resolveUserWallet(chain: string): Promise<string | null> {
  // Check env override first (useful for dev/testing)
  const envWalletId = process.env.CIRCLE_DEMO_WALLET_ID
  if (envWalletId) return envWalletId

  // Resolve from Circle API — find first wallet on the target blockchain
  const CHAIN_MAP: Record<string, string> = {
    arc:      'ARC-TESTNET',
    ethereum: 'ETH-SEPOLIA',
    base:     'BASE-SEPOLIA',
    solana:   'SOL-DEVNET',
  }
  const blockchain = CHAIN_MAP[chain] ?? 'ARC-TESTNET'

  const client = getCircleClient()
  const res = await client.listWallets({ blockchain: blockchain as 'ARC-TESTNET', pageSize: 1 })
  const wallet = res.data?.wallets?.[0]
  return wallet?.id ?? null
}
