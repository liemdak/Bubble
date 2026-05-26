/**
 * Send ERC-20 tokens from MetaMask (main wallet) to the Circle agent wallet.
 * Runs entirely client-side — no server call needed.
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

/** MetaMask throws plain objects, not Error instances — extract message safely */
function extractMsg(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    if (typeof e.message === 'string' && e.message) return e.message
    if (typeof e.code === 'number') return `MetaMask error code ${e.code}`
    try { return JSON.stringify(e) } catch { /* ignore */ }
  }
  return 'Unknown error'
}

function isUserRejection(msg: string): boolean {
  const lower = msg.toLowerCase()
  return lower.includes('reject') || lower.includes('cancel') || lower.includes('denied') || lower.includes('user refused')
}

function getProvider(): EthProvider {
  const p = (window as unknown as { ethereum?: EthProvider }).ethereum
  if (!p) throw new Error('MetaMask not detected. Please install MetaMask and try again.')
  return p
}

async function switchToArc(provider: EthProvider) {
  // Step 0: Ensure MetaMask has an active connection to this site.
  // Without this, wallet_addEthereumChain returns "Not connected".
  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (!accounts?.length) {
      await provider.request({ method: 'eth_requestAccounts' })
    }
  } catch { /* already connected or popup dismissed — proceed */ }

  // Step 1: Try switching to Arc Testnet (fast path if already added)
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_CHAIN_ID }],
    })
    return // success — chain switched
  } catch {
    // 4902 = chain not added yet, or other error — fall through to add
  }

  // Step 2: Add Arc Testnet to MetaMask
  // NOTE: MetaMask requires nativeCurrency.decimals = 18 for all chains.
  // Arc's native USDC uses 6 decimals on-chain, but the API enforces 18 here.
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
        ? 'Please approve adding Arc Testnet in MetaMask to continue.'
        : `Could not add Arc Testnet: ${msg}. Add manually: Chain ID 5042002, RPC https://rpc.testnet.arc.network`
    )
  }
}

/**
 * Transfer ERC-20 token from MetaMask (main wallet) to agent wallet.
 * Flow: switch to Arc → sign ERC-20 transfer → return txHash
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
  const provider = getProvider()

  // 1. Switch/add Arc Testnet in MetaMask
  await switchToArc(provider)

  // 2. Get current MetaMask account (may differ from session address)
  let from = userAddress
  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (accounts?.[0]) from = accounts[0]
  } catch { /* use prop fallback */ }

  // 3. Encode ERC-20 transfer(address,uint256) calldata
  const amountWei  = BigInt(Math.round(parseFloat(amount) * 1_000_000)) // USDC = 6 decimals
  const paddedAddr = agentAddress.slice(2).toLowerCase().padStart(64, '0')
  const paddedAmt  = amountWei.toString(16).padStart(64, '0')
  const calldata   = `0xa9059cbb${paddedAddr}${paddedAmt}`

  // 4. Send via MetaMask — MetaMask popup opens for user signature
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
        ? 'Transaction rejected in MetaMask.'
        : `Transaction failed: ${msg}`
    )
  }
}
