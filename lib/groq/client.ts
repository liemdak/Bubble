import Groq from 'groq-sdk'

let _client: Groq | null = null

export function getGroqClient(): Groq {
  if (_client) return _client
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set')
  _client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _client
}
