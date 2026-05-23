import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

// Routes that require login
const PROTECTED_PREFIXES = ['/chat', '/balance', '/contacts', '/history', '/settings']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const session = await getSession()
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/chat/:path*', '/balance/:path*', '/contacts/:path*', '/history/:path*', '/settings/:path*'],
}
