import Link from 'next/link'

export function CTABanner() {
  return (
    <section style={{
      position: 'relative',
      background: 'linear-gradient(135deg, rgb(219,244,181) 0%, rgb(198,238,137) 100%)',
      padding: '80px 24px',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* Decorative circles */}
      <div aria-hidden style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
        top: -80, right: -40, pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)',
        bottom: -50, left: 60, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          marginBottom: 12,
          color: '#000',
        }}>
          Try it on Arc Testnet.
        </h2>
        <p style={{
          fontSize: 16, fontWeight: 500,
          color: '#333', marginBottom: 36, lineHeight: 1.55,
        }}>
          No real money. Get testnet USDC from the faucet,
          then send, swap, and bridge for free.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            display: 'inline-block',
            background: '#000000', color: '#a3e635',
            borderRadius: 4, padding: '13px 32px',
            fontWeight: 700, fontSize: 16,
            boxShadow: 'rgb(163,230,53) 2px 2px 0px 0px',
            textDecoration: 'none',
          }}>
            Create free account →
          </Link>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#ffffff', color: '#000',
              border: '1px solid #171717',
              borderRadius: 4, padding: '13px 24px',
              fontWeight: 500, fontSize: 16,
              boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
              textDecoration: 'none',
            }}
          >
            Get testnet USDC ↗
          </a>
        </div>
      </div>
    </section>
  )
}
