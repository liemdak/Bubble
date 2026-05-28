import { NextResponse } from 'next/server'

/**
 * GET /api/config
 * Returns non-sensitive client-side config.
 * kitKey is a Circle analytics/routing identifier — safe to return to authenticated clients.
 * CIRCLE_ENTITY_SECRET and CIRCLE_API_KEY are never returned here.
 */
export async function GET() {
  return NextResponse.json({
    kitKey: process.env.CIRCLE_KIT_KEY ?? '',
  })
}
