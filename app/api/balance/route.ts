import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedBalance, getSingleWalletBalance } from '@/lib/circle/balance'

export const dynamic = 'force-dynamic'

/**
 * GET /api/balance
 * Returns:
 *   - Unified balance across all developer-controlled wallets
 *   - Per-chain breakdown
 *   - Gateway total (aggregated USDC equivalent)
 *
 * Query params:
 *   ?walletId=xxx  — return balance for a specific wallet only
 */
export async function GET(req: NextRequest) {
  try {
    const walletId = req.nextUrl.searchParams.get('walletId')

    if (walletId) {
      // Single wallet balance
      const balances = await getSingleWalletBalance(walletId)
      return NextResponse.json({ type: 'single', walletId, balances })
    }

    // Full unified balance across all wallets
    const unified = await getUnifiedBalance()
    return NextResponse.json({ type: 'unified', ...unified })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Balance fetch failed'
    console.error('[/api/balance]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
