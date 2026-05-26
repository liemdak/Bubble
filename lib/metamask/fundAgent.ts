/**
 * Send ERC-20 tokens from MetaMask to the agent wallet.
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

function getProvider(): EthProvider {
  const p = (window as unknown as { ethereum?: EthProvider }).ethereum
  if (!p) throw new Error('MetaMask not detected. Please install MetaMask.')
  return p
}

async function switchToArc(provider: EthProvider) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_CHAIN_ID }],
    })
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code
    if (code === 4902 || code === -32603) {
      // Chain not added yet — add it
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:   ARC_CHAIN_ID,
          chainName: 'Arc Testnet',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://rpc.testnet.arc.network'],
          blockExplorerUrls: ['https://testnet.arcscan.app'],
        }],
      })
    } else {
      const msg = err instanceof Error ? err.message : String(err)
      const isReject = msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel')
      throw new Error(isReject
        ? 'Please approve the network switch to Arc Testnet and try again.'
        : `Network switch failed: ${msg}`)
    }
  }
}

/**
 * Transfer ERC-20 token from MetaMask to agent wallet.
 * @returns txHash on success
 * @throws descriptive Error on failure
 */
export async function fundAgentViaMetaMask(
  agentAddress: string,
  userAddress: string,
  amount: string,
  token: 'USDC' | 'EURC' | 'USYC',
): Promise<string> {
  const provider = getProvider()

  // 1. Switch to Arc Testnet
  await switchToArc(provider)

  // 2. Get current MetaMask account (may differ from session address)
  let from = userAddress
  try {
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (accounts?.[0]) from = accounts[0]
  } catch { /* use prop fallback */ }

  // 3. Encode ERC-20 transfer(address,uint256)
  const amountWei  = BigInt(Math.round(parseFloat(amount) * 1_000_000)) // 6 decimals
  const paddedAddr = agentAddress.slice(2).toLowerCase().padStart(64, '0')
  const paddedAmt  = amountWei.toString(16).padStart(64, '0')
  const calldata   = `0xa9059cbb${paddedAddr}${paddedAmt}`

  // 4. Send via MetaMask
  try {
    const hash = await (provider as { request: (a: { method: string; params?: unknown[] }) => Promise<string> }).request({
      method: 'eth_sendTransaction',
      params: [{ from, to: TOKEN_CONTRACTS[token], data: calldata }],
    })
    return hash
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const isReject = msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('denied')
    throw new Error(isReject
      ? 'Transaction rejected in MetaMask.'
      : `Transaction failed: ${msg}`)
  }
}
