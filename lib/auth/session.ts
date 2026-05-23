/**
 * JWT session helpers — server-side only.
 * Session is stored as a signed httpOnly cookie.
 */
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'bubblepay_session'
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'bubblepay-dev-secret-change-in-production'
)
const EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days

export interface Session {
  address: string        // 0x wallet address — primary user ID
  circleWalletId?: string
  displayName?: string
}

/** Sign + set session cookie */
export async function createSession(payload: Session): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: EXPIRES_IN,
    path: '/',
  })
}

/** Read + verify session cookie → returns Session or null */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as Session
  } catch {
    return null
  }
}

/** Delete session cookie */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
