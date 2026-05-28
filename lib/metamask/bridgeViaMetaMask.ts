/**
 * Bridge USDC cross-chain via MetaMask + Circle CCTP v2.
 * Client-side only — uses createViemAdapterFromProvider (same pattern as Bento).
 * Only USDC is supported for bridging (CCTP limitation).
 */

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

// ── Shared utilities (mirrors fundAgent.ts) ───────────────────────────────────

function extractMsg(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    if (typeof e.message === 'string' && e.message) return e.message
    if (typeof e.code === 'number') return `Wallet error code ${e.code}`
    try { return JSON.stringify(e) } catch { /* ignore */ }
  }
  return 'Unknown error'
}

function isUserRejection(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    lower.includes('reject') ||
    lower.includes('cancel') ||
    lower.includes('denied') ||
    lower.includes('user refused') ||
    lower.includes('user closed')
  )
}

async function getProviderForAddress(userAddress: string): Promise<EthProvider> {
  type WindowExt = Window & {
    ethereum?: EthProvider & { providers?: EthProvider[] }
  }
  const w = window as unknown as WindowExt
  const candidates: EthProvider[] = []

  await new Promise<void>(resolve => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ provider: EthProvider }>).detail
      if (detail?.provider) candidates.push(detail.provider)
    }
    window.addEventListener('eip6963:announceProvider', handler)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler)
      resolve()
    }, 120)
  })

  if (w.ethereum?.providers?.length) {
    for (const p of w.ethereum.providers) {
      if (!candidates.includes(p)) candidates.push(p)
    }
  } else if (w.ethereum && !candidates.includes(w.ethereum)) {
    candidates.push(w.ethereum)
  }

  const target = userAddress.toLowerCase()
  for (const p of candidates) {
    try {
      const accounts = await p.request({ method: 'eth_accounts' }) as string[]
      if (Array.isArray(accounts) && accounts.some(a => a.toLowerCase() === target)) {
        return p
      }
    } catch { /* provider unresponsive — skip */ }
  }

  if (w.ethereum) return w.ethereum
  throw new Error('Wallet not found. Please make sure your wallet extension is unlocked and connected.')
}

// ── Chain configurations ──────────────────────────────────────────────────────

interface ChainConfig {
  chainId: string
  chainName: string
  rpcUrls: string[]
  explorerUrl: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  arc: {
    chainId: '0x4CEF52', // 5042002
    chainName: 'Arc Testnet',
    rpcUrls: ['https://rpc.testnet.arc.network', 'https://rpc.blockdaemon.testnet.arc.network'],
    explorerUrl: 'https://testnet.arcscan.app',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  },
  ethereum: {
    chainId: '0xAA36A7', // 11155111
    chainName: 'Ethereum Sepolia',
    rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  base: {
    chainId: '0x14A34', // 84532
    chainName: 'Base Sepolia',
    rpcUrls: ['https://sepolia.base.org'],
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum: {
    chainId: '0x66EEE', // 421614
    chainName: 'Arbitrum Sepolia',
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  optimism: {
    chainId: '0xAA37DC', // 11155420
    chainName: 'Optimism Sepolia',
    rpcUrls: ['https://sepolia.optimism.io'],
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
}

async function switchToChain(provider: EthProvider, config: ChainConfig) {
  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (!accounts?.length) await provider.request({ method: 'eth_requestAccounts' })
  } catch { /* already connected */ }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: config.chainId }],
    })
    return
  } catch { /* chain not added — fall through */ }

  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: config.chainId,
        chainName: config.chainName,
        nativeCurrency: config.nativeCurrency,
        rpcUrls: config.rpcUrls,
        blockExplorerUrls: [config.explorerUrl],
      }],
    })
  } catch (err: unknown) {
    const msg = extractMsg(err)
    throw new Error(
      isUserRejection(msg)
        ? `Please approve adding ${config.chainName} in your wallet to continue.`
        : `Could not switch to ${config.chainName}: ${msg}`
    )
  }
}

