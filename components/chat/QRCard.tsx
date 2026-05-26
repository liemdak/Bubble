'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { playBubbleTap } from '@/lib/sounds'

interface QRCardProps {
  address: string
  message?: string
}

export function QRCard({ address, message }: QRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hoverCopy, setHoverCopy] = useState(false)
  const [hoverShare, setHoverShare] = useState(false)

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  useEffect(() => {
    if (!address) return
    QRCode.toDataURL(address, {
      width: 200, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(console.error)
  }, [address])

  async function handleCopy() {
    playBubbleTap()
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    playBubbleTap()
    const text = `Pay me on Bubble: ${address}`
    if (navigator.share) {
      await navigator.share({ title: 'My Bubble address', text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: '#ffffff',
        border: '1.5px solid #e0e0e0',
        borderRadius: 14,
        boxShadow: 'rgb(10,10,13) 3px 3px 0px 0px',
        overflow: 'hidden',
        marginBottom: 8,
        maxWidth: 260,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Header */}
      <div style={{
        width: '100%',
        borderLeft: '4px solid #38bdf8',
        padding: '10px 14px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>📷</span>
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.02em' }}>RECEIVE PAYMENT</span>
      </div>

      {/* QR */}
      <div style={{ padding: '18px 18px 10px' }}>
        {qrDataUrl ? (
          <div style={{
            background: '#fff', border: '1px solid #eee',
            borderRadius: 8, padding: 8, display: 'inline-block',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR" width={180} height={180} style={{ display: 'block', borderRadius: 4 }} />
          </div>
        ) : (
          <div style={{
            width: 196, height: 196, background: '#f5f5f5',
            borderRadius: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22,
          }}>⏳</div>
        )}
      </div>

      {/* Address */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', padding: '0 18px 4px', letterSpacing: '0.03em' }}>
        {short}
      </div>

      {message && (
        <div style={{ fontSize: 10, color: '#bbb', padding: '0 18px 12px', textAlign: 'center', lineHeight: 1.5 }}>
          {message}
        </div>
      )}

      {/* Buttons */}
      <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8, width: '100%' }}>
        <button
          onClick={handleCopy}
          onMouseEnter={() => setHoverCopy(true)}
          onMouseLeave={() => setHoverCopy(false)}
          style={{
            flex: 1,
            background: copied ? '#38bdf8' : hoverCopy ? '#f0f0f0' : '#ffffff',
            color: '#000', border: '1px solid #e0e0e0', borderRadius: 6,
            padding: '8px 0', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            transition: 'all 0.15s', transform: hoverCopy ? 'translateY(-1px)' : 'none',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button
          onClick={handleShare}
          onMouseEnter={() => setHoverShare(true)}
          onMouseLeave={() => setHoverShare(false)}
          style={{
            flex: 1,
            background: hoverShare ? '#f0f0f0' : '#ffffff',
            color: '#000', border: '1px solid #e0e0e0', borderRadius: 6,
            padding: '8px 0', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
            transition: 'all 0.15s', transform: hoverShare ? 'translateY(-1px)' : 'none',
          }}
        >
          Share
        </button>
      </div>
    </motion.div>
  )
}
