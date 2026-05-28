'use client'

import Link from 'next/link'

export function Hero() {
  return (
    <section style={{
      position: 'relative',
      background: '#03060a',
      padding: '100px 24px 0',
      overflow: 'hidden',
      textAlign: 'center',
      minHeight: 680,
    }}>
      {/* ── Atmospheric gradient orbs ─────────────────────────────────────── */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* Green orb — top left */}
        <div style={{
          position: 'absolute',
          width: 720, height: 720,
          background: 'radial-gradient(circle, rgba(12, 95, 48, 0.55) 0%, transparent 68%)',
          top: -180, left: -120,
          animation: 'orb-drift-a 22s ease-in-out infinite',
        }} />
        {/* Amber orb — top right */}
        <div style={{
          position: 'absolute',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(185, 105, 8, 0.42) 0%, transparent 65%)',
          top: -60, right: -120,
          animation: 'orb-drift-b 28s ease-in-out infinite',
        }} />
        {/* Crimson orb — bottom center */}
        <div style={{
          position: 'absolute',
          width: 520, height: 520,
          background: 'radial-gradient(circle, rgba(108, 10, 10, 0.38) 0%, transparent 65%)',
          bottom: 40, left: '28%',
          animation: 'orb-drift-c 18s ease-in-out infinite',
        }} />
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 100,
          padding: '6px 16px',
          fontSize: 12,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: '0.04em',
          marginBottom: 36,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635', display: 'inline-block' }} />
          Built on Arc · Powered by Circle
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(36px, 6.5vw, 64px)',
          fontWeight: 300,
          letterSpacing: '-1.5px',
          lineHeight: 1.12,
          color: '#ffffff',
          marginBottom: 24,
        }}>
          Send money the way<br />you talk.
        </h1>

        {/* Subheading */}
        <p style={{
          fontSize: 17,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.52)',
          lineHeight: 1.65,
          maxWidth: 460,
          margin: '0 auto 44px',
        }}>
          Type{' '}
          <span style={{
            background: 'rgba(163,230,53,0.18)',
            color: '#a3e635',
            border: '1px solid rgba(163,230,53,0.3)',
            padding: '2px 9px',
            borderRadius: 6,
            fontStyle: 'normal',
          }}>
            &quot;send 100 USDC to Mike&quot;
          </span>
          {' '}— Bubble handles the rest.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72 }}>
          <Link href="/register" style={{
            background: '#a3e635',
            color: '#000000',
            borderRadius: 100,
            padding: '13px 32px',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
          }}>
            Get started free
          </Link>
          <Link href="/login" style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 100,
            padding: '13px 32px',
            fontWeight: 400,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
          }}>
            Log in
          </Link>
        </div>

        {/* Chat mockup — frosted glass card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '14px 14px 0 0',
          padding: '18px 18px 0',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 0 80px rgba(163,230,53,0.06), 0 20px 60px rgba(0,0,0,0.5)',
          maxWidth: 440,
          margin: '0 auto',
          textAlign: 'left',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 14,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingBottom: 12,
          }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#ffffff' }}>Bubble</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}>Arc Testnet</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635', display: 'inline-block' }} />
          </div>
          <MockMsg role="user"      text="Send 50 USDC to Sarah" />
          <MockMsg role="assistant" text="Got it. Here's the summary:" />
          <MockCard />
          <MockMsg role="assistant" text="Sent. View on ArcScan" success />
          <div style={{ height: 20 }} />
        </div>
      </div>

      {/* Bottom fade to black */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 80,
        background: 'linear-gradient(to bottom, transparent, #000000)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />
    </section>
  )
}

// ── Mock chat ──────────────────────────────────────────────────────────────────
function MockMsg({ role, text, success = false }: { role: 'user' | 'assistant'; text: string; success?: boolean }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        background: isUser
          ? 'rgba(163,230,53,0.15)'
          : success
          ? 'rgba(163,230,53,0.12)'
          : 'rgba(255,255,255,0.06)',
        border: isUser
          ? '1px solid rgba(163,230,53,0.3)'
          : success
          ? '1px solid rgba(163,230,53,0.25)'
          : '1px solid rgba(255,255,255,0.08)',
        color: isUser || success ? '#a3e635' : 'rgba(255,255,255,0.75)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '8px 14px',
        fontSize: 12,
        fontWeight: 400,
        maxWidth: '78%',
      }}>
        {text}
      </div>
    </div>
  )
}

function MockCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderLeft: '3px solid #2775CA',
      borderRadius: 8,
      padding: '11px 14px',
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#ffffff', marginBottom: 6, letterSpacing: '0.04em' }}>
        SEND USDC
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', flexDirection: 'column', gap: 2, fontWeight: 300 }}>
        <span>To: Sarah · 0xAb12...3F9c</span>
        <span>Amount: 50 USDC · Fee: sponsored</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button style={{
          flex: 1, background: '#a3e635', border: 'none',
          borderRadius: 100, padding: '5px', fontSize: 11,
          fontWeight: 600, cursor: 'pointer', color: '#000',
        }}>
          Confirm
        </button>
        <button style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 100, padding: '5px 12px',
          fontSize: 11, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
        }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
