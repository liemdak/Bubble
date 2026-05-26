'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, ArrowDownToLine, X, AlertCircle } from 'lucide-react'

// Arc Testnet token contracts
const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  USYC: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
}
const ARC_CHAIN_ID = '0x4CEF52' // 5042002

const TOKEN_COLOR: Record<string, string> = {
  USDC: '#2775CA',
  EURC: '#E8A838',
  USYC: '#7C3AED',
}

interface WalletData {
  address: string
  USDC: string
  EURC: string
  USYC: string
  total: string
}

interface BalanceResponse {
  userWallet:  WalletData | null
  agentWallet: WalletData | null
  error?: string
}

// ── Dark glass card style ──────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
}

// ── Deposit modal (dark bottom sheet) ─────────────────────────────────────────
function DepositModal({
  agentAddress,
  userAddress,
  onClose,
}: {
  agentAddress: string
  userAddress:  string
  onClose: () => void
}) {
  const [token,  setToken]  = useState<'USDC' | 'EURC' | 'USYC'>('USDC')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'switching' | 'pending' | 'done' | 'error'>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function copyAddress() {
    navigator.clipboard.writeText(agentAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDeposit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setErrMsg('Enter a valid amount'); return }

    type EthProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
    const provider = (window as unknown as { ethereum?: EthProvider }).ethereum
    if (!provider) {
      setErrMsg('MetaMask not detected. Copy the agent address and send manually.')
      return
    }

    setErrMsg(null)
    setStatus('switching')

    // Ensure MetaMask is connected before chain operations
    try {
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
      if (!accounts?.length) await provider.request({ method: 'eth_requestAccounts' })
    } catch { /* already connected */ }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_CHAIN_ID }],
      })
    } catch {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId:   ARC_CHAIN_ID,
            chainName: 'Arc Testnet',
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
        const msg = addErr instanceof Error ? addErr.message : String(addErr)
        const isReject = msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('denied')
        setErrMsg(isReject
          ? 'Please approve adding Arc Testnet in MetaMask and try again.'
          : `Failed to add Arc Testnet: ${msg}`)
        setStatus('error')
        return
      }
    }

    setStatus('pending')

    let fromAddress = userAddress
    try {
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
      if (accounts?.[0]) fromAddress = accounts[0]
    } catch { /* use prop fallback */ }

    try {
      const amountWei  = BigInt(Math.round(amt * 1_000_000))
      const paddedAddr = agentAddress.slice(2).toLowerCase().padStart(64, '0')
      const paddedAmt  = amountWei.toString(16).padStart(64, '0')
      const calldata   = `0xa9059cbb${paddedAddr}${paddedAmt}`

      const hash = await (provider as { request: (a: { method: string; params?: unknown[] }) => Promise<string> }).request({
        method: 'eth_sendTransaction',
        params: [{ from: fromAddress, to: TOKEN_CONTRACTS[token], data: calldata }],
      })

      setTxHash(hash)
      setStatus('done')
    } catch (txErr: unknown) {
      const msg = txErr instanceof Error ? txErr.message : String(txErr)
      setErrMsg(
        msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('denied')
          ? 'Transaction rejected in MetaMask. Click "Send" to try again.'
          : `Transaction failed: ${msg}`
      )
      setStatus('error')
    }
  }

  const arcScanUrl = txHash ? `https://testnet.arcscan.app/tx/${txHash}` : null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'rgba(12,12,24,0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          padding: '24px 20px 48px',
          boxShadow: '0 -16px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Top Up Agent Wallet</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              Transfer from your MetaMask → agent wallet
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%', width: 34, height: 34,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)', transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <X size={14} />
          </button>
        </div>

        {status === 'done' ? (
          /* Success */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#fff' }}>Deposit sent!</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 18 }}>
              {amount} {token} → agent wallet
            </div>
            {arcScanUrl && (
              <a
                href={arcScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}
              >
                View on ArcScan ↗
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                display: 'block', width: '100%', marginTop: 22,
                background: '#38bdf8', color: '#000',
                border: 'none', borderRadius: 12, padding: '13px',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Token selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['USDC', 'EURC', 'USYC'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setToken(t)}
                  style={{
                    flex: 1, padding: '9px 0',
                    background: token === t ? `${TOKEN_COLOR[t]}22` : 'rgba(255,255,255,0.05)',
                    color: token === t ? TOKEN_COLOR[t] : 'rgba(255,255,255,0.45)',
                    border: `1.5px solid ${token === t ? TOKEN_COLOR[t] : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 10, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${amount ? TOKEN_COLOR[token] : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 12, padding: '0 16px', height: 56, marginBottom: 14,
              transition: 'border-color 0.15s',
              boxShadow: amount ? `0 0 12px ${TOKEN_COLOR[token]}30` : 'none',
            }}>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 22, fontWeight: 700, fontFamily: 'inherit', color: '#fff',
                }}
              />
              <span style={{ fontWeight: 700, color: TOKEN_COLOR[token], fontSize: 14 }}>{token}</span>
            </div>

            {/* Agent address */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 5, letterSpacing: '0.06em' }}>
                AGENT WALLET ADDRESS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)', wordBreak: 'break-all' }}>
                  {agentAddress}
                </span>
                <button
                  onClick={copyAddress}
                  style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: '4px 10px',
                    background: copied ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${copied ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                    color: copied ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Error */}
            {errMsg && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'rgba(255,100,100,0.1)',
                border: '1px solid rgba(255,100,100,0.25)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 14,
                fontSize: 12, color: '#ff6b6b',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {errMsg}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleDeposit}
              disabled={status === 'switching' || status === 'pending'}
              style={{
                width: '100%', padding: '14px',
                background: (status === 'switching' || status === 'pending') ? 'rgba(56,189,248,0.35)' : '#38bdf8',
                color: '#000', border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
                transition: 'background 0.15s',
              }}
            >
              {status === 'switching' ? '⏳ Switching to Arc Testnet…'
               : status === 'pending'  ? '⏳ Waiting for MetaMask…'
               : `Send ${amount || '0'} ${token} → Agent`}
            </button>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 12 }}>
              MetaMask will open to confirm. Make sure you&apos;re on Arc Testnet.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main balance page ─────────────────────────────────────────────────────────
export default function BalancePage() {
  const [data,        setData]        = useState<BalanceResponse | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [showDeposit, setShowDeposit] = useState(false)

  async function fetchBalance() {
    setLoading(true)
    try {
      const res  = await fetch('/api/balance')
      const json = await res.json()
      setData(json)
    } catch {
      setData({ userWallet: null, agentWallet: null, error: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBalance() }, [])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 40px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            // PORTFOLIO
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Balance</div>
        </div>
        <button
          onClick={fetchBalance}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '8px 12px', cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
            fontFamily: 'inherit', transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : data?.error ? (
        <div style={{ ...glass, padding: 24, color: '#ff6b6b' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load</div>
          <div style={{ fontSize: 13, color: 'rgba(255,100,100,0.7)' }}>{data.error}</div>
        </div>
      ) : (
        <>
          {/* ── YOUR WALLET ── */}
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            // YOUR WALLET
          </div>

          <div style={{ ...glass, padding: '24px 20px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
            {/* Glow accent */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 140, height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 4 }}>
              MetaMask · Arc Testnet
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>
              {data?.userWallet?.address
                ? `${data.userWallet.address.slice(0, 8)}...${data.userWallet.address.slice(-6)}`
                : '—'}
            </div>

            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px', marginBottom: 4, color: '#fff' }}>
              ${data?.userWallet?.total ?? '0.00'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>USDC equivalent</div>

            {/* Token pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['USDC', 'EURC', 'USYC'] as const).map(t => (
                <div key={t} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${TOKEN_COLOR[t]}44`,
                  borderRadius: 10, padding: '5px 12px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: TOKEN_COLOR[t] }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{data?.userWallet?.[t] ?? '0.00'}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t}</span>
                </div>
              ))}
            </div>

            {/* Faucet link */}
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 16, fontSize: 11, color: '#2775CA',
                background: 'rgba(39,117,202,0.1)',
                border: '1px solid rgba(39,117,202,0.25)',
                borderRadius: 6, padding: '4px 10px',
                textDecoration: 'none', fontWeight: 600,
              }}
            >
              + Get testnet USDC
            </a>
          </div>

          {/* ── AGENT WALLET ── */}
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>
            // AGENT WALLET
          </div>

          <div style={{ ...glass, padding: '20px', borderLeft: '3px solid #38bdf8', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: '#fff' }}>
                  🤖 Bubble Agent
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  Executes send / swap / bridge on your behalf.
                  Top up so the agent has funds to work with.
                </div>
              </div>
              <div style={{
                background: 'rgba(56,189,248,0.12)',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 10, padding: '7px 12px', textAlign: 'center', flexShrink: 0,
                boxShadow: '0 0 16px rgba(56,189,248,0.12)',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>{data?.agentWallet?.USDC ?? '0.00'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>USDC</div>
              </div>
            </div>

            {/* Agent address */}
            {data?.agentWallet?.address && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '8px 12px', marginBottom: 14,
                fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)',
              }}>
                {data.agentWallet.address}
              </div>
            )}

            {/* Agent token balances */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {(['USDC', 'EURC', 'USYC'] as const).map(t => (
                <div key={t} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${TOKEN_COLOR[t]}30`,
                  borderRadius: 8, padding: '4px 10px',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: TOKEN_COLOR[t] }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{data?.agentWallet?.[t] ?? '0.00'}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{t}</span>
                </div>
              ))}
            </div>

            {/* Top Up button */}
            <button
              onClick={() => setShowDeposit(true)}
              disabled={!data?.agentWallet}
              style={{
                width: '100%', padding: '13px',
                background: data?.agentWallet ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                color: data?.agentWallet ? '#000' : 'rgba(255,255,255,0.25)',
                border: data?.agentWallet ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontWeight: 700, fontSize: 14,
                cursor: data?.agentWallet ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: data?.agentWallet ? 'rgb(10,10,13) 2px 2px 0px 0px' : 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (data?.agentWallet) e.currentTarget.style.background = '#7dd3fc' }}
              onMouseLeave={e => { if (data?.agentWallet) e.currentTarget.style.background = '#38bdf8' }}
            >
              <ArrowDownToLine size={15} />
              Top Up Agent Wallet
            </button>
          </div>

          {/* ArcScan links */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {data?.userWallet?.address && (
              <a
                href={`https://testnet.arcscan.app/address/${data.userWallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '4px 10px',
                  textDecoration: 'none', fontWeight: 500,
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#38bdf8')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)')}
              >
                My wallet on ArcScan ↗
              </a>
            )}
            {data?.agentWallet?.address && (
              <a
                href={`https://testnet.arcscan.app/address/${data.agentWallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '4px 10px',
                  textDecoration: 'none', fontWeight: 500,
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#38bdf8')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)')}
              >
                Agent wallet on ArcScan ↗
              </a>
            )}
          </div>
        </>
      )}

      {/* Deposit modal */}
      {showDeposit && data?.agentWallet && data?.userWallet && (
        <DepositModal
          agentAddress={data.agentWallet.address}
          userAddress={data.userWallet.address}
          onClose={() => { setShowDeposit(false); fetchBalance() }}
        />
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse-d { 0%,100%{opacity:.15} 50%{opacity:.35} }
      `}</style>
    </div>
  )
}

function LoadingSkeleton() {
  const bar = (w: string, h = 16) => (
    <div style={{
      width: w, height: h,
      background: 'rgba(255,255,255,0.08)',
      borderRadius: 6,
      animation: 'pulse-d 1.4s ease-in-out infinite',
    }} />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...glass, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bar('30%', 11)} {bar('55%', 42)} {bar('70%', 12)}
      </div>
      <div style={{ ...glass, padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bar('25%', 11)} {bar('45%', 28)} {bar('100%', 44)}
      </div>
    </div>
  )
}
