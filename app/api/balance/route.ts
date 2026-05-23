import { NextRequest, NextResponse } from 'next/server'
import { getSession, createSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const userAddress = session?.address
    let circleWalletId = session?.circleWalletId

    // ── If session has no wallet ID, try to find/create one ──────────
    if (!circleWalletId && userAddress && process.env.CIRCLE_API_KEY) {
      circleWalletId = await findOrCreateWallet(userAddress) ?? undefined

      // Persist wallet ID into session so next request is fast
      if (circleWalletId && session) {
        await createSession({ ...session, circleWalletId })
      }
    }

    // ── Fetch this user's wallet balance (1 API call) ─────────────────
    if (circleWalletId) {
      const { getSingleWalletBalance } = await import('@/lib/circle/balance')
      const balances = await getSingleWalletBalance(circleWalletId)

      const usdc = balances.find(b => b.token === 'USDC')?.amount ?? '0'
      const eurc = balances.find(b => b.token === 'EURC')?.amount ?? '0'
      const usyc = balances.find(b => b.token === 'USYC')?.amount ?? '0'
      const equivalent = (
        parseFloat(usdc) +
        parseFloat(eurc) * 1.08 +
        parseFloat(usyc)
      ).toFixed(2)

      return NextResponse.json({
        type: 'unified',
        wallets: [{
          walletId: circleWalletId,
          address: userAddress ?? '',
          blockchain: 'ARC-TESTNET',
          chain: 'arc',
          balances,
        }],
        totalUsdc: parseFloat(usdc).toFixed(2),
        totalEurc: parseFloat(eurc).toFixed(2),
        totalUsyc: parseFloat(usyc).toFixed(2),
        totalEquivalent: equivalent,
        fetchedAt: new Date().toISOString(),
      })
    }

    // ── Explicit walletId query param ─────────────────────────────────
    const walletId = req.nextUrl.searchParams.get('walletId')
    if (walletId) {
      const { getSingleWalletBalance } = await import('@/lib/circle/balance')
      const balances = await getSingleWalletBalance(walletId)
      return NextResponse.json({ type: 'single', walletId, balances })
    }

    // ── No wallet at all ──────────────────────────────────────────────
    return NextResponse.json({
      type: 'unified',
      wallets: [],
      totalUsdc: '0.00',
      totalEurc: '0.00',
      totalUsyc: '0.00',
      totalEquivalent: '0.00',
      fetchedAt: new Date().toISOString(),
    })

  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Balance fetch failed'
    console.error('[/api/balance]', err)

    let message = raw
    if (raw.toLowerCase().includes('rate'))        message = 'Too many requests — please wait a moment and try again.'
    else if (raw.toLowerCase().includes('401'))    message = 'Circle API key is invalid.'
    else if (raw.toLowerCase().includes('api key')) message = 'Circle API key not configured.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Find existing Circle wallet for this address (by refId),
 * or create a new one on Arc Testnet.
 */
async function findOrCreateWallet(address: string): Promise<string | null> {
  try {
    const { getCircleClient } = await import('@/lib/circle/client')
    const client = getCircleClient()

    // 1. Look for existing wallet by refId = address
    const list = await client.listWallets({ pageSize: 50 })
    const found = list.data?.wallets?.find(
      w => w.refId === address.toLowerCase()
    )
    if (found?.id) {
      console.log('[balance] Found existing wallet:', found.id)
      return found.id
    }

    // 2. None found — create a new one
    const setRes = await client.createWalletSet({
      name: `Bubble:${address.slice(0, 8)}`,
    })
    const walletSetId = setRes.data?.walletSet?.id
    if (!walletSetId) return null

    const walletRes = await client.createWallets({
      walletSetId,
      blockchains: ['ARC-TESTNET'],
      count: 1,
      metadata: [{ name: address, refId: address.toLowerCase() }],
    })

    const walletId = walletRes.data?.wallets?.[0]?.id ?? null
    console.log('[balance] Created new wallet:', walletId)
    return walletId
  } catch (err) {
    console.error('[findOrCreateWallet]', err)
    return null
  }
}
