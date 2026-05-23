'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    setError('')

    try {
      const supabase = createClient()
      const { error: supaError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (supaError) throw supaError
      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{
        background: '#d2fae5',
        border: '1px solid #171717',
        borderRadius: 8,
        padding: '20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Check your email</p>
        <p style={{ fontWeight: 500, fontSize: 13, color: '#444' }}>
          We sent a magic link to <strong>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          style={{
            width: '100%',
            background: '#ffffff',
            color: '#000000',
            border: '1px solid #737373',
            borderRadius: 4,
            padding: '12px',
            fontSize: 15,
            fontFamily: 'inherit',
            fontWeight: 500,
            outline: 'none',
          }}
        />
      </div>

      {status === 'error' && (
        <div style={{
          background: '#fef3c8',
          border: '1px solid #171717',
          borderRadius: 4,
          padding: '10px 12px',
          fontSize: 13,
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          background: status === 'loading' ? '#ccc' : '#a3e635',
          color: '#000000',
          border: 'none',
          borderRadius: 4,
          padding: '12px 24px',
          fontWeight: 700,
          fontSize: 15,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          boxShadow: status === 'loading' ? 'none' : 'rgb(10,10,13) 1px 1px 0px 0px',
          fontFamily: 'inherit',
        }}
      >
        {status === 'loading' ? 'Sending...' : 'Send magic link →'}
      </button>
    </form>
  )
}
