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
      background: '#03060a',
      position: 'relative',
    }}>
      {/* Atmospheric gradient orbs — consistent with landing page */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(12,95,48,0.30) 0%, transparent 65%)',
          top: -200, left: -150,
          animation: 'orb-drift-a 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 550, height: 550,
          background: 'radial-gradient(circle, rgba(185,105,8,0.22) 0%, transparent 65%)',
          top: 100, right: -100,
          animation: 'orb-drift-b 30s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(108,10,10,0.20) 0%, transparent 65%)',
          bottom: -100, left: '35%',
          animation: 'orb-drift-c 20s ease-in-out infinite',
        }} />
      </div>

      <AppHeader address={session?.address} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Sidebar — desktop only */}
        <Sidebar />

        {/* Main content */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative', zIndex: 1,
        }}>
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
