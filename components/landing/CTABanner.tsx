import Link from 'next/link'
import { BubbleField } from '../bubbles/BubbleField'

export function CTABanner() {
  return (
    <section style={{
      position: 'relative',
      background: 'linear-gradient(rgb(219,244,181), rgb(198,238,137))',
      padding: '80px 24px',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      <BubbleField count={6} sizeRange={[50, 130]} opacityRange={[0.08, 0.18]} seed={99} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 700,
          letterSpacing: '-0.544px',
          marginBottom: 32,
        }}>
          Start sending in 60 seconds.
        </h2>

        <Link href="/register" style={{
          display: 'inline-block',
          background: '#000000',
          color: '#a3e635',
          borderRadius: 4,
          padding: '14px 32px',
          fontWeight: 700,
          fontSize: 16,
          boxShadow: 'rgb(163,230,53) 2px 2px 0px 0px',
          textDecoration: 'none',
        }}>
          Create your free account →
        </Link>
      </div>
    </section>
  )
}
