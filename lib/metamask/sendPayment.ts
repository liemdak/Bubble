/**
 * Send ERC-20 tokens directly from the user's connected wallet (MetaMask / OKX / etc.)
 * to any recipient address on Arc Testnet.
 *
 * Uses the same EIP-6963 multi-wallet discovery as fundAgent.ts so the correct
 * wallet popup opens regardless of how many extensions are installed.
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
  const l = msg.toLowerCase()
  return l.includes('reject') || l.includes('cancel') || l.includes('denied') ||
         l.includes('user refused') || l.includes('user closed')
}

/**
 * EIP-6963: find the exact provider whose eth_accounts contains userAddress.
 * Prevents Phantom opening when the user actually connected with OKX, etc.
 */
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
    setTimeout(() => { window.removeEventListener('eip6963:announceProvider', handler); resolve() }, 120)
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
      if (Array.isArray(accounts) && accounts.some(a => a.toLowerCase() === target)) return p
    } catch { /* unresponsive provider — skip */ }
  }

  if (w.ethereum) return w.ethereum
  throw new Error('Wallet not found. Make sure your wallet extension is unlocked and connected.')
}

async function switchToArc(provider: EthProvider) {
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
        ? 'Please approve adding Arc Testnet to continue.'
        : `Could not add Arc Testnet: ${msg}. Add manually: Chain ID 5042002, RPC https://rpc.testnet.arc.network`
    )
  }
}

/**
 * Send `amount` of `token` from `userAddress` to `recipientAddress` on Arc Testnet.
 * Triggers a wallet popup (MetaMask / OKX / etc.) for the user to sign.
 *
 * @returns txHash on success
 * @throws descriptive Error on failure or rejection
 */
export async function sendPaymentViaMetaMask(
  recipientAddress: string,
  userAddress:      string,
  amount:           string,
  token:            'USDC' | 'EURC' | 'USYC',
): Promise<string> {
  const contractAddress = TOKEN_CONTRACTS[token]
  if (!contractAddress) throw new Error(`Unsupported token: ${token}`)

  // 1. Find the exact provider for this user's address
  const provider = await getProviderForAddress(userAddress)

  // 2. Switch to Arc Testnet
  await switchToArc(provider)

  // 3. Re-confirm active account (switch may change accounts[0])
  let from = userAddress
  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (accounts?.[0]) from = accounts[0]
  } catch { /* use prop fallback */ }

  // 4. Encode ERC-20 transfer(address,uint256) — all three tokens use 6 decimals on Arc
  const amountWei  = BigInt(Math.round(parseFloat(amount) * 1_000_000))
  const paddedAddr = recipientAddress.slice(2).toLowerCase().padStart(64, '0')
  const paddedAmt  = amountWei.toString(16).padStart(64, '0')
  const calldata   = `0xa9059cbb${paddedAddr}${paddedAmt}`

  // 5. Send — correct wallet popup opens
  try {
    const hash = await (provider as {
      request: (a: { method: string; params?: unknown[] }) => Promise<string>
    }).request({
      method: 'eth_sendTransaction',
      params: [{ from, to: contractAddress, data: calldata }],
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
