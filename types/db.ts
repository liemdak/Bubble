/**
 * Database types — stored in Firebase Firestore.
 */

export interface Contact {
  id: string           // nanoid
  name: string         // "Mike", "Sarah"
  address: string      // 0x...
  chain: string        // 'arc' | 'ethereum' | ...
  note?: string        // optional label
  createdAt: number    // unix ms
}

export interface TxRecord {
  id: string                                    // nanoid
  type: 'send' | 'swap' | 'bridge'
  status: 'complete' | 'pending' | 'failed'

  // Send fields
  toAddress?: string
  toName?: string

  // Swap fields
  tokenIn?: string
  tokenOut?: string
  amountIn?: string
  amountOut?: string

  // Bridge fields
  fromChain?: string
  toChain?: string

  // Common
  amount?: string
  token?: string
  txHash?: string
  arcScanUrl?: string
  createdAt: number    // unix ms
}
