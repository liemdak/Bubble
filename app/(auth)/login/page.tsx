'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BubbleLogo } from '@/components/ui/BubbleLogo'

// EIP-6963 types — multi-wallet discovery standard
interface EIP6963ProviderInfo {
  rdns:  string
  uuid:  string
  name:  string
  icon:  string   // data URI
}
interface EIP6963Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}
interface EIP6963Detail {
  info:     EIP6963ProviderInfo
  provider: EIP6963Provider
}

type Step = 'idle' | 'connecting' | 'signing' | 'verifying' | 'done' | 'error'

function LoginCard() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const from        = searchParams.get('from') ?? '/chat'

  const [step,     setStep]     = useState<Step>('idle')
  const [error,    setError]    = useState<string | null>(null)
  const [wallets,  setWallets]  = useState<EIP6963Detail[]>([])
  const [selected, setSelected] = useState<EIP6963Detail | null>(null)
  const [stepLabel, setStepLabel] = useState('')

  // ── Discover wallets via EIP-6963 ────────────────────────────────
  useEffect(() => {
    const seen = new Set<string>()
    const found: EIP6963Detail[] = []

    function onAnnounce(e: Event) {
      const detail = (e as CustomEvent<EIP6963Detail>).detail
      if (!detail?.info?.uuid || seen.has(detail.info.uuid)) return
      seen.add(detail.info.uuid)
      found.push(detail)
      setWallets([...found])
    }

    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    // Fallback: if no EIP-6963, detect legacy window.ethereum
    const timer = setTimeout(() => {
      if (found.length === 0) {
        const eth = (window as unknown as { ethereum?: EIP6963Provider }).ethereum
        if (eth) {
          const legacy: EIP6963Detail = {
            info: { rdns: 'legacy', uuid: 'legacy', name: 'Browser Wallet', icon: '' },
            provider: eth,
          }
          setWallets([legacy])
        }
      }
    }, 300)

    return () => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce)
      clearTimeout(timer)
    }
  }, [])

  // ── Connect flow ─────────────────────────────────────────────────
  async function handleConnect(wallet: EIP6963Detail) {
    setSelected(wallet)
    setError(null)

    try {
      setStep('connecting')
      setStepLabel(`Connecting to ${wallet.info.name}…`)
      const accounts = await wallet.provider.request({ method: 'eth_requestAccounts' }) as string[]
      const address  = accounts[0]
      if (!address) throw new Error('No account selected')

      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`)
      const { nonce, error: nonceErr } = await nonceRes.json()
      if (nonceErr) throw new Error(nonceErr)

      setStep('signing')
      setStepLabel('Sign the message in your wallet…')
      const message = `Welcome to Bubble 🫧\n\nSign this message to connect your wallet. This does not cost any gas.\n\nWallet: ${address}\nNonce: ${nonce}`
      const signature = await wallet.provider.request({
        method: 'personal_sign',
        params: [message, address],
      }) as string

      setStep('verifying')
      setStepLabel('Verifying…')
      const res  = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Verification failed')

      setStep('done')
      router.push(from)
      router.refresh()

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')) {
        setStep('idle'); setSelected(null); return
      }
      setError(msg)
      setStep('error')
    }
  }

  const isLoading = ['connecting', 'signing', 'verifying', 'done'].includes(step)

  return (
    <div style={{
      width: '100%', maxWidth: 400,
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.85)',
      borderRadius: 24, padding: '36px 28px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <BubbleLogo size={48} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Connect your wallet</div>
        <div style={{ fontSize: 12, color: '#777', lineHeight: 1.55 }}>
          Sign in instantly — no account needed.
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div style={{
          padding: '20px 16px',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>
            {step === 'signing' ? '✍️' : step === 'done' ? '✅' : '⏳'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {step === 'done' ? 'Welcome!' : selected?.info.name}
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>{stepLabel}</div>

          {step !== 'done' && (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 14 }}>
              {(['connecting', 'signing', 'verifying'] as Step[]).map((s) => (
                <div key={s} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: step === s ? '#000' : 'rgba(0,0,0,0.12)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          )}
        </div>

      ) : wallets.length === 0 ? (
        /* No wallet detected */
        <div style={{
          padding: '20px 16px', borderRadius: 14,
          background: 'rgba(255,80,80,0.05)',
          border: '1px solid rgba(255,80,80,0.15)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🦊</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>No wallet detected</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
            Install a browser wallet extension to continue.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { name: 'MetaMask',       href: 'https://metamask.io/download/' },
              { name: 'Rabby',          href: 'https://rabby.io' },
              { name: 'Coinbase Wallet',href: 'https://www.coinbase.com/wallet/downloads' },
            ].map(({ name, href }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 11, fontWeight: 600,
                background: 'rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8, padding: '5px 10px',
                textDecoration: 'none', color: '#333',
              }}>
                {name}
              </a>
            ))}
          </div>
        </div>

      ) : (
        /* Wallet list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 4, letterSpacing: '0.06em' }}>
            DETECTED WALLETS
          </div>
          {wallets.map((w) => (
            <button
              key={w.info.uuid}
              onClick={() => handleConnect(w)}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.12s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(163,230,53,0.10)'
                e.currentTarget.style.borderColor = 'rgba(163,230,53,0.4)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              {/* Wallet icon or fallback */}
              {w.info.icon ? (
                <img src={w.info.icon} alt={w.info.name} style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(0,0,0,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>🦊</div>
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{w.info.name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>Click to connect</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 16, color: '#ccc' }}>→</div>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'rgba(255,80,80,0.08)',
          border: '1px solid rgba(255,80,80,0.2)',
          borderRadius: 10, fontSize: 12, color: '#c00', lineHeight: 1.5,
        }}>
          {error}
          <button
            onClick={() => { setError(null); setStep('idle'); setSelected(null) }}
            style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 20, paddingTop: 16,
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, fontSize: 11, color: '#bbb',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635' }} />
        Built on Arc · Powered by Circle · Sign is free
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
