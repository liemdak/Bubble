import { BubbleField } from '../bubbles/BubbleField'

export function Testimonial() {
  return (
    <section style={{
      position: 'relative',
      background: '#fbbf25',
      padding: '80px 24px',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      <BubbleField count={5} sizeRange={[40, 100]} opacityRange={[0.08, 0.15]} seed={13} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
        <blockquote style={{
          fontSize: 'clamp(18px, 3vw, 24px)',
          fontWeight: 700,
          lineHeight: 1.4,
          letterSpacing: '-0.24px',
          marginBottom: 24,
        }}>
          "Bubble made paying my team in different countries actually simple."
        </blockquote>

        <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 16 }}>
          — Alex K., Startup Founder
        </p>

        <div style={{
          display: 'inline-block',
          background: '#ffffff',
          border: '1px solid #171717',
          borderRadius: 100,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 500,
          boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
        }}>
          ✓ Verified user
        </div>
      </div>
    </section>
  )
}
