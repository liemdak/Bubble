'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TxRecord } from '@/types/db'

const TYPE_ICON: Record<string, string> = {
  send:   '📤',
  swap:   '🔄',
  bridge: '🌉',
}

const TYPE_COLOR: Record<string, string> = {
  send:   '#2775CA',
  swap:   '#fbbf25',
  bridge: '#a3e635',
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function TxCard({ tx }: { tx: TxRecord }) {
  const icon  = TYPE_ICON[tx.type] ?? '💸'
  const color = TYPE_COLOR[tx.type] ?? '#888'

  let title = ''
  let subtitle = ''

  if (tx.type === 'send') {
    title    = `Sent ${tx.amount} ${tx.token}`
    subtitle = tx.toName
      ? `→ ${tx.toName} (${tx.toAddress?.slice(0, 8)}...)`
      : `→ ${tx.toAddress?.slice(0, 10)}...`
  } else if (tx.type === 'swap') {
    title    = `Swapped ${tx.amountIn} ${tx.tokenIn} → ${tx.amountOut ?? '?'} ${tx.tokenOut}`
    subtitle = 'Arc Testnet'
  } else if (tx.type === 'bridge') {
    title    = `Bridged ${tx.amount} ${tx.token}`
    subtitle = `${tx.fromChain?.toUpperCase()} → ${tx.toChain?.toUpperCase()}`
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 8,
      border: '1px solid #171717',
      boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Left color strip */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 4, background: color, borderRadius: '8px 0 0 8px',
      }} />

      {/* Icon */}
      <div style={{
        fontSize: 22, marginLeft: 8, flexShrink: 0,
        width: 36, textAlign: 'center',
      }}>
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#888' }}>{subtitle}</div>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>{formatTime(tx.createdAt)}</div>
      </div>

      {/* Status + Link */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px',
          borderRadius: 100, border: '1px solid',
          color:       tx.status === 'complete' ? '#2D9B6F' : tx.status === 'failed' ? '#c00' : '#888',
          borderColor: tx.status === 'complete' ? '#2D9B6F' : tx.status === 'failed' ? '#c00' : '#ccc',
        }}>
          {tx.status === 'complete' ? '✓ Done' : tx.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
        </span>
        {tx.arcScanUrl && (
          <a
            href={tx.arcScanUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: '#888', textDecoration: 'none' }}
          >
            ArcScan ↗
          </a>
        )}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [txs, setTxs]       = useState<TxRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'send' | 'swap' | 'bridge'>('all')

  const fetchTxs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/transactions')
      const data = await res.json()
      setTxs(data.transactions ?? [])
    } catch {
      setTxs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTxs() }, [fetchTxs])

  const filtered = filter === 'all' ? txs : txs.filter(t => t.type === filter)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 100, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', border: '1px solid',
    borderColor: active ? '#171717' : '#ddd',
    background:  active ? '#000' : '#fff',
    color:       active ? '#fff' : '#555',
    boxShadow:   active ? 'rgb(10,10,13) 1px 1px 0px 0px' : 'none',
  })

  return (
    <div style={{ padding: '24px', maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📋 History</h1>
        <button onClick={fetchTxs} style={{
          background: 'none', border: '1px solid #ddd', borderRadius: 6,
          padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: '#555',
        }}>
          ↺ Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['all', 'send', 'swap', 'bridge'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={chipStyle(filter === f)}>
            {f === 'all' ? 'All' : f === 'send' ? '📤 Send' : f === 'swap' ? '🔄 Swap' : '🌉 Bridge'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888', padding: 40, fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          border: '1px dashed #ccc', borderRadius: 8,
          padding: '40px 20px', textAlign: 'center', color: '#888',
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No transactions yet</div>
          <div style={{ fontSize: 13 }}>Send, swap, or bridge to see history here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(tx => <TxCard key={tx.id} tx={tx} />)}
        </div>
      )}
    </div>
  )
}
