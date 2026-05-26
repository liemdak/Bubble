/**
 * Rate limiting for /api/execute — SERVER-SIDE ONLY.
 *
 * Fixed sliding window: max 10 transactions per user per hour.
 * State stored in Firestore collection `rateLimits/{userAddress}`.
 *
 * Fails open: if Firestore is unavailable, the request is allowed
 * (tx failure is better than blocking a legitimate user).
 */
import { getDb } from './admin'

const MAX_TX_PER_HOUR = 10
const WINDOW_MS       = 60 * 60 * 1000   // 1 hour in ms

interface RateLimitDoc {
  count:       number
  windowStart: number   // epoch ms when this window opened
}

interface RateLimitResult {
  allowed:   boolean
  remaining: number   // requests left in this window (after this one)
  resetAt:   number   // epoch ms when the window resets
}

/**
 * Check the rate limit for a user and, if allowed, increment the counter.
 * Call this once per execute request — it reads + writes in one go.
 */
export async function checkAndIncrementRateLimit(
  userAddress: string,
): Promise<RateLimitResult> {
  try {
    const db  = getDb()
    const key = userAddress.toLowerCase()
    const ref = db.collection('rateLimits').doc(key)

    const now = Date.now()

    const snap = await ref.get()
    const data = snap.data() as RateLimitDoc | undefined

    let count:       number = 1
    let windowStart: number = now

    if (data) {
      const inWindow = (now - data.windowStart) < WINDOW_MS
      if (inWindow) {
        // Still inside the existing window — increment
        count       = (data.count ?? 0) + 1
        windowStart = data.windowStart
      }
      // else: window expired — start fresh (count = 1, windowStart = now)
    }

    const allowed = count <= MAX_TX_PER_HOUR

    if (allowed) {
      // Only write on allowed requests to avoid Firestore writes on blocked ones
      await ref.set({ count, windowStart } satisfies RateLimitDoc)
    }

    return {
      allowed,
      remaining: Math.max(0, MAX_TX_PER_HOUR - count),
      resetAt:   windowStart + WINDOW_MS,
    }
  } catch (err) {
    // Firestore unavailable — fail open (don't block real transactions)
    console.warn('[rateLimit] Firestore error, allowing request:', err)
    return { allowed: true, remaining: 9, resetAt: Date.now() + WINDOW_MS }
  }
}
