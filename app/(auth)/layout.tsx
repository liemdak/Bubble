import Link from 'next/link'
import { BubbleField } from '@/components/bubbles/BubbleField'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(rgb(137,229,240), rgb(204,243,250) 40%, #ffffff)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <BubbleField count={6} sizeRange={[30, 90]} opacityRange={[0.08, 0.18]} seed={21} />

      {/* Top nav — just logo */}
      <nav style={{ position: 'relative', zIndex: 10, padding: '20px 24px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 18 }}>
          <span>🫧</span>
          <span>Bubble</span>
        </Link>
      </nav>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 10 }}>
        {children}
      </main>
    </div>
  )
}
