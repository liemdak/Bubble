/**
 * Send ERC-20 tokens from the user's connected wallet to the Circle agent wallet.
 *
 * KEY FIX: Uses EIP-6963 multi-wallet discovery to find the EXACT provider
 * that has the user's address — avoids opening Phantom when the user
 * connected with OKX (or any other wallet conflict scenario).
 */

const ARC_CHAIN_ID = '0x4CEF52' // 5042002

const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  USYC: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
}

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

/** MetaMask / OKX throw plain objects, not Error instances — extract safely */
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

/**
 * Find the wallet provider that holds `userAddress` in its accounts.
 *
 * Strategy (in order):
 *  1. EIP-6963 requestProvider → collects all injected wallets
 *  2. window.ethereum.providers[] (MetaMask coexistence array)
 *  3. window.ethereum (single-wallet fallback)
 *
 * Then picks the provider whose eth_accounts contains the user's address.
 * This ensures OKX opens for an OKX-connected user, even if Phantom is also installed.
 */
async function getProviderForAddress(userAddress: string): Promise<EthProvider> {
  type WindowExt = Window & {
    ethereum?: EthProvider & { providers?: EthProvider[] }
  }
  const w = window as unknown as WindowExt
  const candidates: EthProvider[] = []

  // ── 1. EIP-6963 discovery (modern standard, works for OKX / Coinbase / Rabby) ──
  await new Promise<void>(resolve => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ provider: EthProvider }>).detail
      if (detail?.provider) candidates.push(detail.provider)
    }
    window.addEventListener('eip6963:announceProvider', handler)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    // Give all extensions ~120ms to respond
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler)
      resolve()
    }, 120)
  })

  // ── 2. Legacy window.ethereum.providers[] (MetaMask + another wallet coexistence) ──
  if (w.ethereum?.providers?.length) {
    for (const p of w.ethereum.providers) {
      if (!candidates.includes(p)) candidates.push(p)
    }
  } else if (w.ethereum && !candidates.includes(w.ethereum)) {
    candidates.push(w.ethereum)
  }

  // ── 3. Match by address ────────────────────────────────────────────────────────
  const target = userAddress.toLowerCase()
  for (const p of candidates) {
    try {
      const accounts = await p.request({ method: 'eth_accounts' }) as string[]
      if (Array.isArray(accounts) && accounts.some(a => a.toLowerCase() === target)) {
        return p // ✓ this is the wallet the user actually connected with
      }
    } catch { /* provider unresponsive — skip */ }
  }

  // ── 4. Fallback (best effort) ──────────────────────────────────────────────────
  if (w.ethereum) return w.ethereum
  throw new Error(
    'Wallet not found. Please make sure your wallet extension is unlocked and connected.'
  )
}

async function switchToArc(provider: EthProvider) {
  // Ensure wallet has an active connection before chain operations
  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (!accounts?.length) {
      await provider.request({ method: 'eth_requestAccounts' })
    }
  } catch { /* already connected */ }

  // Fast path: try switching to Arc Testnet
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_CHAIN_ID }],
    })
    return
  } catch {
    // Chain not added yet — fall through to add
  }

  // Add Arc Testnet
  // NOTE: wallet_addEthereumChain API enforces decimals=18 for all EVM chains.
  // Arc uses USDC (6 decimals) on-chain, but 18 is required here for the API call.
  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId:        ARC_CHAIN_ID,
        chainName:      'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: [
          'https://rpc.testnet.arc.network',
          'https://rpc.blockdaemon.testnet.arc.network',
          'https://rpc.drpc.testnet.arc.network',
        ],
        blockExplorerUrls: ['https://testnet.arcscan.app'],
      }],
    })
  } catch (addErr: unknown) {
    const msg = extractMsg(addErr)
    throw new Error(
      isUserRejection(msg)
        ? 'Please approve adding Arc Testnet in your wallet to continue.'
        : `Could not add Arc Testnet: ${msg}. Add manually: Chain ID 5042002, RPC https://rpc.testnet.arc.network`
    )
  }
}

/**
 * Transfer ERC-20 token from the user's connected wallet to the agent wallet.
 *
 * @returns txHash on success
 * @throws descriptive Error on failure
 */
export async function fundAgentViaMetaMask(
  agentAddress: string,
  userAddress:  string,
  amount:       string,
  token:        'USDC' | 'EURC' | 'USYC',
): Promise<string> {
  // 1. Find the EXACT provider for this user's address (OKX / MetaMask / etc.)
  const provider = await getProviderForAddress(userAddress)

  // 2. Switch / add Arc Testnet on that provider
  await switchToArc(provider)

  // 3. Re-confirm the active account
  let from = userAddress
  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (accounts?.[0]) from = accounts[0]
  } catch { /* use prop fallback */ }

  // 4. Encode ERC-20 transfer(address,uint256)
  const amountWei  = BigInt(Math.round(parseFloat(amount) * 1_000_000)) // 6 decimals
  const paddedAddr = agentAddress.slice(2).toLowerCase().padStart(64, '0')
  const paddedAmt  = amountWei.toString(16).padStart(64, '0')
  const calldata   = `0xa9059cbb${paddedAddr}${paddedAmt}`

  // 5. Send — the correct wallet popup opens (OKX if user connected with OKX)
  try {
    const hash = await (provider as {
      request: (a: { method: string; params?: unknown[] }) => Promise<string>
    }).request({
      method: 'eth_sendTransaction',
      params: [{ from, to: TOKEN_CONTRACTS[token], data: calldata }],
    })
    return hash
  } catch (err: unknown) {
    const msg = extractMsg(err)
    throw new Error(
      isUserRejection(msg)
        ? 'Transaction rejected.'
        : `Transaction failed: ${msg}`
    )
  }
}
