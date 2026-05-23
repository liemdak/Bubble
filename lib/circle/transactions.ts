/**
 * Transaction execution helpers via Circle Developer-Controlled Wallets SDK.
 * SERVER-SIDE ONLY.
 */
import { getCircleClient, BLOCKCHAINS } from './client'
import type { SupportedChain } from './client'

export interface SendParams {
  walletId: string
  destinationAddress: string
  amount: string
  tokenSymbol: string   // USDC | EURC | USYC
  chain: SupportedChain
}

export interface TxResult {
  txHash: string | null
  circleId: string
  status: string
  arcScanUrl?: string
}

/**
 * Send stablecoins from a developer-controlled wallet.
 * Returns the Circle transaction ID + explorer URL.
 */
export async function sendTokens(params: SendParams): Promise<TxResult> {
  const client = getCircleClient()
  const blockchain = BLOCKCHAINS[params.chain] ?? BLOCKCHAINS.arc

  // 1. Find the token ID for this symbol on this chain
  const tokenId = await resolveTokenId(params.tokenSymbol, blockchain)
  if (!tokenId) {
    throw new Error(`Token ${params.tokenSymbol} not found on ${blockchain}`)
  }

  // 2. Create transfer transaction
  // Note: Circle SDK createTransaction uses `amount: string[]` (array)
  const res = await client.createTransaction({
    walletId: params.walletId,
    tokenId,
    destinationAddress: params.destinationAddress,
    amount: [params.amount],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })

  // createTransaction response only has `id` + `state` — txHash comes after polling
  const circleId = res.data?.id ?? ''
  const state    = res.data?.state ?? 'INITIATED'

  return {
    txHash:   null,
    circleId,
    status:   state,
    arcScanUrl: undefined,
  }
}

/**
 * Poll a Circle transaction until it reaches a terminal state.
 * Arc Testnet confirms in <1s, so this usually resolves in 1-2 polls.
 */
export async function waitForTx(circleId: string, maxWaitMs = 30_000): Promise<TxResult> {
  const client = getCircleClient()
  const pollInterval = 1000
  const deadline = Date.now() + maxWaitMs
  const explorerBase = process.env.NEXT_PUBLIC_ARC_EXPLORER ?? 'https://testnet.arcscan.app'

  while (Date.now() < deadline) {
    const res = await client.getTransaction({ id: circleId })
    const tx = res.data?.transaction
    const state = tx?.state ?? ''

    if (['COMPLETE', 'CONFIRMED'].includes(state)) {
      const txHash = tx?.txHash ?? null
      return {
        txHash,
        circleId,
        status:     state,
        arcScanUrl: txHash ? `${explorerBase}/tx/${txHash}` : undefined,
      }
    }

    if (['FAILED', 'CANCELLED', 'DENIED'].includes(state)) {
      throw new Error(`Transaction ${state.toLowerCase()}`)
    }

    await new Promise((r) => setTimeout(r, pollInterval))
  }

  throw new Error('Transaction timed out — check ArcScan manually')
}

/**
 * Resolve a Circle token ID by symbol + blockchain using the REST API.
 * Circle SDK has `getToken({ id })` but not a "find by symbol" method,
 * so we call the REST endpoint directly.
 * Caches results in memory for the process lifetime.
 */
const _tokenCache = new Map<string, string>()

async function resolveTokenId(symbol: string, blockchain: string): Promise<string | null> {
  const cacheKey = `${symbol}:${blockchain}`
  if (_tokenCache.has(cacheKey)) return _tokenCache.get(cacheKey)!

  const apiKey = process.env.CIRCLE_API_KEY!
  const url = `https://api.circle.com/v1/w3s/tokens?blockchain=${encodeURIComponent(blockchain)}&pageSize=50`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    console.error('[resolveTokenId] Circle tokens API error:', res.status, await res.text())
    return null
  }

  const data = await res.json() as {
    data?: { tokens?: Array<{ id: string; symbol: string; blockchain: string }> }
  }

  const token = (data.data?.tokens ?? []).find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  )

  if (token?.id) {
    _tokenCache.set(cacheKey, token.id)
    return token.id
  }

  return null
}
