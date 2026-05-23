'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet, Globe } from 'lucide-react'
import type { UnifiedBalance, WalletInfo } from '@/lib/circle/balance'

type BalanceData = UnifiedBalance & { type: string; error?: string }

const CHAIN_META: Record<string, { label: string; color: string; dot: string }> = {
  arc:      { label: 'Arc Testnet',      color: 'rgba(163,230,53,0.15)',  dot: '#a3e635' },
  ethereum: { label: 'Ethereum Sepolia', color: 'rgba(98,126,234,0.15)',  dot: '#627eea' },
  base:     { label: 'Base Sepolia',     color: 'rgba(0,82,255,0.15)',    dot: '#0052ff' },
  solana:   { label: 'Solana Devnet',    color: 'rgba(153,69,255,0.15)',  dot: '#9945ff' },
}

const TOKEN_COLOR: Record<string, string> = {
  USDC: '#2775CA',
  EURC: '#E8A838',
  USYC: '#7C3AED',
}

export default function BalancePage() {
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function fetchBalance() {
    setLoading(true)
    try {
      const res = await fetch('/api/balance')
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch {
      setData({ type: 'error', error: 'Failed to fetch balance', wallets: [], totalUsdc: '0', totalEurc: '0', totalUsyc: '0', totalEquivalent: '0', fetchedAt: '' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBalance() }, [])

  const glassCard = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: 20,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 32px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            // PORTFOLIO
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Balance Overview</div>
        </div>
        <button
          onClick={fetchBalance}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 10,
            padding: '8px 10px',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 500, color: '#555',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && !data ? (
        <LoadingSkeleton />
      ) : data?.error ? (
        <ErrorCard message={data.error} />
      ) : data ? (
        <>
          {/* ── Unified Total Card ── */}
          <div style={{ ...glassCard, padding: '28px 24px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            {/* Background glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 160, height: 160,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(163,230,53,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Globe size={14} color="#888" />
              <span style={{ fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Total across {data.wallets.length} wallet{data.wallets.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px', marginBottom: 6 }}>
              ${data.totalEquivalent}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>USDC equivalent</div>

            {/* Token breakdown row */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { symbol: 'USDC', amount: data.totalUsdc },
                { symbol: 'EURC', amount: data.totalEurc },
                { symbol: 'USYC', amount: data.totalUsyc },
              ].map(({ symbol, amount }) => (
                <div key={symbol} style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: `1px solid ${TOKEN_COLOR[symbol]}33`,
                  borderRadius: 10,
                  padding: '6px 12px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: TOKEN_COLOR[symbol] }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{amount}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{symbol}</span>
                </div>
              ))}
            </div>

            {lastRefresh && (
              <div style={{ marginTop: 12, fontSize: 10, color: '#aaa' }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* ── Gateway / Unified Balance Card ── */}
          <GatewayCard totalUsdc={data.totalUsdc} walletCount={data.wallets.length} glassCard={glassCard} />

          {/* ── Per-wallet breakdown ── */}
          <div style={{ fontSize: 11, fontWeight: 500, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 10px' }}>
            // WALLETS
          </div>

          {data.wallets.length === 0 ? (
            <NoWalletCard glassCard={glassCard} />
          ) : (
            data.wallets.map((wallet) => (
              <WalletCard key={wallet.walletId} wallet={wallet} glassCard={glassCard} />
            ))
          )}
        </>
      ) : null}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.8 } }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function GatewayCard({ totalUsdc, walletCount, glassCard }: {
  totalUsdc: string
  walletCount: number
  glassCard: React.CSSProperties
}) {
  return (
    <div style={{ ...glassCard, padding: '20px 24px', marginBottom: 12, borderLeft: '3px solid #a3e635' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} color="#a3e635" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Gateway Balance</span>
          <span style={{
            background: 'rgba(163,230,53,0.15)',
            border: '1px solid rgba(163,230,53,0.4)',
            borderRadius: 100,
            padding: '1px 8px',
            fontSize: 10,
            fontWeight: 600,
            color: '#5a8a00',
          }}>Circle Unified</span>
        </div>
      </div>

      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{totalUsdc} USDC</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
        Aggregated across {walletCount} wallet{walletCount !== 1 ? 's' : ''} · Circle Gateway
      </div>

      {/* Deposit / Withdraw */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '9px 0',
          background: '#a3e635', color: '#000',
          border: 'none', borderRadius: 10,
          fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <ArrowDownToLine size={13} />
          Deposit
        </button>
        <button style={{
          flex: 1, padding: '9px 0',
          background: 'rgba(255,255,255,0.7)', color: '#000',
          border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10,
          fontWeight: 600, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <ArrowUpFromLine size={13} />
          Withdraw
        </button>
      </div>
    </div>
  )
}

function WalletCard({ wallet, glassCard }: { wallet: WalletInfo; glassCard: React.CSSProperties }) {
  const meta = CHAIN_META[wallet.chain] ?? { label: wallet.blockchain, color: 'rgba(0,0,0,0.05)', dot: '#888' }

  return (
    <div style={{ ...glassCard, padding: '16px 20px', marginBottom: 10, background: meta.color }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, boxShadow: `0 0 6px ${meta.dot}80` }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10, color: '#999', fontFamily: 'inherit',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 6, padding: '2px 6px',
        }}>
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </span>
      </div>

      {wallet.balances.length === 0 ? (
        <div style={{ fontSize: 12, color: '#aaa' }}>No token balances yet · Get testnet USDC at faucet.circle.com</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {wallet.balances.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: TOKEN_COLOR[b.token] ?? '#888' }} />
                <span style={{ fontSize: 12, color: '#555' }}>{b.token}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{parseFloat(b.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <a
          href={`https://faucet.circle.com`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11, color: '#2775CA',
            background: 'rgba(39,117,202,0.08)',
            border: '1px solid rgba(39,117,202,0.2)',
            borderRadius: 6, padding: '3px 8px',
            textDecoration: 'none', fontWeight: 500,
          }}
        >
          + Get testnet USDC
        </a>
        <a
          href={`${process.env.NEXT_PUBLIC_ARC_EXPLORER ?? 'https://testnet.arcscan.app'}/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11, color: '#888',
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 6, padding: '3px 8px',
            textDecoration: 'none', fontWeight: 500,
          }}
        >
          ArcScan ↗
        </a>
      </div>
    </div>
  )
}

function NoWalletCard({ glassCard }: { glassCard: React.CSSProperties }) {
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ walletId?: string; address?: string; error?: string } | null>(null)

  async function createWallet() {
    setCreating(true)
    try {
      const res = await fetch('/api/wallet/setup', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Failed to create wallet' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ ...glassCard, padding: '24px', textAlign: 'center' }}>
      <Wallet size={32} color="#ccc" style={{ marginBottom: 12 }} />
      <div style={{ fontWeight: 600, marginBottom: 6 }}>No wallets yet</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        Create a Circle developer-controlled wallet to get started.
      </div>

      {result ? (
        <div style={{
          background: result.error ? 'rgba(255,200,200,0.4)' : 'rgba(163,230,53,0.15)',
          border: `1px solid ${result.error ? 'rgba(255,0,0,0.2)' : 'rgba(163,230,53,0.4)'}`,
          borderRadius: 10, padding: '12px 16px', textAlign: 'left', fontSize: 12,
        }}>
          {result.error ? (
            <span style={{ color: '#c00' }}>Error: {result.error}</span>
          ) : (
            <>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Wallet created!</div>
              <div style={{ color: '#555', marginBottom: 4 }}>ID: {result.walletId}</div>
              <div style={{ color: '#555', marginBottom: 8 }}>Address: {result.address}</div>
              <div style={{ color: '#666', background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '8px 10px', fontFamily: 'inherit' }}>
                Add to .env.local:<br />
                <strong>CIRCLE_DEMO_WALLET_ID={result.walletId}</strong>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={createWallet}
          disabled={creating}
          style={{
            background: '#a3e635', color: '#000',
            border: 'none', borderRadius: 10,
            padding: '10px 24px',
            fontWeight: 700, fontSize: 13,
            cursor: creating ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {creating ? 'Creating...' : 'Create Wallet on Arc Testnet'}
        </button>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  const bar = (w: string, h = 16) => (
    <div style={{
      width: w, height: h,
      background: 'rgba(0,0,0,0.06)',
      borderRadius: 6,
      animation: 'pulse 1.4s ease-in-out infinite',
    }} />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20,
        padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {bar('40%', 12)} {bar('60%', 44)} {bar('50%', 12)}
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20,
        padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {bar('30%', 12)} {bar('45%', 28)} {bar('60%', 12)}
      </div>
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(255,240,240,0.8)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,0,0,0.15)', borderRadius: 16,
      padding: '20px 24px', color: '#c00',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load balance</div>
      <div style={{ fontSize: 13 }}>{message}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
        Make sure CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are set in .env.local
      </div>
    </div>
  )
}
