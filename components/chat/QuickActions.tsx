'use client'

import { useState } from 'react'
import { playBubbleTap } from '@/lib/sounds'

const ACTIONS = [
  { label: '💸 Send',      prompt: 'Send ',                    accent: '#d2fae5' },
  { label: '🔄 Swap',      prompt: 'Swap ',                    accent: '#fae9ff' },
  { label: '🌉 Bridge',    prompt: 'Bridge ',                  accent: '#fef3c8' },
  { label: '🤖 Fund Agent',prompt: 'Nạp 10 USDC vào agent',   accent: '#ecfccb' },
  { label: '📷 My QR',     prompt: 'Show my QR code',          accent: '#e0f2fe' },
  { label: '💰 Balance',   prompt: 'Check my balance',         accent: '#d2fae5' },
]

interface QuickActionsProps {
  onAction: (prompt: string) => void
}

function ActionChip({ label, prompt, accent, onAction }: typeof ACTIONS[0] & { onAction: (p: string) => void }) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={() => { playBubbleTap(); onAction(prompt) }}
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

export function QuickActions({ onAction }: QuickActionsProps) {
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
        <ActionChip key={a.label} {...a} onAction={onAction} />
      ))}
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
