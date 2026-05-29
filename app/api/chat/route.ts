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
- Exchange rates or any crypto price (BTC, ETH, SOL...) → get_rate
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
    // Circle wallet address = nơi funds thực sự nằm
    const circleWalletAddress = session?.circleWalletAddress ?? null

    // ── /help — list all quick commands ─────────────────────────────
    if (/^\/help$/i.test(message.trim())) {
      return NextResponse.json({
        type: 'text',
        message:
          `⚡ **Quick commands**\n\n` +
          `\`/p BTC\` — price + 7d chart\n` +
          `\`/p ETH 30d\` — 30-day chart\n` +
          `\`/p SOL 1d\` — 24h chart\n` +
          `\`/p USDC EURC\` — exchange rate\n` +
          `\`/help\` — show this message\n\n` +
          `Supports BTC, ETH, SOL, BNB, ADA, XRP, DOGE, SHIB, PEPE, SUI, APT, PYTH and 15+ more.\n\n` +
          `**Natural language works too:**\n` +
          `"send 50 USDC to Mike" · "swap 100 USDC to EURC"\n` +
          `"bridge to Ethereum" · "check balance" · "my QR"`,
      })
    }

    // ── /p <token> [period] | /p <tokenA> <tokenB> ───────────────────
    // /p BTC          → price + 7d chart
    // /p BTC 30d      → price + 30d chart
    // /p USDC EURC    → exchange rate (text, no chart)
    const priceCmd = message.match(/^\/p\s+([A-Za-z]+)(?:\s+(7d|30d|1d)|\s+([A-Za-z]+))?/i)
    if (priceCmd) {
      const token1  = priceCmd[1].toUpperCase()
      const period  = (priceCmd[2] ?? '7d').toLowerCase()
      const token2  = priceCmd[3]?.toUpperCase()
      const days    = period === '30d' ? 30 : period === '1d' ? 1 : 7

      try {
        const { fetchPrices, fetchPriceHistory, getExchangeRate, formatRateMessage, SYMBOL_TO_ID } =
          await import('@/lib/market/coingecko')

        // Exchange rate between two tokens → text (no chart)
        if (token2) {
          const { rate, priceIn, priceOut } = await getExchangeRate(token1, token2)
          return NextResponse.json({ type: 'text', message: formatRateMessage(token1, token2, 1, rate, priceIn, priceOut) })
        }

        // Single token → price + sparkline chart
        const [prices, history] = await Promise.all([
          fetchPrices([token1]),
          fetchPriceHistory(token1, days),
        ])

        const id    = SYMBOL_TO_ID[token1] ?? token1.toLowerCase()
        const price = prices[id]

        if (!price || price.usd === 0) {
          return NextResponse.json({ type: 'text', message: `❓ "${token1}" không tìm thấy trên CoinGecko.\nThử: /p BTC  /p ETH  /p SOL  /p DOGE\nGõ /help để xem danh sách đầy đủ.` })
        }

        const priceLine = `${price.change24h >= 0 ? '↑' : '↓'} ${price.usd >= 1000 ? '$' + price.usd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$' + price.usd.toFixed(2)} (${price.change24h >= 0 ? '+' : ''}${price.change24h.toFixed(2)}% 24h)`

        return NextResponse.json({
          type:         'chart',
          symbol:       token1,
          currentPrice: price.usd,
          change24h:    price.change24h,
          chartData:    history.points,
          period:       `${days}d`,
          high:         history.high,
          low:          history.low,
          marketCap:    price.marketCap,
          volume24h:    price.volume24h,
          message:      `${token1} ${priceLine}`,
        })
      } catch (err) {
        const isRateLimit = err instanceof Error && err.message === 'RATE_LIMITED'
        console.error('[/p cmd]', err)
        return NextResponse.json({
          type: 'text',
          message: isRateLimit
            ? `⏳ CoinGecko đang bị rate limit (30 req/phút). Chờ 1 phút rồi thử lại, hoặc thử token khác trước.`
            : `⚠️ Không lấy được data cho ${priceCmd[1].toUpperCase()}. Thử lại sau giây lát.`,
        })
      }
    }

    // ── Fund agent shortcut ───────────────────────────────────────────
    // Detect: "nạp agent", "top up agent", "fund agent", "nạp ví agent", etc.
    if (/nạp.*(agent|ví agent)|top[\s-]?up.*(agent|wallet)|fund.*(agent|wallet)|chuyển.*agent|(agent|ví agent).*(nạp|tiền)/i.test(message)) {
      if (!circleWalletAddress) {
        return NextResponse.json({ type: 'text', message: '⚠️ Agent wallet chưa được khởi tạo. Thử đăng xuất và đăng nhập lại nhé.' })
      }
      // Parse amount and token from message
      const amountMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(usdc|eurc|usyc)?/i)
      const amount = amountMatch?.[1]?.replace(',', '.') ?? '10'
      const token  = (amountMatch?.[2]?.toUpperCase() ?? 'USDC') as 'USDC' | 'EURC' | 'USYC'
      const card: import('@/types/intent').ConfirmationCard = {
        intent: {
          type:          'fund_agent',
          amount,
          token,
          agent_address: circleWalletAddress,
          user_address:  userAddress ?? '',
        },
        gas_fee:      '$0.006',
        total_display: `${amount} ${token} → Agent wallet`,
      }
      return NextResponse.json({ type: 'confirm', card })
    }

    // ── Refund / Withdraw agent → main wallet ────────────────────────
    if (/withdraw|refund|rút.*agent|rút.*ví agent|chuyển.*về ví chính|agent.*về ví|pull.*from agent/i.test(message)) {
      const amountMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(usdc|eurc|usyc)?/i)
      const explicitAmount = amountMatch?.[1]?.replace(',', '.') ?? '0'
      const token = (amountMatch?.[2]?.toUpperCase() ?? 'USDC') as 'USDC' | 'EURC' | 'USYC'

      // Resolve "withdraw all" → fetch real agent wallet balance
      let finalAmount = explicitAmount
      if (parseFloat(explicitAmount) <= 0) {
        if (!circleWalletAddress) {
          return NextResponse.json({ type: 'text', message: '⚠️ Agent wallet not found. Try logging out and back in.' })
        }
        try {
          const { readWalletBalances } = await import('@/lib/viem/balanceReader')
          const balances = await readWalletBalances(circleWalletAddress)
          const found = balances.find(b => b.token === token)
          const actual = parseFloat(found?.amount ?? '0')
          if (actual <= 0) {
            return NextResponse.json({ type: 'text', message: `No ${token} in your agent wallet. Fund it first with "Fund agent".` })
          }
          finalAmount = found!.amount
        } catch {
          return NextResponse.json({ type: 'text', message: 'Could not read agent wallet balance. Please try again.' })
        }
      }

      const card: import('@/types/intent').ConfirmationCard = {
        intent: { type: 'refund_agent', amount: finalAmount, token },
        gas_fee: '$0.006',
        total_display: `${finalAmount} ${token} → Your wallet`,
      }
      return NextResponse.json({ type: 'confirm', card })
    }

    // ── QR shortcut — hiển thị Circle wallet address để nhận tiền ────
    if (/\bqr\b|my qr|receive|payment link/i.test(message)) {
      // Dùng Circle wallet address (nơi nhận tiền), không phải MetaMask
      const address = circleWalletAddress ?? userAddress ?? '0x0000000000000000000000000000000000000000'
      return NextResponse.json({
        type: 'qr',
        address,
        message: 'Here\'s your QR code to receive payments.',
      })
    }

    // ── Balance shortcut — đọc ví MetaMask (chính) ───────────────────
    if (/balance|how much|số dư|xem số dư|kiểm tra ví|check.*balance|my balance|wallet balance/i.test(message)) {
      const msg = await fetchRealBalance(userAddress, circleWalletAddress)
      return NextResponse.json({ type: 'text', message: msg })
    }

    // ── Groq (primary) ───────────────────────────────────────────────
    if (process.env.GROQ_API_KEY) {
      try {
        return await handleGroq(message, userAddress, circleWalletId, circleWalletAddress)
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
  metaMaskAddress: string | null,
  agentAddress: string | null = null,
): Promise<string> {
  if (!metaMaskAddress) {
    return '💰 No wallet connected. Please log in first.'
  }
  try {
    const { readWalletBalances } = await import('@/lib/viem/balanceReader')

    const [userBals, agentBals] = await Promise.all([
      readWalletBalances(metaMaskAddress),
      agentAddress ? readWalletBalances(agentAddress) : Promise.resolve([]),
    ])

    const fmt = (bals: typeof userBals) =>
      bals.filter(b => parseFloat(b.amount) > 0).map(b => `  • ${b.token}: ${b.amount}`)

    const shortUser  = `${metaMaskAddress.slice(0,6)}...${metaMaskAddress.slice(-4)}`
    const shortAgent = agentAddress ? `${agentAddress.slice(0,6)}...${agentAddress.slice(-4)}` : null

    const userLines  = fmt(userBals)
    const agentLines = agentAddress ? fmt(agentBals) : []

    const userTotal  = userBals.reduce((s, b) => s + parseFloat(b.amount), 0).toFixed(2)
    const agentTotal = agentBals.reduce((s, b) => s + parseFloat(b.amount), 0).toFixed(2)

    let msg = `💰 Your wallet (${shortUser}):\n`
    msg += userLines.length ? userLines.join('\n') : '  (empty)'
    msg += `\n≈ $${userTotal} total`

    if (shortAgent) {
      msg += `\n\n🤖 Agent wallet (${shortAgent}):\n`
      msg += agentLines.length ? agentLines.join('\n') : '  (empty — tap "Fund Agent" to top up)'
      msg += `\n≈ $${agentTotal} total`
    }

    return msg
  } catch {
    return '💰 Could not fetch balance right now. Please try again.'
  }
}

async function handleGroq(
  message: string,
  userAddress: string | null,
  circleWalletId: string | null,
  circleWalletAddress: string | null = null,
) {
  const { getGroqClient } = await import('@/lib/groq/client')
  const { PAYMENT_TOOLS } = await import('@/lib/groq/tools')
  const groq = getGroqClient()

  // Cung cấp context đầy đủ cho AI: Circle wallet là nơi dùng để giao dịch
  const walletContext = circleWalletAddress
    ? `\n\nUser's Circle wallet (for transactions): ${circleWalletAddress}\nUser's MetaMask address (identity only): ${userAddress ?? 'not set'}`
    : userAddress
      ? `\n\nUser wallet address: ${userAddress}`
      : ''

  const system = SYSTEM_PROMPT + walletContext

  // Giới hạn độ dài message để tránh spam
  const safeMessage = message.slice(0, 2000)

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',   // Upgrade: 70b chính xác hơn 8b
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: safeMessage },
    ],
    tools: PAYMENT_TOOLS,
    tool_choice: 'auto',
    temperature: 0.1,    // Thấp = intent parsing ổn định
    max_tokens: 1024,    // Tăng từ 512 cho Arc docs responses
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
      // userAddress = MetaMask (main), circleWalletAddress = agent wallet
      return NextResponse.json({ type: 'text', message: await fetchRealBalance(userAddress, circleWalletAddress) })
    }

    if (fnName === 'get_rate') {
      const tokenIn  = (args.token_in  ?? 'USDC').toUpperCase()
      const tokenOut = (args.token_out ?? 'USD').toUpperCase()
      const amount   = parseFloat(args.amount ?? '1') || 1

      try {
        const { getExchangeRate, fetchPrices, formatRateMessage, formatPriceMessage, SYMBOL_TO_ID } =
          await import('@/lib/market/coingecko')

        // Single token price in USD
        if (tokenOut === 'USD') {
          const prices   = await fetchPrices([tokenIn])
          const id       = SYMBOL_TO_ID[tokenIn] ?? tokenIn.toLowerCase()
          const price    = prices[id]
          if (!price || price.usd === 0) {
            return NextResponse.json({ type: 'text', message: `❓ "${tokenIn}" not found on CoinGecko. Try the full coin name or check the symbol.` })
          }
          return NextResponse.json({ type: 'text', message: formatPriceMessage(tokenIn, price) })
        }

        // Exchange rate between two tokens
        const { rate, priceIn, priceOut } = await getExchangeRate(tokenIn, tokenOut)
        return NextResponse.json({
          type: 'text',
          message: formatRateMessage(tokenIn, tokenOut, amount, rate, priceIn, priceOut),
        })
      } catch (err) {
        console.error('[get_rate] CoinGecko error:', err)
        // Fallback to hardcoded rates for stablecoins
        const { FALLBACK_RATE } = await import('@/lib/market/coingecko')
        const key  = `${tokenIn}-${tokenOut}`
        const rate = FALLBACK_RATE[key] ?? 1.00
        return NextResponse.json({
          type: 'text',
          message: `📈 ${amount} ${tokenIn} ≈ ${(amount * rate).toFixed(4)} ${tokenOut}\n\n_(Estimated — live data temporarily unavailable)_`,
        })
      }
    }

    if (fnName === 'manage_contact') {
      if (args.action === 'list') {
        try {
          const { getContacts } = await import('@/lib/firebase/db')
          const contacts = await getContacts(userAddress ?? '')
          if (contacts.length === 0) {
            return NextResponse.json({ type: 'text', message: 'No contacts yet. Go to Contacts tab or say "add Mike 0x1234..." to add one.' })
          }
          const list = contacts.map(c => `• ${c.name} → ${c.address}`).join('\n')
          return NextResponse.json({ type: 'text', message: `👥 Your contacts:\n${list}` })
        } catch {
          return NextResponse.json({ type: 'text', message: 'No contacts yet. Go to the Contacts tab to add one.' })
        }
      }
      if (args.action === 'add' && args.name && args.wallet_address) {
        return NextResponse.json({ type: 'text', message: `To add a contact, tap the Contacts tab (👥) and click "+ Add Contact". Or say: "add ${args.name} with address ${args.wallet_address}".` })
      }
      if (args.action === 'lookup' && args.name) {
        try {
          const { getContacts } = await import('@/lib/firebase/db')
          const contacts = await getContacts(userAddress ?? '')
          const found = contacts.find(c => c.name.toLowerCase() === args.name.toLowerCase())
          if (found) {
            return NextResponse.json({ type: 'text', message: `${found.name}: ${found.address}` })
          }
          return NextResponse.json({ type: 'text', message: `❌ "${args.name}" not found in your contacts. Add them in the Contacts tab first.` })
        } catch {
          return NextResponse.json({ type: 'text', message: `Could not look up "${args.name}".` })
        }
      }
      return NextResponse.json({ type: 'text', message: 'Go to the Contacts tab to manage your address book.' })
    }

    if (fnName === 'search_arc_docs') {
      const result = await searchArcDocs(args.query ?? '')
      return NextResponse.json({ type: 'text', message: result })
    }

    // ── Contact resolution for send_payment ──────────────────────────────────
    // If AI returned a name but no address, look it up in the user's contacts
    if (fnName === 'send_payment' && args.recipient_name && !args.recipient_address) {
      try {
        const { getContacts } = await import('@/lib/firebase/db')
        const contacts = await getContacts(userAddress ?? '')
        const found = contacts.find(
          c => c.name.toLowerCase() === args.recipient_name.toLowerCase()
        )
        if (found) {
          args.recipient_address = found.address
        } else {
          return NextResponse.json({
            type: 'text',
            message: `❌ Contact "${args.recipient_name}" not found. Add them in the Contacts tab (👥) first, or send directly using a wallet address (0x...).`,
          })
        }
      } catch { /* proceed, execution layer will validate */ }
    }

    // Fetch real swap rate for confirm card display
    if (fnName === 'swap_tokens') {
      try {
        const { getExchangeRate } = await import('@/lib/market/coingecko')
        const { rate } = await getExchangeRate(args.token_in ?? 'USDC', args.token_out ?? 'EURC')
        args._real_rate = rate.toString()
      } catch { /* fallback rate used in buildConfirmCard */ }
    }

    // Confirmation-required actions
    const card = buildConfirmCard(fnName, args)

    // For send_payment: embed user's MetaMask address so the client can sign via MetaMask
    if (fnName === 'send_payment' && userAddress) {
      (card.intent as import('@/types/intent').SendIntent).user_address = userAddress
    }

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
      // Use real rate fetched before buildConfirmCard; fallback to hardcode
      const rate = args._real_rate
        ? parseFloat(args._real_rate)
        : tokenIn === 'USDC' && tokenOut === 'EURC' ? 0.92 : 1.087
      return {
        intent: { type: 'swap_tokens', token_in: tokenIn, token_out: tokenOut, amount_in: amountIn, chain: 'arc' },
        gas_fee:      gas,
        total_display: `≈ ${(parseFloat(amountIn) * rate).toFixed(4)} ${tokenOut}`,
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
