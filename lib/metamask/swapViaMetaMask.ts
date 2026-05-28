/**
 * Swap tokens from the user's MetaMask wallet via Circle App Kit.
 * Client-side only — tokens stay in user's main (MetaMask) wallet.
 * Pattern mirrors bridgeViaMetaMask.ts.
 */

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

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

async function switchToArc(provider: EthProvider) {
  const ARC_CHAIN_ID = '0x4CEF52' // 5042002

  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (!accounts?.length) await provider.request({ method: 'eth_requestAccounts' })
  } catch { /* already connected */ }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_CHAIN_ID }],
    })
    return
  } catch { /* chain not added yet */ }

  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: ARC_CHAIN_ID,
        chainName: 'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: [
          'https://rpc.testnet.arc.network',
          'https://rpc.blockdaemon.testnet.arc.network',
        ],
        blockExplorerUrls: ['https://testnet.arcscan.app'],
      }],
    })
  } catch (err: unknown) {
    const msg = extractMsg(err)
    throw new Error(
      isUserRejection(msg)
        ? 'Please approve adding Arc Testnet in your wallet to continue.'
        : `Could not switch to Arc Testnet: ${msg}`
    )
  }
}

export interface SwapResult {
  txHash: string
  message: string
  arcScanUrl?: string
}

/**
 * Swap tokens using the user's MetaMask wallet on Arc Testnet.
 * MetaMask will prompt to approve and sign the swap transaction.
 *
 * @param tokenIn  - Input token symbol (e.g. 'USDC')
 * @param tokenOut - Output token symbol (e.g. 'EURC')
 * @param amountIn - Human-readable amount (e.g. '1.00')
 * @param userAddress - The user's MetaMask wallet address
 */
export async function swapViaMetaMask(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  userAddress: string,
): Promise<SwapResult> {
  // 1. Find the exact provider for this address
  const provider = await getProviderForAddress(userAddress)

  // 2. Switch to Arc Testnet (swap only supported on Arc Testnet)
  await switchToArc(provider)

  // 3. Import Circle SDK (lazy — avoids SSR issues)
  const [{ createViemAdapterFromProvider }, { AppKit }] = await Promise.all([
    import('@circle-fin/adapter-viem-v2'),
    import('@circle-fin/app-kit'),
  ])

  // 4. Create viem adapter from the user's MetaMask provider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = await createViemAdapterFromProvider({ provider: provider as any })

  // 5. Fetch kitKey from server (reuses CIRCLE_KIT_KEY — no new env var needed)
  let kitKey = ''
  try {
    const cfgRes = await fetch('/api/config')
    if (cfgRes.ok) {
      const cfg = await cfgRes.json() as { kitKey?: string }
      kitKey = cfg.kitKey ?? ''
    }
  } catch { /* proceed without kitKey if fetch fails */ }

  if (!kitKey) {
    throw new Error(
      'Kit key not configured. Please set CIRCLE_KIT_KEY in your environment variables.'
    )
  }

  // 6. Proxy window.fetch so that kit.swap() calls to api.circle.com are routed
  //    through the Next.js rewrite at /api/circle-proxy instead of hitting the
  //    Circle origin directly (which the browser blocks with a CORS error).
  const origFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url.startsWith('https://api.circle.com')) {
      const proxied = url.replace('https://api.circle.com', '/api/circle-proxy')
      return origFetch(proxied, init)
    }
    return origFetch(input, init)
  }

  // 7. Execute swap — MetaMask will prompt for Permit2 approval then the swap itself.
  //
  // Why allowanceStrategy: 'approve' (not the default 'permit'):
  //   Arc Testnet's native USDC (0x3600...) does NOT support EIP-2612 permit signatures.
  //   The default "permit with fallback to approve" strategy tries the permit path first,
  //   fails silently, then simulates the swap WITHOUT having submitted an approve tx yet —
  //   the simulation reverts because the Permit2 allowance isn't set.
  //   Forcing 'approve' makes the SDK submit the approve tx first (MetaMask prompts once),
  //   wait for it to confirm, then simulate and execute the swap successfully.
  try {
    const kit = new AppKit()
    const result = await kit.swap({
      from:     { adapter, chain: 'Arc_Testnet' },
      tokenIn:  tokenIn  as 'USDC' | 'EURC',
      tokenOut: tokenOut as 'USDC' | 'EURC',
      amountIn,
      config: {
        ...(kitKey ? { kitKey } : {}),
        allowanceStrategy: 'approve' as 'approve',
        slippageBps: 100,
      },
    })

    const arcScanUrl = result.txHash
      ? `https://testnet.arcscan.app/tx/${result.txHash}`
      : result.explorerUrl

    return {
      txHash:    result.txHash ?? '',
      message:   `Swapped ${amountIn} ${tokenIn} → ${result.amountOut ?? '?'} ${tokenOut}`,
      arcScanUrl,
    }
  } catch (err: unknown) {
    const msg = extractMsg(err)
    throw new Error(
      isUserRejection(msg)
        ? 'Swap cancelled.'
        : msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')
        ? `Insufficient ${tokenIn} in your wallet. Check your balance and try again.`
        : `Swap failed: ${msg}`
    )
  } finally {
    // Always restore the original fetch regardless of success or failure
    window.fetch = origFetch
  }
}
