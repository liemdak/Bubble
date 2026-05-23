export default function FontPreview() {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#f5f5f5', padding: 32 }}>
        <h2 style={{ fontFamily: 'sans-serif', marginBottom: 24 }}>Font Preview — chọn font bạn thích</h2>

        {[
          { name: 'Geist Mono', var: 'Geist Mono' },
          { name: 'JetBrains Mono', var: 'JetBrains Mono' },
          { name: 'IBM Plex Mono', var: 'IBM Plex Mono' },
        ].map(({ name, var: f }) => (
          <div key={name} style={{
            background: '#fff',
            border: '2px solid #000',
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
            boxShadow: '4px 4px 0 #000',
            fontFamily: `'${f}', monospace`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#888', marginBottom: 12 }}>
              {name.toUpperCase()}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              BubblePay 🫧
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: '#555' }}>
              Send 100 USDC to Mike
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ background: '#a3e635', padding: '6px 14px', borderRadius: 4, fontWeight: 700, fontSize: 14, border: '1px solid #000', boxShadow: '2px 2px 0 #000' }}>
                Confirm →
              </span>
              <span style={{ background: '#fff', padding: '6px 14px', borderRadius: 4, fontWeight: 500, fontSize: 14, border: '1px solid #000', boxShadow: '2px 2px 0 #000' }}>
                Cancel
              </span>
            </div>
            <div style={{ background: '#f0f0f0', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#333' }}>
              To: 0xAbCd...3F9c · Amount: 50 USDC · Fee: ~$0.006
            </div>
          </div>
        ))}
      </body>
    </html>
  )
}
