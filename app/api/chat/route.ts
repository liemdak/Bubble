import { NextRequest, NextResponse } from 'next/server'
import { parseIntent } from '@/lib/anthropic/mockParser'
import { getSession } from '@/lib/auth/session'
import type { ConfirmationCard } from '@/types/intent'

const SYSTEM_PROMPT = `You are Bubble — a friendly payment assistant for stablecoin transfers.

LANGUAGE: Always respond in the same language the user writes in. Vietnamese → Vietnamese. English → English.

GREETINGS: If the user greets you (hello, hi, chào, xin chào, hey, etc.), reply warmly in 1 sentence, say you help with stablecoin payments, then give a quick example.

SCOPE — You ONLY help with:
- Sending USDC, EURC, or USYC to contacts or wallet addresses → use send_payment
- Checking wallet balance → use get_balance
- Swapping tokens (USDC ↔ EURC ↔ USYC) → use swap_tokens
- Bridging across chains (Arc, Ethereum, Solana, Base) → use bridge_tokens
- Exchange rates → use get_rate
- Managing contacts → use manage_contact
- Gas fees, Arc network info → answer directly

OUT OF SCOPE: For anything unrelated, reply in user's language:
- English: "I'm a payment assistant. Try: 'send 50 USDC to Mike' or 'check my balance'."
- Vietnamese: "Mình chỉ hỗ trợ thanh toán stablecoin. Thử: 'gửi 50 USDC cho Mike' hoặc 'kiểm tra số dư'."

RULES:
- Never invent wallet addresses
- Always use a tool call for payment actions
- If a contact name is not found, ask the user to provide their wallet address
- Be concise — 1-2 sentences max for text replies
- Gas on Arc ≈ $0.006, sponsored automatically
- Default chain: arc`

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()
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

    // ── Balance shortcut — bypass AI, always fetch real data ─────────
    if (/balance|how much|số dư|xem số dư|kiểm tra ví|check.*balance|my balance|wallet balance/i.test(message)) {
      const msg = await fetchRealBalance(circleWalletId, userAddress)
      return NextResponse.json({ type: 'text', message: msg })
    }

    // ── Groq (primary) ───────────────────────────────────────────────
    if (process.env.GROQ_API_KEY) {
      try {
        return await handleGroq(message, userAddress, circleWalletId)
      } catch (err) {
        console.error('[/api/chat] Groq error — falling back to mock:', err)
      }
    }

    // ── Mock parser (fallback) ───────────────────────────────────────
    await new Promise((r) => setTimeout(r, 300))
    return NextResponse.json(parseIntent(message))

  } catch (err) {
    console.error('[/api/chat]', err)
    return NextResponse.json(
      { type: 'text', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchRealBalance(
  circleWalletId: string | null,
  userAddress: string | null = null,
): Promise<string> {
  try {
    if (!process.env.CIRCLE_API_KEY) {
      return '💰 Wallet not configured yet.'
    }

    // Auto-find wallet if session is missing it
    let walletId = circleWalletId
    if (!walletId && userAddress) {
      walletId = await findOrCreateWallet(userAddress)
    }

    if (!walletId) {
      return '💰 Could not locate your wallet. Please visit the Balance tab to set it up.'
    }

    const { getSingleWalletBalance } = await import('@/lib/circle/balance')
    const balances = await getSingleWalletBalance(walletId)

    if (balances.length === 0) {
      return '💰 Your wallet is empty on Arc Testnet.\n\nGet free USDC at faucet.circle.com → select Arc Testnet.'
    }

    const lines = balances.map((b) => `• ${b.token}: ${parseFloat(b.amount).toFixed(2)}`)
    return `💰 Your balances on Arc Testnet:\n${lines.join('\n')}`
  } catch {
    return '💰 Could not fetch balance right now. Please try again.'
  }
}

async function findOrCreateWallet(address: string): Promise<string | null> {
  try {
    const { getCircleClient } = await import('@/lib/circle/client')
    const client = getCircleClient()

    const list = await client.listWallets({ pageSize: 50 })
    const found = list.data?.wallets?.find(w => w.refId === address.toLowerCase())
    if (found?.id) return found.id

    const setRes = await client.createWalletSet({ name: `Bubble:${address.slice(0, 8)}` })
    const walletSetId = setRes.data?.walletSet?.id
    if (!walletSetId) return null

    const walletRes = await client.createWallets({
      walletSetId,
      blockchains: ['ARC-TESTNET'],
      count: 1,
      metadata: [{ name: address, refId: address.toLowerCase() }],
    })
    return walletRes.data?.wallets?.[0]?.id ?? null
  } catch {
    return null
  }
}

async function handleGroq(
  message: string,
  userAddress: string | null,
  circleWalletId: string | null,
) {
  const { getGroqClient } = await import('@/lib/groq/client')
  const { PAYMENT_TOOLS } = await import('@/lib/groq/tools')
  const groq = getGroqClient()

  const system = userAddress
    ? `${SYSTEM_PROMPT}\n\nUser wallet address: ${userAddress}`
    : SYSTEM_PROMPT

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ],
    tools: PAYMENT_TOOLS,
    tool_choice: 'auto',
    temperature: 0.1,
    max_tokens: 512,
  })

  const choice = completion.choices[0]
  const toolCalls = choice.message.tool_calls

  if (toolCalls && toolCalls.length > 0) {
    const call = toolCalls[0]
    const fnName = call.function.name
    let args: Record<string, string> = {}
    try { args = JSON.parse(call.function.arguments) } catch { /* ignore */ }

    // Non-confirmation tools — handle directly
    if (fnName === 'get_balance') {
      return NextResponse.json({ type: 'text', message: await fetchRealBalance(circleWalletId, userAddress) })
    }

    if (fnName === 'get_rate') {
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

    if (fnName === 'manage_contact') {
      if (args.action === 'list') {
        return NextResponse.json({ type: 'text', message: 'No contacts yet. Add one: "add Mike 0x1234..."' })
      }
      if (args.action === 'add' && args.name && args.wallet_address) {
        return NextResponse.json({ type: 'text', message: `✓ Got it! Contacts feature coming soon. For now send directly: "send 50 USDC to ${args.wallet_address}"` })
      }
      return NextResponse.json({ type: 'text', message: 'Contacts feature coming soon. You can send to any wallet address directly.' })
    }

    // Confirmation-required actions
    const card = buildConfirmCard(fnName, args)
    return NextResponse.json({ type: 'confirm', card })
  }

  const text = choice.message.content ?? 'I didn\'t understand that. Try: "send 50 USDC to Mike".'
  return NextResponse.json({ type: 'text', message: text })
}

function buildConfirmCard(intentType: string, args: Record<string, string>): ConfirmationCard {
  const gas = '$0.006'
  switch (intentType) {
    case 'send_payment': {
      const amount = args.amount ?? '0'
      const token  = (args.token ?? 'USDC') as 'USDC' | 'EURC' | 'USYC'
      return {
        intent: {
          type: 'send_payment',
          recipient_name:    args.recipient_name,
          recipient_address: args.recipient_address,
          amount, token,
          chain: (args.chain ?? 'arc') as 'arc',
        },
        resolved_address: args.recipient_address
          ? `${args.recipient_address.slice(0, 6)}...${args.recipient_address.slice(-4)}`
          : undefined,
        gas_fee:      gas,
        total_display: `≈ ${(parseFloat(amount) + 0.006).toFixed(3)} ${token}`,
      }
    }
    case 'swap_tokens': {
      const amountIn = args.amount_in ?? '0'
      const tokenIn  = (args.token_in  ?? 'USDC') as 'USDC' | 'EURC' | 'USYC'
      const tokenOut = (args.token_out ?? 'EURC') as 'USDC' | 'EURC' | 'USYC'
      const rate = tokenIn === 'USDC' && tokenOut === 'EURC' ? 0.92 : 1.08
      return {
        intent: { type: 'swap_tokens', token_in: tokenIn, token_out: tokenOut, amount_in: amountIn, chain: 'arc' },
        gas_fee:      gas,
        total_display: `≈ ${(parseFloat(amountIn) * rate).toFixed(2)} ${tokenOut}`,
      }
    }
    case 'bridge_tokens': {
      const amount  = args.amount   ?? '0'
      const toChain = (args.to_chain ?? 'ethereum') as 'arc' | 'ethereum' | 'solana' | 'base'
      return {
        intent: {
          type: 'bridge_tokens',
          token:      (args.token ?? 'USDC') as 'USDC' | 'EURC',
          amount,
          from_chain: (args.from_chain ?? 'arc') as 'arc',
          to_chain:   toChain,
        },
        gas_fee:      gas,
        total_display: `${amount} ${args.token ?? 'USDC'} → ${toChain.toUpperCase()} (~20s)`,
      }
    }
    default:
      return { intent: { type: 'get_balance', token: 'all', chain: 'arc' }, gas_fee: '$0', total_display: '—' }
  }
}