// ── Main bridge function ──────────────────────────────────────────────────────

export interface BridgeResult {
  txHash: string
  message: string
  arcScanUrl?: string
  explorerUrl?: string
}

export async function bridgeViaMetaMask(
  fromChain: string,
  toChain: string,
  amount: string,
  userAddress: string,
): Promise<BridgeResult> {
  const fromConfig = CHAIN_CONFIGS[fromChain.toLowerCase()]
  if (!fromConfig) throw new Error(`Unsupported source chain: ${fromChain}. Supported: arc, ethereum, base, arbitrum`)

  const toConfig = CHAIN_CONFIGS[toChain.toLowerCase()]
  if (!toConfig) throw new Error(`Unsupported destination chain: ${toChain}. Supported: arc, ethereum, base, arbitrum`)

  if (fromChain.toLowerCase() === toChain.toLowerCase()) {
    throw new Error('Source and destination chains must be different.')
  }

  // 1. Find the user's wallet provider
  const provider = await getProviderForAddress(userAddress)

  // 2. Switch to source chain
  await switchToChain(provider, fromConfig)

  // 3. Import Circle SDK (lazy — avoid SSR issues)
  const [{ createViemAdapterFromProvider }, { AppKit, BridgeChain }] = await Promise.all([
    import('@circle-fin/adapter-viem-v2'),
    import('@circle-fin/app-kit'),
  ])

  // 4. Map chain names → BridgeChain enum
  const BRIDGE_CHAIN_MAP: Record<string, typeof BridgeChain[keyof typeof BridgeChain]> = {
    arc:      BridgeChain.Arc_Testnet,
    ethereum: BridgeChain.Ethereum_Sepolia,
    base:     BridgeChain.Base_Sepolia,
    arbitrum: BridgeChain.Arbitrum_Sepolia,
    optimism: BridgeChain.Optimism_Sepolia,
  }

  const fromBridgeChain = BRIDGE_CHAIN_MAP[fromChain.toLowerCase()]
  const toBridgeChain   = BRIDGE_CHAIN_MAP[toChain.toLowerCase()]

  if (!fromBridgeChain) throw new Error(`Bridge chain not supported: ${fromChain}`)
  if (!toBridgeChain)   throw new Error(`Bridge chain not supported: ${toChain}`)

  // 5. Create viem adapter from MetaMask provider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = createViemAdapterFromProvider({ provider: provider as any })

  // 6. Execute bridge (MetaMask will prompt for approve + burn)
  try {
    const kit = new AppKit()
    const result = await kit.bridge({
      from:   { adapter, chain: fromBridgeChain },
      to:     { adapter, chain: toBridgeChain },
      amount,
      token:  'USDC',
      config: { transferSpeed: 'FAST' },
    })

    // Extract txHash from burn step
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const burnStep = (result.steps as any[])?.find(
      (s) => s.txHash && (s.state === 'success' || s.name === 'burn')
    )
    const txHash = burnStep?.txHash ?? ''

    const explorerBase = fromChain.toLowerCase() === 'arc'
      ? 'https://testnet.arcscan.app'
      : fromConfig.explorerUrl

    return {
      txHash,
      message: `Bridged ${amount} USDC: ${fromChain.toUpperCase()} → ${toChain.toUpperCase()} (~20s)`,
      arcScanUrl: txHash ? `${explorerBase}/tx/${txHash}` : undefined,
      explorerUrl: burnStep?.explorerUrl,
    }
  } catch (err: unknown) {
    const msg = extractMsg(err)
    throw new Error(
      isUserRejection(msg)
        ? 'Bridge cancelled.'
        : msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')
        ? `Insufficient USDC balance on ${fromChain}. Please check your wallet balance.`
        : `Bridge failed: ${msg}`
    )
  }
}
