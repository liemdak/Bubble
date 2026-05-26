'use client'

import { useState } from 'react'
import { playBubbleTap } from '@/lib/sounds'

const ACTIONS = [
  { label: '💸 Send',       prompt: 'Send  USDC to ',        accent: 'rgba(163,230,53,0.25)',  prefillOnly: true  },
  { label: '🔄 Swap',       prompt: 'Swap  USDC to EURC',    accent: 'rgba(250,233,255,0.2)',  prefillOnly: true  },
  { label: '🌉 Bridge',     prompt: 'Bridge  USDC from arc to ethereum', accent: 'rgba(254,243,200,0.2)', prefillOnly: true  },
  { label: '🤖 Fund Agent', prompt: 'Nạp 10 USDC vào agent', accent: 'rgba(163,230,53,0.2)',   prefillOnly: false },
  { label: '📷 My QR',      prompt: 'Show my QR code',        accent: 'rgba(224,242,254,0.18)', prefillOnly: false },
  { label: '💰 Balance',    prompt: 'Check my balance',       accent: 'rgba(163,230,53,0.15)', prefillOnly: false },
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
        background: hover ? accent : 'rgba(255,255,255,0.07)',
        color: '#fff',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 100,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: pressed ? 'none' : hover ? 'rgb(10,10,13) 2px 2px 0px 0px' : 'none',
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
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(6,6,15,0.5)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
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
