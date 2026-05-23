'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#ffffff',
      borderBottom: '1px solid #171717',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 20 }}>
          <span style={{ fontSize: 24 }}>🫧</span>
          <span>Bubble</span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
          <NavLinks />
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login" style={{
              background: '#ffffff',
              color: '#000000',
              border: '1px solid #171717',
              borderRadius: 4,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: 14,
              boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            }}>
              Log in
            </Link>
            <Link href="/register" style={{
              background: '#a3e635',
              color: '#000000',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 14,
              boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            }}>
              Get Started →
            </Link>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
          className="mobile-menu-btn"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div style={{
          borderTop: '1px solid #171717',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <NavLinks mobile />
          <Link href="/login" style={{ fontWeight: 500, fontSize: 15 }}>Log in</Link>
          <Link href="/register" style={{
            background: '#a3e635',
            color: '#000',
            borderRadius: 4,
            padding: '10px 16px',
            fontWeight: 700,
            textAlign: 'center',
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
          }}>
            Get Started →
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  )
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const links = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#faq', label: 'FAQ' },
  ]
  return (
    <>
      {links.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          style={{
            color: '#000',
            fontWeight: 500,
            fontSize: mobile ? 15 : 14,
            textDecoration: 'none',
          }}
        >
          {label}
        </a>
      ))}
    </>
  )
}
