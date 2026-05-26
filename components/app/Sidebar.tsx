'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { playBubbleTap } from '@/lib/sounds'
import type { Contact } from '@/types/db'

export function Sidebar() {
  const pathname = usePathname()
  const isChat   = pathname === '/'
  const [open, setOpen]         = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(false)

  // Load contacts when drawer opens
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
    // Prefill chat input via global event (ChatInput listens for this)
    window.dispatchEvent(
      new CustomEvent('bubblepay:prefill', { detail: `Send  USDC to ${name}` })
    )
  }

  return (
    <>
      {/* ── Collapsed strip — always visible on desktop ── */}
      <div
        className="app-sidebar-strip"
        style={{
          width: 40,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,6,15,0.65)',
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
        {/* 🫧 — on chat page: opens contacts drawer; on other pages: goes back to chat */}
        {isChat ? (
          <button
            onClick={() => { playBubbleTap(); setOpen(true) }}
            title="Quick send"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'rgba(255,255,255,0.3)',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(56,189,248,0.12)'
              e.currentTarget.style.color = '#38bdf8'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
            }}
          >
            🫧
          </button>
        ) : (
          <Link
            href="/"
            onClick={() => playBubbleTap()}
            title="Back to chat"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'transparent',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'rgba(255,255,255,0.3)',
              transition: 'background 0.12s, color 0.12s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(56,189,248,0.12)'
              ;(e.currentTarget as HTMLAnchorElement).style.color = '#38bdf8'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)'
            }}
          >
            🫧
          </Link>
        )}

        {/* Contact initials — quick jump */}
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center' }}>
          {contacts.slice(0, 5).map((c) => (
            <div
              key={c.id}
              title={`Send to ${c.name}`}
              onClick={() => sendToContact(c.name)}
              style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background: 'rgba(56,189,248,0.13)',
                border: '1.5px solid rgba(56,189,248,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#38bdf8',
                cursor: 'pointer',
                transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(56,189,248,0.28)'
                el.style.borderColor = '#38bdf8'
                el.style.boxShadow = '0 0 10px rgba(56,189,248,0.35)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(56,189,248,0.13)'
                el.style.borderColor = 'rgba(56,189,248,0.28)'
                el.style.boxShadow = 'none'
              }}
            >
              {c.name[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* ── Overlay + slide-in drawer ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { playBubbleTap(); setOpen(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Panel */}
          <div
            className="app-sidebar-panel"
            style={{
              position: 'fixed', top: 56, left: 40, bottom: 0, zIndex: 40,
              width: 240,
              background: 'rgba(8,8,18,0.93)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '6px 0 40px rgba(0,0,0,0.6)',
              animation: 'slideInLeft 0.18s ease',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 14px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>
                CONTACTS
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 18, color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                  lineHeight: 1, padding: '0 2px',
                  transition: 'color 0.12s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
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
                background: 'rgba(56,189,248,0.07)',
                border: '1px solid rgba(56,189,248,0.18)',
                borderRadius: 8,
                padding: '9px 11px',
                textDecoration: 'none',
                color: '#fff',
                display: 'flex', flexDirection: 'column', gap: 1,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(56,189,248,0.14)')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(56,189,248,0.07)')}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>💰 Portfolio Balance</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>View cross-chain balance</div>
            </Link>

            {/* Contact list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 28, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                  Loading…
                </div>
              ) : contacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 14px', color: 'rgba(255,255,255,0.25)', fontSize: 12, lineHeight: 1.8 }}>
                  No contacts yet.{' '}
                  <Link
                    href="/contacts"
                    onClick={() => setOpen(false)}
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700 }}
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
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(56,189,248,0.13)',
                      border: '1.5px solid rgba(56,189,248,0.28)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#38bdf8',
                    }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    {/* Name + address */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.name}</div>
                      <div style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.28)',
                        fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.address.slice(0, 10)}…{c.address.slice(-6)}
                      </div>
                    </div>
                    {/* Arrow hint */}
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>↗</span>
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
          .app-sidebar-strip  { display: none !important; }
          .app-sidebar-panel  { left: 0 !important; top: 56px !important; }
        }
      `}</style>
    </>
  )
}
