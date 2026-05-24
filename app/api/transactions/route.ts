import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getRedis, KEYS } from '@/lib/redis/client'
import type { TxRecord } from '@/types/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/transactions
 * Returns the last 50 transactions for the logged-in user.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const redis = getRedis()
    // lrange returns newest first (we lpush, so index 0 = latest)
    const raw = await redis.lrange<TxRecord>(KEYS.txHistory(session.address), 0, 49)

    return NextResponse.json({ transactions: raw ?? [] })
  } catch (err) {
    console.error('[GET /api/transactions]', err)
    if (err instanceof Error && err.message.includes('UPSTASH_REDIS')) {
      return NextResponse.json({ transactions: [], _info: 'Redis not configured yet' })
    }
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
