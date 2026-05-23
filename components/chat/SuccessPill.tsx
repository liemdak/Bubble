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
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
      <SuccessBurst active={burst} />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'backOut' }}
        style={{
          background: '#a3e635',
          border: '1px solid #171717',
          borderRadius: 100,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 700,
          boxShadow: 'rgb(10,10,13) 2px 2px 0px 0px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>✓</span>
        <span>{message}</span>
        {arcScanUrl && (
          <a
            href={arcScanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline', fontSize: 12 }}
          >
            View on ArcScan →
          </a>
        )}
      </motion.div>
    </div>
  )
}
