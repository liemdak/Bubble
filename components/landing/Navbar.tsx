'use client'

import Link from 'next/link'
import { useState } from 'react'

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 28px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          fontWeight: 600,
          fontSize: 22,
          color: '#ffffff',
          letterSpacing: '-0.5px',
        }}>
          Bubble
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="desktop-nav">
          <NavLinks />
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/login" style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 100,
              padding: '8px 20px',
              fontWeight: 400,
              fontSize: 14,
              transition: 'color 0.15s, border-color 0.15s',
            }}>
              Log in
            </Link>
            <Link href="/register" style={{
              background: '#a3e635',
              color: '#000000',
              border: 'none',
              borderRadius: 100,
              padding: '8px 20px',
              fontWeight: 600,
              fontSize: 14,
            }}>
              Get Started
            </Link>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'none',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            cursor: 'pointer',
            padding: '6px 10px',
            color: '#ffffff',
            fontSize: 18,
            lineHeight: 1,
          }}
          className="mobile-menu-btn"
          aria-label="Toggle menu"
        >
          {open ? '✕' : '≡'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '20px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <NavLinks mobile />
          <Link href="/login" style={{ fontWeight: 400, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>Log in</Link>
          <Link href="/register" style={{
            background: '#a3e635',
            color: '#000',
            borderRadius: 100,
            padding: '11px 20px',
            fontWeight: 600,
            textAlign: 'center',
          }}>
            Get Started
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav   { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  )
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const links = [
    { href: '#features',     label: 'Features'     },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#faq',          label: 'FAQ'          },
  ]
  return (
    <>
      {links.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 400,
            fontSize: mobile ? 15 : 14,
            letterSpacing: '0.01em',
            transition: 'color 0.15s',
          }}
        >
          {label}
        </a>
      ))}
    </>
  )
}
