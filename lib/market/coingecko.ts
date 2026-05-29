/**
 * CoinGecko price fetcher — server-side only, no blockchain, no wallet needed.
 * Uses CoinGecko's free public API (no key required, 30 req/min).
 * In-memory cache (60s TTL) keeps requests well within the free limit.
 *
 * CoinGecko coin IDs used:
 *   USDC → usd-coin
 *   EURC → eurc  (Circle Euro Coin)
 *   BTC  → bitcoin
 *   ETH  → ethereum
 *   SOL  → solana
 *   ... any CoinGecko coin ID works
 */

export interface TokenPrice {
  usd:       number   // price in USD
  change24h: number   // 24h % change
}

export interface MarketData {
  prices:    Record<string, TokenPrice>   // keyed by CoinGecko coin ID
  fetchedAt: number
}

// Symbol → CoinGecko coin ID mapping for common tokens
export const SYMBOL_TO_ID: Record<string, string> = {
  USDC:  'usd-coin',
  EURC:  'eurc',
  USYC:  'usd-coin',    // USYC ≈ $1, not reliably listed — fallback to USDC price
  BTC:   'bitcoin',
  ETH:   'ethereum',
  SOL:   'solana',
  BNB:   'binancecoin',
  ARB:   'arbitrum',
  OP:    'optimism',
  MATIC: 'matic-network',
  AVAX:  'avalanche-2',
  USDT:  'tether',
  DAI:   'dai',
  LINK:  'chainlink',
  UNI:   'uniswap',
}

// In-memory cache — shared across requests on the same serverless instance
const _cache = new Map<string, { price: TokenPrice; at: number }>()
const CACHE_TTL_MS = 60_000   // 60 seconds

/**
 * Fetch USD price for one or more tokens.
 * Accepts either a symbol ("BTC") or a CoinGecko coin ID ("bitcoin").
 * Returns a map of { coinId → TokenPrice }.
 */
export async function fetchPrices(
  tokens: string[],
): Promise<Record<string, TokenPrice>> {
  // Resolve symbols → coin IDs, deduplicate
  const ids = Array.from(new Set(
    tokens.map(t => SYMBOL_TO_ID[t.toUpperCase()] ?? t.toLowerCase())
  ))

  // Split into cached vs needs-fetch
  const result: Record<string, TokenPrice> = {}
  const toFetch: string[] = []

  for (const id of ids) {
    const cached = _cache.get(id)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      result[id] = cached.price
    } else {
      toFetch.push(id)
    }
  }

  if (toFetch.length > 0) {
    const url =
      `https://api.coingecko.com/api/v3/simple/price` +
      `?ids=${toFetch.join(',')}` +
      `&vs_currencies=usd` +
      `&include_24hr_change=true`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal:  AbortSignal.timeout(5_000),
    })

    if (!res.ok) throw new Error(`CoinGecko returned HTTP ${res.status}`)

    const raw = await res.json() as Record<string, { usd?: number; usd_24h_change?: number }>

    for (const id of toFetch) {
      const entry = raw[id]
      const price: TokenPrice = {
        usd:       entry?.usd           ?? 0,
        change24h: entry?.usd_24h_change ?? 0,
      }
      result[id] = price
      _cache.set(id, { price, at: Date.now() })
    }
  }

  return result
}

/**
 * Get the exchange rate from tokenIn to tokenOut.
 * Accepts symbols or CoinGecko IDs.
 * e.g. getExchangeRate('USDC', 'EURC') → 0.923
 */
export async function getExchangeRate(
  tokenIn:  string,
  tokenOut: string,
): Promise<{ rate: number; priceIn: TokenPrice; priceOut: TokenPrice }> {
  const prices = await fetchPrices([tokenIn, tokenOut])

  const idIn  = SYMBOL_TO_ID[tokenIn.toUpperCase()]  ?? tokenIn.toLowerCase()
  const idOut = SYMBOL_TO_ID[tokenOut.toUpperCase()] ?? tokenOut.toLowerCase()

  const priceIn  = prices[idIn]  ?? { usd: 1, change24h: 0 }
  const priceOut = prices[idOut] ?? { usd: 1, change24h: 0 }

  const rate = priceOut.usd > 0 ? priceIn.usd / priceOut.usd : 1

  return { rate, priceIn, priceOut }
}

// ── Message formatters ────────────────────────────────────────────────────────

const trend  = (c: number) => c > 0.05 ? ' ↑' : c < -0.05 ? ' ↓' : ''
const sign   = (c: number) => `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`
const dollars = (n: number) =>
  n >= 1000 ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  : n >= 1   ? `$${n.toFixed(2)}`
  :            `$${n.toFixed(6)}`

/**
 * Format a rate message between two tokens for the chat.
 * e.g. formatRateMessage('USDC', 'EURC', 100) →
 *   "📈 USDC → EURC rate
 *    100 USDC ≈ 92.31 EURC
 *    • 1 USDC = $1.0001 (24h: +0.01%)
 *    • 1 EURC = $1.0833 ↑ (24h: +0.28%)
 *    Live via CoinGecko"
 */
export function formatRateMessage(
  tokenIn:  string,
  tokenOut: string,
  amount:   number,
  rate:     number,
  priceIn:  TokenPrice,
  priceOut: TokenPrice,
): string {
  const result = amount * rate
  const symIn  = tokenIn.toUpperCase()
  const symOut = tokenOut.toUpperCase()

  let msg = `📈 **${symIn} → ${symOut}**\n\n`
  msg += `${amount} ${symIn} ≈ **${result.toFixed(4)} ${symOut}**\n\n`
  msg += `• 1 ${symIn}  = ${dollars(priceIn.usd)}${trend(priceIn.change24h)} (24h: ${sign(priceIn.change24h)})\n`
  msg += `• 1 ${symOut} = ${dollars(priceOut.usd)}${trend(priceOut.change24h)} (24h: ${sign(priceOut.change24h)})\n\n`
  msg += `_Live via CoinGecko_`
  return msg
}

/**
 * Format a single token price message.
 * e.g. formatPriceMessage('BTC') →
 *   "💰 Bitcoin (BTC)
 *    $68,420 ↓ (24h: -1.20%)"
 */
export function formatPriceMessage(
  symbol:   string,
  price:    TokenPrice,
): string {
  const sym = symbol.toUpperCase()
  return (
    `💰 **${sym}**\n\n` +
    `${dollars(price.usd)}${trend(price.change24h)}\n` +
    `24h: ${sign(price.change24h)}\n\n` +
    `_Live via CoinGecko_`
  )
}

/** Fallback rates when CoinGecko is unreachable. */
export const FALLBACK_RATE: Record<string, number> = {
  'USDC-EURC': 0.92,
  'EURC-USDC': 1.087,
  'USDC-USYC': 1.00,
  'USYC-USDC': 1.00,
  'EURC-USYC': 0.92,
  'USYC-EURC': 1.087,
}
