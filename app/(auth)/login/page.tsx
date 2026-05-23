'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BubbleLogo } from '@/components/ui/BubbleLogo'

type Step = 'idle' | 'connecting' | 'signing' | 'verifying' | 'done' | 'error'

function LoginCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/chat'

  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setError(null)

    const eth = (window as Window & {
      ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }
    }).ethereum

    if (!eth) {
      setError('No wallet found. Please install MetaMask or another browser wallet.')
      return
    }

    try {
      // 1. Connect wallet
      setStep('connecting')
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
      const address = accounts[0]
      if (!address) throw new Error('No account selected')

      // 2. Get nonce
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`)
      const { nonce, error: nonceErr } = await nonceRes.json()
      if (nonceErr) throw new Error(nonceErr)

      // 3. Sign message (no gas)
      setStep('signing')
      const message = `Welcome to Bubble 🫧\n\nSign this message to connect your wallet. This does not cost any gas.\n\nWallet: ${address}\nNonce: ${nonce}`
      const signature = await eth.request({
        method: 'personal_sign',
        params: [message, address],
      }) as string

      // 4. Verify + create session
      setStep('verifying')
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Verification failed')

      // 5. Enter app
      setStep('done')
      router.push(from)
      router.refresh()

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')) {
        setStep('idle')
        return
      }
      setError(msg)
      setStep('error')
    }
  }

  const isLoading = ['connecting', 'signing', 'verifying', 'done'].includes(step)

  const labels: Record<Step, string> = {
    idle:       'Connect Wallet',
    connecting: 'Connecting…',
    signing:    'Check your wallet to sign…',
    verifying:  'Verifying…',
    done:       'Welcome! ✓',
    error:      'Connect Wallet',
  }

  const icons: Record<Step, string> = {
    idle:       '🦊',
    connecting: '🔗',
    signing:    '✍️',
    verifying:  '⏳',
    done:       '✓',
    error:      '🦊',
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 400,
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.85)',
      borderRadius: 24,
      padding: '40px 32px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <BubbleLogo size={52} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Bubble</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.55 }}>
          Connect your wallet to get started.<br />No account needed.
        </div>
      </div>

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '14px 0',
          background: isLoading ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.88)',
          color: isLoading ? '#999' : '#fff',
          border: 'none',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
          cursor: isLoading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transition: 'all 0.15s ease',
          boxShadow: isLoading ? 'none' : '0 2px 12px rgba(0,0,0,0.18)',
        }}
      >
        <span>{icons[step]}</span>
        <span>{labels[step]}</span>
      </button>

      {/* Progress indicator */}
      {isLoading && step !== 'done' && (
        <div style={{ marginTop: 12, display: 'flex', gap: 4, justifyContent: 'center' }}>
          {(['connecting', 'signing', 'verifying'] as Step[]).map((s) => (
            <div key={s} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: step === s ? '#000' : 'rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 14,
          padding: '10px 14px',
          background: 'rgba(255,80,80,0.08)',
          border: '1px solid rgba(255,80,80,0.2)',
          borderRadius: 10,
          fontSize: 12,
          color: '#c00',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Steps explanation */}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: '🔗', label: 'Connect', text: 'MetaMask, Rainbow, Coinbase…' },
          { icon: '✍️', label: 'Sign',    text: 'Prove ownership — zero gas cost' },
          { icon: '⚡', label: 'In',      text: 'Enter Bubble instantly' },
        ].map(({ icon, label, text }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>{icon}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer badge */}
      <div style={{
        marginTop: 24, paddingTop: 20,
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, fontSize: 11, color: '#bbb',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635' }} />
        Built on Arc · Powered by Circle
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  )
}
