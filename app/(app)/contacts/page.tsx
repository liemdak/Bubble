'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Contact } from '@/types/db'

export default function ContactsPage() {
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  // Add form state
  const [name, setName]       = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts')
      const data = await res.json()
      setContacts(data.contacts ?? [])
    } catch {
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setContacts(prev => [...prev, data.contact])
      setName(''); setAddress(''); setNote('')
      setShowAdd(false)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
      setContacts(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: '#fff', border: '1px solid #737373',
    borderRadius: 4, fontFamily: 'inherit', fontSize: 13,
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '24px', maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>👥 Contacts</h1>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(null) }}
          style={{
            background: '#a3e635', color: '#000', border: 'none',
            borderRadius: 4, padding: '8px 16px', fontWeight: 700,
            fontSize: 13, cursor: 'pointer',
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
          }}
        >
          {showAdd ? '✕ Cancel' : '+ Add Contact'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{
          background: '#fff', border: '1px solid #171717',
          borderRadius: 8, padding: 20, marginBottom: 20,
          boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>New Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              style={inputStyle} placeholder="Name (e.g. Mike)"
              value={name} onChange={e => setName(e.target.value)} required
            />
            <input
              style={inputStyle} placeholder="Wallet address (0x...)"
              value={address} onChange={e => setAddress(e.target.value)} required
            />
            <input
              style={inputStyle} placeholder="Note (optional)"
              value={note} onChange={e => setNote(e.target.value)}
            />
            {error && <div style={{ fontSize: 12, color: '#c00' }}>{error}</div>}
            <button type="submit" disabled={saving} style={{
              background: saving ? '#ccc' : '#a3e635',
              border: 'none', borderRadius: 4, padding: '10px',
              fontWeight: 700, cursor: saving ? 'default' : 'pointer',
              fontSize: 13, boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            }}>
              {saving ? 'Saving…' : 'Save Contact'}
            </button>
          </div>
        </form>
      )}

      {/* Contact list */}
      {loading ? (
        <div style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : contacts.length === 0 ? (
        <div style={{
          border: '1px dashed #ccc', borderRadius: 8,
          padding: '40px 20px', textAlign: 'center', color: '#888',
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No contacts yet</div>
          <div style={{ fontSize: 13 }}>Add a contact to send payments by name</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map(c => (
            <div key={c.id} style={{
              background: '#fff', border: '1px solid #171717',
              borderRadius: 8, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#a3e635', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>
                {c.name[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.address}
                </div>
                {c.note && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{c.note}</div>}
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(c.id)}
                disabled={deleting === c.id}
                style={{
                  background: 'none', border: '1px solid #eee',
                  borderRadius: 6, padding: '4px 8px',
                  cursor: 'pointer', fontSize: 12, color: '#c00',
                  flexShrink: 0,
                }}
              >
                {deleting === c.id ? '…' : '🗑'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
