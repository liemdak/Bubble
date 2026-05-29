import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

/**
 * GET /api/config
 * Returns non-sensitive client-side config — requires auth.
 * CIRCLE_ENTITY_SECRET and CIRCLE_API_KEY are never returned here.
 */
export async function GET() {
  const session = await getSession()
  if (!session?.address) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return NextResponse.json({
    kitKey: process.env.CIRCLE_KIT_KEY ?? '',
  })
}
