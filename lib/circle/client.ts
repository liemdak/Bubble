/**
 * Circle Developer-Controlled Wallets SDK client.
 * SERVER-SIDE ONLY — never import from client components.
 * Uses lazy singleton so the client is initialised once per process.
 */
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

type CircleClient = ReturnType<typeof initiateDeveloperControlledWalletsClient>

let _client: CircleClient | null = null

export function getCircleClient(): CircleClient {
  if (!_client) {
    const apiKey = process.env.CIRCLE_API_KEY
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET

    if (!apiKey || !entitySecret) {
      throw new Error('CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set in .env.local')
    }

    _client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret })
  }
  return _client
}

// ── Blockchain identifiers ─────────────────────────────────────────────────
export const BLOCKCHAINS = {
  arc:      'ARC-TESTNET',
  ethereum: 'ETH-SEPOLIA',
  base:     'BASE-SEPOLIA',
  solana:   'SOL-DEVNET',
} as const

export type SupportedChain = keyof typeof BLOCKCHAINS

// ── Token symbols ──────────────────────────────────────────────────────────
export const TOKEN_SYMBOLS = ['USDC', 'EURC', 'USYC'] as const
export type TokenSymbol = typeof TOKEN_SYMBOLS[number]
