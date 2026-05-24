import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { readWalletBalances, TOKEN_CONTRACTS } from '@/lib/viem/balanceReader'

export const dynamic = 'force-dynamic'

/**
 * GET /api/balance
 * Reads token balances from Arc Testnet blockchain via viem.
 *
 * Address priority:
 *  1. ?address= query param (explicit lookup)
 *  2. session.circleWalletAddress (Circle dev wallet — where app funds live)
 *  3. session.address (MetaMask address — fallback for users not yet set up)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    const queryAddress = req.nextUrl.searchParams.get('address')

    // Use Circle wallet address as primary (funds live here after deposit)
    const address = queryAddress
      ?? session?.circleWalletAddress
      ?? session?.address

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json({
        type: 'unified',
        wallets: [],
        totalUsdc: '0.00',
        totalEurc: '0.00',
        totalUsyc: '0.00',
        totalEquivalent: '0.00',
        fetchedAt: new Date().toISOString(),
        _info: 'No wallet connected.',
      })
    }

    const isCircleWallet = address === session?.circleWalletAddress

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
      walletType: isCircleWallet ? 'circle' : 'metamask',
      wallets: [{
        walletId:   address,
        address,
        blockchain: 'ARC-TESTNET',
        chain:      'arc',
        balances:   balances.map(b => ({
          token:      b.token,
          amount:     b.amount,
          chain:      'arc',
          blockchain: 'ARC-TESTNET',
          updateDate: new Date().toISOString(),
        })),
      }],
      totalUsdc:       parseFloat(usdc).toFixed(2),
      totalEurc:       parseFloat(eurc).toFixed(2),
      totalUsyc:       parseFloat(usyc).toFixed(2),
      totalEquivalent: equivalent,
      fetchedAt:       new Date().toISOString(),
      contracts:       TOKEN_CONTRACTS,
      // Pass both addresses to UI for deposit flow
      circleWalletAddress: session?.circleWalletAddress,
      metaMaskAddress:     session?.address,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Balance fetch failed'
    console.error('[/api/balance]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
