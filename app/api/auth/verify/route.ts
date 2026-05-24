import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'
import { createSession } from '@/lib/auth/session'
import { consumeNonce, buildSignMessage } from '@/lib/auth/nonce'

/**
 * POST /api/auth/verify
 * Body: { address, signature, nonce }
 *
 * Flow:
 * 1. Verify nonce (one-time, 5-min expiry)
 * 2. Verify MetaMask signature
 * 3. Find or create Circle wallet for this user (persistent via refId)
 * 4. Issue session cookie with both addresses
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

    // 3. Verify the MetaMask signature
    const message = buildSignMessage(address, nonce)
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })

    if (!valid) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }

    // 4. Find or create Circle wallet — permanently linked to this MetaMask address
    const circleWallet = await getOrCreateCircleWallet(address)

    // 5. Issue session cookie (7-day expiry)
    await createSession({
      address,
      circleWalletId:      circleWallet?.id,
      circleWalletAddress: circleWallet?.address,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    })

    return NextResponse.json({
      success: true,
      address,
      circleWalletAddress: circleWallet?.address,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    })
  } catch (err) {
    console.error('[/api/auth/verify]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

// ── Circle Wallet helpers ────────────────────────────────────────────────────

interface CircleWalletInfo {
  id: string
  address: string
}

/**
 * In-memory cache for the app's shared wallet set ID.
 * One wallet set for all users — wallets are differentiated by refId.
 */
let _appWalletSetId: string | null = null

/**
 * Get the app's shared wallet set, or create one if it doesn't exist.
 * Uses CIRCLE_WALLET_SET_ID env var if provided (recommended for production).
 */
async function getAppWalletSetId(client: Awaited<ReturnType<typeof import('@/lib/circle/client')['getCircleClient']>>): Promise<string | null> {
  // 1. Check env var (fastest path — set this in production)
  if (process.env.CIRCLE_WALLET_SET_ID) {
    return process.env.CIRCLE_WALLET_SET_ID
  }

  // 2. Return cached value
  if (_appWalletSetId) return _appWalletSetId

  // 3. List existing wallet sets → use first one
  try {
    const sets = await client.listWalletSets({ pageSize: 1 })
    const existing = sets.data?.walletSets?.[0]
    if (existing?.id) {
      _appWalletSetId = existing.id
      return _appWalletSetId
    }
  } catch {
    // listWalletSets may not be available — fall through to create
  }

  // 4. Create a new shared wallet set for the app
  const created = await client.createWalletSet({ name: 'BubblePay-Users' })
  _appWalletSetId = created.data?.walletSet?.id ?? null
  return _appWalletSetId
}

/**
 * Find an existing Circle wallet for this MetaMask address, or create one.
 *
 * The refId = lowercase MetaMask address ensures the wallet is ALWAYS
 * recoverable — even if session/DB is lost. This is the permanent link.
 */
async function getOrCreateCircleWallet(metaMaskAddress: string): Promise<CircleWalletInfo | null> {
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
    console.warn('[getOrCreateCircleWallet] Circle credentials not set — skipping wallet creation')
    return null
  }

  try {
    const { getCircleClient } = await import('@/lib/circle/client')
    const client = getCircleClient()
    const refId = metaMaskAddress.toLowerCase()

    // ── Step 1: Find existing wallet by refId ──────────────────────────────
    // List all wallets on ARC-TESTNET and find the one linked to this address
    const listRes = await client.listWallets({
      blockchain: 'ARC-TESTNET' as const,
      pageSize: 50,
    })

    const existing = listRes.data?.wallets?.find(
      (w) => w.refId?.toLowerCase() === refId
    )

    if (existing?.id && existing?.address) {
      console.log(`[Circle] Found existing wallet for ${refId.slice(0, 8)}... → ${existing.address.slice(0, 10)}...`)
      return { id: existing.id, address: existing.address }
    }

    // ── Step 2: Get the app's shared wallet set ────────────────────────────
    const walletSetId = await getAppWalletSetId(client)
    if (!walletSetId) {
      console.error('[getOrCreateCircleWallet] Could not get wallet set ID')
      return null
    }

    // ── Step 3: Create new wallet for this user ────────────────────────────
    const walletRes = await client.createWallets({
      walletSetId,
      blockchains: ['ARC-TESTNET'],
      count: 1,
      metadata: [{
        name: `bubble-${metaMaskAddress.slice(0, 10)}`,
        refId,   // ← permanent link: MetaMask address = refId
      }],
    })

    const newWallet = walletRes.data?.wallets?.[0]
    if (!newWallet?.id || !newWallet?.address) {
      console.error('[getOrCreateCircleWallet] Wallet creation returned no data')
      return null
    }

    console.log(`[Circle] Created new wallet for ${refId.slice(0, 8)}... → ${newWallet.address.slice(0, 10)}...`)
    return { id: newWallet.id, address: newWallet.address }

  } catch (err) {
    console.error('[getOrCreateCircleWallet]', err)
    return null
  }
}
