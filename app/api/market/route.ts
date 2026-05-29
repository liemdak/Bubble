import { NextRequest, NextResponse } from 'next/server'
import { fetchPrices, getExchangeRate, SYMBOL_TO_ID } from '@/lib/market/coingecko'

/**
 * GET /api/market?tokens=USDC,EURC,BTC
 * Returns live USD prices + 24h change for requested tokens.
 * Defaults to USDC,EURC if no tokens param provided.
 */
export async function GET(req: NextRequest) {
  const raw    = req.nextUrl.searchParams.get('tokens') ?? 'USDC,EURC'
  const tokens = raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 10)

  try {
    const prices = await fetchPrices(tokens)

    // Re-key by symbol for easier client consumption
    const bySymbol: Record<string, { usd: number; change24h: number; coinId: string }> = {}
    for (const sym of tokens) {
      const id    = SYMBOL_TO_ID[sym] ?? sym.toLowerCase()
      const price = prices[id]
      if (price) bySymbol[sym] = { ...price, coinId: id }
    }

    return NextResponse.json({ prices: bySymbol, fetchedAt: Date.now() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Market data unavailable'
    console.error('[/api/market]', err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

/**
 * GET /api/market/rate?from=USDC&to=EURC&amount=100
 */
export async function POST(req: NextRequest) {
  try {
    const { from = 'USDC', to = 'EURC', amount = 1 } = await req.json()
    const { rate, priceIn, priceOut } = await getExchangeRate(from, to)
    return NextResponse.json({
      from, to, amount,
      rate,
      result: Number(amount) * rate,
      priceIn,
      priceOut,
      fetchedAt: Date.now(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Rate unavailable'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
