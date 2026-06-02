'use client'

import { motion } from 'framer-motion'
import type { BookResult, AuthorResult } from '@/lib/data/books'

interface BookCardProps {
  subtype: 'list' | 'author'
  data: BookResult[] | AuthorResult
}

export function BookCard({ subtype, data }: BookCardProps) {
  if (subtype === 'author') {
    return <AuthorCard author={data as AuthorResult} />
  }
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
        padding: '14px 16px',
        marginBottom: 8,
        maxWidth: 360,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(163,230,53,0.7)', letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase' }}>
        📚 Books
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {books.map((book, i) => (
          <BookRow key={i} book={book} index={i} />
        ))}
      </div>
    </motion.div>
  )
}

function BookRow({ book, index }: { book: BookResult; index: number }) {
  return (
    <a
      href={book.pageUrl ?? `https://openlibrary.org/search?q=${encodeURIComponent(book.title)}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}
    >
      {/* Cover */}
      <div style={{
        width: 36, height: 52, flexShrink: 0,
        borderRadius: 4, overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {book.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 16 }}>📖</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#ffffff', lineHeight: 1.35, marginBottom: 3 }}>
          <span style={{ opacity: 0.35, marginRight: 5, fontSize: 10 }}>{index + 1}.</span>
          {book.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>
          {book.author}{book.year ? ` · ${book.year}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {book.rating && (
            <span style={{ fontSize: 10, color: '#fbbf24' }}>⭐ {book.rating}</span>
          )}
          {book.subjects?.[0] && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
              {book.subjects[0]}
            </span>
          )}
        </div>
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
        padding: '14px 16px',
        marginBottom: 8,
        maxWidth: 360,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(163,230,53,0.7)', letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase' }}>
        ✍️ Author
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        {/* Photo */}
        <div style={{
          width: 48, height: 48, flexShrink: 0,
          borderRadius: '50%', overflow: 'hidden',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {author.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.photoUrl} alt={author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 20 }}>👤</span>
          )}
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 2 }}>{author.name}</div>
          {author.born && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>
              {author.born}{author.died ? ` - ${author.died}` : ''}
            </div>
          )}
          {author.bookCount && (
            <div style={{ fontSize: 11, color: 'rgba(163,230,53,0.6)' }}>{author.bookCount} works</div>
          )}
        </div>
      </div>

      {author.bio && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, marginBottom: 12 }}>
          {author.bio}
        </div>
      )}

      {author.topBooks && author.topBooks.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>
            Notable works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {author.topBooks.slice(0, 4).map((book, i) => (
              <a
                key={i}
                href={book.pageUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none' }}
              >
                <div style={{
                  width: 26, height: 36, flexShrink: 0,
                  borderRadius: 3, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {book.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 12 }}>📖</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{book.title}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
