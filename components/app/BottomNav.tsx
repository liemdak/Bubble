'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { playBubbleTap } from '@/lib/sounds'

const TABS = [
  { href: '/chat',     emoji: '🫧', label: 'Chat' },
  { href: '/balance',  emoji: '💳', label: 'Balance' },
  { href: '/contacts', emoji: '👥', label: 'Contacts' },
  { href: '/history',  emoji: '📋', label: 'History' },
  { href: '/settings', emoji: '⚙️', label: 'Settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      borderTop: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(6,6,15,0.75)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      display: 'flex',
      height: 'calc(64px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      flexShrink: 0,
    }} className="bottom-nav">
      {TABS.map(({ href, emoji, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={() => playBubbleTap()}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              position: 'relative',
              paddingTop: 6,
              transition: 'opacity 0.15s',
            }}
          >
            {/* Green indicator */}
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 24, height: 3,
                background: '#a3e635',
                borderRadius: '0 0 3px 3px',
                boxShadow: '0 2px 8px rgba(163,230,53,0.6)',
              }} />
            )}

            <div style={{
              width: 38, height: 34,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? 'rgba(163,230,53,0.15)' : 'transparent',
              fontSize: 18,
              transition: 'background 0.15s',
            }}>
              {emoji}
            </div>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? '#a3e635' : 'rgba(255,255,255,0.35)',
              letterSpacing: '0.01em',
            }}>
              {label}
            </span>
          </Link>
        )
      })}

      <style>{`
        @media (min-width: 769px) { .bottom-nav { display: none !important; } }
      `}</style>
    </nav>
  )
}
