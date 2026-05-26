'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ConfirmationCard } from '@/types/intent'
import { playBubbleConfirm, playBubbleTap } from '@/lib/sounds'

interface ConfirmCardProps {
  card: ConfirmationCard
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const STRIP_COLORS: Record<string, string> = {
  send_payment:  '#2775CA',
  swap_tokens:   '#fbbf25',
  bridge_tokens: '#a3e635',
  fund_agent:    '#a3e635',
}

const ACTION_LABELS: Record<string, string> = {
  send_payment:   'Send',
  swap_tokens:    'Swap',
  bridge_tokens:  'Bridge',
  get_balance:    'Balance',
  get_rate:       'Rate',
  manage_contact: 'Contact',
  fund_agent:     'Fund Agent',
}

export function ConfirmCard({ card, onConfirm, onCancel, loading = false }: ConfirmCardProps) {
  const { intent, resolved_address, gas_fee, total_display } = card
  const stripColor = STRIP_COLORS[intent.type] ?? '#a3e635'
  const actionLabel = ACTION_LABELS[intent.type] ?? intent.type

  const [hoverConfirm, setHoverConfirm] = useState(false)
  const [pressConfirm, setPressConfirm] = useState(false)
  const [hoverCancel, setHoverCancel] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        marginBottom: 8,
        maxWidth: 340,
      }}
    >
      {/* Header */}
      <div style={{
        borderLeft: `4px solid ${stripColor}`,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', color: '#fff' }}>{actionLabel}</span>
        <button
          onClick={() => { playBubbleTap(); onCancel() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: 'rgba(255,255,255,0.3)', lineHeight: 1, padding: '2px 4px',
            borderRadius: 4, transition: 'color 0.12s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          ×
        </button>
      </div>

      {/* Details */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {intent.type === 'fund_agent' ? (
          <>
            <CardRow label="From"   value={`MetaMask · ${intent.user_address.slice(0,6)}...${intent.user_address.slice(-4)}`} />
            <CardRow label="To"     value={`Agent wallet · ${intent.agent_address.slice(0,6)}...${intent.agent_address.slice(-4)}`} />
            <CardRow label="Amount" value={`${intent.amount} ${intent.token}`} />
            <CardRow label="Via"    value="MetaMask (on-chain transfer)" />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 9 }}>
              <CardRow label="Total" value={total_display} bold />
            </div>
          </>
        ) : (
          <>
            <CardRow label="To" value={
              intent.type === 'send_payment'
                ? `${intent.recipient_name ?? ''} · ${resolved_address ?? intent.recipient_address ?? '—'}`
                : '—'
            } />
            <CardRow label="Amount" value={
              'amount' in intent
                ? `${intent.amount} ${'token' in intent ? intent.token : ''}`
                : 'amount_in' in intent
                ? `${intent.amount_in} ${intent.token_in} → ${intent.token_out}`
                : '—'
            } />
            <CardRow label="Gas" value={`~${gas_fee} (sponsored)`} />
            <CardRow label="Chain" value={'chain' in intent ? intent.chain.toUpperCase() : 'ARC'} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 9 }}>
              <CardRow label="Total" value={total_display} bold />
            </div>
          </>
        )}
      </div>

      {/* Buttons */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        <button
          onClick={() => { playBubbleConfirm(); onConfirm() }}
          disabled={loading}
          onMouseEnter={() => setHoverConfirm(true)}
          onMouseLeave={() => { setHoverConfirm(false); setPressConfirm(false) }}
          onMouseDown={() => setPressConfirm(true)}
          onMouseUp={() => setPressConfirm(false)}
          style={{
            flex: 1,
            background: loading ? 'rgba(163,230,53,0.3)' : hoverConfirm ? '#b5f03a' : '#a3e635',
            color: '#000',
            border: 'none',
            borderRadius: 10,
            padding: '11px',
            fontWeight: 700, fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: pressConfirm || loading ? 'none' : 'rgb(10,10,13) 2px 2px 0px 0px',
            transform: pressConfirm ? 'translate(2px,2px)' : hoverConfirm ? 'translateY(-1px)' : 'none',
            transition: 'all 0.12s',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Confirming…' : '✓ Confirm'}
        </button>
        <button
          onClick={() => { playBubbleTap(); onCancel() }}
          onMouseEnter={() => setHoverCancel(true)}
          onMouseLeave={() => setHoverCancel(false)}
          style={{
            background: hoverCancel ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '11px 18px',
            fontWeight: 600, fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.12s',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

function CardRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, textAlign: 'right', color: '#fff' }}>{value}</span>
    </div>
  )
}
