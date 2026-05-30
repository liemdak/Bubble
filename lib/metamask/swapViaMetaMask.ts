/**
 * Swap tokens from the user's MetaMask wallet via Circle App Kit.
 * Client-side only — tokens stay in user's main (MetaMask) wallet.
 * Pattern mirrors bridgeViaMetaMask.ts.
 *
 * Why we need TWO Permit2 approvals before calling kit.swap():
 *
 * Arc docs: "Before executing FX trades, StableFX must be able to transfer
 * USDC from your wallet. Grant a USDC allowance to the Permit2 contract."
 *
 * kit.swap() simulates the transaction with eth_call before asking MetaMask
 * to sign. Without on-chain approvals the simulation always reverts.
 *
 * Step 1 — ERC-20.approve(Permit2, maxUint256)
 *   Grants Permit2 the ability to pull USDC/EURC from the user's wallet.
 *   One MetaMask popup, mined on Arc before proceeding.
 *
 * Step 2 — Permit2.approve(token, FxEscrow, maxUint160, maxUint48)
 *   Registers FxEscrow as an authorised spender inside Permit2's internal
 *   AllowanceTransfer store. This is what kit.swap() simulation reads via
 *   Permit2.allowance(user, token, FxEscrow) — if the entry is empty the
 *   simulation sees no allowance and reverts even though step 1 is done.
 *   One MetaMask popup, mined on Arc before proceeding.
 *
 * Both steps are checked on-chain first and skipped if already done, so the
 * user only ever sees each popup once. We then pass
 * allowanceStrategy: "approve" so the SDK uses the existing on-chain approvals.
 */

// Arc Testnet contract addresses
const PERMIT2_ADDR   = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
const FXESCROW_ADDR  = '0x867650F5eAe8df91445971f14d89fd84F0C9a9f8'
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
 * Ensure both Permit2 approvals are in place before kit.swap() simulates.
 *
 * Step 1 — ERC-20.approve(Permit2, maxUint256)
 *   Lets Permit2 pull tokens from the user wallet.
 *   Skipped if ERC-20 allowance ≥ amountInRaw.
 *
 * Step 2 — Permit2.approve(token, FxEscrow, maxUint160, maxUint48)
 *   Registers FxEscrow as an authorised spender inside Permit2's
 *   AllowanceTransfer store. kit.swap() simulation reads this entry; if
 *   it is empty (amount == 0) the simulation reverts even with step 1 done.
 *   Skipped if Permit2's internal allowance(user, token, FxEscrow).amount > 0.
 *
 * On first swap MetaMask shows two "Approve" popups — this is expected.
 * On subsequent swaps both checks pass on-chain and no popup is shown.
 */
