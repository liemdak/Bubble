'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ScanLine } from 'lucide-react'
import { QRScanner } from '@/components/qr/QRScanner'
import { playBubblePop, playBubbleTap } from '@/lib/sounds'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  mode?: 'payment' | 'agent'
  accentColor?: string
}

export interface ChatInputHandle {
  prefill: (text: string) => void
}

// ── Slash command definitions ─────────────────────────────────────────────────
const PAYMENT_COMMANDS = [
  { cmd: '/p',         fill: '/p ',          label: '/p <TOKEN>',          desc: 'Price + 7d chart  e.g. /p BTC'     },
  { cmd: '/p 30d',     fill: '/p ',          label: '/p <TOKEN> 30d',      desc: '30-day chart  e.g. /p ETH 30d'     },
  { cmd: '/p 1d',      fill: '/p ',          label: '/p <TOKEN> 1d',       desc: '24h chart  e.g. /p SOL 1d'         },
  { cmd: '/p rate',    fill: '/p ',          label: '/p <TOKEN> <TOKEN>',  desc: 'Exchange rate  e.g. /p USDC EURC'  },
  { cmd: '/save',      fill: '/save ',       label: '/save <Name> <0x…>',  desc: 'Save a contact  e.g. /save Mike 0xAbc…' },
  { cmd: '/help',      fill: '/help',        label: '/help',               desc: 'List all quick commands'            },
]

