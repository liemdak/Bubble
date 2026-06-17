const STEPS = [
  {
    num: '01',
    title: 'Type what you want',
    detail: '"Send 50 USDC to Sarah" or "/book dune"',
    desc: 'Plain English or a command. Works for payments and book discovery.',
  },
  {
    num: '02',
    title: 'Review the card',
    detail: 'Amount, recipient, fee - all shown clearly',
    desc: 'Nothing moves until you confirm.',
  },
  {
    num: '03',
    title: 'Done',
    detail: 'Arc confirms in under a second',
    desc: 'Transaction recorded on-chain. Check ArcScan anytime.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{
      position: 'relative',
      background: '#000000',
      padding: '100px 24px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      {/* Ambient orb */}
      <div aria-hidden style={{
        position: 'absolute',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(100,52,5,0.22) 0%, transparent 65%)',
        bottom: -150, left: -100,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.14em',
          marginBottom: 16,
          textTransform: 'uppercase',
        }}>
          How it works
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 300,
          letterSpacing: '-0.8px',
          textAlign: 'center',
          color: '#ffffff',
          marginBottom: 64,
          lineHeight: 1.2,
        }}>
          Three steps.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 2,
        }}>
          {STEPS.map((s) => (
            <div
              key={s.num}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '34px 28px',
              }}
            >
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.14em',
                marginBottom: 20,
              }}>
                {s.num}
              </div>
              <h3 style={{
                fontWeight: 400,
                fontSize: 18,
                color: '#ffffff',
                marginBottom: 10,
                letterSpacing: '-0.2px',
              }}>
                {s.title}
              </h3>
              <p style={{
                fontWeight: 400,
                fontSize: 12,
                marginBottom: 8,
                color: 'rgba(163,230,53,0.7)',
                fontFamily: 'ui-monospace, monospace',
                letterSpacing: '0.02em',
              }}>
                {s.detail}
              </p>
              <p style={{
                fontWeight: 300,
                fontSize: 14,
                color: 'rgba(255,255,255,0.42)',
                lineHeight: 1.65,
              }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
