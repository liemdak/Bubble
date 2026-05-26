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
    <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 8 }}>
      <SuccessBurst active={burst} />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'backOut' }}
        style={{
          background: 'rgba(163,230,53,0.15)',
          border: '1px solid rgba(163,230,53,0.4)',
          borderRadius: 100,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 700,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 0 20px rgba(163,230,53,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#a3e635',
        }}
      >
        <span>✓</span>
        <span>{message}</span>
        {arcScanUrl && (
          <a
            href={arcScanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(163,230,53,0.8)', textDecoration: 'underline', fontSize: 12 }}
          >
            ArcScan →
          </a>
        )}
      </motion.div>
    </div>
  )
}
