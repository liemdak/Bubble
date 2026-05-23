import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { readWalletBalances, TOKEN_CONTRACTS } from '@/lib/viem/balanceReader'

export const dynamic = 'force-dynamic'

/**
 * GET /api/balance
 * Reads token balances directly from Arc Testnet blockchain via viem.
 * Uses the user's connected wallet address (from session) — NOT Circle dev wallets.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    const userAddress = session?.address

    // Allow explicit address override (for sharing/lookup)
    const queryAddress = req.nextUrl.searchParams.get('address')
    const address = queryAddress ?? userAddress

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json({
        type: 'unified',
        wallets: [],
        totalUsdc: '0.00',
        totalEurc: '0.00',
        totalUsyc: '0.00',
        totalEquivalent: '0.00',
        fetchedAt: new Date().toISOString(),
        _info: 'No wallet address in session.',
      })
    }

    // Read balances directly from blockchain
    const balances = await readWalletBalances(address)

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
      address,
      wallets: [{
        walletId: address,
        address,
        blockchain: 'ARC-TESTNET',
        chain: 'arc',
        balances: balances.map(b => ({
          token:      b.token,
          amount:     b.amount,
          chain:      'arc',
          blockchain: 'ARC-TESTNET',
          updateDate: new Date().toISOString(),
        })),
      }],
      totalUsdc:      parseFloat(usdc).toFixed(2),
      totalEurc:      parseFloat(eurc).toFixed(2),
      totalUsyc:      parseFloat(usyc).toFixed(2),
      totalEquivalent: equivalent,
      fetchedAt: new Date().toISOString(),
      contracts: TOKEN_CONTRACTS,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Balance fetch failed'
    console.error('[/api/balance]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
