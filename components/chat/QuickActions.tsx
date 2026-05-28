'use client'

import { useState } from 'react'
import { playBubbleTap } from '@/lib/sounds'

const ACTIONS = [
  { label: 'Send',       prompt: 'Send  USDC to ',                   prefillOnly: true  },
  { label: 'Swap',       prompt: 'Swap  USDC to EURC',               prefillOnly: true  },
  { label: 'Bridge',     prompt: 'Bridge  USDC from arc to ethereum', prefillOnly: true  },
  { label: 'Withdraw',   prompt: 'Withdraw all from agent wallet',    prefillOnly: false },
  { label: 'Fund Agent', prompt: 'Fund 10 USDC to agent',            prefillOnly: false },
  { label: 'My QR',      prompt: 'Show my QR code',                  prefillOnly: false },
  { label: 'Balance',    prompt: 'Check my balance',                 prefillOnly: false },
]

interface QuickActionsProps {
  onAction:  (prompt: string) => void
  onPrefill: (text: string)   => void
}

function ActionChip({
  label, prompt, prefillOnly, onAction, onPrefill,
}: typeof ACTIONS[0] & { onAction: (p: string) => void; onPrefill: (p: string) => void }) {
  const [hover,   setHover]   = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={() => { playBubbleTap(); prefillOnly ? onPrefill(prompt) : onAction(prompt) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: hover ? 'rgba(163,230,53,0.08)' : 'rgba(255,255,255,0.06)',
        color: hover ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.55)',
        border: `1px solid ${hover ? 'rgba(163,230,53,0.25)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 100,
        padding: '5px 13px',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        flexShrink: 0,
        transform: pressed ? 'scale(0.96)' : hover ? 'translateY(-1px)' : 'none',
        transition: 'background 0.12s, transform 0.10s, border-color 0.12s, color 0.12s',
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
      gap: 6,
      overflowX: 'auto',
      padding: '8px 14px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(4,4,12,0.50)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
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
