/**
 * Transaction history helpers — SERVER-SIDE ONLY.
 * Writes/reads TxRecords from Upstash Redis.
 */
import { getRedis, KEYS } from './client'
import type { TxRecord } from '@/types/db'

/**
 * Append a transaction to the user's history.
 * Keeps only the last 50 entries (lpush + ltrim).
 * Silently ignores errors so a Redis outage never blocks a real tx.
 */
export async function recordTx(
  userAddress: string,
  tx: Omit<TxRecord, 'id' | 'createdAt'>,
): Promise<void> {
  try {
    const redis = getRedis()
    const record: TxRecord = {
      ...tx,
      id:        crypto.randomUUID(),
      createdAt: Date.now(),
    }
    const key = KEYS.txHistory(userAddress)
    await redis.lpush(key, record)
    await redis.ltrim(key, 0, 49) // keep latest 50
  } catch (err) {
    // Non-blocking — log but don't throw
    console.warn('[recordTx] Could not write tx history:', err)
  }
}
