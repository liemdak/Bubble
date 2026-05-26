/**
 * Firestore helpers for contacts — SERVER-SIDE ONLY.
 *
 * Collection structure:
 *   users/{userAddress}/contacts/{contactId}
 *
 * userAddress is always stored lowercase for consistent lookups.
 *
 * Transaction history is NOT stored here — use ArcScan instead:
 *   https://testnet.arcscan.app/address/{circleWalletAddress}
 */
import { getDb } from './admin'
import type { Contact } from '@/types/db'

const addr = (a: string) => a.toLowerCase()

function contactsCol(userAddress: string) {
  return getDb().collection('users').doc(addr(userAddress)).collection('contacts')
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContacts(userAddress: string): Promise<Contact[]> {
  const snap = await contactsCol(userAddress)
    .orderBy('createdAt', 'asc')
    .get()

  return snap.docs.map(d => {
    const { nameLower: _, ...rest } = d.data() as Contact & { nameLower?: string }
    return rest
  })
}

export async function addContact(
  userAddress: string,
  contact: Omit<Contact, 'id' | 'createdAt'>,
): Promise<Contact> {
  const col = contactsCol(userAddress)

  // Check for duplicate name (case-insensitive)
  const existing = await col
    .where('nameLower', '==', contact.name.trim().toLowerCase())
    .get()

  if (!existing.empty) {
    throw new Error(`DUPLICATE:Contact "${contact.name}" already exists`)
  }

  const id  = crypto.randomUUID()
  const now = Date.now()

  const doc: Contact & { nameLower: string } = {
    id,
    name:      contact.name.trim(),
    nameLower: contact.name.trim().toLowerCase(),
    address:   contact.address.toLowerCase(),
    chain:     contact.chain ?? 'arc',
    note:      contact.note?.trim() || undefined,
    createdAt: now,
  }

  await col.doc(id).set(doc)

  const { nameLower: _, ...result } = doc
  return result
}

export async function deleteContact(userAddress: string, contactId: string): Promise<boolean> {
  const ref  = contactsCol(userAddress).doc(contactId)
  const snap = await ref.get()
  if (!snap.exists) return false
  await ref.delete()
  return true
}
