import Link from 'next/link'

export function CTABanner() {
  return (
    <section style={{
      position: 'relative',
      padding: '120px 24px',
      overflow: 'hidden',
      textAlign: 'center',
      background: '#000000',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Deep gradient atmosphere — the most prominent gradient use */}
      <div aria-hidden style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgb(8,55,28) 0%, rgb(130,68,5) 50%, rgb(70,8,8) 100%)',
        opacity: 0.7,
        pointerEvents: 'none',
      }} />
      {/* Top fade from black */}
      <div aria-hidden style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 80,
        background: 'linear-gradient(to bottom, #000000, transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      {/* Bottom fade to black */}
      <div aria-hidden style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 80,
        background: 'linear-gradient(to top, #000000, transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 520, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4.5vw, 48px)',
          fontWeight: 300,
          letterSpacing: '-1px',
          marginBottom: 16,
          color: '#ffffff',
          lineHeight: 1.15,
        }}>
          Try it yourself, right now.
        </h2>
        <p style={{
          fontSize: 15,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 40,
          lineHeight: 1.6,
        }}>
          On Arc Testnet — no real money needed.
          Get free USDC from the faucet and experience instant cross-chain payments.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            display: 'inline-block',
            background: '#a3e635',
            color: '#000000',
            borderRadius: 100,
            padding: '13px 32px',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
          }}>
            Create free account
          </Link>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 100,
              padding: '13px 28px',
              fontWeight: 400,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Get testnet USDC
          </a>
        </div>
      </div>
    </section>
  )
}
