'use client'

import Link from 'next/link'
import { BubbleField } from '../bubbles/BubbleField'

export function Hero() {
  return (
    <section style={{
      position: 'relative',
      background: 'linear-gradient(rgb(137,229,240), rgb(182,239,246) 27%, rgb(204,243,250) 35%, rgb(197,243,248) 55%, #ffffff)',
      padding: '80px 24px 120px',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* Floating bubbles in background */}
      <BubbleField count={10} sizeRange={[30, 120]} opacityRange={[0.10, 0.25]} seed={7} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto' }}>
        {/* Pill badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#ffffff',
          border: '1px solid #171717',
          borderRadius: 100,
          padding: '6px 14px',
          fontSize: 14,
          fontWeight: 500,
          boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
          marginBottom: 32,
        }}>
          <span>⚡</span>
          <span>Built on Arc · Powered by Circle</span>
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(40px, 7vw, 64px)',
          fontWeight: 700,
          letterSpacing: '-1.344px',
          lineHeight: 1.14,
          color: '#000000',
          marginBottom: 24,
        }}>
          Send money the way<br />you talk.
        </h1>

        {/* Subheading */}
        <p style={{
          fontSize: 18,
          fontWeight: 500,
          color: '#333333',
          lineHeight: 1.55,
          marginBottom: 40,
          maxWidth: 520,
          margin: '0 auto 40px',
        }}>
          Just type <em style={{ fontStyle: 'normal', background: '#a3e635', padding: '2px 6px', borderRadius: 4 }}>"send 100 USDC to Mike"</em> — Bubble handles the rest.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            background: '#a3e635',
            color: '#000000',
            borderRadius: 4,
            padding: '12px 24px',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            textDecoration: 'none',
          }}>
            Get Started — free →
          </Link>
          <button style={{
            background: '#ffffff',
            color: '#000000',
            border: '1px solid #171717',
            borderRadius: 4,
            padding: '12px 24px',
            fontWeight: 500,
            fontSize: 16,
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            cursor: 'pointer',
          }}>
            ▷ Watch demo
          </button>
        </div>

        {/* Chat UI mockup */}
        <div style={{
          marginTop: 64,
          background: '#ffffff',
          border: '1px solid #171717',
          borderRadius: 8,
          padding: '20px',
          boxShadow: 'rgb(10,10,13) 4px 4px 0px 0px',
          maxWidth: 480,
          margin: '64px auto 0',
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🫧</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Bubble</span>
            <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#a3e635', display: 'block' }} />
          </div>

          {/* Sample messages */}
          <MockMessage role="user" text="Send 50 USDC to Sarah" />
          <MockMessage role="assistant" text="Got it! Here's the summary:" />
          <MockConfirmCard />
          <MockMessage role="assistant" text="✓ Sent! View on ArcScan →" success />
        </div>
      </div>
    </section>
  )
}

function MockMessage({ role, text, success = false }: { role: 'user' | 'assistant'; text: string; success?: boolean }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 8,
    }}>
      <div style={{
        background: isUser ? '#a3e635' : success ? '#a3e635' : '#ffffff',
        border: isUser ? 'none' : '1px solid #171717',
        borderRadius: isUser ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
        maxWidth: '75%',
      }}>
        {text}
      </div>
    </div>
  )
}

function MockConfirmCard() {
  return (
    <div style={{
      border: '1.5px solid #171717',
      borderRadius: 8,
      padding: '12px',
      marginBottom: 8,
      boxShadow: 'rgb(10,10,13) 4px 4px 0px 0px',
      borderLeft: '4px solid #2775CA',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Send USDC</div>
      <div style={{ fontSize: 12, color: '#444', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span>To: Sarah · 0xAb12...3F9c</span>
        <span>Amount: 50 USDC</span>
        <span>Fee: ~$0.006 (sponsored)</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button style={{ flex: 1, background: '#a3e635', border: 'none', borderRadius: 4, padding: '6px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Confirm</button>
        <button style={{ background: '#fff', border: '1px solid #171717', borderRadius: 4, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>✗</button>
      </div>
    </div>
  )
}
