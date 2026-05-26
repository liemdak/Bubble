'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCard } from '@/components/chat/QRCard'

interface WalletInfo {
  circleWalletAddress?: string
  metaMaskAddress?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [info, setInfo]         = useState<WalletInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch('/api/balance')
      .then(r => r.json())
      .then(d => setInfo({
        circleWalletAddress: d.circleWalletAddress,
        metaMaskAddress:     d.metaMaskAddress ?? d.address,
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 40px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>⚙️ Settings</h1>

      {/* ── Receive / Fund section ─────────────────────────────────── */}
      <SectionLabel>Your Circle Wallet</SectionLabel>

      {loading ? (
        <Skeleton />
      ) : info?.circleWalletAddress ? (
        <>
          {/* QR card */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
            <QRCard
              address={info.circleWalletAddress}
              message="Send USDC here to fund your Bubble wallet"
            />
          </div>

          {/* Full address row */}
          <AddressRow label="Circle wallet (for deposits)" address={info.circleWalletAddress} />
        </>
      ) : (
        <InfoCard color="#fef3c8" border="#e8b84b">
          ⚠️ Circle wallet not found. Try logging out and back in.
        </InfoCard>
      )}

      {/* ── How to fund ─────────────────────────────────────────────── */}
      <SectionLabel style={{ marginTop: 28 }}>How to fund your wallet</SectionLabel>

      <div style={{
        background: '#fff',
        border: '1px solid #171717',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
        marginBottom: 8,
      }}>
        {[
          { n: '1', text: 'Visit faucet.circle.com', link: 'https://faucet.circle.com', linkLabel: 'Open faucet ↗' },
          { n: '2', text: 'Select network: Arc Testnet' },
          { n: '3', text: 'Paste your Circle wallet address above' },
          { n: '4', text: 'Click "Request" — you\'ll get 10 USDC instantly' },
        ].map((step, i, arr) => (
          <div key={step.n} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '14px 16px',
            borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#a3e635', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {step.n}
            </div>
            <div style={{ flex: 1, lineHeight: 1.5 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{step.text}</span>
              {step.link && (
                <>
                  {' '}
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2775CA', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {step.linkLabel}
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <InfoCard color="#d2fae5" border="#6cd69b" style={{ marginBottom: 0 }}>
        💡 Testnet USDC has no real value — free to experiment!
      </InfoCard>

      {/* ── Connected wallet ─────────────────────────────────────────── */}
      <SectionLabel style={{ marginTop: 28 }}>Connected Wallet</SectionLabel>

      <div style={{
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 8,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <Row label="MetaMask address">
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>
            {loading ? '…' : (info?.metaMaskAddress ?? '—')}
          </span>
        </Row>
        <Row label="Network">
          <span style={{
            background: 'rgba(163,230,53,0.15)',
            border: '1px solid rgba(163,230,53,0.35)',
            borderRadius: 100, padding: '2px 10px',
            fontSize: 10, fontWeight: 700, color: '#3a6e00',
          }}>
            ARC TESTNET
          </span>
        </Row>
        <Row label="Explorer">
          <a
            href={`https://testnet.arcscan.app${info?.circleWalletAddress ? `/address/${info.circleWalletAddress}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#2775CA', textDecoration: 'none', fontWeight: 600 }}
          >
            ArcScan ↗
          </a>
        </Row>
      </div>

      {/* ── Danger zone ──────────────────────────────────────────────── */}
      <SectionLabel style={{ marginTop: 28, color: '#c00' }}>Account</SectionLabel>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          width: '100%',
          padding: '14px',
          background: loggingOut ? '#f5f5f5' : '#fff0f0',
          border: '1px solid #ffcccc',
          borderRadius: 8,
          color: loggingOut ? '#aaa' : '#c00',
          fontWeight: 700,
          fontSize: 14,
          cursor: loggingOut ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
          transition: 'background 0.15s',
        }}
      >
        {loggingOut ? 'Disconnecting…' : '↩ Disconnect & Log Out'}
      </button>

      <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
        BubblePay · Arc Testnet · Powered by Circle
      </p>
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: '#888',
      textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  )
}

function AddressRow({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div style={{
      background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
      padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#333', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {address}
        </span>
        <button
          onClick={copy}
          style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '4px 10px',
            background: copied ? '#a3e635' : '#f5f5f5',
            border: '1px solid #ddd', borderRadius: 6,
            cursor: 'pointer', fontFamily: 'inherit', color: '#333',
            transition: 'background 0.2s',
          }}
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#888', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>{children}</div>
    </div>
  )
}

function InfoCard({ children, color, border, style }: {
  children: React.ReactNode
  color: string
  border: string
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: color,
      border: `1px solid ${border}`,
      borderRadius: 8,
      padding: '12px 14px',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.5,
      marginBottom: 8,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[196, 120].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 220 : 48,
          width: i === 0 ? 220 : '100%',
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 12,
          animation: 'pulse 1.4s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </div>
  )
}