async function ensurePermit2Allowance(
  provider: EthProvider,
  tokenIn: string,
  amountIn: string,
  userAddress: string,
): Promise<void> {
  const tokenAddr = TOKEN_CONTRACTS[tokenIn.toUpperCase()]
  if (!tokenAddr) return   // unknown token — let kit.swap handle it

  // ── Step 1: ERC-20.approve(Permit2, maxUint256) ──────────────────────────
  // allowance(owner, spender) — ABI selector 0xdd62ed3e
  const erc20AllowanceData =
    '0xdd62ed3e' +
    userAddress.replace('0x', '').padStart(64, '0') +
    PERMIT2_ADDR.replace('0x', '').padStart(64, '0')

  const erc20RawResult = await provider.request({
    method: 'eth_call',
    params: [{ to: tokenAddr, data: erc20AllowanceData }, 'latest'],
  }) as string

  const erc20Allowance = erc20RawResult && erc20RawResult !== '0x'
    ? BigInt(erc20RawResult)
    : BigInt(0)

  // USDC/EURC use 6 decimals; amountIn is human-readable (e.g. "1.00")
  const amountInRaw = BigInt(Math.round(parseFloat(amountIn) * 1_000_000))

  if (erc20Allowance < amountInRaw) {
    // approve(spender, uint256 max) — ABI selector 0x095ea7b3
    const approveData =
      '0x095ea7b3' +
      PERMIT2_ADDR.replace('0x', '').padStart(64, '0') +
      'f'.repeat(64) // uint256 max

    let step1TxHash: string
    try {
      step1TxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userAddress, to: tokenAddr, data: approveData }],
      }) as string
    } catch (err: unknown) {
      const msg = extractMsg(err)
      if (isUserRejection(msg)) {
        throw new Error(
          `${tokenIn} approval cancelled. ` +
          `A one-time approval is required before your first swap so that Permit2 can access your ${tokenIn}. ` +
          `Please try again and approve the permission in MetaMask.`
        )
      }
      throw new Error(`${tokenIn} approval failed: ${msg}`)
    }

    // Wait for step 1 to mine before checking step 2 (~0.5s on Arc Testnet)
    await waitForReceipt(provider, step1TxHash)
  }

  // ── Step 2: Permit2.approve(token, FxEscrow, maxUint160, maxUint48) ──────
  // Read Permit2's internal AllowanceTransfer record for (user, token, FxEscrow).
  // allowance(address owner, address token, address spender) → (uint160 amount, uint48 expiration, uint48 nonce)
  // ABI selector: keccak256("allowance(address,address,address)")[0:4] = 0x927da105
  const p2AllowanceData =
    '0x927da105' +
    userAddress.replace('0x', '').padStart(64, '0') +
    tokenAddr.replace('0x', '').padStart(64, '0') +
    FXESCROW_ADDR.replace('0x', '').padStart(64, '0')

  const p2RawResult = await provider.request({
    method: 'eth_call',
    params: [{ to: PERMIT2_ADDR, data: p2AllowanceData }, 'latest'],
  }) as string

  // Return data layout: [uint160 amount (32 bytes)][uint48 expiration (32 bytes)][uint48 nonce (32 bytes)]
  // Parse the uint160 amount from the first 32-byte word.
  const p2Amount = p2RawResult && p2RawResult !== '0x' && p2RawResult.length >= 66
    ? BigInt('0x' + p2RawResult.slice(2, 66))
    : BigInt(0)

  if (p2Amount > BigInt(0)) return   // FxEscrow already registered — skip step 2

  // Permit2.approve(address token, address spender, uint160 amount, uint48 expiration)
  // ABI selector: keccak256("approve(address,address,uint160,uint48)")[0:4] = 0x87517c45
  // maxUint160 = 2^160 - 1 = 0xffffffffffffffffffffffffffffffffffffffff (padded to 32 bytes)
  // maxUint48  = 2^48  - 1 = 0xffffffffffff              (padded to 32 bytes)
  const p2ApproveData =
    '0x87517c45' +
    tokenAddr.replace('0x', '').padStart(64, '0') +
    FXESCROW_ADDR.replace('0x', '').padStart(64, '0') +
    '000000000000000000000000ffffffffffffffffffffffffffffffffffffffff' +
    '0000000000000000000000000000000000000000000000000000ffffffffffff'

  let step2TxHash: string
  try {
    step2TxHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: userAddress, to: PERMIT2_ADDR, data: p2ApproveData }],
    }) as string
  } catch (err: unknown) {
    const msg = extractMsg(err)
    if (isUserRejection(msg)) {
      throw new Error(
        `Permit2 authorisation cancelled. ` +
        `This one-time step lets FxEscrow execute the swap on your behalf via Permit2. ` +
        `Please try again and approve in MetaMask.`
      )
    }
    throw new Error(`Permit2 authorisation failed: ${msg}`)
  }

  // Wait for step 2 to mine so the simulation sees the allowance entry (~0.5s)
  await waitForReceipt(provider, step2TxHash)
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

  // 6. Ensure both Permit2 approvals are in place.
  //    Step 1: ERC-20.approve(Permit2, maxUint256)   — one-time per token
  //    Step 2: Permit2.approve(token, FxEscrow, max) — one-time per token
  //    Both are checked on-chain first; MetaMask only shows a popup when
  //    the approval is actually needed (typically only on the very first swap).
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

  // 8. Execute swap — let the Circle SDK handle permit2 signing internally.
  try {
    const kit = new AppKit()
    const result = await kit.swap({
      from:     { adapter, chain: 'Arc_Testnet' },
      tokenIn:  tokenIn  as 'USDC' | 'EURC',
      tokenOut: tokenOut as 'USDC' | 'EURC',
      amountIn,
      config:   { kitKey },
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
