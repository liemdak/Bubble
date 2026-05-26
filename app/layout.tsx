import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Bubble — Send money the way you talk',
  description: 'Just type "send 100 USDC to Mike" — Bubble handles the rest. Powered by Arc and Circle.',
  manifest: '/manifest.json',
}

// Separate viewport export (Next.js 14+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',     // enables safe-area-inset-* on iOS notch devices
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${jetbrainsMono.className}`}>
      <body style={{ margin: 0, padding: 0, WebkitTapHighlightColor: 'transparent' }}>
        {children}
      </body>
    </html>
  )
}
