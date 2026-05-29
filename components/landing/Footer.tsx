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
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          {['Features', 'How it works', 'FAQ'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              style={{
                fontWeight: 400,
                fontSize: 13,
                color: 'rgba(255,255,255,0.38)',
                textDecoration: 'none',
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
            textDecoration: 'none',
          }}>
            Login
          </Link>
        </div>

        {/* Social + attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Twitter / X */}
          <a
            href="https://x.com/liemdak"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontWeight: 400, fontSize: 13,
              color: 'rgba(255,255,255,0.38)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            {/* X logo */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Twitter
          </a>

          {/* Website */}
          <a
            href="https://bubble-arc.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontWeight: 400, fontSize: 13,
              color: 'rgba(255,255,255,0.38)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            {/* Globe icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Website
          </a>

          {/* Attribution pill */}
          <div style={{
            display: 'inline-flex', gap: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
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
      </div>
    </footer>
  )
}
