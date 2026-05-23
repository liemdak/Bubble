import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/balance
 * Uses session circleWalletId to fetch only the current user's wallet (1 API call).
 * Falls back to unified (all wallets) if no walletId in session.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const circleWalletId = session?.circleWalletId
    const userAddress = session?.address

    // ── Fast path: 1 API call for the user's specific wallet ──────────
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

    // ── Explicit walletId query param (admin use) ──────────────────────
    const walletId = req.nextUrl.searchParams.get('walletId')
    if (walletId) {
      const { getSingleWalletBalance } = await import('@/lib/circle/balance')
      const balances = await getSingleWalletBalance(walletId)
      return NextResponse.json({ type: 'single', walletId, balances })
    }

    // ── No wallet in session ───────────────────────────────────────────
    return NextResponse.json({
      type: 'unified',
      wallets: [],
      totalUsdc: '0.00',
      totalEurc: '0.00',
      totalUsyc: '0.00',
      totalEquivalent: '0.00',
      fetchedAt: new Date().toISOString(),
      _info: 'No Circle wallet linked to this session yet.',
    })

  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Balance fetch failed'
    console.error('[/api/balance]', err)

    // Friendlier error messages
    let message = raw
    if (raw.toLowerCase().includes('rate')) {
      message = 'Too many requests — please wait a moment and try again.'
    } else if (raw.toLowerCase().includes('unauthorized') || raw.toLowerCase().includes('401')) {
      message = 'Circle API key is invalid. Check CIRCLE_API_KEY in Vercel settings.'
    } else if (raw.toLowerCase().includes('api key')) {
      message = 'Circle API key not configured. Add CIRCLE_API_KEY to Vercel environment variables.'
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
