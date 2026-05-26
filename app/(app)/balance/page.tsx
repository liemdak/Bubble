'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, ArrowDownToLine, X, AlertCircle } from 'lucide-react'

// Arc Testnet token contracts
const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  USYC: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
}
const ARC_CHAIN_ID = '0x4CAEF2' // 5042002

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

// ── Deposit modal ─────────────────────────────────────────────────────────────

function DepositModal({
  agentAddress,
  userAddress,
  onClose,
}: {
  agentAddress: string
  userAddress:  string
  onClose: () => void
}) {
  const [token,   setToken]   = useState<'USDC' | 'EURC' | 'USYC'>('USDC')
  const [amount,  setAmount]  = useState('')
  const [status,  setStatus]  = useState<'idle' | 'switching' | 'pending' | 'done' | 'error'>('idle')
  const [txHash,  setTxHash]  = useState<string | null>(null)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  function copyAddress() {
    navigator.clipboard.writeText(agentAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDeposit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setErrMsg('Enter a valid amount'); return }

    const provider = (window as unknown as { ethereum?: Record<string, unknown> }).ethereum
    if (!provider) {
      setErrMsg('MetaMask not detected. Copy the agent address below and send manually.')
      return
    }

    setErrMsg(null)
    setStatus('switching')

    try {
      // 1. Switch to Arc Testnet
      try {
        await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CHAIN_ID }],
        })
      } catch {
        // Chain not added yet — add it
        await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId:  ARC_CHAIN_ID,
            chainName: 'Arc Testnet',
            nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
            rpcUrls: ['https://rpc.testnet.arc.network'],
            blockExplorerUrls: ['https://testnet.arcscan.app'],
          }],
        })
      }

      setStatus('pending')

      // 2. Encode ERC-20 transfer(address,uint256)
      const amountWei  = BigInt(Math.round(amt * 1_000_000)) // 6 decimals
      const paddedAddr = agentAddress.slice(2).toLowerCase().padStart(64, '0')
      const paddedAmt  = amountWei.toString(16).padStart(64, '0')
      const data       = `0xa9059cbb${paddedAddr}${paddedAmt}`

      // 3. Send via MetaMask
      const hash = await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<string> }).request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to:   TOKEN_CONTRACTS[token],
          data,
        }],
      })

      setTxHash(hash)
      setStatus('done')

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction rejected'
      if (msg.includes('rejected') || msg.includes('denied')) {
        setErrMsg('Transaction cancelled.')
      } else {
        setErrMsg(msg)
      }
      setStatus('error')
    }
  }

  const arcScanUrl = txHash
    ? `https://testnet.arcscan.app/tx/${txHash}`
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 40px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Handle + header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Top Up Agent Wallet</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              Transfer from your MetaMask → agent wallet
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#f5f5f5', border: '1px solid #e0e0e0',
            borderRadius: '50%', width: 32, height: 32,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        {status === 'done' ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              Deposit sent!
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
              {amount} {token} → agent wallet
            </div>
            {arcScanUrl && (
              <a href={arcScanUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#2775CA', textDecoration: 'none', fontWeight: 600 }}>
                View on ArcScan ↗
              </a>
            )}
            <button onClick={onClose} style={{
              display: 'block', width: '100%', marginTop: 20,
              background: '#a3e635', color: '#000',
              border: 'none', borderRadius: 8, padding: '12px',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Token selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['USDC', 'EURC', 'USYC'] as const).map(t => (
                <button key={t} onClick={() => setToken(t)} style={{
                  flex: 1, padding: '8px 0',
                  background: token === t ? TOKEN_COLOR[t] : '#f5f5f5',
                  color: token === t ? '#fff' : '#555',
                  border: `1px solid ${token === t ? TOKEN_COLOR[t] : '#e0e0e0'}`,
                  borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#f5f5f5', border: `1.5px solid ${amount ? TOKEN_COLOR[token] : '#e0e0e0'}`,
              borderRadius: 10, padding: '0 14px', height: 52, marginBottom: 16,
              transition: 'border-color 0.15s',
            }}>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 20, fontWeight: 700, fontFamily: 'inherit', color: '#000',
                }}
              />
              <span style={{ fontWeight: 700, color: TOKEN_COLOR[token], fontSize: 14 }}>{token}</span>
            </div>

            {/* Agent address (reference) */}
            <div style={{
              background: '#f8f8f8', border: '1px solid #e8e8e8',
              borderRadius: 8, padding: '10px 12px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, marginBottom: 4 }}>AGENT WALLET ADDRESS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#555', wordBreak: 'break-all' }}>
                  {agentAddress}
                </span>
                <button onClick={copyAddress} style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700,
                  padding: '4px 10px',
                  background: copied ? '#a3e635' : '#fff',
                  border: '1px solid #ddd', borderRadius: 6,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.2s',
                }}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {errMsg && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: '#fff0f0', border: '1px solid #ffcccc',
                borderRadius: 8, padding: '10px 12px', marginBottom: 14,
                fontSize: 12, color: '#c00',
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
                background: (status === 'switching' || status === 'pending') ? '#e8f5d0' : '#a3e635',
                color: '#000', border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
                transition: 'background 0.15s',
              }}
            >
              {status === 'switching' ? 'Switching to Arc Testnet…'
               : status === 'pending'  ? 'Waiting for MetaMask…'
               : `Send ${amount || '0'} ${token} → Agent`}
            </button>

            <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
              MetaMask will open to confirm. Make sure you're on Arc Testnet.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main balance page ─────────────────────────────────────────────────────────

