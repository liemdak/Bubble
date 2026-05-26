/**
 * Read token balances directly from Arc Testnet blockchain.
 * Uses viem to call balanceOf() on ERC-20 contracts.
 * This reads the user's actual connected wallet — NOT Circle dev-controlled wallets.
 */
import { arcPublicClient, ERC20_ABI } from './arcClient'

// Arc Testnet contract addresses (from https://docs.arc.io/arc/references/contract-addresses)
export const TOKEN_CONTRACTS = {
  USDC: '0x3600000000000000000000000000000000000000' as `0x${string}`,
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`,
  USYC: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C' as `0x${string}`,
} as const

export interface OnchainBalance {
  token: string
  amount: string      // human-readable, e.g. "420.50"
  raw: string         // raw bigint as string
  chain: 'arc'
  contractAddress: string
}

/**
 * Read all token balances for a wallet address on Arc Testnet.
 */
export async function readWalletBalances(address: string): Promise<OnchainBalance[]> {
  const addr = address as `0x${string}`

  const results = await Promise.allSettled([
    arcPublicClient.readContract({
      address: TOKEN_CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    }),
    arcPublicClient.readContract({
      address: TOKEN_CONTRACTS.EURC,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    }),
    arcPublicClient.readContract({
      address: TOKEN_CONTRACTS.USYC,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    }),
  ])

  const tokens = ['USDC', 'EURC', 'USYC'] as const
  const contracts = [TOKEN_CONTRACTS.USDC, TOKEN_CONTRACTS.EURC, TOKEN_CONTRACTS.USYC]
  const balances: OnchainBalance[] = []

  for (let i = 0; i < tokens.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      const raw = result.value as bigint
      // All three tokens use 6 decimals on Arc
      const amount = (Number(raw) / 1_000_000).toFixed(2)
      balances.push({
        token: tokens[i],
        amount,
        raw: raw.toString(),
        chain: 'arc',
        contractAddress: contracts[i],
      })
    }
  }

  return balances
}

/**
 * Format balances for display.
 */
export function formatBalanceMessage(balances: OnchainBalance[], address: string): string {
  const nonZero = balances.filter(b => parseFloat(b.amount) > 0)

  if (balances.length === 0) {
    return '💰 Could not read balance from Arc Testnet. Check your connection.'
  }

  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`

  if (nonZero.length === 0) {
    return `💰 Your Circle wallet is empty on Arc Testnet.\n\nTo fund it:\n1. Go to faucet.circle.com\n2. Select Arc Testnet\n3. Paste your Circle wallet address: ${shortAddr}\n\nYou can also find this address in the ⚙️ Settings tab.`
  }

  const lines = nonZero.map(b => `• ${b.token}: ${b.amount}`)
  const total = balances
    .reduce((sum, b) => sum + parseFloat(b.amount), 0)
    .toFixed(2)

  return `💰 Circle wallet balance (Arc Testnet):\n${lines.join('\n')}\n\n≈ $${total} total\nWallet: ${shortAddr}`
}
