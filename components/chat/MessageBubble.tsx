'use client'

import { motion } from 'framer-motion'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

/** Render text with clickable https:// links */
function RichText({ text }: { text: string }) {
  const URL_RE = /(https?:\/\/[^\s]+)/g
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(163,230,53,0.85)', textDecoration: 'underline', wordBreak: 'break-all' }}
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
        paddingLeft: isUser ? 48 : 0,
        paddingRight: isUser ? 0 : 48,
      }}
    >
      {/* Indicator dot — assistant only */}
      {!isUser && (
        <div style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: '#a3e635',
          flexShrink: 0,
          alignSelf: 'flex-end',
          marginRight: 8,
          marginBottom: 10,
          boxShadow: '0 0 8px rgba(163,230,53,0.5)',
        }} />
      )}

      <div style={{
        background: isUser
          ? '#a3e635'
          : 'rgba(255,255,255,0.06)',
        border: isUser
          ? 'none'
          : '1px solid rgba(255,255,255,0.10)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: isTyping ? '12px 16px' : '10px 14px',
        fontSize: 14,
        fontWeight: isUser ? 500 : 400,
        lineHeight: 1.6,
        fontFamily: 'inherit',
        backdropFilter: isUser ? 'none' : 'blur(20px)',
        WebkitBackdropFilter: isUser ? 'none' : 'blur(20px)',
        boxShadow: isUser
          ? '0 2px 12px rgba(163,230,53,0.25)'
          : '0 2px 12px rgba(0,0,0,0.25)',
        maxWidth: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'pre-line',
        color: isUser ? '#000' : 'rgba(255,255,255,0.88)',
      }}>
        {isTyping ? <TypingDots /> : <RichText text={content} />}
      </div>
    </motion.div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 18 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.9,
            delay: i * 0.18,
            ease: 'easeInOut',
          }}
          style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </div>
  )
}
