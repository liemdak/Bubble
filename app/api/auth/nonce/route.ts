import { NextRequest, NextResponse } from 'next/server'
import { createNonce } from '@/lib/auth/nonce'

/**
 * GET /api/auth/nonce?address=0x...
 * Returns a one-time nonce for the wallet to sign.
 */
export function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')?.toLowerCase()
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  const nonce = createNonce(address)
  return NextResponse.json({ nonce })
}
