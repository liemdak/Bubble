const STEPS = [
  {
    bg: '#fef3c8',
    num: '1',
    title: 'Type your intent',
    detail: '"Send 50 USDC to Sarah"',
    desc: 'Plain English. No crypto jargon needed.',
  },
  {
    bg: '#d2fae5',
    num: '2',
    title: 'Review & confirm',
    detail: 'Tap confirm on the card',
    desc: 'Check amount, recipient, and fee before it goes.',
  },
  {
    bg: '#fae9ff',
    num: '3',
    title: 'Done in under a second',
    detail: 'Arc settles instantly.',
    desc: 'Sarah gets notified. Transaction recorded.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{ background: '#f5f5f5', padding: '80px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 700,
          letterSpacing: '-0.544px',
          textAlign: 'center',
          marginBottom: 48,
        }}>
          Three words. That's all it takes.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}>
          {STEPS.map((s) => (
            <div
              key={s.num}
              style={{
                background: s.bg,
                border: '1px solid #171717',
                borderRadius: 8,
                padding: '28px 24px',
                boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#000',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
                marginBottom: 16,
              }}>
                {s.num}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#000' }}>→ {s.detail}</p>
              <p style={{ fontWeight: 500, fontSize: 14, color: '#444', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
