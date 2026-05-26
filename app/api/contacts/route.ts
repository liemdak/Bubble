import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getContacts, addContact, deleteContact } from '@/lib/firebase/db'

export const dynamic = 'force-dynamic'

// ── GET /api/contacts ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const contacts = await getContacts(session.address)
    return NextResponse.json({ contacts })
  } catch (err) {
    console.error('[GET /api/contacts]', err)
    if (err instanceof Error && err.message.includes('Firebase Admin env vars')) {
      return NextResponse.json({ contacts: [], _info: 'Firebase not configured yet' })
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

    const contact = await addContact(session.address, { name, address, chain, note })
    return NextResponse.json({ contact })
  } catch (err) {
    console.error('[POST /api/contacts]', err)
    if (err instanceof Error && err.message.startsWith('DUPLICATE:')) {
      return NextResponse.json({ error: err.message.replace('DUPLICATE:', '') }, { status: 409 })
    }
    if (err instanceof Error && err.message.includes('Firebase Admin env vars')) {
      return NextResponse.json({ error: 'Database not configured. Add Firebase env vars.' }, { status: 503 })
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

    const deleted = await deleteContact(session.address, id)
    if (!deleted) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/contacts]', err)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
