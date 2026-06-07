'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { playBubbleTap } from '@/lib/sounds'

interface AppHeaderProps {
  address?: string
}

const NAV_LINKS = [
  { href: '/balance',  label: 'Balance'  },
  { href: '/contacts', label: 'Contacts' },
  { href: '/history',  label: 'History'  },
]

export function AppHeader({ address }: AppHeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [loggingOut,  setLoggingOut]  = useState(false)
  const [hoverLogout, setHoverLogout] = useState(false)
  const [copiedAddr,  setCopiedAddr]  = useState(false)

  async function handleCopyAddress() {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopiedAddr(true)
    setTimeout(() => setCopiedAddr(false), 2000)
  }

  async function handleLogout() {
    playBubbleTap()
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null

  return (
    <header style={{
      position: 'relative',   /* required for zIndex to apply as flex child */
      background: 'rgba(4,4,12,0.80)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      padding: '0 18px',
      height: 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      zIndex: 20,
      gap: 12,
    }}>

      {/* Left: wordmark + Agent chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Link href="/chat" style={{
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: '-0.5px',
          color: '#ffffff',
          textDecoration: 'none',
        }}>
          Bubble
        </Link>

        {/* Agent chip — sits right next to logo */}
        <Link
          href="/agent"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: pathname === '/agent' ? 'rgba(96,165,250,0.15)' : 'rgba(96,165,250,0.07)',
            border: `1px solid ${pathname === '/agent' ? 'rgba(96,165,250,0.45)' : 'rgba(96,165,250,0.20)'}`,
            borderRadius: 100,
            padding: '3px 10px 3px 8px',
            fontSize: 11,
            fontWeight: 500,
            color: pathname === '/agent' ? '#93c5fd' : 'rgba(147,197,253,0.55)',
            textDecoration: 'none',
            transition: 'all 0.18s',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => {
            if (pathname !== '/agent') {
              e.currentTarget.style.background = 'rgba(96,165,250,0.12)'
              e.currentTarget.style.color = 'rgba(147,197,253,0.80)'
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== '/agent') {
              e.currentTarget.style.background = 'rgba(96,165,250,0.07)'
              e.currentTarget.style.color = 'rgba(147,197,253,0.55)'
            }
          }}
        >
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: pathname === '/agent' ? '#60a5fa' : 'rgba(96,165,250,0.4)',
            boxShadow: pathname === '/agent' ? '0 0 5px rgba(96,165,250,0.7)' : 'none',
            transition: 'all 0.18s',
          }} />
          Agent
        </Link>

        {/* ARC Testnet — small, muted, right next to the logo group */}
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.12em',
          paddingLeft: 2,
        }}>
          ARC TESTNET
        </div>
      </div>

      {/* Right: nav + wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 8 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => playBubbleTap()}
                style={{
                  padding: '5px 12px',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.35)',
                  textDecoration: 'none',
                  background: active
                    ? 'linear-gradient(135deg, rgba(12,95,48,0.55), rgba(185,105,8,0.35))'
                    : 'transparent',
                  border: active
                    ? '1px solid rgba(163,230,53,0.22)'
                    : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.18s',
                  letterSpacing: active ? '-0.1px' : '0',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                  }
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Wallet address pill — click to copy */}
        {shortAddr ? (
          <button
            onClick={handleCopyAddress}
            title="Click to copy address"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 100,
              padding: '4px 11px',
              fontSize: 11,
              fontWeight: 400,
              color: copiedAddr ? '#a3e635' : 'rgba(255,255,255,0.50)',
              display: 'flex', alignItems: 'center', gap: 6,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#a3e635',
              boxShadow: '0 0 6px rgba(163,230,53,0.7)',
            }} />
            {copiedAddr ? 'Copied!' : shortAddr}
          </button>
        ) : (
          <Link href="/login" style={{
            background: '#a3e635',
            border: 'none',
            borderRadius: 100,
            padding: '5px 14px',
            fontSize: 11,
            fontWeight: 600,
            color: '#000',
            textDecoration: 'none',
          }}>
            Connect
          </Link>
        )}

        {/* Disconnect */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          onMouseEnter={() => setHoverLogout(true)}
          onMouseLeave={() => setHoverLogout(false)}
          style={{
            height: 28, borderRadius: 100,
            background: hoverLogout ? 'rgba(255,80,80,0.10)' : 'transparent',
            border: `1px solid ${hoverLogout ? 'rgba(255,80,80,0.25)' : 'rgba(255,255,255,0.08)'}`,
            padding: '0 11px',
            display: 'flex', alignItems: 'center',
            cursor: loggingOut ? 'wait' : 'pointer',
            fontSize: 11, fontWeight: 400,
            color: hoverLogout ? 'rgba(255,120,120,0.9)' : 'rgba(255,255,255,0.28)',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {loggingOut ? '…' : 'Disconnect'}
        </button>
      </div>
    </header>
  )
}
