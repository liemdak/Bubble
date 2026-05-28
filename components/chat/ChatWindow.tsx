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

const CHAT_KEY  = 'bubblepay:chat'
const MAX_SAVED = 60

function isPersistable(m: ChatMessage): boolean {
  return m.type === 'user' || m.type === 'assistant' || m.type === 'success' || m.type === 'qr'
}

export function ChatWindow() {
  const [messages, setMessages]           = useState<ChatMessage[]>([])
  const [loading, setLoading]             = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (messages.length === 0) return
    try {
      const toSave = messages.filter(isPersistable).slice(-MAX_SAVED)
      localStorage.setItem(CHAT_KEY, JSON.stringify(toSave))
    } catch { /* storage quota */ }
  }, [messages])

  function handlePrefill(text: string) {
    chatInputRef.current?.prefill(text)
  }

  const hasMessages = messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text: string) {
    if (loading) return

    const userMsg: ChatMessage   = { id: crypto.randomUUID(), type: 'user', content: text }
    const typingMsg: ChatMessage = { id: 'typing', type: 'typing' }

    setMessages((prev) => [...prev, userMsg, typingMsg])
    setLoading(true)

    try {
      const res  = await fetch('/api/chat', {
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
        content: 'Something went wrong. Please try again.',
      }))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(card: ConfirmationCard, cardId: string) {
    setConfirmLoading(true)

    // ── fund_agent: MetaMask ERC-20 transfer (client-side) ───────────────
    if (card.intent.type === 'fund_agent') {
      const { agent_address, user_address, amount, token } = card.intent
      try {
        const { fundAgentViaMetaMask } = await import('@/lib/metamask/fundAgent')
        const txHash = await fundAgentViaMetaMask(agent_address, user_address, amount, token)
        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat(
          { id: crypto.randomUUID(), type: 'success', txHash, message: `${amount} ${token} sent to agent wallet!`, arcScanUrl: `https://testnet.arcscan.app/tx/${txHash}` },
          { id: crypto.randomUUID(), type: 'assistant', content: `Agent wallet funded. Type "Withdraw from agent" anytime to send funds back to your main wallet.` }
        ))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'MetaMask transaction failed.'
        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
          id: crypto.randomUUID(), type: 'assistant', content: `${msg}`,
        }))
      } finally {
        setConfirmLoading(false)
      }
      return
    }

    // ── bridge_tokens: MetaMask + CCTP v2 (client-side) ──────────────────
    if (card.intent.type === 'bridge_tokens') {
      const { from_chain, to_chain, amount } = card.intent
      try {
        const balRes      = await fetch('/api/balance')
        const balData     = await balRes.json()
        const userAddress: string = balData.address ?? balData.userWallet?.address ?? ''
        if (!userAddress) throw new Error('Could not determine your wallet address. Please refresh.')

        const { bridgeViaMetaMask } = await import('@/lib/metamask/bridgeViaMetaMask')
        const result = await bridgeViaMetaMask(from_chain, to_chain, amount, userAddress)

        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat(
          { id: crypto.randomUUID(), type: 'success', txHash: result.txHash, message: result.message, arcScanUrl: result.arcScanUrl ?? result.explorerUrl },
          { id: crypto.randomUUID(), type: 'assistant', content: `Bridge initiated! USDC is moving to ${to_chain.toUpperCase()} (~20s).` }
        ))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bridge failed.'
        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
          id: crypto.randomUUID(), type: 'assistant', content: msg,
        }))
      } finally {
        setConfirmLoading(false)
      }
      return
    }

    // ── All other intents: POST /api/execute ─────────────────────────────
    try {
      const res  = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: card.intent, resolved_address: card.resolved_address }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
          id: crypto.randomUUID(),
          type: 'assistant',
          content: `${data.error ?? 'Transaction failed.'}\n\nView your wallet: https://testnet.arcscan.app`,
        }))
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
        content: 'Could not reach the server. Check your connection and try again.',
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
      {/* Outer div is flex-column; the flex:1 spacer at top pushes messages to the bottom */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Spacer — collapses when content overflows, so scroll works naturally */}
        <div style={{ flex: 1 }} />

        <div style={{ padding: '0 14px 8px' }}>

          <AnimatePresence>
            {!hasMessages && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="empty"
              >
                {/* Greeting */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  style={{ textAlign: 'center', padding: '40px 16px 24px' }}
                >
                  {/* Ambient orb */}
                  <motion.div
                    animate={{ y: [0, -5, 0], opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 52, height: 52,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 35%, rgba(163,230,53,0.22), rgba(163,230,53,0.03) 70%)',
                      border: '1px solid rgba(163,230,53,0.20)',
                      marginBottom: 18,
                      boxShadow: '0 0 24px rgba(163,230,53,0.15)',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#a3e635',
                      boxShadow: '0 0 10px rgba(163,230,53,0.8)',
                    }} />
                  </motion.div>

                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 7, color: '#fff' }}>
                    {getGreeting()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.40)', lineHeight: 1.8, maxWidth: 220, margin: '0 auto' }}>
                    Your payment assistant.<br />Type what you need.
                  </div>
                </motion.div>

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
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6 }}>
                  <SuccessPill txHash={msg.txHash} message={msg.message} arcScanUrl={msg.arcScanUrl} />
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
      </div>

      {/* ── Quick actions ── */}
      <QuickActions onAction={handleSend} onPrefill={handlePrefill} />

      {/* ── Input bar ── */}
      <ChatInput ref={chatInputRef} onSend={handleSend} disabled={loading} />
    </div>
  )
}
