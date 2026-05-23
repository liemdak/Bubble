import { NextResponse } from 'next/server'
import { getCircleClient } from '@/lib/circle/client'

/**
 * POST /api/wallet/setup
 *
 * One-time setup: creates a Circle wallet set + wallets on Arc Testnet.
 * Run this ONCE to initialise the project, then save the returned walletId
 * as CIRCLE_DEMO_WALLET_ID in .env.local.
 *
 * Protected: only works if CIRCLE_DEMO_WALLET_ID is NOT already set.
 */
export async function POST() {
  // Prevent accidental re-creation
  if (process.env.CIRCLE_DEMO_WALLET_ID) {
    return NextResponse.json({
      message: 'Wallet already configured',
      walletId: process.env.CIRCLE_DEMO_WALLET_ID,
    })
  }

  try {
    const client = getCircleClient()

    // 1. Create a wallet set (container for wallets)
    const setRes = await client.createWalletSet({ name: 'Bubble Demo' })
    const walletSetId = setRes.data?.walletSet?.id
    if (!walletSetId) throw new Error('Failed to create wallet set')

    // 2. Create wallet on Arc Testnet
    const walletRes = await client.createWallets({
      walletSetId,
      blockchains: ['ARC-TESTNET'],
      count: 1,
    })

    const wallet = walletRes.data?.wallets?.[0]
    if (!wallet) throw new Error('Failed to create wallet')

    return NextResponse.json({
      success: true,
      walletId:   wallet.id,
      address:    wallet.address,
      blockchain: wallet.blockchain,
      instruction: `Add this to your .env.local:\nCIRCLE_DEMO_WALLET_ID=${wallet.id}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Setup failed'
    console.error('[/api/wallet/setup]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/wallet/setup
 * Returns current wallet info (if configured).
 */
export async function GET() {
  try {
    const client = getCircleClient()
    const res = await client.listWallets({ pageSize: 10 })
    const wallets = res.data?.wallets ?? []

    return NextResponse.json({
      configured: wallets.length > 0,
      wallets: wallets.map((w) => ({
        id:         w.id,
        address:    w.address,
        blockchain: w.blockchain,
        state:      w.state,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list wallets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
