'use client'

import Link from 'next/link'

export function Hero() {
  return (
    <section style={{
      position: 'relative',
      background: 'linear-gradient(160deg, rgb(137,229,240) 0%, rgb(182,239,246) 25%, rgb(210,245,252) 50%, #ffffff 85%)',
      padding: '88px 24px 0',
      overflow: 'hidden',
      textAlign: 'center',
      minHeight: 640,
    }}>
      {/* Subtle floating circles */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {BUBBLES.map((b) => (
          <div key={b.id} style={{
            position: 'absolute',
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.65), transparent 60%)',
            border: '1.5px solid rgba(255,255,255,0.55)',
            backdropFilter: 'blur(2px)',
            opacity: b.opacity,
            animation: `floatBubble ${b.duration}s ease-in-out infinite`,
            animationDelay: `${b.delay}s`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto' }}>
        {/* Pill badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#ffffff', border: '1px solid #171717',
          borderRadius: 100, padding: '6px 14px',
          fontSize: 13, fontWeight: 500,
          boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
          marginBottom: 32,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a3e635', display: 'inline-block' }} />
          Built on Arc · Powered by Circle
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(38px, 7vw, 64px)',
          fontWeight: 700,
          letterSpacing: '-1.344px',
          lineHeight: 1.12,
          color: '#000000',
          marginBottom: 22,
        }}>
          Send money the way<br />you talk.
        </h1>

        {/* Subheading */}
        <p style={{
          fontSize: 18,
          fontWeight: 500,
          color: '#333333',
          lineHeight: 1.6,
          maxWidth: 500,
          margin: '0 auto 40px',
        }}>
          Type{' '}
          <span style={{ background: '#a3e635', padding: '2px 7px', borderRadius: 4, fontStyle: 'normal' }}>
            &quot;send 100 USDC to Mike&quot;
          </span>
          {' '}— Bubble handles the rest.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          <Link href="/register" style={{
            background: '#a3e635', color: '#000000',
            borderRadius: 4, padding: '13px 28px',
            fontWeight: 700, fontSize: 16,
            boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
            textDecoration: 'none', display: 'inline-block',
          }}>
            Get started free →
          </Link>
          <Link href="/login" style={{
            background: '#ffffff', color: '#000000',
            border: '1px solid #171717', borderRadius: 4,
            padding: '13px 28px', fontWeight: 500, fontSize: 16,
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            textDecoration: 'none', display: 'inline-block',
          }}>
            Log in
          </Link>
        </div>

        {/* Chat mockup */}
        <div style={{
          background: '#ffffff', border: '1px solid #171717',
          borderRadius: '12px 12px 0 0',
          padding: '18px 18px 0',
          boxShadow: 'rgb(10,10,13) 4px 4px 0px 0px',
          maxWidth: 440, margin: '0 auto',
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🫧</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Bubble</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888', fontWeight: 500 }}>Arc Testnet</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a3e635', display: 'inline-block' }} />
          </div>
          <MockMsg role="user" text="Send 50 USDC to Sarah" />
          <MockMsg role="assistant" text="Got it. Here's the summary:" />
          <MockCard />
          <MockMsg role="assistant" text="✓ Sent! View on ArcScan →" success />
          <div style={{ height: 18 }} />
        </div>
      </div>

      {/* 3D Wave animation */}
      <WaveStack />

      <style>{`
        @keyframes floatBubble {
          0%   { transform: translateY(0px) scale(1); }
          50%  { transform: translateY(-18px) scale(1.04); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes wave1 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave2 {
          0%   { transform: translateX(-20%); }
          100% { transform: translateX(-70%); }
        }
        @keyframes wave3 {
          0%   { transform: translateX(-10%); }
          100% { transform: translateX(-60%); }
        }
      `}</style>
    </section>
  )
}

// ── 3-layer wave stack ─────────────────────────────────────────────────────────
function WaveStack() {
  return (
    <div style={{ position: 'relative', height: 90, marginTop: 0, overflow: 'hidden' }}>
      {/* Wave 1 — back, slow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: '200%', animation: 'wave1 14s linear infinite',
      }}>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ display: 'block', width: '100%' }}>
          <path
            d="M0,45 C180,85 360,5 540,45 C720,85 900,5 1080,45 C1260,85 1350,20 1440,45 L1440,90 L0,90 Z"
            fill="rgba(137,229,240,0.25)"
          />
        </svg>
      </div>

      {/* Wave 2 — mid */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: '200%', animation: 'wave2 9s linear infinite',
      }}>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ display: 'block', width: '100%' }}>
          <path
            d="M0,55 C200,15 400,75 600,45 C800,15 1000,75 1200,45 C1320,25 1400,60 1440,50 L1440,90 L0,90 Z"
            fill="rgba(100,210,240,0.30)"
          />
        </svg>
      </div>

      {/* Wave 3 — front, fast, solid */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: '200%', animation: 'wave3 6s linear infinite',
      }}>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ display: 'block', width: '100%' }}>
          <path
            d="M0,60 C240,20 480,80 720,50 C960,20 1200,70 1440,40 L1440,90 L0,90 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    </div>
  )
}

// ── Mock chat messages ─────────────────────────────────────────────────────────
function MockMsg({ role, text, success = false }: { role: 'user' | 'assistant'; text: string; success?: boolean }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        background: isUser ? '#a3e635' : success ? '#a3e635' : '#f5f5f5',
        border: isUser || success ? 'none' : '1px solid #e5e5e5',
        borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        padding: '8px 13px', fontSize: 13, fontWeight: 500,
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
      border: '1px solid #e5e5e5', borderLeft: '4px solid #2775CA',
      borderRadius: 8, padding: '11px 13px', marginBottom: 8,
      background: '#fafafa',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Send USDC</div>
      <div style={{ fontSize: 12, color: '#555', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>To: Sarah · 0xAb12...3F9c</span>
        <span>Amount: 50 USDC · Fee: sponsored</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
        <button style={{ flex: 1, background: '#a3e635', border: 'none', borderRadius: 4, padding: '5px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Confirm</button>
        <button style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>✗</button>
      </div>
    </div>
  )
}

// ── Bubble data ────────────────────────────────────────────────────────────────
const BUBBLES = [
  { id: 1,  x: 5,  y: 12, size: 64,  opacity: 0.18, duration: 7,  delay: 0   },
  { id: 2,  x: 88, y: 8,  size: 96,  opacity: 0.14, duration: 9,  delay: 1.5 },
  { id: 3,  x: 72, y: 55, size: 48,  opacity: 0.20, duration: 6,  delay: 0.8 },
  { id: 4,  x: 15, y: 60, size: 80,  opacity: 0.12, duration: 11, delay: 2.2 },
  { id: 5,  x: 50, y: 5,  size: 36,  opacity: 0.22, duration: 8,  delay: 3   },
  { id: 6,  x: 93, y: 40, size: 55,  opacity: 0.16, duration: 10, delay: 0.3 },
]
