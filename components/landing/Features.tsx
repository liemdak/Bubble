const FEATURES = [
  {
    label: '01',
    title: 'Send in seconds',
    body: 'Type a name, Bubble resolves the address and sends. No copy-pasting, no confusion.',
  },
  {
    label: '02',
    title: 'Contacts',
    body: 'Save wallet addresses as names. Send to "Mike" instead of 0x4A3f…',
  },
  {
    label: '03',
    title: 'Bridge cross-chain',
    body: 'Move USDC between Arc, Ethereum, and Base via CCTP. Signed directly from your wallet.',
  },
  {
    label: '04',
    title: 'QR receive',
    body: 'Show your QR code to receive payment. Scan to pre-fill a send.',
  },
  {
    label: '05',
    title: 'Swap stablecoins',
    body: 'Swap between USDC, EURC, and USYC on Arc. Check rates before confirming.',
  },
  {
    label: '06',
    title: 'Near-zero fees',
    body: 'Gas on Arc is ~$0.006 per transaction. Circle Gas Station covers it automatically.',
  },
]

export function Features() {
  return (
    <section id="features" style={{
      position: 'relative',
      background: '#000000',
      padding: '100px 24px',
      overflow: 'hidden',
    }}>
      {/* Subtle ambient orb behind cards */}
      <div aria-hidden style={{
        position: 'absolute',
        width: 800, height: 800,
        background: 'radial-gradient(circle, rgba(10,70,35,0.25) 0%, transparent 65%)',
        top: -200, right: -200,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.14em',
          marginBottom: 16,
          textTransform: 'uppercase',
        }}>
          Features
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 300,
          letterSpacing: '-0.8px',
          textAlign: 'center',
          color: '#ffffff',
          marginBottom: 56,
          lineHeight: 1.2,
        }}>
          Everything you need.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 1,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {FEATURES.map((f, idx) => (
            <div
              key={f.title}
              style={{
                background: idx % 2 === 0
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(255,255,255,0.015)',
                padding: '34px 32px',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.14em',
                marginBottom: 18,
              }}>
                {f.label}
              </div>
              <h3 style={{
                fontWeight: 400,
                fontSize: 18,
                color: '#ffffff',
                marginBottom: 10,
                letterSpacing: '-0.2px',
                lineHeight: 1.3,
              }}>
                {f.title}
              </h3>
              <p style={{
                fontWeight: 300,
                fontSize: 14,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.65,
              }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
