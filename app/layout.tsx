import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Bubble — Send money the way you talk',
  description: 'Just type "send 100 USDC to Mike" — Bubble handles the rest. Powered by Arc and Circle.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${inter.className}`}>
      <body style={{ margin: 0, padding: 0, WebkitTapHighlightColor: 'transparent' }}>
        {children}
      </body>
    </html>
  )
}
