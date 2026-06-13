'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { BookResult, AuthorResult } from '@/lib/data/books'

interface BookCardProps {
  subtype: 'list' | 'author'
  data: BookResult[] | AuthorResult
}

export function BookCard({ subtype, data }: BookCardProps) {
  if (subtype === 'author') return <AuthorCard author={data as AuthorResult} />
  return <BookListCard books={data as BookResult[]} />
}

// ── Book list ─────────────────────────────────────────────────────────────────

function BookListCard({ books }: { books: BookResult[] }) {
  if (!books.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderLeft: '3px solid #a3e635',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 8,
        width: 'min(calc(100vw - 32px), 560px)',
      }}
    >
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'rgba(163,230,53,0.7)',
        letterSpacing: '0.12em', marginBottom: 14, textTransform: 'uppercase',
      }}>
        📚 Books
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {books.map((book, i) => <BookRow key={book.id || i} book={book} index={i} />)}
      </div>
    </motion.div>
  )
}

function BookRow({ book, index }: { book: BookResult; index: number }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <a
      href={book.pageUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}
    >
      {/* Cover */}
      <div style={{
        width: 52, height: 72, flexShrink: 0,
        borderRadius: 6, overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {book.cover && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgFailed(true)} />
        ) : (
          <span style={{ fontSize: 22 }}>📖</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#ffffff', lineHeight: 1.35, marginBottom: 4 }}>
          <span style={{ opacity: 0.30, marginRight: 6, fontSize: 11 }}>{index + 1}.</span>
          {book.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', marginBottom: 5 }}>
          {book.author}{book.year ? ` · ${book.year}` : ''}
        </div>
        {book.description && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginBottom: 5 }}>
            {book.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {book.rating && (
            <span style={{ fontSize: 11, color: '#fbbf24' }}>
              ⭐ {book.rating}{book.ratingCount ? ` (${book.ratingCount.toLocaleString()})` : ''}
            </span>
          )}
          {book.categories?.[0] && (
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 8px', borderRadius: 4,
            }}>
              {book.categories[0]}
            </span>
          )}
          {book.pageCount && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{book.pageCount} pages</span>
          )}
        </div>
      </div>
    </a>
  )
}

// ── Author book row (with own image error state) ──────────────────────────────

function AuthorBookRow({ book }: { book: BookResult }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <a
      href={book.pageUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none' }}
    >
      <div style={{
        width: 36, height: 50, flexShrink: 0,
        borderRadius: 4, overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {book.cover && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgFailed(true)} />
        ) : (
          <span style={{ fontSize: 16 }}>📖</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{book.title}</div>
        {book.year && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{book.year}</div>}
      </div>
    </a>
  )
}

// ── Author card ───────────────────────────────────────────────────────────────

function AuthorCard({ author }: { author: AuthorResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderLeft: '3px solid #a3e635',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 8,
        width: 'min(calc(100vw - 32px), 560px)',
      }}
    >
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'rgba(163,230,53,0.7)',
        letterSpacing: '0.12em', marginBottom: 14, textTransform: 'uppercase',
      }}>
        ✍️ Author
      </div>

      {/* Author header */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 64, height: 64, flexShrink: 0,
          borderRadius: '50%', overflow: 'hidden',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {author.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.photoUrl} alt={author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 28 }}>👤</span>
          )}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>{author.name}</div>
          {author.bookCount && (
            <div style={{ fontSize: 12, color: 'rgba(163,230,53,0.7)' }}>{author.bookCount}+ works</div>
          )}
        </div>
      </div>

      {/* Bio */}
      {author.bio && (
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.50)',
          lineHeight: 1.65, marginBottom: 14,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
        }}>
          {author.bio}
        </div>
      )}

      {/* Books */}
      {author.topBooks.length > 0 && (
        <>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.30)',
            letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase',
          }}>
            Notable works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {author.topBooks.slice(0, 5).map((book, i) => (
              <AuthorBookRow key={book.id || i} book={book} />
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
