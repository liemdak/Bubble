'use client'

import { motion } from 'framer-motion'
import type { BookResult } from '@/lib/data/books'

interface BookGridProps {
  books:  BookResult[]
  title?: string
}

export function BookGrid({ books, title }: BookGridProps) {
  if (!books.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: 8, width: 'min(calc(100vw - 32px), 580px)' }}
    >
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.40)',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          {title}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
      }}>
        {books.map((book, i) => (
          <BookTile key={book.id || i} book={book} />
        ))}
      </div>
    </motion.div>
  )
}

function BookTile({ book }: { book: BookResult }) {
  return (
    <a
      href={book.pageUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15 }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* Cover image */}
        <div style={{
          width: '100%',
          aspectRatio: '2/3',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {book.coverLarge ?? book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverLarge ?? book.cover}
              alt={book.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 40, opacity: 0.3 }}>📖</span>
          )}
          {/* Rating badge */}
          {book.rating && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              borderRadius: 6,
              padding: '3px 7px',
              fontSize: 11, fontWeight: 600,
              color: '#fbbf24',
            }}>
              ⭐ {book.rating}
            </div>
          )}
          {/* Price badge */}
          {book.price && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              background: 'rgba(163,230,53,0.85)',
              borderRadius: 5,
              padding: '2px 7px',
              fontSize: 10, fontWeight: 700,
              color: '#000',
            }}>
              {book.currency === 'USD' ? '$' : (book.currency ?? '')}{book.price}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 11px 12px' }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: '#ffffff',
            lineHeight: 1.35,
            marginBottom: 4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {book.title}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
            {book.author}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {book.year && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{book.year}</span>
            )}
            {book.pageCount && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)' }}>· {book.pageCount}p</span>
            )}
          </div>
          {book.description && (
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.35)',
              lineHeight: 1.5, marginTop: 6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {book.description}
            </div>
          )}
        </div>
      </motion.div>
    </a>
  )
}
