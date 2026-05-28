const STEPS = [
  {
    bg: '#fef3c8',
    num: '1',
    title: 'Type what you want',
    detail: '"Send 50 USDC to Sarah"',
    desc: 'Plain English. No wallet addresses, no forms.',
  },
  {
    bg: '#d2fae5',
    num: '2',
    title: 'Review the card',
    detail: 'Amount, recipient, fee — all shown clearly',
    desc: 'Nothing moves until you tap Confirm.',
  },
  {
    bg: '#fae9ff',
    num: '3',
    title: 'Done',
    detail: 'Arc confirms in under a second',
    desc: 'Transaction recorded on-chain. Check ArcScan anytime.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{ background: '#f5f5f5', padding: '80px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          textAlign: 'center',
          marginBottom: 12,
        }}>
          How it works
        </h2>
        <p style={{
          textAlign: 'center', fontSize: 16, color: '#555',
          fontWeight: 500, marginBottom: 48,
        }}>
          Three steps. No crypto knowledge needed.
        </p>

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
                position: 'relative',
              }}
            >
              {/* Step number */}
              <div style={{
                width: 34, height: 34,
                borderRadius: '50%',
                background: '#000', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15,
                marginBottom: 16,
              }}>
                {s.num}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, letterSpacing: '-0.2px' }}>{s.title}</h3>
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#000', fontFamily: 'monospace' }}>→ {s.detail}</p>
              <p style={{ fontWeight: 500, fontSize: 14, color: '#444', lineHeight: 1.55 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
