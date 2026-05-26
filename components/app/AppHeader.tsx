'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BubbleLogo } from '@/components/ui/BubbleLogo'
import { playBubbleTap } from '@/lib/sounds'

interface AppHeaderProps {
  address?: string
}

export function AppHeader({ address }: AppHeaderProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
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
      background: 'rgba(6, 6, 15, 0.55)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '0 16px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      zIndex: 20,
      gap: 8,
    }}>

      {/* Logo */}
      <Link href="/chat" style={{
        display: 'flex', alignItems: 'center', gap: 7,
        textDecoration: 'none', color: '#fff', flexShrink: 0,
      }}>
        <BubbleLogo size={26} />
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: '#fff' }}>Bubble</span>
      </Link>

      {/* Arc badge */}
      <div className="arc-badge" style={{
        background: 'rgba(163,230,53,0.12)',
        border: '1px solid rgba(163,230,53,0.3)',
        borderRadius: 100,
        padding: '4px 12px',
        fontSize: 11,
        fontWeight: 700,
        color: '#a3e635',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        ARC TESTNET
      </div>
      <style>{`
        @media (max-width: 360px) { .arc-badge { display: none !important; } }
      `}</style>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {shortAddr ? (
          <Link href="/balance" style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 100,
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#a3e635',
              boxShadow: '0 0 6px rgba(163,230,53,0.8)',
            }} />
            {shortAddr}
          </Link>
        ) : (
          <Link href="/login" style={{
            background: '#a3e635', border: '1px solid #8bc920',
            borderRadius: 100, padding: '5px 14px',
            fontSize: 11, fontWeight: 700, color: '#000',
            textDecoration: 'none',
          }}>
            Connect
          </Link>
        )}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Disconnect wallet"
          onMouseEnter={() => setHoverLogout(true)}
          onMouseLeave={() => setHoverLogout(false)}
          style={{
            height: 32, borderRadius: 100,
            background: hoverLogout ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${hoverLogout ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.12)'}`,
            padding: '0 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loggingOut ? 'wait' : 'pointer',
            fontSize: 11, fontWeight: 600,
            color: hoverLogout ? '#ff6b6b' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {loggingOut ? 'Bye…' : 'Disconnect'}
        </button>
      </div>
    </header>
  )
}
