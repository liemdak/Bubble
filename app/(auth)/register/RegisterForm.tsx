'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'loading' | 'verify' | 'done' | 'error'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setStep('loading')
    setError('')

    try {
      const supabase = createClient()

      // Sign up via OTP (magic link) — Supabase creates user on first send
      const { error: supaError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: { display_name: displayName || email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?new=1`,
        },
      })

      if (supaError) throw supaError
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  if (step === 'verify') {
    return (
      <div style={{
        background: '#d2fae5',
        border: '1px solid #171717',
        borderRadius: 8,
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Check your email</p>
        <p style={{ fontWeight: 500, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
          Click the link we sent to <strong>{email}</strong> to activate your account and set up your wallet.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          Name <span style={{ fontWeight: 500, color: '#888' }}>(optional)</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Mike"
          style={inputStyle}
        />
      </div>

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
          style={inputStyle}
        />
      </div>

      {(step === 'error') && (
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
        disabled={step === 'loading'}
        style={{
          background: step === 'loading' ? '#ccc' : '#38bdf8',
          color: '#000000',
          border: 'none',
          borderRadius: 4,
          padding: '13px 24px',
          fontWeight: 700,
          fontSize: 15,
          cursor: step === 'loading' ? 'not-allowed' : 'pointer',
          boxShadow: step === 'loading' ? 'none' : 'rgb(10,10,13) 1px 1px 0px 0px',
          fontFamily: 'inherit',
          marginTop: 4,
        }}
      >
        {step === 'loading' ? 'Creating account...' : 'Create free account →'}
      </button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
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
}
