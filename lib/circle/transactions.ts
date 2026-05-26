/**
 * Transaction execution helpers via Circle Developer-Controlled Wallets SDK.
 * SERVER-SIDE ONLY.
 */
import { getCircleClient } from './client'
import type { SupportedChain } from './client'

// Arc Testnet ERC-20 contract addresses
const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  USYC: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
}

// All three tokens use 6 decimals on Arc Testnet
const TOKEN_DECIMALS = 6

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
 * Send stablecoins from a Circle developer-controlled wallet on Arc Testnet.
 *
 * Uses createContractExecutionTransaction to call transfer(address,uint256)
 * directly on the ERC-20 contract — bypasses Circle's token registry lookup
 * which does not return results for ARC-TESTNET.
 */
export async function sendTokens(params: SendParams): Promise<TxResult> {
  const client = getCircleClient()

  const contractAddress = TOKEN_CONTRACTS[params.tokenSymbol.toUpperCase()]
  if (!contractAddress) {
    throw new Error(`Unsupported token: ${params.tokenSymbol}`)
  }

  // Convert human amount → smallest unit (6 decimals)
  const amountUnits = BigInt(Math.round(parseFloat(params.amount) * 10 ** TOKEN_DECIMALS))

  // Pad to 32-byte ABI encoding for address and uint256
  const paddedAddr = params.destinationAddress.slice(2).toLowerCase().padStart(64, '0')
  const paddedAmt  = amountUnits.toString(16).padStart(64, '0')
  // transfer(address,uint256) selector = 0xa9059cbb
  const calldata   = `0xa9059cbb${paddedAddr}${paddedAmt}`

  const res = await client.createContractExecutionTransaction({
    walletId:        params.walletId,
    contractAddress,
    callData:        calldata,
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })

  const circleId = res.data?.id ?? ''
  const state    = res.data?.state ?? 'INITIATED'

  return {
    txHash:     null,
    circleId,
    status:     state,
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
