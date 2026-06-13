'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { BookResult } from '@/lib/data/books'

interface BookDetailCardProps {
  book: BookResult
}

const DESC_SHORT = 400

export function BookDetailCard({ book }: BookDetailCardProps) {
  const [descExpanded, setDescExpanded] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const isLongDesc = (book.description?.length ?? 0) > DESC_SHORT
  const displayDesc = isLongDesc && !descExpanded
    ? book.description!.slice(0, DESC_SHORT) + '…'
    : book.description

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: 'min(calc(100vw - 32px), 580px)',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderLeft: '3px solid #a3e635',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Top section: cover + metadata */}
      <div style={{ display: 'flex', gap: 16, padding: '16px 18px' }}>
        {/* Cover image */}
        <div style={{
          width: 90, flexShrink: 0,
          aspectRatio: '2/3',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {(book.coverLarge ?? book.cover) && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverLarge ?? book.cover}
              alt={book.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span style={{ fontSize: 32, opacity: 0.4 }}>📖</span>
          )}
        </div>

        {/* Book info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.35, marginBottom: 5,
          }}>
            {book.title}
          </div>

          <div style={{ fontSize: 13, color: 'rgba(163,230,53,0.85)', marginBottom: 10 }}>
            {book.author}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px' }}>
            {book.year && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>
                📅 {book.year}
              </span>
            )}
            {book.pageCount && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>
                📖 {book.pageCount} pages
              </span>
            )}
            {book.rating && (
              <span style={{ fontSize: 12, color: '#fbbf24' }}>
                ⭐ {book.rating}
                {book.ratingCount ? ` · ${book.ratingCount.toLocaleString()} ratings` : ''}
              </span>
            )}
            {book.language && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
                🌐 {book.language.toUpperCase()}
              </span>
            )}
          </div>

          {/* Category pills */}
          {book.categories && book.categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 9 }}>
              {book.categories.map((cat, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 600,
                  color: 'rgba(255,255,255,0.50)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 100, padding: '2px 9px',
                  letterSpacing: '0.02em',
                }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {displayDesc && (
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.75,
          }}>
            {displayDesc}
          </div>
          {isLongDesc && (
            <button
              onClick={() => setDescExpanded(e => !e)}
              style={{
                marginTop: 8, background: 'none', border: 'none',
                color: '#a3e635', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', padding: 0, fontWeight: 500,
              }}
            >
              {descExpanded ? 'Rút gọn ↑' : 'Xem thêm ↓'}
            </button>
          )}
        </div>
      )}

      {/* Footer link */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <a
          href={book.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12, fontWeight: 600,
            color: '#a3e635',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          View on Google Books
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M7 7h10v10"/>
          </svg>
        </a>
        {book.price && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: '#000',
            background: '#a3e635',
            borderRadius: 5, padding: '2px 8px',
          }}>
            {book.currency === 'USD' ? '$' : (book.currency ?? '')}{book.price}
          </span>
        )}
      </div>
    </motion.div>
  )
}
