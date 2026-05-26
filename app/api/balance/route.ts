import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { readWalletBalances, TOKEN_CONTRACTS } from '@/lib/viem/balanceReader'

export const dynamic = 'force-dynamic'

/**
 * GET /api/balance
 *
 * Returns TWO wallet balances:
 *  - userWallet  : MetaMask address (user's main wallet — display this)
 *  - agentWallet : Circle dev wallet (agent spends from here)
 *
 * The balance page shows userWallet prominently.
 * The agent section shows agentWallet + deposit button to top it up.
 */
export async function GET() {
  try {
    const session = await getSession()

    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userAddress  = session.address
    const agentAddress = session.circleWalletAddress ?? null

    // Fetch both balances in parallel
    const [userBalances, agentBalances] = await Promise.all([
      readWalletBalances(userAddress),
      agentAddress ? readWalletBalances(agentAddress) : Promise.resolve([]),
    ])

    function summarise(bals: Awaited<ReturnType<typeof readWalletBalances>>) {
      const usdc = parseFloat(bals.find(b => b.token === 'USDC')?.amount ?? '0')
      const eurc = parseFloat(bals.find(b => b.token === 'EURC')?.amount ?? '0')
      const usyc = parseFloat(bals.find(b => b.token === 'USYC')?.amount ?? '0')
      return {
        USDC: usdc.toFixed(2),
        EURC: eurc.toFixed(2),
        USYC: usyc.toFixed(2),
        total: (usdc + eurc * 1.08 + usyc).toFixed(2),
        balances: bals,
      }
    }

    const user  = summarise(userBalances)
    const agent = summarise(agentBalances)

    return NextResponse.json({
      // Primary: user's MetaMask wallet
      userWallet: {
        address:  userAddress,
        USDC:     user.USDC,
        EURC:     user.EURC,
        USYC:     user.USYC,
        total:    user.total,
        balances: user.balances,
      },
      // Secondary: Circle agent wallet (executes on behalf)
      agentWallet: agentAddress ? {
        address:  agentAddress,
        USDC:     agent.USDC,
        EURC:     agent.EURC,
        USYC:     agent.USYC,
        total:    agent.total,
        balances: agent.balances,
      } : null,

      // Legacy fields kept so other parts of app don't break
      address:             userAddress,
      circleWalletAddress: agentAddress,
      metaMaskAddress:     userAddress,
      totalUsdc:           user.USDC,
      totalEurc:           user.EURC,
      totalUsyc:           user.USYC,
      totalEquivalent:     user.total,
      wallets: [{
        walletId:   userAddress,
        address:    userAddress,
        blockchain: 'ARC-TESTNET',
        chain:      'arc',
        balances:   user.balances.map(b => ({
          token: b.token, amount: b.amount,
          chain: 'arc', blockchain: 'ARC-TESTNET',
          updateDate: new Date().toISOString(),
        })),
      }],
      contracts:  TOKEN_CONTRACTS,
      fetchedAt:  new Date().toISOString(),
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Balance fetch failed'
    console.error('[/api/balance]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
