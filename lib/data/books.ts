/**
 * Book data layer — Google Books API (free, accurate, supports all languages)
 * Used by /api/chat tool: get_book
 */

const GBOOKS = 'https://www.googleapis.com/books/v1'
const WIKI   = 'https://en.wikipedia.org/w/api.php'

function apiKey() {
  return process.env.GOOGLE_BOOKS_API_KEY ?? ''
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookResult {
  id:           string
  title:        string
  author:       string
  year?:        string
  description?: string
  categories?:  string[]
  cover?:       string
  coverLarge?:  string
  rating?:      number
  ratingCount?: number
  pageCount?:   number
  language?:    string
  price?:       string
  currency?:    string
  pageUrl:      string
}

export interface AuthorResult {
  name:       string
  bio?:       string
  photoUrl?:  string
  bookCount?: number
  topBooks:   BookResult[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVolume(item: any): BookResult {
  const info = item.volumeInfo ?? {}
  const sale = item.saleInfo ?? {}

  const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail
  const cover      = thumb ? thumb.replace('http://', 'https://').replace('zoom=1', 'zoom=1') : undefined
  const coverLarge = thumb ? thumb.replace('http://', 'https://').replace('zoom=1', 'zoom=3') : undefined

  const rawDesc = info.description ?? ''
  const description = rawDesc
    ? rawDesc.replace(/<[^>]*>/g, '').slice(0, 400) + (rawDesc.length > 400 ? '…' : '')
    : undefined

  // Price from Google Books saleInfo
  const listPrice = sale.listPrice ?? sale.retailPrice
  const price    = listPrice?.amount ? `${listPrice.amount}` : undefined
  const currency = listPrice?.currencyCode

  return {
    id:          item.id ?? '',
    title:       info.title ?? 'Unknown title',
    author:      Array.isArray(info.authors) ? info.authors.join(', ') : 'Unknown author',
    year:        info.publishedDate?.slice(0, 4),
    description,
    categories:  info.categories?.slice(0, 2),
    cover,
    coverLarge,
    rating:      info.averageRating,
    ratingCount: info.ratingsCount,
    pageCount:   info.pageCount,
    language:    info.language,
    price,
    currency,
    pageUrl:     info.infoLink ?? `https://books.google.com/books?id=${item.id}`,
  }
}

// ── Search books ──────────────────────────────────────────────────────────────

export async function searchBooks(query: string, limit = 6): Promise<BookResult[]> {
  const url = `${GBOOKS}/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&printType=books&key=${apiKey()}`
  const res  = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Google Books search failed: ${res.status}`)
  const data = await res.json()
  return (data.items ?? []).map(mapVolume)
}

// ── Search by quote / excerpt ─────────────────────────────────────────────────

export async function searchByQuote(quote: string, limit = 4): Promise<BookResult[]> {
  // Use full-text search with the quote
  const url = `${GBOOKS}/volumes?q=${encodeURIComponent(quote)}&maxResults=${limit}&printType=books&key=${apiKey()}`
  const res  = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Quote search failed: ${res.status}`)
  const data = await res.json()
  return (data.items ?? []).map(mapVolume)
}

// ── Genre / subject books ─────────────────────────────────────────────────────

export async function getGenreBooks(genre: string, limit = 6): Promise<BookResult[]> {
  const url = `${GBOOKS}/volumes?q=subject:${encodeURIComponent(genre)}&maxResults=${limit}&orderBy=relevance&printType=books&key=${apiKey()}`
  const res  = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Genre search failed: ${res.status}`)
  const data = await res.json()
  return (data.items ?? []).map(mapVolume)
}

// ── Author info ───────────────────────────────────────────────────────────────

export async function getAuthorInfo(name: string): Promise<AuthorResult | null> {
  // 1. Get author's books from Google Books
  const booksUrl = `${GBOOKS}/volumes?q=inauthor:${encodeURIComponent(`"${name}"`)}&maxResults=6&orderBy=relevance&printType=books&key=${apiKey()}`
  const booksRes = await fetch(booksUrl, { cache: 'no-store' })
  if (!booksRes.ok) return null
  const booksData = await booksRes.json()
  const topBooks: BookResult[] = (booksData.items ?? []).map(mapVolume)
  if (topBooks.length === 0) return null

  // 2. Get author photo + bio from Wikipedia
  let photoUrl: string | undefined
  let bio: string | undefined

  try {
    const wikiSearch = await fetch(
      `${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`,
      { cache: 'no-store' }
    )
    const wikiSearchData = await wikiSearch.json()
    const pageTitle = wikiSearchData.query?.search?.[0]?.title

    if (pageTitle) {
      // Get page image
      const wikiImg = await fetch(
        `${WIKI}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages|extracts&exintro=true&exchars=400&format=json&pithumbsize=200&origin=*`,
        { cache: 'no-store' }
      )
      const wikiImgData = await wikiImg.json()
      const pages = Object.values(wikiImgData.query?.pages ?? {}) as any[] // eslint-disable-line
      const page  = pages[0]
      photoUrl = page?.thumbnail?.source
      const rawBio = page?.extract ?? ''
      bio = rawBio.replace(/<[^>]*>/g, '').trim()
    }
  } catch { /* Wikipedia optional — continue without */ }

  return {
    name,
    bio,
    photoUrl,
    bookCount: booksData.totalItems,
    topBooks,
  }
}

// ── Format for chat fallback text ─────────────────────────────────────────────

export function formatBookList(books: BookResult[], title?: string): string {
  if (books.length === 0) return 'No books found.'
  const header = title ? `${title}\n\n` : ''
  return header + books.map((b, i) => {
    const year   = b.year     ? ` (${b.year})`      : ''
    const rating = b.rating   ? ` · ⭐ ${b.rating}` : ''
    const cat    = b.categories?.[0] ? ` · ${b.categories[0]}` : ''
    return `${i + 1}. ${b.title}${year} - ${b.author}${rating}${cat}`
  }).join('\n')
}

export function formatAuthor(a: AuthorResult): string {
  const lines: string[] = [
    `${a.name}${a.bookCount ? ` · ${a.bookCount}+ works` : ''}`,
  ]
  if (a.bio)   lines.push(`\n${a.bio}`)
  if (a.topBooks.length) {
    lines.push(`\nNotable works:`)
    a.topBooks.slice(0, 5).forEach((b, i) => lines.push(`${i + 1}. ${b.title}${b.year ? ` (${b.year})` : ''}`))
  }
  return lines.join('\n')
}
