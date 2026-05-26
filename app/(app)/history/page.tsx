'use client'

import { useState, useEffect } from 'react'

export default function HistoryPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [copied, setCopied]               = useState(false)
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    fetch('/api/balance')
      .then(r => r.json())
      .then(d => setWalletAddress(d.circleWalletAddress ?? d.address ?? null))
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
    <div style={{ padding: '24px', maxWidth: 560, margin: '0 auto' }}>

      {/* Header */}
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>📋 History</h1>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>
        All on-chain transactions are recorded on Arc Testnet and viewable on ArcScan.
      </p>

      {/* Wallet address card */}
      <div style={{
        background: '#fff', border: '1px solid #171717', borderRadius: 8,
        padding: '16px 20px', marginBottom: 14,
        boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
      }}>
        <div style={{
          fontSize: 10, color: '#888', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
        }}>
          Your Circle Wallet Address
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, fontSize: 12, fontFamily: 'monospace',
            color: '#222', wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {loading ? '…' : (walletAddress ?? 'Not connected')}
          </div>

          {walletAddress && (
            <button
              onClick={copyAddress}
              title="Copy address"
              style={{
                flexShrink: 0, background: copied ? '#a3e635' : '#f5f5f5',
                border: '1px solid #ddd', borderRadius: 6,
                padding: '5px 10px', fontSize: 11, cursor: 'pointer',
                fontWeight: 600, transition: 'background 0.2s',
                color: '#333',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* ArcScan button */}
      <a
        href={arcScanUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#a3e635', color: '#000', borderRadius: 4,
          padding: '14px', fontWeight: 700, fontSize: 14,
          textDecoration: 'none',
          boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
        }}
      >
        View all transactions on ArcScan ↗
      </a>

      <p style={{ fontSize: 12, color: '#bbb', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
        ArcScan shows every send, swap, and bridge in real-time —<br />
        including tx hash, status, gas fee, and block confirmation.
      </p>

      {/* Info cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        {[
          { icon: '📤', label: 'Send', desc: 'Transfers to other wallets', color: '#2775CA' },
          { icon: '🔄', label: 'Swap', desc: 'USDC ↔ EURC ↔ USYC on Arc', color: '#fbbf25' },
          { icon: '🌉', label: 'Bridge', desc: 'Cross-chain via CCTP', color: '#a3e635' },
        ].map(({ icon, label, desc, color }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 8,
            border: '1px solid #eee',
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 3, background: color, borderRadius: '8px 0 0 8px',
            }} />
            <div style={{ fontSize: 20, marginLeft: 6 }}>{icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
