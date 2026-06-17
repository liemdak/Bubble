'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { playBubbleTap } from '@/lib/sounds'
import type { Contact } from '@/types/db'

export function Sidebar() {
  const [open, setOpen]         = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(false)
  const pathname                = usePathname()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/contacts')
      .then(r => r.json())
      .then(d => setContacts(d.contacts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  function sendToContact(name: string) {
    playBubbleTap()
    setOpen(false)
    window.dispatchEvent(
      new CustomEvent('bubblepay:prefill', { detail: `Send  USDC to ${name}` })
    )
  }

  return (
    <>
      {/* ── Collapsed strip ── */}
      <div
        className="app-sidebar-strip"
        style={{
          width: 40,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(4,4,12,0.70)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          flexShrink: 0,
          gap: 2,
        }}
      >
        {/* Contacts toggle */}
        <button
          onClick={() => { playBubbleTap(); setOpen(v => !v) }}
          title="Contacts"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: open ? 'rgba(163,230,53,0.10)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 400,
            color: open ? '#a3e635' : 'rgba(255,255,255,0.20)',
            transition: 'background 0.12s, color 0.12s',
            letterSpacing: '2px',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            if (!open) {
              e.currentTarget.style.background = 'rgba(163,230,53,0.08)'
              e.currentTarget.style.color = '#a3e635'
            }
          }}
          onMouseLeave={e => {
            if (!open) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.20)'
            }
          }}
        >
          ···
        </button>

        {/* Book Agent shortcut */}
        <Link
          href="/agent"
          onClick={() => playBubbleTap()}
          title="Book Agent"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: pathname === '/agent' ? 'rgba(96,165,250,0.14)' : 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
            color: pathname === '/agent' ? '#93c5fd' : 'rgba(255,255,255,0.22)',
            transition: 'background 0.12s, color 0.12s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => {
            if (pathname !== '/agent') {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(96,165,250,0.10)'
              ;(e.currentTarget as HTMLAnchorElement).style.color = '#93c5fd'
            }
          }}
          onMouseLeave={e => {
            if (pathname !== '/agent') {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.22)'
            }
          }}
        >
          📚
        </Link>
      </div>

      {/* ── Overlay + slide-in drawer ── */}
      {open && (
        <>
          <div
            onClick={() => { playBubbleTap(); setOpen(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
            }}
          />

          <div
            className="app-sidebar-panel"
            style={{
              position: 'fixed', top: 56, left: 40, bottom: 0, zIndex: 40,
              width: 240,
              background: 'rgba(4,4,12,0.95)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '8px 0 40px rgba(0,0,0,0.7)',
              animation: 'slideInLeft 0.18s ease',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 14px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{
                fontWeight: 600, fontSize: 10,
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.28)',
                textTransform: 'uppercase',
              }}>
                Contacts
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 16, color: 'rgba(255,255,255,0.22)',
                  cursor: 'pointer', lineHeight: 1,
                  padding: '0 2px', transition: 'color 0.12s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}
              >
                ×
              </button>
            </div>

            {/* Balance shortcut */}
            <Link
              href="/balance"
              onClick={() => setOpen(false)}
              style={{
                margin: '8px 10px 0',
                background: 'rgba(163,230,53,0.05)',
                border: '1px solid rgba(163,230,53,0.14)',
                borderRadius: 8,
                padding: '9px 12px',
                textDecoration: 'none',
                color: '#fff',
                display: 'flex', flexDirection: 'column', gap: 2,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,230,53,0.10)')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,230,53,0.05)')}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: '#a3e635' }}>Portfolio Balance</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 300 }}>View cross-chain balance</div>
            </Link>

            {/* Contact list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 28, color: 'rgba(255,255,255,0.22)', fontSize: 12 }}>
                  Loading…
                </div>
              ) : contacts.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '28px 14px',
                  color: 'rgba(255,255,255,0.22)', fontSize: 12, lineHeight: 1.8,
                }}>
                  No contacts yet.{' '}
                  <Link
                    href="/contacts"
                    onClick={() => setOpen(false)}
                    style={{ color: '#a3e635', textDecoration: 'none', fontWeight: 600 }}
                  >
                    + Add one
                  </Link>
                </div>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => sendToContact(c.name)}
                    title={`Prefill: Send USDC to ${c.name}`}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      borderRadius: 8, padding: '9px 10px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {/* Initial avatar */}
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 12, fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                    }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 400, color: '#ffffff' }}>{c.name}</div>
                      <div style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.24)',
                        fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.address.slice(0, 10)}…{c.address.slice(-6)}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>↗</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-12px); opacity: 0.7; }
          to   { transform: translateX(0);     opacity: 1;   }
        }
        @media (max-width: 768px) {
          .app-sidebar-strip { display: none !important; }
          .app-sidebar-panel { left: 0 !important; top: 56px !important; }
        }
      `}</style>
    </>
  )
}
