'use client'

import { useState } from 'react'
import Link from 'next/link'
import { playBubbleTap } from '@/lib/sounds'

const SAMPLE_CONTACTS = [
  { name: 'Sarah', address: '0xAb12...3F9c', chain: 'arc' },
  { name: 'Mike',  address: '0x1234...5678', chain: 'arc' },
  { name: 'Alice', address: '0xDead...Beef', chain: 'ethereum' },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Collapsed strip — always visible on desktop */}
      <div
        className="app-sidebar-strip"
        style={{
          width: 40,
          borderRight: '1px solid rgba(0,0,0,0.07)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          flexShrink: 0,
          gap: 2,
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => { playBubbleTap(); setOpen(true) }}
          title="Open contacts"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'transparent', border: 'none',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: '#aaa',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(163,230,53,0.12)'
            e.currentTarget.style.color = '#3a6e00'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#aaa'
          }}
        >
          ☰
        </button>

        {/* Contact initials — quick jump */}
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center' }}>
          {SAMPLE_CONTACTS.map((c) => (
            <div
              key={c.name}
              title={c.name}
              style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background: '#f0f0f0',
                border: '1.5px solid #e0e0e0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#555',
                cursor: 'pointer',
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(163,230,53,0.15)'
                el.style.borderColor = 'rgba(163,230,53,0.5)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = '#f0f0f0'
                el.style.borderColor = '#e0e0e0'
              }}
            >
              {c.name[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Overlay + drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { playBubbleTap(); setOpen(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.18)',
            }}
          />

          {/* Slide-in panel */}
          <div
            className="app-sidebar-panel"
            style={{
              position: 'fixed', top: 56, left: 40, bottom: 0, zIndex: 40,
              width: 220,
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(0,0,0,0.07)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
              animation: 'slideInLeft 0.18s ease',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 14px 10px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: '#888' }}>
                CONTACTS
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{
                  background: '#a3e635', border: 'none',
                  borderRadius: 4, padding: '3px 8px',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
                  fontFamily: 'inherit',
                }}>
                  + Add
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 16, color: '#bbb', cursor: 'pointer',
                    lineHeight: 1, padding: '0 2px',
                    transition: 'color 0.12s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#555')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#bbb')}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Balance link */}
            <Link href="/balance" onClick={() => setOpen(false)} style={{
              margin: '8px 10px 0',
              background: 'rgba(163,230,53,0.08)',
              border: '1px solid rgba(163,230,53,0.25)',
              borderRadius: 8,
              padding: '9px 11px',
              textDecoration: 'none',
              color: '#000',
              display: 'flex', flexDirection: 'column', gap: 1,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,230,53,0.16)')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,230,53,0.08)')}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3a6e00' }}>Portfolio Balance</div>
              <div style={{ fontSize: 10, color: '#999' }}>View cross-chain balance</div>
            </Link>

            {/* Contacts */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
              {SAMPLE_CONTACTS.map((c) => (
                <button
                  key={c.name}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    borderRadius: 8, padding: '9px 10px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#f0f0f0', border: '1.5px solid #e0e0e0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 13, fontWeight: 700,
                  }}>
                    {c.name[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>{c.address}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-12px); opacity: 0.7; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .app-sidebar-strip { display: none !important; }
          .app-sidebar-panel { left: 0 !important; top: 56px !important; }
        }
      `}</style>
    </>
  )
}
