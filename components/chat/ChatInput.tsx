'use client'

import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { ScanLine } from 'lucide-react'
import { QRScanner } from '@/components/qr/QRScanner'
import { playBubblePop, playBubbleTap } from '@/lib/sounds'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export interface ChatInputHandle {
  /** Pre-fill input text and focus without sending */
  prefill: (text: string) => void
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Send 50 USDC to Sarah…',
}, ref) {
  const [value, setValue] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [hoverScan, setHoverScan] = useState(false)
  const [hoverSend, setHoverSend] = useState(false)
  const [pressSend, setPressSend] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    prefill: (text: string) => {
      setValue(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
  }))

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    playBubblePop()
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
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

      <div style={{
        padding: '10px 14px 16px',
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        flexShrink: 0,
      }}>

        {/* QR scan — text only */}
        <button
          onClick={() => { playBubbleTap(); setScannerOpen(true) }}
          disabled={disabled}
          onMouseEnter={() => setHoverScan(true)}
          onMouseLeave={() => setHoverScan(false)}
          style={{
            height: 46, flexShrink: 0,
            borderRadius: 12,
            background: hoverScan ? '#f0f0f0' : '#f5f5f5',
            border: `1px solid ${hoverScan ? '#ccc' : '#e0e0e0'}`,
            padding: '0 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            boxShadow: hoverScan ? 'rgb(10,10,13) 2px 2px 0px 0px' : 'rgb(10,10,13) 1px 1px 0px 0px',
            transform: hoverScan ? 'translateY(-1px)' : 'none',
          }}
        >
          <ScanLine size={17} color={hoverScan ? '#444' : '#888'} />
        </button>

        {/* Text input */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center',
          background: '#f5f5f5',
          border: `1.5px solid ${hasValue ? '#a3e635' : '#e0e0e0'}`,
          borderRadius: 14,
          padding: '0 14px',
          height: 46,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: hasValue
            ? 'rgb(163,230,53) 1px 1px 0px 0px'
            : 'rgb(10,10,13) 1px 1px 0px 0px',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, fontWeight: 500, fontFamily: 'inherit', color: '#000',
            }}
          />
        </div>

        {/* Send — text only */}
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
              ? hoverSend ? '#b5f03a' : '#a3e635'
              : '#f0f0f0',
            border: hasValue ? '1px solid #8bc920' : '1px solid #ddd',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: hasValue ? 'pointer' : 'not-allowed',
            transition: 'all 0.12s',
            boxShadow: hasValue && !pressSend ? 'rgb(10,10,13) 2px 2px 0px 0px' : 'none',
            transform: pressSend ? 'translate(2px,2px)' : hoverSend ? 'translateY(-1px)' : 'none',
            fontSize: 13, fontWeight: 700,
            color: hasValue ? '#000' : '#bbb',
            fontFamily: 'inherit',
          }}
        >
          Send
        </button>
      </div>
    </>
  )
})
