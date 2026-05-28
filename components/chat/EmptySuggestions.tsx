'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { playBubbleTap } from '@/lib/sounds'

const SUGGESTIONS = [
  { text: 'Send 50 USDC to ',      desc: 'Transfer stablecoins instantly',  prefillOnly: true  },
  { text: 'Swap 100 USDC to EURC', desc: 'Exchange between tokens',          prefillOnly: true  },
  { text: 'Show my QR code',       desc: 'Share your receive address',        prefillOnly: false },
  { text: 'Check my balance',      desc: 'USDC · EURC · USYC',               prefillOnly: false },
]

interface EmptySuggestionsProps {
  onSelect:  (text: string) => void
  onPrefill: (text: string) => void
}

function SuggestionCard({
  text, desc, prefillOnly, onSelect, onPrefill,
}: typeof SUGGESTIONS[0] & { onSelect: (t: string) => void; onPrefill: (t: string) => void }) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)

  return (
    <button
      onClick={() => { playBubbleTap(); prefillOnly ? onPrefill(text) : onSelect(text) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        background: hover ? 'rgba(163,230,53,0.06)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hover ? 'rgba(163,230,53,0.18)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: '13px 14px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transform: press ? 'scale(0.98)' : hover ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.12s, background 0.12s, border-color 0.12s',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.80)', marginBottom: 3, lineHeight: 1.3 }}>
        {text}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontWeight: 300 }}>
        {desc}
      </div>
    </button>
  )
}

export function EmptySuggestions({ onSelect, onPrefill }: EmptySuggestionsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      padding: '0 0 20px',
    }}>
      {SUGGESTIONS.map((s, i) => (
        <motion.div
          key={s.text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.20, delay: i * 0.05 + 0.08 }}
        >
          <SuggestionCard {...s} onSelect={onSelect} onPrefill={onPrefill} />
        </motion.div>
      ))}
    </div>
  )
}
