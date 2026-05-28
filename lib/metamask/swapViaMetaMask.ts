/**
 * Swap tokens from the user's MetaMask wallet via Circle App Kit.
 * Client-side only — tokens stay in user's main (MetaMask) wallet.
 * Pattern mirrors bridgeViaMetaMask.ts.
 *
 * Why we pre-approve USDC/EURC → Permit2 before calling kit.swap():
 * Arc docs: "Before executing FX trades, StableFX must be able to transfer
 * USDC from your wallet. Grant a USDC allowance to the Permit2 contract."
 * kit.swap() simulates the transaction with eth_call before asking MetaMask
 * to sign. The default "permit" strategy embeds an EIP-712 off-chain
 * signature into the calldata, but the simulation runs with a placeholder
 * signature that Permit2 rejects → "Simulation failed / Transaction reverted".
 * By pre-approving on-chain (approve(Permit2, maxUint256)), the simulation
 * sees a real allowance in state and succeeds. We then pass
 * allowanceStrategy: "approve" so the SDK uses the existing approval.
 */

// Arc Testnet contract addresses
const PERMIT2_ADDR = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
}

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

/** Poll until the transaction is mined (up to timeoutMs). Throws on failure or timeout. */
async function waitForReceipt(
  provider: EthProvider,
  txHash: string,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 700))
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }) as { status: string } | null
    if (receipt?.status === '0x1') return
    if (receipt?.status === '0x0') {
      throw new Error('USDC approval transaction failed on-chain. Please try again.')
    }
  }
  throw new Error('USDC approval transaction timed out. Please try again.')
}

/**
 * Ensure Permit2 has a sufficient USDC or EURC allowance from userAddress.
 * Arc docs require this one-time approval before StableFX/FxEscrow can execute swaps.
 * If the allowance is already ≥ amountInRaw, this is a no-op.
 * On first swap: MetaMask will show an "Approve" popup — this is expected.
 */
async function ensurePermit2Allowance(
  provider: EthProvider,
  tokenIn: string,
  amountIn: string,
  userAddress: string,
): Promise<void> {
  const tokenAddr = TOKEN_CONTRACTS[tokenIn.toUpperCase()]
  if (!tokenAddr) return   // unknown token — let kit.swap handle it

  // allowance(owner, spender) — ABI selector 0xdd62ed3e
  const allowanceData =
    '0xdd62ed3e' +
    userAddress.replace('0x', '').padStart(64, '0') +
    PERMIT2_ADDR.replace('0x', '').padStart(64, '0')

  const rawResult = await provider.request({
    method: 'eth_call',
    params: [{ to: tokenAddr, data: allowanceData }, 'latest'],
  }) as string

  const currentAllowance = rawResult && rawResult !== '0x' ? BigInt(rawResult) : 0n
  // USDC/EURC use 6 decimals; amountIn is human-readable (e.g. "1.00")
  const amountInRaw = BigInt(Math.round(parseFloat(amountIn) * 1_000_000))

  if (currentAllowance >= amountInRaw) return   // already approved — skip

  // approve(spender, uint256 max) — ABI selector 0x095ea7b3
  const approveData =
    '0x095ea7b3' +
    PERMIT2_ADDR.replace('0x', '').padStart(64, '0') +
    'f'.repeat(64) // uint256 max

  let approveTxHash: string
  try {
    approveTxHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: userAddress, to: tokenAddr, data: approveData }],
    }) as string
  } catch (err: unknown) {
    const msg = extractMsg(err)
    if (isUserRejection(msg)) {
      throw new Error(
        `${tokenIn} approval cancelled. ` +
        `A one-time approval is required before your first swap so that StableFX can access your ${tokenIn}. ` +
        `Please try again and approve the permission in MetaMask.`
      )
    }
    throw new Error(`${tokenIn} approval failed: ${msg}`)
  }

  // Wait for the approval to be mined before proceeding (~0.5s on Arc Testnet)
  await waitForReceipt(provider, approveTxHash)
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
 * On the first swap, MetaMask may show an extra "Approve" popup for Permit2 — this is normal.
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

  if (!kitKey.startsWith('KIT_KEY:')) {
    throw new Error(
      `Invalid kit key format. Expected "KIT_KEY:…" but got "${kitKey.slice(0, 20)}…". ` +
      `Check CIRCLE_KIT_KEY in your Vercel environment variables — ` +
      `copy the full key from Circle Console including the "KIT_KEY:" prefix.`
    )
  }

  // 6. Ensure Permit2 has a sufficient allowance for tokenIn.
  //    Arc docs: "Before executing FX trades, grant USDC allowance to the Permit2 contract."
  //    This is a one-time approval (~0.001 USDC gas). Subsequent swaps skip this step.
  //    We do this BEFORE the window.fetch proxy so it's unaffected by the proxy.
  await ensurePermit2Allowance(provider, tokenIn, amountIn, userAddress)

  // 7. Proxy window.fetch so that kit.swap() calls to api.circle.com are routed
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

  // 8. Execute swap.
  //    allowanceStrategy: "approve" — uses the on-chain Permit2 approval we set in step 6.
  //    This ensures the simulation (eth_call) sees a real allowance in state and passes,
  //    instead of failing on an unsigned placeholder permit.
  try {
    const kit = new AppKit()
    const result = await kit.swap({
      from:     { adapter, chain: 'Arc_Testnet' },
      tokenIn:  tokenIn  as 'USDC' | 'EURC',
      tokenOut: tokenOut as 'USDC' | 'EURC',
      amountIn,
      config:   { kitKey, allowanceStrategy: 'approve' },
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
        : msg.toLowerCase().includes('simulation failed') || msg.toLowerCase().includes('transaction reverted')
        ? `Swap failed: simulation reverted on Arc Testnet. Try a smaller amount (leave a little USDC for gas), or try again in a moment if the liquidity pool is busy.`
        : `Swap failed: ${msg}`
    )
  } finally {
    // Always restore the original fetch regardless of success or failure
    window.fetch = origFetch
  }
}
