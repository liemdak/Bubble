/**
 * In-memory nonce store for wallet auth.
 * Key: lowercase address, Value: { nonce, expiresAt }
 * Fine for single-server beta — swap for Redis in production.
 */
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>()

export function createNonce(address: string): string {
  const key = address.toLowerCase()
  const now = Date.now()

  // Prune expired nonces
  nonceStore.forEach((v, k) => {
    if (v.expiresAt < now) nonceStore.delete(k)
  })

  const nonce = crypto.randomUUID().replace(/-/g, '')
  nonceStore.set(key, { nonce, expiresAt: now + 5 * 60 * 1000 })
  return nonce
}

/** Consume a nonce — one-time use. Returns the nonce if valid, null otherwise. */
export function consumeNonce(address: string): string | null {
  const key = address.toLowerCase()
  const entry = nonceStore.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    nonceStore.delete(key)
    return null
  }
  nonceStore.delete(key)
  return entry.nonce
}

/** The exact message the wallet signs — must match client-side exactly */
export function buildSignMessage(address: string, nonce: string): string {
  return `Welcome to Bubble 🫧\n\nSign this message to connect your wallet. This does not cost any gas.\n\nWallet: ${address}\nNonce: ${nonce}`
}
