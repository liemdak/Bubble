'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BubbleLogo } from '@/components/ui/BubbleLogo'
import { playBubbleTap } from '@/lib/sounds'

interface AppHeaderProps {
  address?: string
  isCircleWallet?: boolean   // true = showing Circle wallet (where funds live)
}

export function AppHeader({ address, isCircleWallet }: AppHeaderProps) {
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
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
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
        textDecoration: 'none', color: '#000', flexShrink: 0,
      }}>
        <BubbleLogo size={26} />
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>Bubble</span>
      </Link>

      {/* Arc badge — hidden on very small screens */}
      <div className="arc-badge" style={{
        background: 'rgba(163,230,53,0.12)',
        border: '1px solid rgba(163,230,53,0.35)',
        borderRadius: 100,
        padding: '4px 12px',
        fontSize: 11,
        fontWeight: 700,
        color: '#3a6e00',
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
          <Link
            href="/balance"
            title={isCircleWallet ? 'Your Circle wallet (funds live here)' : 'Connected wallet'}
            style={{
              background: '#f8f8f8',
              border: '1px solid #e0e0e0',
              borderRadius: 100,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: '#333',
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#efefef')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f8f8f8')}
          >
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#a3e635',
              boxShadow: '0 0 6px rgba(163,230,53,0.8)',
            }} />
            {shortAddr}
            {isCircleWallet && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: '#2775CA',
                background: 'rgba(39,117,202,0.1)',
                borderRadius: 4, padding: '1px 4px',
                letterSpacing: '0.03em',
              }}>
                ◎
              </span>
            )}
          </Link>
        ) : (
          <Link href="/login" style={{
            background: '#a3e635', border: '1px solid #8bc920',
            borderRadius: 100, padding: '5px 14px',
            fontSize: 11, fontWeight: 700, color: '#000',
            textDecoration: 'none', boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
          }}>
            Connect
          </Link>
        )}

        {/* Disconnect — text only */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Disconnect wallet"
          onMouseEnter={() => setHoverLogout(true)}
          onMouseLeave={() => setHoverLogout(false)}
          style={{
            height: 32, borderRadius: 100,
            background: hoverLogout ? '#fff0f0' : '#f8f8f8',
            border: `1px solid ${hoverLogout ? '#ffcccc' : '#e0e0e0'}`,
            padding: '0 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loggingOut ? 'wait' : 'pointer',
            fontSize: 11, fontWeight: 600,
            color: hoverLogout ? '#cc0000' : '#aaa',
            transition: 'all 0.15s',
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            fontFamily: 'inherit',
          }}
        >
          {loggingOut ? 'Bye…' : 'Disconnect'}
        </button>
      </div>
    </header>
  )
}
