import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getRedis, KEYS } from '@/lib/redis/client'
import type { Contact } from '@/types/db'

export const dynamic = 'force-dynamic'

// ── GET /api/contacts ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const redis = getRedis()
    const raw = await redis.get<Contact[]>(KEYS.contacts(session.address))
    const contacts: Contact[] = raw ?? []

    return NextResponse.json({ contacts })
  } catch (err) {
    console.error('[GET /api/contacts]', err)
    // Nếu Redis chưa được cấu hình thì trả về rỗng thay vì lỗi
    if (err instanceof Error && err.message.includes('UPSTASH_REDIS')) {
      return NextResponse.json({ contacts: [], _info: 'Redis not configured yet' })
    }
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

// ── POST /api/contacts ────────────────────────────────────────────────────────
// Body: { name, address, chain?, note? }
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { name, address, chain = 'arc', note } = body

    // Validate
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const redis = getRedis()
    const key = KEYS.contacts(session.address)
    const existing = (await redis.get<Contact[]>(key)) ?? []

    // Check duplicate name
    if (existing.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: `Contact "${name}" already exists` }, { status: 409 })
    }

    const newContact: Contact = {
      id:        crypto.randomUUID(),
      name:      name.trim(),
      address:   address.toLowerCase(),
      chain,
      note:      note?.trim() || undefined,
      createdAt: Date.now(),
    }

    await redis.set(key, [...existing, newContact])

    return NextResponse.json({ contact: newContact })
  } catch (err) {
    console.error('[POST /api/contacts]', err)
    if (err instanceof Error && err.message.includes('UPSTASH_REDIS')) {
      return NextResponse.json({ error: 'Database not configured. Add UPSTASH_REDIS env vars.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 })
  }
}

// ── DELETE /api/contacts?id=xxx ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Contact id required' }, { status: 400 })
    }

    const redis = getRedis()
    const key = KEYS.contacts(session.address)
    const existing = (await redis.get<Contact[]>(key)) ?? []
    const filtered = existing.filter(c => c.id !== id)

    if (filtered.length === existing.length) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await redis.set(key, filtered)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/contacts]', err)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
