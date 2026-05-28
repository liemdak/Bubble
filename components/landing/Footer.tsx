import Link from 'next/link'

export function Footer() {
  return (
    <footer style={{
      background: '#000000',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '44px 28px',
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
        {/* Logo — text only, no icon */}
        <span style={{
          fontWeight: 600,
          fontSize: 16,
          color: '#ffffff',
          letterSpacing: '-0.2px',
        }}>
          Bubble
        </span>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {['Features', 'How it works', 'FAQ'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              style={{
                fontWeight: 400,
                fontSize: 13,
                color: 'rgba(255,255,255,0.38)',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </a>
          ))}
          <Link href="/login" style={{
            fontWeight: 400,
            fontSize: 13,
            color: 'rgba(255,255,255,0.38)',
          }}>
            Login
          </Link>
        </div>

        {/* Attribution pill */}
        <div style={{
          display: 'inline-flex',
          gap: 6,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 100,
          padding: '6px 16px',
          fontSize: 11,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.04em',
        }}>
          Built on Arc · Secured by Circle
        </div>
      </div>
    </footer>
  )
}
