import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#03060a',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Atmospheric orbs */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(12,95,48,0.40) 0%, transparent 65%)',
          top: -180, left: -100,
          animation: 'orb-drift-a 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(185,105,8,0.32) 0%, transparent 65%)',
          top: 100, right: -120,
          animation: 'orb-drift-b 28s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(108,10,10,0.28) 0%, transparent 65%)',
          bottom: -80, left: '40%',
          animation: 'orb-drift-c 18s ease-in-out infinite',
        }} />
      </div>

      {/* Top nav */}
      <nav style={{ position: 'relative', zIndex: 10, padding: '24px 28px' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center',
          fontWeight: 600, fontSize: 17,
          color: '#ffffff', letterSpacing: '-0.2px',
          textDecoration: 'none',
        }}>
          Bubble
        </Link>
      </nav>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 10,
      }}>
        {children}
      </main>
    </div>
  )
}
