import Link from 'next/link'

export function Footer() {
  return (
    <footer style={{
      background: '#f5f5f5',
      borderTop: '1px solid #171717',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
          <span>🫧</span>
          <span>Bubble</span>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {['Features', 'How it works', 'FAQ'].map((label) => (
            <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`} style={{ fontWeight: 500, fontSize: 14, color: '#333' }}>
              {label}
            </a>
          ))}
          <Link href="/login" style={{ fontWeight: 500, fontSize: 14, color: '#333' }}>Login</Link>
        </div>

        <div style={{
          display: 'inline-flex',
          gap: 6,
          background: '#ffffff',
          border: '1px solid #171717',
          borderRadius: 100,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 500,
          boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
        }}>
          <span>⚡</span>
          <span>Built on Arc · Secured by Circle</span>
        </div>
      </div>
    </footer>
  )
}
