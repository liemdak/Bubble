'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import { ConfirmCard } from './ConfirmCard'
import { SuccessPill } from './SuccessPill'
import { EmptySuggestions } from './EmptySuggestions'
import { QRCard } from './QRCard'
import { BookCard } from './BookCard'
import { ChatInput, type ChatInputHandle } from './ChatInput'
import { QuickActions } from './QuickActions'
import type { ChartPoint } from './PriceChart'
import type { BookResult, AuthorResult } from '@/lib/data/books'
import type { ConfirmationCard } from '@/types/intent'

// Dynamic import prevents recharts from being bundled in SSR pass
const PriceChart = dynamic(() => import('./PriceChart').then(m => m.PriceChart), { ssr: false })

type ChatMessage =
  | { id: string; type: 'user' | 'assistant'; content: string }
  | { id: string; type: 'confirm'; card: ConfirmationCard }
  | { id: string; type: 'success'; txHash: string; message: string; arcScanUrl?: string }
  | { id: string; type: 'qr'; address: string; message: string }
  | { id: string; type: 'chart'; symbol: string; currentPrice: number; change24h: number; chartData: ChartPoint[]; period: string; high: number; low: number; marketCap?: number; volume24h?: number }
  | { id: string; type: 'book'; subtype: 'list' | 'author'; data: BookResult[] | AuthorResult; message: string }
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
  const bottomRef       = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const chatInputRef    = useRef<ChatInputHandle>(null)

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
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
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
        if (data.type === 'chart') {
          return [...without, {
            id: crypto.randomUUID(), type: 'chart' as const,
            symbol:       data.symbol,
            currentPrice: data.currentPrice,
            change24h:    data.change24h,
            chartData:    data.chartData,
            period:       data.period,
            high:         data.high,
            low:          data.low,
            marketCap:    data.marketCap,
            volume24h:    data.volume24h,
          }]
        }
        if (data.type === 'book') {
          return [...without, {
            id: crypto.randomUUID(), type: 'book' as const,
            subtype: data.subtype,
            data:    data.data,
            message: data.message,
          }]
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

    // ── swap_tokens: MetaMask client-side (tokens stay in user's main wallet) ──
    if (card.intent.type === 'swap_tokens') {
      const { token_in, token_out, amount_in } = card.intent
      try {
        const balRes      = await fetch('/api/balance')
        const balData     = await balRes.json()
        const userAddress: string = balData.address ?? balData.userWallet?.address ?? ''
        if (!userAddress) throw new Error('Could not determine your wallet address. Please refresh.')

        // ── Pre-check: MetaMask wallet must have enough token_in ─────────
        // Swap runs from the MetaMask wallet, not the agent wallet.
        // If MetaMask balance is insufficient (e.g. all USDC was sent to agent),
        // kit.swap() will fail with "Simulation failed / Transaction reverted"
        // without any useful message. Catch it here with a clear explanation.
        const walletBal = balData.userWallet as Record<string, string> | undefined
        const haveAmt   = parseFloat(walletBal?.[token_in] ?? '0')
        const needAmt   = parseFloat(amount_in)
        if (haveAmt < needAmt) {
          throw new Error(
            `Your MetaMask wallet only has ${haveAmt.toFixed(2)} ${token_in} ` +
            `(need ${amount_in}). ` +
            `Get more from faucet.circle.com (select Arc Testnet) or type "Withdraw all from agent wallet" first.`
          )
        }

        const { swapViaMetaMask } = await import('@/lib/metamask/swapViaMetaMask')
        const result = await swapViaMetaMask(token_in, token_out, amount_in, userAddress)

        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat(
          { id: crypto.randomUUID(), type: 'success', txHash: result.txHash, message: result.message, arcScanUrl: result.arcScanUrl },
          { id: crypto.randomUUID(), type: 'assistant', content: `Swap done! ${amount_in} ${token_in} → ${token_out} is now in your wallet.` }
        ))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Swap failed.'
        setMessages((prev) => prev.filter((m) => m.id !== cardId).concat({
          id: crypto.randomUUID(), type: 'assistant', content: msg,
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

  function clearChat() {
    setMessages([])
    try { localStorage.removeItem(CHAT_KEY) } catch { /* ignore */ }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Chat toolbar — only when messages exist ── */}
      <AnimatePresence>
        {hasMessages && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 4,
              padding: '6px 14px 0',
              flexShrink: 0,
            }}
          >
            {/* New chat */}
            <button
              onClick={clearChat}
              title="New chat"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 100, padding: '4px 10px',
                fontSize: 11, color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/>
                <path d="M18.375 2.625a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
              New chat
            </button>

            {/* Clear / trash */}
            <button
              onClick={clearChat}
              title="Clear chat"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 100, width: 26, height: 26,
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,80,80,0.7)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,80,80,0.25)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Scroll container: height:100% so JS scrollTop works; overflow:auto for scroll */}
        <div ref={scrollContainerRef} style={{ height: '100%', overflowY: 'auto' }}>
          {/* Inner flex column: minHeight:100% + justifyContent:flex-end pins messages to bottom */}
          <div style={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            boxSizing: 'border-box',
          }}>
          <div style={{ padding: '12px 14px 8px' }}>

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
            if (msg.type === 'book') {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                  <BookCard subtype={msg.subtype} data={msg.data} />
                </div>
              )
            }
            if (msg.type === 'chart') {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                  <PriceChart
                    symbol={msg.symbol}
                    currentPrice={msg.currentPrice}
                    change24h={msg.change24h}
                    chartData={msg.chartData}
                    period={msg.period}
                    high={msg.high}
                    low={msg.low}
                    marketCap={msg.marketCap}
                    volume24h={msg.volume24h}
                  />
                </div>
              )
            }
            return null
          })}

            <div ref={bottomRef} />
          </div>{/* end content padding */}
          </div>{/* end minHeight flex-end inner */}
        </div>{/* end scroll container */}
      </div>{/* end messages area */}

      {/* ── Quick actions ── */}
      <QuickActions onAction={handleSend} onPrefill={handlePrefill} />

      {/* ── Input bar ── */}
      <ChatInput ref={chatInputRef} onSend={handleSend} disabled={loading} />
    </div>
  )
}
