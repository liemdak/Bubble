'use client'

import { useState } from 'react'
import { playBubbleTap } from '@/lib/sounds'

const ACTIONS = [
  // prefillOnly=true → set input text, let user complete before sending
  // prefillOnly=false → auto-send immediately
  { label: '💸 Send',       prompt: 'Send  USDC to ',          accent: '#d2fae5', prefillOnly: true  },
  { label: '🔄 Swap',       prompt: 'Swap  USDC to EURC',      accent: '#fae9ff', prefillOnly: true  },
  { label: '🌉 Bridge',     prompt: 'Bridge  USDC to ',        accent: '#fef3c8', prefillOnly: true  },
  { label: '🤖 Fund Agent', prompt: 'Nạp 10 USDC vào agent',   accent: '#ecfccb', prefillOnly: false },
  { label: '📷 My QR',      prompt: 'Show my QR code',          accent: '#e0f2fe', prefillOnly: false },
  { label: '💰 Balance',    prompt: 'Check my balance',         accent: '#d2fae5', prefillOnly: false },
]

interface QuickActionsProps {
  onAction:  (prompt: string) => void
  onPrefill: (text: string)   => void
}

function ActionChip({
  label, prompt, accent, prefillOnly, onAction, onPrefill,
}: typeof ACTIONS[0] & { onAction: (p: string) => void; onPrefill: (p: string) => void }) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={() => { playBubbleTap(); prefillOnly ? onPrefill(prompt) : onAction(prompt) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: hover ? accent : '#ffffff',
        color: '#000',
        border: `1.5px solid ${hover ? 'rgba(0,0,0,0.12)' : '#e8e8e8'}`,
        borderRadius: 100,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: pressed
          ? 'none'
          : hover
          ? 'rgb(10,10,13) 2px 2px 0px 0px'
          : 'rgb(10,10,13) 1px 1px 0px 0px',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        flexShrink: 0,
        transform: pressed ? 'translate(1px, 1px)' : hover ? 'translateY(-1px)' : 'none',
        transition: 'background 0.12s, transform 0.1s, box-shadow 0.1s, border-color 0.12s',
      }}
    >
      {label}
    </button>
  )
}

export function QuickActions({ onAction, onPrefill }: QuickActionsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 7,
      overflowX: 'auto',
      padding: '7px 14px',
      borderTop: '1px solid rgba(0,0,0,0.05)',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(10px)',
      scrollbarWidth: 'none',
      flexShrink: 0,
    }}>
      {ACTIONS.map((a) => (
        <ActionChip key={a.label} {...a} onAction={onAction} onPrefill={onPrefill} />
      ))}
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
