/**
 * Upstash Redis client — server-side only.
 * Free tier: 10,000 requests/day, unlimited data.
 *
 * Setup: https://console.upstash.com → Create Database → REST API tab
 * Add to .env.local:
 *   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=xxx
 */
import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (_redis) return _redis

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set.\n' +
      'Get them free at: https://console.upstash.com'
    )
  }

  _redis = new Redis({ url, token })
  return _redis
}

// ── Key helpers ───────────────────────────────────────────────────────────────

/** Normalize address to lowercase for consistent key lookups */
const addr = (address: string) => address.toLowerCase()

export const KEYS = {
  contacts:  (address: string) => `user:${addr(address)}:contacts`,
  txHistory: (address: string) => `user:${addr(address)}:txHistory`,
}
