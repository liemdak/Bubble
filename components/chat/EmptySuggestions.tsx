'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { playBubbleTap } from '@/lib/sounds'

const SUGGESTIONS = [
  { text: 'Send 50 USDC to Sarah',  desc: 'Transfer stablecoins instantly',  accent: '#a3e635' },
  { text: 'Swap 100 USDC to EURC',  desc: 'Exchange between tokens',          accent: '#fbbf25' },
  { text: 'Show my QR code',         desc: 'Share your receive address',       accent: '#89e5f0' },
  { text: 'Check my balance',         desc: 'USDC · EURC · USYC',              accent: '#c4b5fd' },
]

interface EmptySuggestionsProps {
  onSelect: (text: string) => void
}

function SuggestionCard({
  text, desc, accent, onSelect,
}: typeof SUGGESTIONS[0] & { onSelect: (t: string) => void }) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)

  return (
    <button
      onClick={() => { playBubbleTap(); onSelect(text) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        background: '#ffffff',
        border: '1.5px solid #e8e8e8',
        borderLeft: `4px solid ${accent}`,
        borderRadius: 10,
        padding: '14px 14px 14px 13px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
        boxShadow: press
          ? 'none'
          : hover
          ? 'rgb(10,10,13) 3px 3px 0px 0px'
          : 'rgb(10,10,13) 2px 2px 0px 0px',
        transform: press
          ? 'translate(2px,2px)'
          : hover
          ? 'translateY(-2px)'
          : 'none',
        transition: 'transform 0.12s, box-shadow 0.12s, background 0.12s',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4, lineHeight: 1.3 }}>
        {text}
      </div>
      <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>
        {desc}
      </div>
    </button>
  )
}

export function EmptySuggestions({ onSelect }: EmptySuggestionsProps) {
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
          <SuggestionCard {...s} onSelect={onSelect} />
        </motion.div>
      ))}
    </div>
  )
}
