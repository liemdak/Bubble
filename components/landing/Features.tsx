const FEATURES = [
  {
    bg: '#d2fae5',
    icon: '⚡',
    title: 'Send in seconds',
    body: 'Just say a name. Bubble resolves the address and sends.',
  },
  {
    bg: '#fae9ff',
    icon: '👥',
    title: 'Smart contacts',
    body: 'Save once, send forever. No more copy-pasting wallet addresses.',
  },
  {
    bg: '#fef3c8',
    icon: '🌉',
    title: 'Multichain',
    body: 'Arc, Ethereum, Solana, Base — one app, all chains via CCTP.',
  },
  {
    bg: '#f5d1fe',
    icon: '📷',
    title: 'Scan & Pay',
    body: 'QR code — point and send. Show your QR to receive.',
  },
  {
    bg: '#fbbf25',
    icon: '📈',
    title: 'Live rates',
    body: 'USDC, EURC, USYC rates in chat. Swap with one message.',
  },
  {
    bg: '#d2fae5',
    icon: '⛽',
    title: 'Gasless',
    body: '~$0.006 per tx, we cover it. Sub-second finality on Arc.',
  },
]

export function Features() {
  return (
    <section id="features" style={{ background: '#ffffff', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 700,
          letterSpacing: '-0.544px',
          textAlign: 'center',
          marginBottom: 48,
        }}>
          Everything you need. Nothing you don't.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: f.bg,
                border: '1px solid #171717',
                borderRadius: 8,
                padding: '24px',
                boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontWeight: 500, fontSize: 14, color: '#333', lineHeight: 1.57 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
