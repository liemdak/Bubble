/**
 * Book data layer — wraps Open Library API (free, no key needed)
 * Used by /api/chat tool: get_book
 * Will be wrapped with x402 payment in Phase 2B
 */

const OL_BASE    = 'https://openlibrary.org'
const COVERS_BASE = 'https://covers.openlibrary.org'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookResult {
  title:       string
  author:      string
  year?:       number
  subjects?:   string[]
  cover?:      string   // full image URL
  olKey?:      string   // Open Library key e.g. /works/OL45883W
  pageUrl?:    string   // full URL to openlibrary.org page
  rating?:     number   // 0–5
  description?: string
}

export interface AuthorResult {
  name:        string
  bio?:        string
  born?:       string
  died?:       string
  photoUrl?:   string
  bookCount?:  number
  topBooks?:   BookResult[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function coverUrl(coverId?: number, isbn?: string, size = 'M'): string | undefined {
  if (coverId && coverId > 0) return `${COVERS_BASE}/b/id/${coverId}-${size}.jpg`
  if (isbn)                   return `${COVERS_BASE}/b/isbn/${isbn}-${size}.jpg`
  return undefined
}

function olPageUrl(key?: string): string | undefined {
  if (!key) return undefined
  return `${OL_BASE}${key}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDoc(doc: any): BookResult {
  const isbn    = doc.isbn?.[0]
  const coverId = doc.cover_i
  return {
    title:    doc.title ?? 'Unknown title',
    author:   Array.isArray(doc.author_name) ? doc.author_name[0] : 'Unknown author',
    year:     doc.first_publish_year,
    subjects: doc.subject?.slice(0, 4),
    cover:    coverUrl(coverId, isbn),
    olKey:    doc.key,
    pageUrl:  olPageUrl(doc.key),
    rating:   doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : undefined,
  }
}

// ── Search books ──────────────────────────────────────────────────────────────

export async function searchBooks(query: string, limit = 5): Promise<BookResult[]> {
  const url = `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=title,author_name,first_publish_year,subject,cover_i,isbn,key,ratings_average`
  const res  = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`Open Library search failed: ${res.status}`)
  const data = await res.json()
  return (data.docs ?? []).map(mapDoc)
}

// ── Search by quote / excerpt ─────────────────────────────────────────────────

export async function searchByQuote(quote: string, limit = 3): Promise<BookResult[]> {
  // Open Library full-text search — use quoted phrase for best match
  const url = `${OL_BASE}/search.json?q=${encodeURIComponent(`"${quote}"`)}&limit=${limit}&fields=title,author_name,first_publish_year,subject,cover_i,isbn,key,ratings_average`
  const res  = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`Quote search failed: ${res.status}`)
  const data = await res.json()
  if (data.numFound === 0) {
    // Fallback: search without quotes
    return searchBooks(quote, limit)
  }
  return (data.docs ?? []).map(mapDoc)
}

// ── Author info ───────────────────────────────────────────────────────────────

export async function getAuthorInfo(name: string): Promise<AuthorResult | null> {
  // 1. Find author key
  const searchUrl = `${OL_BASE}/search/authors.json?q=${encodeURIComponent(name)}&limit=1`
  const searchRes = await fetch(searchUrl, { next: { revalidate: 600 } })
  if (!searchRes.ok) return null
  const searchData = await searchRes.json()
  const author     = searchData.docs?.[0]
  if (!author) return null

  const authorKey  = author.key   // e.g. "OL23919A"
  const photoId    = author.photos?.[0]

  // 2. Fetch author details
  const detailUrl = `${OL_BASE}/authors/${authorKey}.json`
  const detailRes = await fetch(detailUrl, { next: { revalidate: 600 } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detail: any = detailRes.ok ? await detailRes.json() : {}

  // 3. Fetch top works
  const worksUrl = `${OL_BASE}/authors/${authorKey}/works.json?limit=5`
  const worksRes = await fetch(worksUrl, { next: { revalidate: 600 } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worksData: any = worksRes.ok ? await worksRes.json() : {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topBooks: BookResult[] = (worksData.entries ?? []).map((w: any) => ({
    title:   w.title ?? 'Unknown',
    author:  author.name ?? name,
    cover:   w.covers?.[0] > 0 ? coverUrl(w.covers[0]) : undefined,
    olKey:   w.key,
    pageUrl: olPageUrl(w.key),
  }))

  const bio = typeof detail.bio === 'string'
    ? detail.bio
    : detail.bio?.value ?? undefined

  return {
    name:       author.name ?? name,
    bio:        bio ? bio.slice(0, 300) + (bio.length > 300 ? '…' : '') : undefined,
    born:       detail.birth_date,
    died:       detail.death_date,
    photoUrl:   photoId ? `${COVERS_BASE}/a/id/${photoId}-M.jpg` : undefined,
    bookCount:  author.work_count,
    topBooks,
  }
}

// ── Genre / subject ranking ───────────────────────────────────────────────────

export async function getGenreBooks(genre: string, limit = 5): Promise<BookResult[]> {
  const slug  = genre.toLowerCase().replace(/\s+/g, '_')
  const url   = `${OL_BASE}/subjects/${encodeURIComponent(slug)}.json?limit=${limit}`
  const res   = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) {
    // Fallback to search
    return searchBooks(genre, limit)
  }
  const data  = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.works ?? []).map((w: any): BookResult => ({
    title:    w.title ?? 'Unknown',
    author:   w.authors?.[0]?.name ?? 'Unknown author',
    cover:    w.cover_id > 0 ? coverUrl(w.cover_id) : undefined,
    olKey:    w.key,
    pageUrl:  olPageUrl(w.key),
    subjects: [genre],
  }))
}

// ── Format for chat response ──────────────────────────────────────────────────

export function formatBookList(books: BookResult[], title?: string): string {
  if (books.length === 0) return 'No books found.'
  const header = title ? `${title}\n\n` : ''
  return header + books.map((b, i) => {
    const year    = b.year    ? ` (${b.year})`    : ''
    const rating  = b.rating  ? ` · ⭐ ${b.rating}` : ''
    const subject = b.subjects?.length ? ` · ${b.subjects[0]}` : ''
    return `${i + 1}. ${b.title}${year} — ${b.author}${rating}${subject}`
  }).join('\n')
}

export function formatAuthor(a: AuthorResult): string {
  const lines: string[] = [`${a.name}${a.bookCount ? ` · ${a.bookCount} works` : ''}`]
  if (a.born)  lines.push(`Born: ${a.born}${a.died ? ` · Died: ${a.died}` : ''}`)
  if (a.bio)   lines.push(`\n${a.bio}`)
  if (a.topBooks?.length) {
    lines.push(`\nNotable works:`)
    a.topBooks.slice(0, 5).forEach((b, i) => lines.push(`${i + 1}. ${b.title}`))
  }
  return lines.join('\n')
}
