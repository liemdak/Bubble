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
            style={{ color: '#a3e635', textDecoration: 'underline', wordBreak: 'break-all' }}
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
      {/* Avatar — assistant only */}
      {!isUser && (
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: 'rgba(163,230,53,0.15)',
          border: '1px solid rgba(163,230,53,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
          alignSelf: 'flex-end',
          marginRight: 8,
          marginBottom: 2,
          boxShadow: '0 0 12px rgba(163,230,53,0.2)',
        }}>
          🫧
        </div>
      )}

      <div style={{
        background: isUser
          ? '#a3e635'
          : 'rgba(255,255,255,0.07)',
        border: isUser
          ? '1.5px solid #8bc920'
          : '1px solid rgba(255,255,255,0.12)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: isTyping ? '12px 16px' : '10px 14px',
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.6,
        fontFamily: 'inherit',
        backdropFilter: isUser ? 'none' : 'blur(16px)',
        WebkitBackdropFilter: isUser ? 'none' : 'blur(16px)',
        boxShadow: isUser
          ? 'rgb(10,10,13) 2px 2px 0px 0px'
          : '0 4px 16px rgba(0,0,0,0.3)',
        maxWidth: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'pre-line',
        color: isUser ? '#000' : '#fff',
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
