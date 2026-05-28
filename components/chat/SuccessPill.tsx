'use client'

import { motion } from 'framer-motion'
import { SuccessBurst } from '@/components/bubbles/SuccessBurst'
import { useState, useEffect } from 'react'

interface SuccessPillProps {
  txHash: string
  message?: string
  arcScanUrl?: string
}

export function SuccessPill({ txHash, message = 'Transaction confirmed', arcScanUrl }: SuccessPillProps) {
  const [burst, setBurst] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setBurst(false), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 6 }}>
      <SuccessBurst active={burst} />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'rgba(163,230,53,0.08)',
          border: '1px solid rgba(163,230,53,0.28)',
          borderRadius: 100,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 0 20px rgba(163,230,53,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#a3e635',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 14 }}>✓</span>
        <span>{message}</span>
        {arcScanUrl && (
          <a
            href={arcScanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'rgba(163,230,53,0.65)',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 400,
              borderLeft: '1px solid rgba(163,230,53,0.2)',
              paddingLeft: 8,
              marginLeft: 2,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#a3e635')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(163,230,53,0.65)')}
          >
            ArcScan →
          </a>
        )}
      </motion.div>
    </div>
  )
}
