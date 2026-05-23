import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'

let _client: GoogleGenerativeAI | null = null
let _model: GenerativeModel | null = null

export function getGeminiModel(): GenerativeModel {
  if (_model) return _model
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')
  _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  _model = _client.getGenerativeModel({ model: 'gemini-1.5-flash' })
  return _model
}
