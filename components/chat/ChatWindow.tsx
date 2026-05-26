'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import { ConfirmCard } from './ConfirmCard'
import { SuccessPill } from './SuccessPill'
import { EmptySuggestions } from './EmptySuggestions'
import { QRCard } from './QRCard'
import { ChatInput, type ChatInputHandle } from './ChatInput'
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
  const bottomRef    = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)

  function handlePrefill(text: string) {
    chatInputRef.current?.prefill(text)
  }

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

    // ── fund_agent: MetaMask ERC-20 transfer (client-side, no server needed) ──
    if (card.intent.type === 'fund_agent') {
      // Destructure BEFORE entering closures so TypeScript retains narrowed type
      const { agent_address, user_address, amount, token } = card.intent
      try {
        const { fundAgentViaMetaMask } = await import('@/lib/metamask/fundAgent')
        const txHash = await fundAgentViaMetaMask(agent_address, user_address, amount, token)
        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
          id: crypto.randomUUID(),
          type: 'success',
          txHash,
          message: `${amount} ${token} sent to agent wallet!`,
          arcScanUrl: `https://testnet.arcscan.app/tx/${txHash}`,
        }))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'MetaMask transaction failed.'
        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
          id: crypto.randomUUID(),
          type: 'assistant',
          content: `⚠️ ${msg}`,
        }))
      } finally {
        setConfirmLoading(false)
      }
      return
    }

    // ── All other intents: POST to /api/execute (Circle agent wallet) ──────────
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: card.intent, resolved_address: card.resolved_address }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        // Server returned an error — include clickable ArcScan link
        setMessages((prev) => {
          // Try to find user wallet address from a previous success/qr message for the link
          const arcScanBase = 'https://testnet.arcscan.app'
          return prev.filter((m) => m.id !== cardId).concat({
            id: crypto.randomUUID(),
            type: 'assistant',
            content: `⚠️ ${data.error ?? 'Transaction failed.'}\n\nView your wallet: ${arcScanBase}`,
          })
        })
        return
      }

      setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
        id: crypto.randomUUID(),
        type: 'success',
        txHash: data.txHash,
        message: data.message ?? 'Transaction confirmed!',
        arcScanUrl: data.arcScanUrl,
      }))
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
        id: crypto.randomUUID(),
        type: 'assistant',
        content: '⚠️ Could not reach the server. Check your connection and try again.',
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
                    background: 'rgba(163,230,53,0.12)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(163,230,53,0.35)',
                    fontSize: 36,
                    marginBottom: 18,
                    boxShadow: '0 0 32px rgba(163,230,53,0.3), 0 8px 32px rgba(0,0,0,0.3)',
                  }}
                >
                  🫧
                </motion.div>

                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6, color: '#fff' }}>
                  {getGreeting()} 👋
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 260, margin: '0 auto' }}>
                  I&apos;m your payment assistant.<br />
                  Type what you need — I&apos;ll handle the rest.
                </div>

                {/* Agent explanation */}
                <div style={{
                  marginTop: 12,
                  background: 'rgba(163,230,53,0.08)',
                  border: '1px solid rgba(163,230,53,0.2)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.6,
                  maxWidth: 280,
                  margin: '12px auto 0',
                  textAlign: 'left',
                }}>
                  <span style={{ fontWeight: 700, color: '#a3e635' }}>🤖 Agent wallet</span> — Circle wallet that executes transactions for you. Say <em style={{ color: 'rgba(255,255,255,0.7)' }}>&ldquo;nạp 10 USDC vào agent&rdquo;</em> to fund it.
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
                      background: 'rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 100,
                      padding: '4px 11px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.55)',
                      letterSpacing: '0.01em',
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Suggestions — prefill for incomplete prompts, auto-send for complete ones */}
              <EmptySuggestions onSelect={handleSend} onPrefill={handlePrefill} />
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
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
                <SuccessPill
                  txHash={msg.txHash}
                  message={msg.message}
                  arcScanUrl={msg.arcScanUrl}
                />
              </div>
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
      <QuickActions onAction={handleSend} onPrefill={handlePrefill} />

      {/* ── Input bar ── */}
      <ChatInput ref={chatInputRef} onSend={handleSend} disabled={loading} />
    </div>
  )
}
