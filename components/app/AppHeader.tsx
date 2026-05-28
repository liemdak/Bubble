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

      {/* Left: wordmark → /chat */}
      <Link href="/chat" style={{
        fontWeight: 600,
        fontSize: 20,
        letterSpacing: '-0.5px',
        color: '#ffffff',
        textDecoration: 'none',
        flexShrink: 0,
      }}>
        Bubble
      </Link>

      {/* Center: ARC badge */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 100,
        padding: '3px 11px',
        fontSize: 10,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.35)',
        letterSpacing: '0.10em',
        flexShrink: 0,
      }}>
        ARC TESTNET
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

        {/* Wallet address pill */}
        {shortAddr ? (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 100,
            padding: '4px 11px',
            fontSize: 11,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.50)',
            display: 'flex', alignItems: 'center', gap: 6,
            letterSpacing: '0.02em',
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#a3e635',
              boxShadow: '0 0 6px rgba(163,230,53,0.7)',
            }} />
            {shortAddr}
          </div>
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
