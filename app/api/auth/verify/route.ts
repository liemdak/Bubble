import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'
import { createSession } from '@/lib/auth/session'
import { consumeNonce, buildSignMessage } from '@/lib/auth/nonce'

/**
 * POST /api/auth/verify
 * Body: { address, signature, nonce }
 *
 * 1. Verify nonce is valid (one-time, not expired)
 * 2. Verify signature matches address
 * 3. Issue session cookie
 * 4. Create Circle wallet if first login (TODO: wire Firebase)
 */
export async function POST(req: NextRequest) {
  try {
    const { address, signature, nonce } = await req.json()

    if (!address || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // 1. Validate address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    // 2. Consume nonce (one-time use)
    const storedNonce = consumeNonce(address)
    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 })
    }

    // 3. Verify the signature
    const message = buildSignMessage(address, nonce)
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })

    if (!valid) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }

    // 4. Create/fetch user profile (Firestore — wired when Firebase config added)
    const circleWalletId = await getOrCreateCircleWallet(address)

    // 5. Issue session cookie
    await createSession({
      address,
      circleWalletId: circleWalletId ?? undefined,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    })

    return NextResponse.json({
      success: true,
      address,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    })
  } catch (err) {
    console.error('[/api/auth/verify]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

/**
 * Get existing Circle wallet or create one for this address.
 * For now: creates a new wallet on Arc Testnet on first login.
 * Future: check Firestore first to avoid duplicate wallets.
 */
async function getOrCreateCircleWallet(address: string): Promise<string | null> {
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
    return null
  }

  try {
    const { getCircleClient } = await import('@/lib/circle/client')
    const client = getCircleClient()

    // Check if wallet already exists for this address tag
    const existing = await client.listWallets({ pageSize: 50 })
    const found = existing.data?.wallets?.find(
      (w) => w.refId === address.toLowerCase()
    )
    if (found?.id) return found.id

    // Create new wallet set + wallet for this user
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

    return walletRes.data?.wallets?.[0]?.id ?? null
  } catch (err) {
    console.error('[getOrCreateCircleWallet]', err)
    return null
  }
}
