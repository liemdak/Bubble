'use client'

import { useEffect } from 'react'

/**
 * Listens for webpack ChunkLoadError and hard-reloads the page once.
 * This happens when Vercel deploys a new version and the browser still
 * holds an old HTML page referencing old chunk hashes that no longer exist.
 */
export function ChunkErrorRecovery() {
  useEffect(() => {
    const RELOAD_KEY = 'bubble:chunk_reload'

    function handleError(event: ErrorEvent) {
      const msg = event.message ?? ''
      if (
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed')
      ) {
        // Guard: reload at most once per minute to avoid infinite loop
        const lastReload = parseInt(sessionStorage.getItem(RELOAD_KEY) ?? '0', 10)
        if (Date.now() - lastReload > 60_000) {
          sessionStorage.setItem(RELOAD_KEY, Date.now().toString())
          window.location.reload()
        }
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  return null
}