export default function BalancePage() {
  const [data,    setData]    = useState<BalanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
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

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.85)',
    borderRadius: 20,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            // PORTFOLIO
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Balance</div>
        </div>
        <button onClick={fetchBalance} disabled={loading} style={{
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
          padding: '8px 10px', cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 500, color: '#555', fontFamily: 'inherit',
        }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading ? <LoadingSkeleton glass={glass} /> : data?.error ? (
        <div style={{ ...glass, padding: 24, color: '#c00' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load</div>
          <div style={{ fontSize: 13 }}>{data.error}</div>
        </div>
      ) : (
        <>
          {/* ── YOUR WALLET (MetaMask — user's main wallet) ── */}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            // YOUR WALLET
          </div>

          <div style={{ ...glass, padding: '24px 20px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 120, height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(163,230,53,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 4 }}>
              MetaMask · Arc Testnet
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#aaa', marginBottom: 14 }}>
              {data?.userWallet?.address
                ? `${data.userWallet.address.slice(0, 8)}...${data.userWallet.address.slice(-6)}`
                : '—'}
            </div>

            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-1px', marginBottom: 4 }}>
              ${data?.userWallet?.total ?? '0.00'}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 18 }}>USDC equivalent</div>

            {/* Token pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['USDC', 'EURC', 'USYC'] as const).map(t => (
                <div key={t} style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: `1px solid ${TOKEN_COLOR[t]}33`,
                  borderRadius: 10, padding: '5px 12px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: TOKEN_COLOR[t] }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{data?.userWallet?.[t] ?? '0.00'}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{t}</span>
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
                background: 'rgba(39,117,202,0.08)',
                border: '1px solid rgba(39,117,202,0.2)',
                borderRadius: 6, padding: '4px 10px',
                textDecoration: 'none', fontWeight: 600,
              }}
            >
              + Get testnet USDC
            </a>
          </div>

          {/* ── AGENT WALLET (Circle — executes transactions) ── */}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>
            // AGENT WALLET
          </div>

          <div style={{ ...glass, padding: '20px', borderLeft: '3px solid #a3e635', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  🤖 Bubble Agent
                </div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
                  Executes send / swap / bridge on your behalf.
                  Top up so the agent has funds to work with.
                </div>
              </div>
              <div style={{
                background: 'rgba(163,230,53,0.15)',
                border: '1px solid rgba(163,230,53,0.4)',
                borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{data?.agentWallet?.USDC ?? '0.00'}</div>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 600 }}>USDC</div>
              </div>
            </div>

            {/* Agent address */}
            {data?.agentWallet?.address && (
              <div style={{
                background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '8px 12px', marginBottom: 14,
                fontSize: 11, fontFamily: 'monospace', color: '#666',
              }}>
                {data.agentWallet.address}
              </div>
            )}

            {/* All agent token balances */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {(['USDC', 'EURC', 'USYC'] as const).map(t => (
                <div key={t} style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: `1px solid ${TOKEN_COLOR[t]}22`,
                  borderRadius: 8, padding: '4px 10px',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: TOKEN_COLOR[t] }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{data?.agentWallet?.[t] ?? '0.00'}</span>
                  <span style={{ fontSize: 10, color: '#aaa' }}>{t}</span>
                </div>
              ))}
            </div>

            {/* Top Up button */}
            <button
              onClick={() => setShowDeposit(true)}
              disabled={!data?.agentWallet}
              style={{
                width: '100%', padding: '12px',
                background: data?.agentWallet ? '#a3e635' : '#f0f0f0',
                color: data?.agentWallet ? '#000' : '#aaa',
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 14,
                cursor: data?.agentWallet ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: data?.agentWallet ? 'rgb(10,10,13) 1px 1px 0px 0px' : 'none',
                transition: 'background 0.15s',
              }}
            >
              <ArrowDownToLine size={15} />
              Top Up Agent Wallet
            </button>
          </div>

          {/* ArcScan links */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {data?.userWallet?.address && (
              <a href={`https://testnet.arcscan.app/address/${data.userWallet.address}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#888', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', fontWeight: 500 }}>
                My wallet on ArcScan ↗
              </a>
            )}
            {data?.agentWallet?.address && (
              <a href={`https://testnet.arcscan.app/address/${data.agentWallet.address}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#888', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', fontWeight: 500 }}>
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
      `}</style>
    </div>
  )
}

function LoadingSkeleton({ glass }: { glass: React.CSSProperties }) {
  const bar = (w: string, h = 16) => (
    <div style={{ width: w, height: h, background: 'rgba(0,0,0,0.06)', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...glass, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bar('30%', 11)} {bar('55%', 40)} {bar('70%', 12)}
      </div>
      <div style={{ ...glass, padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bar('25%', 11)} {bar('45%', 28)} {bar('100%', 42)}
      </div>
    </div>
  )
}
