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
      /* Galaxy starfield background photo */
      backgroundImage: 'url(/galaxy-bg.webp)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#000000', /* fallback while image loads */
    }}>
      <AppHeader address={session?.address} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
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
