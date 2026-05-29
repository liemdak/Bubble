import { NextResponse } from 'next/server'
import { getSession, createSession, type Session } from '@/lib/auth/session'
import { readWalletBalances, TOKEN_CONTRACTS } from '@/lib/viem/balanceReader'

export const dynamic = 'force-dynamic'

/**
 * Auto-heal stale sessions that are missing circleWalletAddress,
 * OR sessions where address was wrongly set to the Circle wallet address.
 *
 * Two cases handled:
 *  Case 1 (normal stale): session.address = MetaMask, but circleWalletAddress missing
 *          → look up Circle wallet where refId = session.address
 *  Case 2 (broken stale): session.address = Circle wallet address (old bug)
 *          → find wallet where wallet.address = session.address, then refId = MetaMask address
 *
 * Returns the healed session (or original if Circle API unavailable).
 */
async function recoverSession(session: Session): Promise<Session> {
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
    return session
  }

  try {
    const { getCircleClient } = await import('@/lib/circle/client')
    const client = getCircleClient()

    const listRes = await client.listWallets({
      blockchain: 'ARC-TESTNET' as const,
      pageSize: 50,
    })
    const wallets = listRes.data?.wallets ?? []

    // ── Case 1: session.address is MetaMask — just need to add circleWalletAddress ──
    const byRefId = wallets.find(
      (w) => w.refId?.toLowerCase() === session.address.toLowerCase()
    )
    if (byRefId?.id && byRefId?.address) {
      console.log('[recoverSession] Case 1: recovered Circle wallet from refId')
      const healed: Session = {
        ...session,
        circleWalletId:      byRefId.id,
        circleWalletAddress: byRefId.address,
      }
      await createSession(healed)
      return healed
    }

    // ── Case 2: session.address IS the Circle wallet address (old buggy session) ──
    const byAddress = wallets.find(
      (w) => w.address?.toLowerCase() === session.address.toLowerCase()
    )
    if (byAddress?.refId && byAddress?.address) {
      // refId was set to MetaMask address when the wallet was created
      const metaMaskAddress = byAddress.refId
      console.log('[recoverSession] Case 2: session.address was Circle wallet — restoring MetaMask address')
      const healed: Session = {
        ...session,
        address:             metaMaskAddress,
        circleWalletId:      byAddress.id,
        circleWalletAddress: byAddress.address,
        displayName:         `${metaMaskAddress.slice(0, 6)}...${metaMaskAddress.slice(-4)}`,
      }
      await createSession(healed)
      return healed
    }

    console.warn('[recoverSession] Could not match session to any Circle wallet')
  } catch (err) {
    console.error('[recoverSession]', err)
  }

  return session
}

/**
 * GET /api/balance
 *
 * Returns TWO wallet balances:
 *  - userWallet  : MetaMask address (user's main wallet — display this)
 *  - agentWallet : Circle dev wallet (agent spends from here)
 *
 * Auto-heals stale session cookies so users never need to manually re-login.
 */
export async function GET() {
  try {
    let session = await getSession()

    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ── Auto-heal: recover Circle wallet info if missing from session ──────────
    if (!session.circleWalletAddress) {
      console.log('[/api/balance] circleWalletAddress missing — attempting session recovery')
      session = await recoverSession(session)
    }

    const userAddress  = session.address
    const agentAddress = session.circleWalletAddress ?? null

    // Fetch both balances in parallel
    const [userBalances, agentBalances] = await Promise.all([
      readWalletBalances(userAddress),
      agentAddress ? readWalletBalances(agentAddress) : Promise.resolve([]),
    ])

    const summarise = (bals: Awaited<ReturnType<typeof readWalletBalances>>) => {
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
