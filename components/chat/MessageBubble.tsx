'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

/** Render text with clickable https:// links */
function RichText({ text }: { text: string }) {
  const URL_RE = /(https?:\/\/[^\s]+)/g
  const parts  = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'rgba(163,230,53,0.85)',
              textDecoration: 'underline',
              wordBreak: 'break-all',
            }}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export function MessageBubble({ role, content, isTyping = false }: MessageBubbleProps) {
  const isUser = role === 'user'
  const [hovered, setHovered] = useState(false)
  const [copied,  setCopied]  = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 7,
        marginBottom: 6,
        paddingLeft:  isUser ? 52 : 0,
        paddingRight: isUser ? 0 : 52,
        position: 'relative',
      }}
    >
      {/* Green dot — assistant only */}
      {!isUser && (
        <div style={{
          width: 5, height: 5,
          borderRadius: '50%',
          background: '#a3e635',
          flexShrink: 0,
          marginBottom: 8,
          boxShadow: '0 0 6px rgba(163,230,53,0.6)',
        }} />
      )}

      <div style={{ position: 'relative', maxWidth: '100%' }}>
        <div style={{
          background: isUser
            ? '#a3e635'
            : 'rgba(255,255,255,0.055)',
          border: isUser
            ? 'none'
            : '1px solid rgba(255,255,255,0.09)',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: isTyping ? '11px 15px' : '9px 13px',
          fontSize: 13.5,
          fontWeight: isUser ? 500 : 400,
          lineHeight: 1.65,
          fontFamily: 'inherit',
          backdropFilter: isUser ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: isUser ? 'none' : 'blur(20px)',
          boxShadow: isUser
            ? '0 2px 10px rgba(163,230,53,0.20)'
            : '0 1px 8px rgba(0,0,0,0.20)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-line',
          color: isUser ? '#000' : 'rgba(255,255,255,0.85)',
        }}>
          {isTyping ? <TypingDots /> : <RichText text={content} />}
        </div>

        {/* Copy button — appears on hover, not shown while typing */}
        {!isTyping && hovered && (
          <button
            onClick={handleCopy}
            title="Copy"
            style={{
              position: 'absolute',
              bottom: -22,
              right: isUser ? 0 : 'auto',
              left: isUser ? 'auto' : 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: copied ? '#a3e635' : 'rgba(255,255,255,0.35)',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 16 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.85, delay: i * 0.16, ease: 'easeInOut' }}
          style={{
            width: 5, height: 5,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.45)',
          }}
        />
      ))}
    </div>
  )
}
