'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// EIP-6963 types
interface EIP6963ProviderInfo {
  rdns:  string
  uuid:  string
  name:  string
  icon:  string
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
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') ?? '/chat'

  const [step,      setStep]      = useState<Step>('idle')
  const [error,     setError]     = useState<string | null>(null)
  const [wallets,   setWallets]   = useState<EIP6963Detail[]>([])
  const [selected,  setSelected]  = useState<EIP6963Detail | null>(null)
  const [stepLabel, setStepLabel] = useState('')

  // Discover wallets via EIP-6963
  useEffect(() => {
    const seen  = new Set<string>()
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

    const timer = setTimeout(() => {
      if (found.length === 0) {
        const eth = (window as unknown as { ethereum?: EIP6963Provider }).ethereum
        if (eth) {
          setWallets([{
            info: { rdns: 'legacy', uuid: 'legacy', name: 'Browser Wallet', icon: '' },
            provider: eth,
          }])
        }
      }
    }, 300)

    return () => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce)
      clearTimeout(timer)
    }
  }, [])

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
      const message = `Welcome to Bubble\n\nSign this message to connect your wallet. This does not cost any gas.\n\nWallet: ${address}\nNonce: ${nonce}`
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
      width: '100%',
      maxWidth: 400,
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 14,
      padding: '36px 28px',
      boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 22,
          fontWeight: 300,
          color: '#ffffff',
          letterSpacing: '-0.4px',
          marginBottom: 8,
        }}>
          Connect wallet
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', fontWeight: 300, lineHeight: 1.55 }}>
          Sign in instantly. No account needed.
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div style={{
          padding: '24px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 400, color: '#ffffff', marginBottom: 6 }}>
            {step === 'done' ? 'Welcome.' : selected?.info.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 300 }}>
            {stepLabel}
          </div>
          {step !== 'done' && (
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 16 }}>
              {(['connecting', 'signing', 'verifying'] as Step[]).map((s) => (
                <div key={s} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: step === s ? '#a3e635' : 'rgba(255,255,255,0.12)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          )}
        </div>

      ) : wallets.length === 0 ? (
        /* No wallet detected */
        <div style={{
          padding: '24px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          textAlign: 'center',
        }}>
          <div style={{ fontWeight: 400, fontSize: 14, color: '#ffffff', marginBottom: 8 }}>
            No wallet detected
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 300, marginBottom: 18, lineHeight: 1.6 }}>
            Install a browser wallet extension to continue.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { name: 'MetaMask',        href: 'https://metamask.io/download/' },
              { name: 'Rabby',           href: 'https://rabby.io' },
              { name: 'Coinbase Wallet', href: 'https://www.coinbase.com/wallet/downloads' },
            ].map(({ name, href }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 11, fontWeight: 400,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 100,
                padding: '5px 12px',
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.65)',
              }}>
                {name}
              </a>
            ))}
          </div>
        </div>

      ) : (
        /* Wallet list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.25)',
            marginBottom: 4,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Detected wallets
          </div>
          {wallets.map((w) => (
            <button
              key={w.info.uuid}
              onClick={() => handleConnect(w)}
              style={{
                width: '100%',
                padding: '13px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(163,230,53,0.07)'
                e.currentTarget.style.borderColor = 'rgba(163,230,53,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
              }}
            >
              {/* Wallet icon or initial */}
              {w.info.icon ? (
                <img
                  src={w.info.icon}
                  alt={w.info.name}
                  style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                }}>
                  {w.info.name[0]}
                </div>
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 400, color: '#ffffff' }}>{w.info.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>Click to connect</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>→</div>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 14,
          padding: '12px 14px',
          background: 'rgba(255,60,60,0.07)',
          border: '1px solid rgba(255,60,60,0.20)',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 300,
          color: 'rgba(255,140,140,0.9)',
          lineHeight: 1.55,
        }}>
          {error}
          <button
            onClick={() => { setError(null); setStep('idle'); setSelected(null) }}
            style={{
              display: 'block', marginTop: 8,
              fontSize: 11, color: 'rgba(255,255,255,0.35)',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
          >
            Try again →
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 24,
        paddingTop: 18,
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.22)',
        fontWeight: 300,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a3e635', display: 'inline-block' }} />
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
