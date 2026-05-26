'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { BubbleLogo } from '@/components/ui/BubbleLogo'
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
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '0 18px',
      height: 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      zIndex: 20,
      gap: 12,
    }}>

      {/* ── Left: logo → Chat ── */}
      <Link href="/chat" style={{
        display: 'flex', alignItems: 'center', gap: 7,
        textDecoration: 'none', flexShrink: 0,
      }}>
        <BubbleLogo size={24} />
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px', color: '#fff' }}>
          Bubble
        </span>
      </Link>

      {/* ── Center: ARC badge ── */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 100,
        padding: '3px 11px',
        fontSize: 10,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.08em',
        flexShrink: 0,
      }}>
        ARC TESTNET
      </div>

      {/* ── Right: nav + wallet ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

        {/* Nav links — Balance / Contacts / History */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 8 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => playBubbleTap()}
                style={{
                  padding: '5px 11px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#38bdf8' : 'rgba(255,255,255,0.45)',
                  textDecoration: 'none',
                  background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                    e.currentTarget.style.background = 'transparent'
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
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 100,
            padding: '4px 11px',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', gap: 5,
            letterSpacing: '0.02em',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#38bdf8',
              boxShadow: '0 0 6px rgba(56,189,248,0.8)',
            }} />
            {shortAddr}
          </div>
        ) : (
          <Link href="/login" style={{
            background: '#38bdf8',
            border: 'none',
            borderRadius: 100, padding: '5px 14px',
            fontSize: 11, fontWeight: 700, color: '#000',
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
            height: 30, borderRadius: 100,
            background: hoverLogout ? 'rgba(255,80,80,0.12)' : 'transparent',
            border: `1px solid ${hoverLogout ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.1)'}`,
            padding: '0 11px',
            display: 'flex', alignItems: 'center',
            cursor: loggingOut ? 'wait' : 'pointer',
            fontSize: 11, fontWeight: 500,
            color: hoverLogout ? '#ff6b6b' : 'rgba(255,255,255,0.35)',
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
