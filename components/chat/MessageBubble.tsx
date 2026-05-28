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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 7,
        marginBottom: 6,
        paddingLeft:  isUser ? 52 : 0,
        paddingRight: isUser ? 0 : 52,
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
        maxWidth: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'pre-line',
        color: isUser ? '#000' : 'rgba(255,255,255,0.85)',
      }}>
        {isTyping ? <TypingDots /> : <RichText text={content} />}
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
