import { NextRequest, NextResponse } from 'next/server'
import { parseIntent } from '@/lib/anthropic/mockParser'
import { SYSTEM_PROMPT } from '@/lib/gemini/systemPrompt'
import { PAYMENT_TOOLS } from '@/lib/gemini/tools'
import { getSession } from '@/lib/auth/session'
import type { ConfirmationCard } from '@/types/intent'

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ type: 'text', message: 'No message received.' }, { status: 400 })
    }

    // Read user session for QR and personalised context
    const session = await getSession()
    const userAddress = session?.address ?? null

    // ── QR shortcut (no AI needed) ─────────────────────────────────
    if (/\bqr\b|my qr|receive|payment link/i.test(message)) {
      const address = userAddress ?? '0x0000000000000000000000000000000000000000'
      return NextResponse.json({ type: 'qr', address, message: 'Here\'s your QR code to receive payments.' })
    }

    // ── Gemini mode ────────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      try {
        return await handleGemini(message, history, userAddress)
      } catch (geminiErr) {
        console.error('[/api/chat] Gemini error — falling back to mock:', geminiErr)
        // Fall through to mock parser
      }
    }

    // ── Mock parser (demo / fallback) ─────────────────────────────
    await new Promise((r) => setTimeout(r, 400))
    const result = parseIntent(message)
    return NextResponse.json(result)

  } catch (err) {
    console.error('[/api/chat]', err)
    return NextResponse.json({ type: 'text', message: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

async function handleGemini(message: string, _history: unknown[], userAddress: string | null) {
  const { getGeminiModel } = await import('@/lib/gemini/client')
  const model = getGeminiModel()

  const systemWithContext = userAddress
    ? `${SYSTEM_PROMPT}\n\nUser's wallet address: ${userAddress}`
    : SYSTEM_PROMPT

  const chat = model.startChat({
    systemInstruction: systemWithContext,
    tools: PAYMENT_TOOLS,
    history: [],
  })

  const result = await chat.sendMessage(message)
  const response = result.response

  const candidate = response.candidates?.[0]
  const parts = candidate?.content?.parts ?? []
  const fnCall = parts.find((p) => p.functionCall)?.functionCall

  if (fnCall) {
    const args = fnCall.args as Record<string, string>
    const card: ConfirmationCard = buildConfirmCard(fnCall.name, args)
    return NextResponse.json({ type: 'confirm', card })
  }

  const text = response.text()
  return NextResponse.json({ type: 'text', message: text })
}

function buildConfirmCard(intentType: string, args: Record<string, string>): ConfirmationCard {
  const gasFormatted = '$0.006'
  switch (intentType) {
    case 'send_payment': {
      const amount = args.amount ?? '0'
      const token = args.token ?? 'USDC'
      return {
        intent: { type: 'send_payment', recipient_name: args.recipient_name, recipient_address: args.recipient_address, amount, token: token as 'USDC' | 'EURC' | 'USYC', chain: (args.chain as 'arc') ?? 'arc' },
        resolved_address: args.recipient_address ? `${args.recipient_address.slice(0, 6)}...${args.recipient_address.slice(-4)}` : undefined,
        gas_fee: gasFormatted,
        total_display: `≈ ${(parseFloat(amount) + 0.006).toFixed(3)} ${token}`,
      }
    }
    case 'swap_tokens': {
      const amountIn = args.amount_in ?? '0'
      const tokenIn = args.token_in ?? 'USDC'
      const tokenOut = args.token_out ?? 'EURC'
      const rate = tokenIn === 'USDC' && tokenOut === 'EURC' ? 0.92 : 1.08
      return {
        intent: { type: 'swap_tokens', token_in: tokenIn as 'USDC' | 'EURC' | 'USYC', token_out: tokenOut as 'USDC' | 'EURC' | 'USYC', amount_in: amountIn, chain: (args.chain as 'arc') ?? 'arc' },
        gas_fee: gasFormatted,
        total_display: `≈ ${(parseFloat(amountIn) * rate).toFixed(2)} ${tokenOut}`,
      }
    }
    case 'bridge_tokens': {
      const amount = args.amount ?? '0'
      const toChain = args.to_chain ?? 'ethereum'
      return {
        intent: { type: 'bridge_tokens', token: (args.token ?? 'USDC') as 'USDC' | 'EURC', amount, from_chain: (args.from_chain as 'arc') ?? 'arc', to_chain: toChain as 'arc' | 'ethereum' | 'solana' | 'base' },
        gas_fee: gasFormatted,
        total_display: `${amount} ${args.token ?? 'USDC'} → ${toChain.toUpperCase()} (~20s)`,
      }
    }
    default:
      return { intent: { type: 'get_balance', token: 'all', chain: 'arc' }, gas_fee: '$0', total_display: '—' }
  }
}
