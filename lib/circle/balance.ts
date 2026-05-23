/**
 * Balance helpers — fetches wallet token balances from Circle API.
 * Supports per-chain reads and unified (aggregated) totals.
 * SERVER-SIDE ONLY.
 */
import { getCircleClient } from './client'

export interface TokenBalance {
  token: string        // USDC | EURC | USYC
  amount: string       // human-readable, e.g. "420.50"
  chain: string        // arc | ethereum | base | solana
  blockchain: string   // ARC-TESTNET | ETH-SEPOLIA ...
  updateDate: string
}

export interface WalletInfo {
  walletId: string
  address: string
  blockchain: string
  chain: string
  balances: TokenBalance[]
}

export interface UnifiedBalance {
  wallets: WalletInfo[]
  /** Sum of USDC across all chains */
  totalUsdc: string
  /** Sum of EURC across all chains */
  totalEurc: string
  /** Sum of USYC across all chains */
  totalUsyc: string
  /** Grand total in USDC equivalent */
  totalEquivalent: string
  fetchedAt: string
}

const CHAIN_LABEL: Record<string, string> = {
  'ARC-TESTNET': 'arc',
  'ETH-SEPOLIA':  'ethereum',
  'BASE-SEPOLIA': 'base',
  'SOL-DEVNET':   'solana',
}

/**
 * List all developer-controlled wallets for this entity,
 * then fetch the token balance of each one.
 */
export async function getUnifiedBalance(): Promise<UnifiedBalance> {
  const client = getCircleClient()

  // 1. List all wallets
  const walletsRes = await client.listWallets({ pageSize: 50 })
  const rawWallets = walletsRes.data?.wallets ?? []

  if (rawWallets.length === 0) {
    return emptyUnified()
  }

  // 2. Fetch balances for each wallet in parallel
  const walletInfos = await Promise.all(
    rawWallets.map(async (w): Promise<WalletInfo> => {
      const balRes = await client.getWalletTokenBalance({ id: w.id ?? '' })
      const raw = balRes.data?.tokenBalances ?? []

      const balances: TokenBalance[] = raw.map((b) => ({
        token:      b.token?.symbol ?? '?',
        amount:     b.amount ?? '0',
        chain:      CHAIN_LABEL[b.token?.blockchain ?? ''] ?? b.token?.blockchain ?? '?',
        blockchain: b.token?.blockchain ?? '?',
        updateDate: b.updateDate ?? new Date().toISOString(),
      }))

      return {
        walletId:   w.id ?? '',
        address:    w.address ?? '',
        blockchain: w.blockchain ?? '',
        chain:      CHAIN_LABEL[w.blockchain ?? ''] ?? w.blockchain ?? '?',
        balances,
      }
    })
  )

  // 3. Aggregate totals
  let totalUsdc = 0
  let totalEurc = 0
  let totalUsyc = 0

  for (const wallet of walletInfos) {
    for (const b of wallet.balances) {
      const n = parseFloat(b.amount) || 0
      if (b.token === 'USDC') totalUsdc += n
      if (b.token === 'EURC') totalEurc += n
      if (b.token === 'USYC') totalUsyc += n
    }
  }

  // EURC ≈ 1.08 USD, USYC ≈ 1.00 USD for rough equivalent
  const totalEquivalent = totalUsdc + totalEurc * 1.08 + totalUsyc

  return {
    wallets: walletInfos,
    totalUsdc: totalUsdc.toFixed(2),
    totalEurc: totalEurc.toFixed(2),
    totalUsyc: totalUsyc.toFixed(2),
    totalEquivalent: totalEquivalent.toFixed(2),
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Get balance for a single wallet by ID.
 */
export async function getSingleWalletBalance(walletId: string): Promise<TokenBalance[]> {
  const client = getCircleClient()
  const res = await client.getWalletTokenBalance({ id: walletId })
  const raw = res.data?.tokenBalances ?? []

  return raw.map((b) => ({
    token:      b.token?.symbol ?? '?',
    amount:     b.amount ?? '0',
    chain:      CHAIN_LABEL[b.token?.blockchain ?? ''] ?? '?',
    blockchain: b.token?.blockchain ?? '?',
    updateDate: b.updateDate ?? new Date().toISOString(),
  }))
}

function emptyUnified(): UnifiedBalance {
  return {
    wallets: [],
    totalUsdc: '0.00',
    totalEurc: '0.00',
    totalUsyc: '0.00',
    totalEquivalent: '0.00',
    fetchedAt: new Date().toISOString(),
  }
}
