'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import { ConfirmCard } from './ConfirmCard'
import { SuccessPill } from './SuccessPill'
import { EmptySuggestions } from './EmptySuggestions'
import { QRCard } from './QRCard'
import { ChatInput } from './ChatInput'
import { QuickActions } from './QuickActions'
import type { ConfirmationCard } from '@/types/intent'

type ChatMessage =
  | { id: string; type: 'user' | 'assistant'; content: string }
  | { id: string; type: 'confirm'; card: ConfirmationCard }
  | { id: string; type: 'success'; txHash: string; message: string; arcScanUrl?: string }
  | { id: string; type: 'qr'; address: string; message: string }
  | { id: string; type: 'typing' }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text: string) {
    if (loading) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), type: 'user', content: text }
    const typingMsg: ChatMessage = { id: 'typing', type: 'typing' }

    setMessages((prev) => [...prev, userMsg, typingMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()

      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== 'typing')
        if (data.type === 'confirm') {
          return [...without, { id: crypto.randomUUID(), type: 'confirm', card: data.card }]
        }
        if (data.type === 'qr') {
          return [...without, { id: crypto.randomUUID(), type: 'qr', address: data.address, message: data.message }]
        }
        return [...without, { id: crypto.randomUUID(), type: 'assistant', content: data.message ?? 'Done.' }]
      })
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== 'typing').concat({
        id: crypto.randomUUID(),
        type: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
      }))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(card: ConfirmationCard, cardId: string) {
    setConfirmLoading(true)
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: card.intent, resolved_address: card.resolved_address }),
      })
      const data = await res.json()
      setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
        id: crypto.randomUUID(),
        type: 'success',
        txHash: data.txHash,
        message: data.message ?? 'Transaction confirmed!',
        arcScanUrl: data.arcScanUrl,
      }))
    } catch {
      setMessages((prev) => prev.concat({
        id: crypto.randomUUID(),
        type: 'assistant',
        content: '⚠️ Transaction failed. Please try again.',
      }))
    } finally {
      setConfirmLoading(false)
    }
  }

  function handleCancelCard(cardId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
      id: crypto.randomUUID(),
      type: 'assistant',
      content: 'Cancelled.',
    }))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
        <AnimatePresence>
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="empty"
            >
              {/* Greeting hero */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ textAlign: 'center', padding: '32px 16px 24px' }}
              >
                {/* Bubble icon */}
                <motion.div
                  animate={{
                    y: [0, -6, 0],
                    scale: [1, 1.04, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(163,230,53,0.4)',
                    fontSize: 36,
                    marginBottom: 18,
                    boxShadow: '0 8px 32px rgba(163,230,53,0.2), 0 2px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  🫧
                </motion.div>

                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6 }}>
                  {getGreeting()} 👋
                </div>
                <div style={{ fontSize: 13, color: '#777', lineHeight: 1.7, maxWidth: 260, margin: '0 auto' }}>
                  I&apos;m your payment assistant.<br />
                  Just type what you need — I&apos;ll handle the rest.
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: 6,
                  justifyContent: 'center',
                  marginTop: 16,
                  flexWrap: 'wrap',
                }}>
                  {['~$0.006 gas', 'Arc · ETH · Base · Solana', 'USDC · EURC · USYC'].map((label) => (
                    <span key={label} style={{
                      background: 'rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 100,
                      padding: '4px 11px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#666',
                      letterSpacing: '0.01em',
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Suggestions */}
              <EmptySuggestions onSelect={handleSend} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {messages.map((msg) => {
          if (msg.type === 'typing') {
            return <MessageBubble key="typing" role="assistant" content="" isTyping />
          }
          if (msg.type === 'user' || msg.type === 'assistant') {
            return <MessageBubble key={msg.id} role={msg.type} content={msg.content} />
          }
          if (msg.type === 'confirm') {
            return (
              <ConfirmCard
                key={msg.id}
                card={msg.card}
                onConfirm={() => handleConfirm(msg.card, msg.id)}
                onCancel={() => handleCancelCard(msg.id)}
                loading={confirmLoading}
              />
            )
          }
          if (msg.type === 'success') {
            return (
              <SuccessPill
                key={msg.id}
                txHash={msg.txHash}
                message={msg.message}
                arcScanUrl={msg.arcScanUrl}
              />
            )
          }
          if (msg.type === 'qr') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                <QRCard address={msg.address} message={msg.message} />
              </div>
            )
          }
          return null
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick actions ── */}
      <QuickActions onAction={handleSend} />

      {/* ── Input bar ── */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  )
}
