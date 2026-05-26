import { BubbleField } from '@/components/bubbles/BubbleField'
import { AppHeader } from '@/components/app/AppHeader'
import { BottomNav } from '@/components/app/BottomNav'
import { Sidebar } from '@/components/app/Sidebar'
import { getSession } from '@/lib/auth/session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <div style={{
      height: '100dvh',
      maxHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      overscrollBehavior: 'none',
      /* Galaxy dark background — swap bg-image here once user sends photo */
      background: `
        radial-gradient(ellipse at 15% 10%, rgba(139,92,246,0.28) 0%, transparent 45%),
        radial-gradient(ellipse at 85% 85%, rgba(59,130,246,0.22) 0%, transparent 45%),
        radial-gradient(ellipse at 55% 45%, rgba(236,72,153,0.08) 0%, transparent 35%),
        #06060f
      `,
    }}>
      <AppHeader address={session?.address} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Subtle bubbles behind glass */}
        <BubbleField count={6} sizeRange={[50, 130]} opacityRange={[0.08, 0.18]} seed={55} />

        {/* Sidebar — desktop only */}
        <Sidebar />

        {/* Main content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
