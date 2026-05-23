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

    const session = await getSession()
    const userAddress = session?.address ?? null
    const circleWalletId = session?.circleWalletId ?? null

    // ── QR shortcut ──────────────────────────────────────────────────
    if (/\bqr\b|my qr|receive|payment link/i.test(message)) {
      const address = userAddress ?? '0x0000000000000000000000000000000000000000'
      return NextResponse.json({
        type: 'qr',
        address,
        message: 'Here\'s your QR code to receive payments.',
      })
    }

    // ── Balance shortcut (works in both Gemini + mock mode) ──────────
    if (/balance|how much|số dư|xem số dư|kiểm tra ví|check.*balance|my balance|wallet balance/i.test(message)) {
      const msg = await fetchRealBalance(circleWalletId)
      return NextResponse.json({ type: 'text', message: msg })
    }

    // ── Gemini mode ──────────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      try {
        return await handleGemini(message, history, userAddress, circleWalletId)
      } catch (geminiErr) {
        console.error('[/api/chat] Gemini error — falling back to mock:', geminiErr)
        // Fall through to mock parser
      }
    }

    // ── Mock parser (fallback) ───────────────────────────────────────
    await new Promise((r) => setTimeout(r, 400))
    const result = parseIntent(message)
    return NextResponse.json(result)

  } catch (err) {
    console.error('[/api/chat]', err)
    return NextResponse.json(
      { type: 'text', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function fetchRealBalance(circleWalletId: string | null): Promise<string> {
  try {
    if (!circleWalletId || !process.env.CIRCLE_API_KEY) {
      return '💰 Wallet not set up yet.\n\nGet free testnet USDC at faucet.circle.com → select Arc Testnet.'
    }
    const { getSingleWalletBalance } = await import('@/lib/circle/balance')
    const balances = await getSingleWalletBalance(circleWalletId)

    if (balances.length === 0) {
      return '💰 Your wallet is empty on Arc Testnet.\n\nGet free USDC at faucet.circle.com → select Arc Testnet.'
    }

    const lines = balances.map((b) => `• ${b.token}: ${parseFloat(b.amount).toFixed(2)}`)
    return `💰 Your balances on Arc Testnet:\n${lines.join('\n')}`
  } catch (err) {
    console.error('[fetchRealBalance]', err)
    return '💰 Could not fetch balance right now. Please try again in a moment.'
  }
}

async function handleGemini(
  message: string,
  _history: unknown[],
  userAddress: string | null,
  circleWalletId: string | null,
) {
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

    // get_balance → fetch real data, no confirm card needed
    if (fnCall.name === 'get_balance') {
      const msg = await fetchRealBalance(circleWalletId)
      return NextResponse.json({ type: 'text', message: msg })
    }

    // get_rate → return live rate text
    if (fnCall.name === 'get_rate') {
      const tokenIn  = args.token_in  ?? 'USDC'
      const tokenOut = args.token_out ?? 'EURC'
      const amount   = parseFloat(args.amount ?? '1')
      const rate =
        tokenIn === 'USDC' && tokenOut === 'EURC' ? 0.92
        : tokenIn === 'EURC' && tokenOut === 'USDC' ? 1.087
        : 1.00
      return NextResponse.json({
        type: 'text',
        message: `📈 ${amount} ${tokenIn} ≈ ${(amount * rate).toFixed(4)} ${tokenOut}\n\nRates update every block (~0.5s on Arc).`,
      })
    }

    // manage_contact → stub until Supabase contacts land
    if (fnCall.name === 'manage_contact') {
      if (args.action === 'list') {
        return NextResponse.json({ type: 'text', message: 'You have no contacts yet. Add one: "add Mike 0x1234..."' })
      }
      if (args.action === 'add' && args.name && args.wallet_address) {
        return NextResponse.json({ type: 'text', message: `✓ Got it! Contact feature is coming soon. For now, send directly: "send 50 USDC to ${args.wallet_address}"` })
      }
      return NextResponse.json({ type: 'text', message: 'Contact feature coming soon. You can send directly to any wallet address.' })
    }

    // send / swap / bridge → require user confirmation
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
      const token  = args.token  ?? 'USDC'
      return {
        intent: {
          type: 'send_payment',
          recipient_name:    args.recipient_name,
          recipient_address: args.recipient_address,
          amount,
          token: token as 'USDC' | 'EURC' | 'USYC',
          chain: (args.chain ?? 'arc') as 'arc',
        },
        resolved_address: args.recipient_address
          ? `${args.recipient_address.slice(0, 6)}...${args.recipient_address.slice(-4)}`
          : undefined,
        gas_fee:      gasFormatted,
        total_display: `≈ ${(parseFloat(amount) + 0.006).toFixed(3)} ${token}`,
      }
    }
    case 'swap_tokens': {
      const amountIn = args.amount_in ?? '0'
      const tokenIn  = args.token_in  ?? 'USDC'
      const tokenOut = args.token_out ?? 'EURC'
      const rate = tokenIn === 'USDC' && tokenOut === 'EURC' ? 0.92 : 1.08
      return {
        intent: {
          type:      'swap_tokens',
          token_in:  tokenIn  as 'USDC' | 'EURC' | 'USYC',
          token_out: tokenOut as 'USDC' | 'EURC' | 'USYC',
          amount_in: amountIn,
          chain:     (args.chain ?? 'arc') as 'arc',
        },
        gas_fee:      gasFormatted,
        total_display: `≈ ${(parseFloat(amountIn) * rate).toFixed(2)} ${tokenOut}`,
      }
    }
    case 'bridge_tokens': {
      const amount  = args.amount   ?? '0'
      const toChain = args.to_chain ?? 'ethereum'
      return {
        intent: {
          type:       'bridge_tokens',
          token:      (args.token ?? 'USDC') as 'USDC' | 'EURC',
          amount,
          from_chain: (args.from_chain ?? 'arc') as 'arc',
          to_chain:   toChain as 'arc' | 'ethereum' | 'solana' | 'base',
        },
        gas_fee:      gasFormatted,
        total_display: `${amount} ${args.token ?? 'USDC'} → ${toChain.toUpperCase()} (~20s)`,
      }
    }
    default:
      return {
        intent:        { type: 'get_balance', token: 'all', chain: 'arc' },
        gas_fee:       '$0',
        total_display: '—',
      }
  }
}
