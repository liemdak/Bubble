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
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, rgb(137,229,240) 0%, rgb(182,239,246) 25%, rgb(210,245,250) 50%, rgb(235,250,245) 80%, #ffffff 100%)',
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
