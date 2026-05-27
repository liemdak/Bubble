'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Contact } from '@/types/db'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  fontFamily: 'inherit',
  fontSize: 13,
  color: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export default function ContactsPage() {
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  const [name, setName]       = useState('')
  const [address, setAddress] = useState('')
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
        body: JSON.stringify({ name, address }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setContacts(prev => [...prev, data.contact])
      setName(''); setAddress('')
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

  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 560, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            // ADDRESS BOOK
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>Contacts</h1>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(null) }}
          style={{
            background: showAdd ? 'rgba(255,255,255,0.08)' : '#38bdf8',
            color: showAdd ? '#fff' : '#000',
            border: showAdd ? '1px solid rgba(255,255,255,0.15)' : 'none',
            borderRadius: 8, padding: '9px 16px', fontWeight: 700,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: showAdd ? 'none' : 'rgb(10,10,13) 1px 1px 0px 0px',
            transition: 'all 0.15s',
          }}
        >
          {showAdd ? '✕ Cancel' : '+ Add Contact'}
        </button>
      </div>

      {/* ── Add form ── */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '20px 18px',
            marginBottom: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: '#fff' }}>New Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              style={INPUT_STYLE}
              placeholder="Name (e.g. Mike)"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = '#38bdf8')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              required
            />
            <input
              style={INPUT_STYLE}
              placeholder="Wallet address (0x...)"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = '#38bdf8')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              required
            />
            {error && (
              <div style={{
                fontSize: 12, color: '#ff6b6b',
                background: 'rgba(255,107,107,0.1)',
                border: '1px solid rgba(255,107,107,0.2)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                ⚠️ {error}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? 'rgba(56,189,248,0.4)' : '#38bdf8',
                border: 'none', borderRadius: 10, padding: '12px',
                fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                fontSize: 13, boxShadow: saving ? 'none' : 'rgb(10,10,13) 1px 1px 0px 0px',
                color: '#000', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {saving ? 'Saving…' : 'Save Contact'}
            </button>
          </div>
        </form>
      )}

      {/* ── Contact list ── */}
      {loading ? (
        <div style={{
          textAlign: 'center', padding: 48,
          color: 'rgba(255,255,255,0.3)', fontSize: 14,
        }}>
          Loading…
        </div>
      ) : contacts.length === 0 ? (
        <div style={{
          border: '1px dashed rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '48px 20px', textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.5)' }}>No contacts yet</div>
          <div style={{ fontSize: 13 }}>Add a contact to send payments by name</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map(c => (
            <div
              key={c.id}
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(56,189,248,0.15)',
                border: '1.5px solid rgba(56,189,248,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, flexShrink: 0, color: '#38bdf8',
                boxShadow: '0 0 16px rgba(56,189,248,0.15)',
              }}>
                {c.name[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: '#fff' }}>{c.name}</div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.address}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(c.id)}
                disabled={deleting === c.id}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '5px 10px',
                  cursor: 'pointer', fontSize: 13, color: 'rgba(255,100,100,0.7)',
                  flexShrink: 0, fontFamily: 'inherit',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,100,100,0.1)'
                  e.currentTarget.style.borderColor = 'rgba(255,100,100,0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
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
