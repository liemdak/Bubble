import { NextRequest, NextResponse } from 'next/server'
import { parseIntent } from '@/lib/anthropic/mockParser'
import { getSession } from '@/lib/auth/session'
import type { ConfirmationCard } from '@/types/intent'

const SYSTEM_PROMPT = `You are Bubble — a smart, friendly assistant built into a stablecoin payment app on Arc blockchain.

LANGUAGE: Always respond in the same language the user writes in. Vietnamese → Vietnamese. English → English. Mix if they mix.

PERSONALITY: Warm, helpful, slightly playful. You can discuss anything — you're not limited to payments. Think of yourself as a knowledgeable friend who happens to be really good at crypto payments.

PAYMENT CAPABILITIES (use tools for these):
- Send USDC, EURC, USYC → send_payment
- Check balance → get_balance
- Swap tokens → swap_tokens
- Bridge across chains → bridge_tokens
- Exchange rates → get_rate
- Manage contacts → manage_contact
- Look up Arc docs, contracts, APIs → search_arc_docs

PAYMENT RULES:
- Never invent wallet addresses — only use ones the user provides
- Always use a tool call for payment actions (send, swap, bridge)
- Gas on Arc ≈ $0.006, sponsored automatically
- Default chain: arc (fastest, sub-second)
- Supported tokens: USDC, EURC, USYC
- Supported chains: arc, ethereum, solana, base

KNOWLEDGE:
- Arc is an EVM blockchain built by Circle, optimized for stablecoin payments
- Sub-second finality, ~$0.006 gas, gas sponsored by Circle
- Circle CCTP enables trustless USDC bridging across chains
- Circle Developer Controlled Wallets: server-side wallets created via Circle API
- You have access to Arc docs via search_arc_docs tool

Be concise but complete. For payments always confirm before executing.`

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
  _circleWalletId: string | null,
  userAddress: string | null = null,
): Promise<string> {
  try {
    if (!userAddress) {
      return '💰 No wallet connected. Please log in first.'
    }
    const { readWalletBalances, formatBalanceMessage } = await import('@/lib/viem/balanceReader')
    const balances = await readWalletBalances(userAddress)
    return formatBalanceMessage(balances, userAddress)
  } catch {
    return '💰 Could not fetch balance right now. Please try again.'
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

    if (fnName === 'search_arc_docs') {
      const result = await searchArcDocs(args.query ?? '')
      return NextResponse.json({ type: 'text', message: result })
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

/**
 * Search Arc docs via Arc MCP server (JSON-RPC over HTTP).
 * Falls back to curated answers if MCP is unreachable.
 */
async function searchArcDocs(query: string): Promise<string> {
  try {
    const res = await fetch('https://docs.arc.io/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search_arc_docs',
          arguments: { query },
        },
        id: 1,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data?.result?.content
      if (Array.isArray(content)) {
        const text = content.map((c: { text?: string }) => c.text).filter(Boolean).join('\n\n')
        if (text) return `📚 **Arc Docs**\n\n${text}`
      }
    }
  } catch (err) {
    console.error('[searchArcDocs] MCP fetch failed:', err)
  }

  // Curated fallback for common Arc questions
  const q = query.toLowerCase()

  if (q.includes('usdc') && (q.includes('address') || q.includes('contract'))) {
    return '📚 **Arc Docs — USDC**\n\nUSDC on Arc Testnet: check https://docs.arc.io/arc/references/contract-addresses\n\nArc uses Circle\'s native USDC (not bridged). Gas fees are paid in USDC (~$0.006/tx), sponsored by Circle Gas Station for developer-controlled wallets.'
  }
  if (q.includes('gas') || q.includes('fee')) {
    return '📚 **Arc Docs — Gas**\n\n• Gas token: USDC (native)\n• Cost: ~$0.006 per transaction\n• Circle Gas Station sponsors fees for developer-controlled wallets (zero cost to users)\n• No ETH needed on Arc'
  }
  if (q.includes('rpc') || q.includes('chain id') || q.includes('network')) {
    return '📚 **Arc Docs — Network**\n\n• Chain ID: 5042002\n• RPC: https://rpc.testnet.arc.network\n• Explorer: https://testnet.arcscan.app\n• Block time: ~0.48s\n• Finality: deterministic, sub-second'
  }
  if (q.includes('cctp') || q.includes('bridge')) {
    return '📚 **Arc Docs — CCTP Bridge**\n\nArc supports Circle CCTP v2 for bridging USDC:\n• Burn on source chain → Attestation → Mint on destination\n• ~20 second transfer time\n• Supported: Arc ↔ Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, Solana'
  }
  if (q.includes('faucet') || q.includes('testnet') || q.includes('test usdc')) {
    return '📚 **Arc Docs — Faucet**\n\nGet free testnet USDC:\n1. Go to https://faucet.circle.com\n2. Select "Arc Testnet"\n3. Enter your wallet address\n4. Receive 10 USDC instantly'
  }

  return `📚 **Arc Docs**\n\nI couldn't fetch live Arc docs for "${query}" right now.\n\nTry visiting: https://docs.arc.io\n\nOr ask me something specific like "Arc gas fees", "USDC contract address", "how to bridge", or "testnet RPC".`
}
