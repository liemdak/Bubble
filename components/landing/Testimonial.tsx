export function Testimonial() {
  return (
    <section style={{
      position: 'relative',
      background: '#000000',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '100px 24px',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* Atmospheric orbs */}
      <div aria-hidden style={{
        position: 'absolute',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(12,95,48,0.28) 0%, transparent 65%)',
        top: -200, left: -100,
        pointerEvents: 'none',
        animation: 'orb-drift-a 26s ease-in-out infinite',
      }} />
      <div aria-hidden style={{
        position: 'absolute',
        width: 550, height: 550,
        background: 'radial-gradient(circle, rgba(108,10,10,0.22) 0%, transparent 65%)',
        bottom: -150, right: -80,
        pointerEvents: 'none',
        animation: 'orb-drift-c 20s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 580, margin: '0 auto' }}>
        <blockquote style={{
          fontSize: 'clamp(17px, 2.8vw, 22px)',
          fontWeight: 300,
          lineHeight: 1.55,
          letterSpacing: '-0.2px',
          marginBottom: 28,
          color: 'rgba(255,255,255,0.80)',
        }}>
          &ldquo;Finally an app where I just type what I want and it works.
          No confusing wallet UI, no network switching. Type, confirm, done.&rdquo;
        </blockquote>

        <p style={{
          fontWeight: 400,
          fontSize: 13,
          marginBottom: 20,
          color: 'rgba(255,255,255,0.32)',
          letterSpacing: '0.04em',
        }}>
          Beta tester, Arc Testnet
        </p>

        <div style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 100,
          padding: '6px 18px',
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.40)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Testnet — free to try
        </div>
      </div>
    </section>
  )
}
