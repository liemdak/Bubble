const FEATURES = [
  {
    bg: '#d2fae5',
    icon: null,
    label: '01',
    title: 'Send in seconds',
    body: 'Type a name, Bubble resolves the address and sends. No copy-pasting, no confusion.',
  },
  {
    bg: '#fae9ff',
    icon: null,
    label: '02',
    title: 'Contacts',
    body: 'Save wallet addresses as names. Send to "Mike" instead of 0x4A3f…',
  },
  {
    bg: '#fef3c8',
    icon: null,
    label: '03',
    title: 'Bridge cross-chain',
    body: 'Move USDC between Arc, Ethereum, and Base via CCTP. Signed directly from your wallet.',
  },
  {
    bg: '#f5d1fe',
    icon: null,
    label: '04',
    title: 'QR receive',
    body: 'Show your QR code to receive payment. Scan to pre-fill a send.',
  },
  {
    bg: '#fbbf25',
    icon: null,
    label: '05',
    title: 'Swap stablecoins',
    body: 'Swap between USDC, EURC, and USYC on Arc. Check rates before confirming.',
  },
  {
    bg: '#d2fae5',
    icon: null,
    label: '06',
    title: 'Near-zero fees',
    body: 'Gas on Arc is ~$0.006 per transaction. Circle Gas Station covers it automatically.',
  },
]

export function Features() {
  return (
    <section id="features" style={{ background: '#ffffff', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          textAlign: 'center',
          marginBottom: 12,
        }}>
          Everything you need.
        </h2>
        <p style={{
          textAlign: 'center', fontSize: 16, color: '#555',
          fontWeight: 500, marginBottom: 48,
        }}>
          Nothing you don&apos;t.
        </p>

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
              {/* Label tag */}
              <div style={{
                display: 'inline-block',
                background: '#000',
                color: '#fff',
                borderRadius: 100,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                marginBottom: 14,
              }}>
                {f.label}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, letterSpacing: '-0.2px' }}>{f.title}</h3>
              <p style={{ fontWeight: 500, fontSize: 14, color: '#333', lineHeight: 1.6 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
