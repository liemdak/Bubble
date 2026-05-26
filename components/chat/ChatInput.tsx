'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ScanLine } from 'lucide-react'
import { QRScanner } from '@/components/qr/QRScanner'
import { playBubblePop, playBubbleTap } from '@/lib/sounds'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export interface ChatInputHandle {
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

  // Listen for sidebar contact clicks dispatched via CustomEvent
  useEffect(() => {
    function handler(e: Event) {
      const text = (e as CustomEvent<string>).detail
      setValue(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    window.addEventListener('bubblepay:prefill', handler)
    return () => window.removeEventListener('bubblepay:prefill', handler)
  }, [])

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
        background: 'rgba(6,6,15,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
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
          border: `1.5px solid ${hasValue ? '#a3e635' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 14,
          padding: '0 14px',
          height: 46,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: hasValue ? 'rgba(163,230,53,0.35) 0 0 12px 0' : 'none',
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
              ? hoverSend ? '#b5f03a' : '#a3e635'
              : 'rgba(255,255,255,0.07)',
            border: hasValue ? '1px solid #8bc920' : '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: hasValue ? 'pointer' : 'not-allowed',
            transition: 'all 0.12s',
            boxShadow: hasValue && !pressSend ? 'rgb(10,10,13) 2px 2px 0px 0px' : 'none',
            transform: pressSend ? 'translate(2px,2px)' : hoverSend ? 'translateY(-1px)' : 'none',
            fontSize: 13, fontWeight: 700,
            color: hasValue ? '#000' : 'rgba(255,255,255,0.25)',
            fontFamily: 'inherit',
          }}
        >
          Send
        </button>
      </div>
    </>
  )
})
