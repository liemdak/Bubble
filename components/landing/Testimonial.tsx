export function Testimonial() {
  return (
    <section style={{
      position: 'relative',
      background: '#fbbf25',
      padding: '72px 24px',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* Decorative large circles */}
      <div aria-hidden style={{
        position: 'absolute', width: 320, height: 320, borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
        top: -80, left: -60, pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', width: 200, height: 200, borderRadius: '50%',
        background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.2)',
        bottom: -40, right: 80, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
        <blockquote style={{
          fontSize: 'clamp(17px, 3vw, 22px)',
          fontWeight: 700,
          lineHeight: 1.45,
          letterSpacing: '-0.24px',
          marginBottom: 20,
          color: '#000',
        }}>
          &ldquo;Finally an app where I just type what I want to do and it works.
          No confusing wallet UI, no gas estimations. Just done.&rdquo;
        </blockquote>

        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: '#333' }}>
          — Beta tester, Arc Testnet
        </p>

        <div style={{
          display: 'inline-block',
          background: '#ffffff',
          border: '1px solid #171717',
          borderRadius: 100,
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 600,
          boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
        }}>
          Testnet — free to try
        </div>
      </div>
    </section>
  )
}
