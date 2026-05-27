'use client'

import { useState, useEffect } from 'react'

export default function HistoryPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [copied, setCopied]               = useState(false)
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    fetch('/api/balance')
      .then(r => r.json())
      .then(d => {
        setWalletAddress(d.address ?? d.userWallet?.address ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const arcScanUrl = walletAddress
    ? `https://testnet.arcscan.app/address/${walletAddress}`
    : 'https://testnet.arcscan.app'

  function copyAddress() {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 560, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
          // ON-CHAIN HISTORY
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>History</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
          All transactions are recorded on Arc Testnet and viewable on ArcScan.
        </p>
      </div>

      {/* ── Wallet address card ── */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
        }}>
          Your Wallet Address (Arc Testnet)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, fontSize: 12, fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.65)', wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {loading ? (
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>…</span>
            ) : (
              walletAddress ?? <span style={{ color: 'rgba(255,100,100,0.7)' }}>Not connected</span>
            )}
          </div>

          {walletAddress && (
            <button
              onClick={copyAddress}
              title="Copy address"
              style={{
                flexShrink: 0,
                background: copied ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${copied ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 8,
                padding: '5px 12px', fontSize: 11, cursor: 'pointer',
                fontWeight: 600, fontFamily: 'inherit',
                color: copied ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* ── ArcScan button ── */}
      <a
        href={arcScanUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#38bdf8', color: '#000', borderRadius: 12,
          padding: '14px', fontWeight: 700, fontSize: 14,
          textDecoration: 'none',
          boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
          transition: 'transform 0.12s, box-shadow 0.12s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'
          ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'rgb(10,10,13) 2px 3px 0px 0px'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'none'
          ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'rgb(10,10,13) 2px 2px 0px 0px'
        }}
      >
        View all transactions on ArcScan ↗
      </a>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 12, textAlign: 'center', lineHeight: 1.7 }}>
        ArcScan shows every send, swap, and bridge in real-time —<br />
        including tx hash, status, gas fee, and block confirmation.
      </p>

      {/* ── Info cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        {[
          { label: 'Send',   desc: 'Transfers to other wallets',   color: '#2775CA' },
          { label: 'Swap',   desc: 'USDC ↔ EURC ↔ USYC on Arc',  color: '#fbbf25' },
          { label: 'Bridge', desc: 'Cross-chain via CCTP',          color: '#38bdf8' },
        ].map(({ label, desc, color }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 16px', position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Left color strip */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 3, background: color, borderRadius: '12px 0 0 12px',
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginLeft: 6 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
