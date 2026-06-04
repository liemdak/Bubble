import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.GOOGLE_BOOKS_API_KEY ?? 'MISSING'
  const keyPreview = key === 'MISSING' ? 'MISSING' : `${key.slice(0, 8)}...`

  // Test Google Books API
  let booksResult = 'not tested'
  let booksStatus = 0
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=inauthor:"Stephen King"&maxResults=3&key=${key}`
    const res = await fetch(url, { cache: 'no-store' })
    booksStatus = res.status
    const data = await res.json()
    if (res.ok) {
      const items = data.items ?? []
      booksResult = `OK - ${items.length} books found: ${items.map((i: any) => i.volumeInfo?.title).join(', ')}` // eslint-disable-line
    } else {
      booksResult = `Error ${res.status}: ${JSON.stringify(data).slice(0, 200)}`
    }
  } catch (err) {
    booksResult = `Exception: ${err instanceof Error ? err.message : String(err)}`
  }

  // Test detectBookIntent logic inline
  const testMessage = 'stephen king'
  const lower = testMessage.toLowerCase().trim()
  const FAMOUS_AUTHORS = ['stephen king', 'haruki murakami', 'agatha christie']
  const matched = FAMOUS_AUTHORS.find(a => lower.includes(a))

  return NextResponse.json({
    keyStatus:    keyPreview,
    booksStatus,
    booksResult,
    detectTest: {
      input:   testMessage,
      matched: matched ?? 'none',
    },
  })
}
