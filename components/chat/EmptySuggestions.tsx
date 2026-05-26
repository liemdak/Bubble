'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { playBubbleTap } from '@/lib/sounds'

const SUGGESTIONS = [
  { text: 'Send 50 USDC to ',    desc: 'Transfer stablecoins instantly',  accent: 'rgba(56,189,248,0.2)',  prefillOnly: true  },
  { text: 'Swap 100 USDC to EURC', desc: 'Exchange between tokens',       accent: 'rgba(250,233,255,0.2)', prefillOnly: true  },
  { text: 'Show my QR code',      desc: 'Share your receive address',      accent: 'rgba(137,229,240,0.18)', prefillOnly: false },
  { text: 'Check my balance',     desc: 'USDC · EURC · USYC',             accent: 'rgba(196,181,253,0.18)', prefillOnly: false },
]

interface EmptySuggestionsProps {
  onSelect:  (text: string) => void
  onPrefill: (text: string) => void
}

function SuggestionCard({
  text, desc, accent, prefillOnly, onSelect, onPrefill,
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
        background: hover ? accent : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 12,
        padding: '14px 14px 14px 13px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: press ? 'none' : hover ? 'rgb(10,10,13) 3px 3px 0px 0px' : 'rgb(10,10,13) 2px 2px 0px 0px',
        transform: press ? 'translate(2px,2px)' : hover ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.12s, box-shadow 0.12s, background 0.12s',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
        {text}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
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
      gap: 9,
      padding: '0 16px 20px',
    }}>
      {SUGGESTIONS.map((s, i) => (
        <motion.div
          key={s.text}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: i * 0.06 + 0.1 }}
        >
          <SuggestionCard {...s} onSelect={onSelect} onPrefill={onPrefill} />
        </motion.div>
      ))}
    </div>
  )
}
