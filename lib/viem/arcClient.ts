import { defineChain, createPublicClient, http, fallback } from 'viem'

// Primary + fallback RPC endpoints for Arc Testnet.
// If the primary is down, viem automatically retries on the next one.
const ARC_RPC_PRIMARY    = process.env.NEXT_PUBLIC_ARC_RPC_URL ?? 'https://rpc.testnet.arc.network'
const ARC_RPC_BLOCKDAEMON = 'https://rpc.blockdaemon.testnet.arc.network'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    // Both endpoints listed — Circle App Kit picks the first available one.
    default: { http: [ARC_RPC_PRIMARY, ARC_RPC_BLOCKDAEMON] },
    public:  { http: [ARC_RPC_PRIMARY, ARC_RPC_BLOCKDAEMON] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
})

// Read-only client — for balance checks and onchain reads.
// fallback() tries the primary RPC first, then Blockdaemon if it fails.
export const arcPublicClient = createPublicClient({
  chain: arcTestnet,
  transport: fallback([
    http(ARC_RPC_PRIMARY),
    http(ARC_RPC_BLOCKDAEMON),
  ]),
})

// Standard ERC-20 ABI (minimal — only what we need)
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const