const AGENT_COMMANDS = [
  { cmd: '/book',      fill: '/book ',       label: '/book <title>',       desc: 'Book details  e.g. /book harry potter'     },
  { cmd: '/book @',    fill: '/book @',      label: '/book @<author>',     desc: 'Author info  e.g. /book @stephen king'     },
  { cmd: '/book #',    fill: '/book #',      label: '/book #<genre>',      desc: 'Books by genre  e.g. /book #thriller'      },
  { cmd: '/book #manga', fill: '/book #manga', label: '/book #manga',      desc: 'Manga & anime  e.g. /book #manga'          },
  { cmd: '/help',      fill: '/help',        label: '/help',               desc: 'List all commands'                         },
]

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Send 50 USDC to Sarah…',
  mode = 'payment',
  accentColor = '#a3e635',
}, ref) {
  const SLASH_COMMANDS = mode === 'agent' ? AGENT_COMMANDS : PAYMENT_COMMANDS
  const [value, setValue]           = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [hoverScan, setHoverScan]   = useState(false)
  const [hoverSend, setHoverSend]   = useState(false)
  const [pressSend, setPressSend]   = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    prefill: (text: string) => {
      setValue(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
  }))

  useEffect(() => {
    function handler(e: Event) {
      const text = (e as CustomEvent<string>).detail
      setValue(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    window.addEventListener('bubblepay:prefill', handler)
    return () => window.removeEventListener('bubblepay:prefill', handler)
  }, [])

  // ── Slash command suggestions ───────────────────────────────────────
  const showSuggestions = value.startsWith('/')
  const filtered = showSuggestions
    ? SLASH_COMMANDS.filter(c =>
        c.cmd.startsWith(value.split(' ')[0].toLowerCase()) ||
        c.label.toLowerCase().includes(value.toLowerCase().slice(1))
      )
    : []

  // Reset selection when filter changes
  useEffect(() => { setSelectedIdx(0) }, [value])

  function pickCommand(fill: string) {
    setValue(fill)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Handlers ────────────────────────────────────────────────────────
  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    playBubblePop()
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showSuggestions && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && filtered.length > 0 && value.trim() === filtered[selectedIdx]?.cmd)) {
        e.preventDefault()
        pickCommand(filtered[selectedIdx].fill)
        return
      }
      if (e.key === 'Escape') {
        setValue('')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleScan(address: string) {
    setScannerOpen(false)
    const msg = address.startsWith('0x') ? `Send to ${address}` : address
    setValue(msg)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const hasValue = !!value.trim() && !disabled

  return (
    <>
      {scannerOpen && (
        <QRScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}

      {/* Wrapper with relative positioning so the popup floats above */}
      <div style={{ position: 'relative', flexShrink: 0 }}>

        {/* ── Slash command popup ── */}
        {showSuggestions && filtered.length > 0 && (
          <div style={{
            position:     'absolute',
            bottom:       '100%',
            left:          14,
            right:         14,
            marginBottom:  6,
            background:   '#0e0e14',
            border:       '1px solid rgba(255,255,255,0.12)',
            borderRadius:  12,
            overflow:     'hidden',
            zIndex:        200,
            boxShadow:    '0 -8px 32px rgba(0,0,0,0.6)',
          }}>
            {/* header label */}
            <div style={{
              padding:    '7px 14px 5px',
              fontSize:    10,
              fontWeight:  600,
              letterSpacing: 0.8,
              color:      'rgba(255,255,255,0.25)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              QUICK COMMANDS
            </div>

            {filtered.map((c, i) => (
              <div
                key={c.label}
                onMouseDown={(e) => { e.preventDefault(); pickCommand(c.fill) }}
                onMouseEnter={() => setSelectedIdx(i)}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:         10,
                  padding:    '9px 14px',
                  cursor:     'pointer',
                  background:  i === selectedIdx ? `${accentColor}14` : 'transparent',
                  borderLeft:  i === selectedIdx ? `2px solid ${accentColor}` : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  fontFamily:   'monospace',
                  fontSize:      13,
                  fontWeight:    600,
                  color:         i === selectedIdx ? accentColor : `${accentColor}b0`,
                  minWidth:      140,
                  flexShrink:    0,
                }}>
                  {c.label}
                </span>
                <span style={{
                  fontSize:  12,
                  color:     'rgba(255,255,255,0.35)',
                  overflow:  'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {c.desc}
                </span>
              </div>
            ))}

            <div style={{
              padding:    '5px 14px 7px',
              fontSize:    10,
              color:      'rgba(255,255,255,0.18)',
              borderTop:  '1px solid rgba(255,255,255,0.06)',
            }}>
              ↑↓ navigate · Tab to fill · Enter to send · Esc to close
            </div>
          </div>
        )}

        {/* ── Input bar ── */}
        <div style={{
          padding: '10px 14px 16px',
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'rgba(6,6,15,0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>

          {/* QR scan button */}
          <button
            onClick={() => { playBubbleTap(); setScannerOpen(true) }}
            disabled={disabled}
            onMouseEnter={() => setHoverScan(true)}
            onMouseLeave={() => setHoverScan(false)}
            style={{
              height: 46, flexShrink: 0,
              borderRadius: 12,
              background: hoverScan ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${hoverScan ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'}`,
              padding: '0 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <ScanLine size={17} color={hoverScan ? '#fff' : 'rgba(255,255,255,0.5)'} />
          </button>

          {/* Text input */}
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.07)',
            border: `1.5px solid ${showSuggestions && filtered.length > 0
              ? `${accentColor}66`
              : hasValue ? `${accentColor}8c` : 'rgba(255,255,255,0.10)'}`,
            borderRadius: 14,
            padding: '0 14px',
            height: 46,
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: hasValue ? `${accentColor}2e 0 0 16px 0` : 'none',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                color: '#fff',
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!hasValue}
            onMouseEnter={() => setHoverSend(true)}
            onMouseLeave={() => { setHoverSend(false); setPressSend(false) }}
            onMouseDown={() => setPressSend(true)}
            onMouseUp={() => setPressSend(false)}
            style={{
              height: 46, flexShrink: 0,
              borderRadius: 12,
              padding: '0 18px',
              background: hasValue
                ? accentColor
                : 'rgba(255,255,255,0.07)',
              border: hasValue ? 'none' : '1px solid rgba(255,255,255,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: hasValue ? 'pointer' : 'not-allowed',
              transition: 'all 0.12s',
              boxShadow: hasValue && !pressSend ? `${accentColor}40 0 4px 16px` : 'none',
              transform: pressSend ? 'translate(2px,2px)' : hoverSend ? 'translateY(-1px)' : 'none',
              fontSize: 13, fontWeight: 700,
              color: hasValue ? '#000' : 'rgba(255,255,255,0.25)',
              fontFamily: 'inherit',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
})
