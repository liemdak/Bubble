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
  usd:        number    // price in USD
  change24h:  number    // 24h % change
  marketCap?: number    // market cap in USD
  volume24h?: number    // 24h trading volume in USD
}

export interface MarketData {
  prices:    Record<string, TokenPrice>   // keyed by CoinGecko coin ID
  fetchedAt: number
}

// Symbol → CoinGecko coin ID mapping for common tokens
export const SYMBOL_TO_ID: Record<string, string> = {
  // Stablecoins
  USDC:  'usd-coin',
  EURC:  'eurc',
  USYC:  'usd-coin',
  USDT:  'tether',
  DAI:   'dai',
  PYUSD: 'paypal-usd',
  // Layer 1
  BTC:   'bitcoin',
  ETH:   'ethereum',
  SOL:   'solana',
  BNB:   'binancecoin',
  ADA:   'cardano',
  XRP:   'ripple',
  DOT:   'polkadot',
  AVAX:  'avalanche-2',
  ATOM:  'cosmos',
  SUI:   'sui',
  APT:   'aptos',
  SEI:   'sei-network',
  TIA:   'celestia',
  // Layer 2 / DeFi
  ARB:   'arbitrum',
  OP:    'optimism',
  MATIC: 'matic-network',
  LINK:  'chainlink',
  UNI:   'uniswap',
  INJ:   'injective-protocol',
  PYTH:  'pyth-network',
  // Meme
  DOGE:  'dogecoin',
  SHIB:  'shiba-inu',
  PEPE:  'pepe',
  WIF:   'dogwifcoin',
  BONK:  'bonk',
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
      `&include_24hr_change=true` +
      `&include_market_cap=true` +
      `&include_24hr_vol=true`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal:  AbortSignal.timeout(5_000),
    })

    if (res.status === 429) throw new Error('RATE_LIMITED')
    if (!res.ok) throw new Error(`CoinGecko returned HTTP ${res.status}`)

    const raw = await res.json() as Record<string, {
      usd?: number
      usd_24h_change?: number
      usd_market_cap?: number
      usd_24h_vol?: number
    }>

    for (const id of toFetch) {
      const entry = raw[id]
      const price: TokenPrice = {
        usd:        entry?.usd             ?? 0,
        change24h:  entry?.usd_24h_change  ?? 0,
        marketCap:  entry?.usd_market_cap,
        volume24h:  entry?.usd_24h_vol,
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
/** Format large numbers: $1.35T, $28.5B, $450M */
export function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatPriceMessage(
  symbol:   string,
  price:    TokenPrice,
): string {
  const sym = symbol.toUpperCase()
  let msg = `💰 **${sym}**\n\n`
  msg += `${dollars(price.usd)}${trend(price.change24h)}\n`
  msg += `24h: ${sign(price.change24h)}\n`
  if (price.marketCap) msg += `Mcap: ${fmtBig(price.marketCap)}\n`
  if (price.volume24h) msg += `Vol 24h: ${fmtBig(price.volume24h)}\n`
  msg += `\n_Live via CoinGecko_`
  return msg
}

// ── Price history for charts ──────────────────────────────────────────────────

export interface ChartPoint { t: number; p: number }   // unix-ms timestamp, price

/**
 * Fetch historical prices for a token.
 * Returns ~60 downsampled data points (enough for a sparkline, not too heavy).
 * CoinGecko free: daily data for days > 90, hourly for 1–90 days.
 */
export async function fetchPriceHistory(
  token: string,
  days:  number = 7,
): Promise<{ points: ChartPoint[]; high: number; low: number }> {
  const id  = SYMBOL_TO_ID[token.toUpperCase()] ?? token.toLowerCase()
  const url =
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart` +
    `?vs_currency=usd&days=${days}`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal:  AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`CoinGecko chart returned HTTP ${res.status}`)

  const raw = await res.json() as { prices: [number, number][] }
  const rawPrices = raw.prices

  // Downsample to ~60 points so the chart stays lightweight
  const step   = Math.max(1, Math.floor(rawPrices.length / 60))
  const points: ChartPoint[] = []
  for (let i = 0; i < rawPrices.length; i += step) {
    points.push({ t: rawPrices[i][0], p: rawPrices[i][1] })
  }

  const vals = rawPrices.map(p => p[1])
  return {
    points,
    high: Math.max(...vals),
    low:  Math.min(...vals),
  }
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

// ── Comprehensive coin research ───────────────────────────────────────────────

export interface CoinDetail {
  id:           string
  symbol:       string
  name:         string
  // Market
  price:        number
  change1h:     number
  change24h:    number
  change7d:     number
  change30d:    number
  marketCap:    number
  volume24h:    number
  rank:         number
  circulatingSupply: number
  totalSupply:       number | null
  maxSupply:         number | null
  ath:          number
  athDate:      string
  atl:          number
  atlDate:      string
  // Social (from CoinGecko)
  twitterFollowers: number | null
  redditSubscribers: number | null
  // Description
  description: string
  homepage: string | null
  // Technical — derived from market_chart 14d daily
  rsi14:    number | null
  // Chart data (14d)
  chartPoints: ChartPoint[]
  chartHigh:   number
  chartLow:    number
}

/**
 * Fetch comprehensive coin data for the /research command.
 * Makes 2 CoinGecko requests in parallel (coin detail + 14d market chart).
 */
export async function fetchCoinDetail(token: string): Promise<CoinDetail> {
  const id = SYMBOL_TO_ID[token.toUpperCase()] ?? token.toLowerCase()

  const [detailRes, chartRes] = await Promise.all([
    fetch(
      `https://api.coingecko.com/api/v3/coins/${id}` +
      `?localization=false&tickers=false&market_data=true` +
      `&community_data=true&developer_data=false&sparkline=false`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) }
    ),
    fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=14&interval=daily`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) }
    ),
  ])

  if (!detailRes.ok) throw new Error(`CoinGecko detail HTTP ${detailRes.status}`)
  if (!chartRes.ok)  throw new Error(`CoinGecko chart HTTP ${chartRes.status}`)

  const d     = await detailRes.json()
  const chart = await chartRes.json() as { prices: [number, number][] }

  const md = d.market_data

  // RSI-14 from 14 daily close prices
  const closes = chart.prices.map((p: [number, number]) => p[1])
  let rsi14: number | null = null
  if (closes.length >= 15) {
    const diffs  = closes.slice(1).map((p: number, i: number) => p - closes[i])
    const gains  = diffs.map((x: number) => Math.max(x, 0))
    const losses = diffs.map((x: number) => Math.max(-x, 0))
    const avgGain = gains.slice(0, 14).reduce((a: number, b: number) => a + b, 0) / 14
    const avgLoss = losses.slice(0, 14).reduce((a: number, b: number) => a + b, 0) / 14
    rsi14 = avgLoss === 0 ? 100 : Math.round(100 - 100 / (1 + avgGain / avgLoss))
  }

  // Downsample to ~60 sparkline points
  const step   = Math.max(1, Math.floor(chart.prices.length / 60))
  const points: ChartPoint[] = []
  for (let i = 0; i < chart.prices.length; i += step) {
    points.push({ t: chart.prices[i][0], p: chart.prices[i][1] })
  }
  const vals = chart.prices.map((p: [number, number]) => p[1])

  const rawDesc: string = d.description?.en ?? ''
  const cleanDesc = rawDesc
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n/g, ' ')
    .trim()
  const shortDesc = cleanDesc.split('. ').slice(0, 3).join('. ') + (cleanDesc ? '.' : '')

  return {
    id,
    symbol:   (d.symbol as string).toUpperCase(),
    name:     d.name as string,
    price:    md.current_price?.usd   ?? 0,
    change1h:   md.price_change_percentage_1h_in_currency?.usd  ?? 0,
    change24h:  md.price_change_percentage_24h_in_currency?.usd ?? md.price_change_percentage_24h ?? 0,
    change7d:   md.price_change_percentage_7d_in_currency?.usd  ?? md.price_change_percentage_7d  ?? 0,
    change30d:  md.price_change_percentage_30d_in_currency?.usd ?? md.price_change_percentage_30d ?? 0,
    marketCap:         md.market_cap?.usd             ?? 0,
    volume24h:         md.total_volume?.usd            ?? 0,
    rank:              md.market_cap_rank              ?? 0,
    circulatingSupply: md.circulating_supply           ?? 0,
    totalSupply:       md.total_supply                 ?? null,
    maxSupply:         md.max_supply                   ?? null,
    ath:     md.ath?.usd      ?? 0,
    athDate: md.ath_date?.usd ?? '',
    atl:     md.atl?.usd      ?? 0,
    atlDate: md.atl_date?.usd ?? '',
    twitterFollowers:  d.community_data?.twitter_followers  ?? null,
    redditSubscribers: d.community_data?.reddit_subscribers ?? null,
    description: shortDesc,
    homepage:    d.links?.homepage?.[0] ?? null,
    rsi14,
    chartPoints: points,
    chartHigh:   vals.length ? Math.max(...vals) : 0,
    chartLow:    vals.length ? Math.min(...vals) : 0,
  }
}
