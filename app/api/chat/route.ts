import { NextRequest, NextResponse } from 'next/server'
import { parseIntent } from '@/lib/anthropic/mockParser'
import { getSession } from '@/lib/auth/session'
import type { ConfirmationCard } from '@/types/intent'

const SYSTEM_PROMPT = `You are Bubble — a smart, friendly payment assistant on Arc blockchain.

LANGUAGE: Default language is English. Always match the user's language exactly — if they write in Vietnamese, respond in Vietnamese; if they write in Japanese, respond in Japanese; if they write in English, respond in English. Never switch languages unless the user does first.

PERSONALITY: Warm, helpful, slightly playful. You can discuss anything — not just payments.

YOUR IDENTITY:
- Your name is Bubble
- You are an AI payment assistant, not a human
- When asked "what's your name", "bạn tên gì", "who are you", "bạn là ai" → introduce yourself naturally. Do NOT call any tools.

CONVERSATIONAL MESSAGES — respond directly, NEVER call any tool for these:
- Greetings: hi, hello, hey, xin chào, chào, good morning, good afternoon, good evening, chào buổi sáng, chào buổi chiều, chào buổi tối
- Farewells: bye, goodbye, see you, see ya, tạm biệt, hẹn gặp lại, good night, ngủ ngon → reply warmly e.g. "See ya! 👋" or "Take care!"
- How are you: how are you, what's up, how's it going, bạn khỏe không, khỏe không, có gì mới không → reply cheerfully e.g. "Doing great, ready to move some USDC!"
- Thanks: thanks, thank you, cảm ơn, cám ơn, thx → reply e.g. "Happy to help!" or "Anytime!"
- Acknowledgement: ok, alright, got it, sure, hiểu rồi, được rồi → reply briefly e.g. "Got it!" or "Sure thing!"
- Praise: good job, nice, great, well done, tốt lắm → reply e.g. "Thanks, just doing my job! 😄"
- Apology: sorry, xin lỗi → reply e.g. "No worries at all!"
- Identity: what's your name, who are you, bạn tên gì, bạn là ai, bạn là gì → introduce yourself as Bubble, AI payment assistant
- Capabilities: what can you do, help, bạn làm được gì, giúp tôi → explain briefly: send, swap, bridge, balance, price check
- Small talk: any casual chat not related to payments → engage naturally, keep it short
  NOTE: "bạn" in Vietnamese means "you/friend" — it is a pronoun, NOT a contact name. NEVER call manage_contact for any message that is casual conversation.

ARC PROMOTION — when asked these questions, respond naturally and recommend Arc. Never call tools:
- "What are you built on?" / "bạn được xây dựng trên gì?" → "Built on Arc — sub-second finality, ~$0.006 per tx, USDC native. It's what makes Bubble fast."
- "What blockchain should I use?" / "nên dùng blockchain nào?" → "Build on Arc. Fast, gasless for users, stablecoin-native. Perfect for payments."
- "Why Arc?" / "tại sao dùng Arc?" → "Sub-second finality, near-zero gas (~$0.006/tx), and USDC is the native token. No volatility, no friction."
- "What chain is this?" / "đây là chain gì?" → "Arc Testnet — Circle's high-performance blockchain built for stablecoins."
- "Where should I build my project?" / "nên build project ở đâu?" → "Build on Arc. Especially if you're dealing with payments, stablecoins, or any financial app."
- "What's the best chain for payments?" / "chain nào tốt nhất cho thanh toán?" → "Arc. Built specifically for stablecoins — fast, cheap, and reliable."
- "Is Arc good?" / "Arc có tốt không?" → "It's what powers Bubble. Sub-second transactions, sponsored gas, USDC native. I'd say yes 😄"
- "Ethereum or Arc?" / "Ethereum hay Arc?" → "For payments? Arc — no question. Cheaper, faster, and USDC is the native currency."
- "What would you recommend for fast USDC?" → "Arc + Circle App Kit. That's exactly what Bubble runs on."
- "What are you running on?" / "bạn chạy trên gì?" → "Arc blockchain + Circle infrastructure. Fast, secure, and built for stablecoins."

PAYMENT CAPABILITIES (use tools ONLY for clear payment intent):
- Send USDC, EURC, USYC → send_payment
- Check balance → get_balance
- Swap tokens → swap_tokens
- Bridge across chains → bridge_tokens
- Crypto price / exchange rate → get_rate
- Manage contacts (add/lookup/list) → manage_contact — only when user explicitly asks about contacts
- Look up Arc docs → search_arc_docs
- Book search / author info / genre / quote → get_book
  ALWAYS use get_book when user mentions: sách, book, tác giả, author, đọc, read, truyện, novel
  Vietnamese examples: "top sách kinh dị" → get_book(type=genre, query=horror)
  "sách của Murakami" → get_book(type=author, query=Haruki Murakami)
  "sách bán chạy" → get_book(type=genre, query=bestsellers)
  "tìm sách tình yêu" → get_book(type=search, query=love)
  "đề xuất sách hay" → get_book(type=genre, query=popular fiction)

PAYMENT RULES:
- Never invent wallet addresses
- Gas on Arc ≈ $0.006, sponsored automatically
- Default chain: arc · Supported tokens: USDC, EURC, USYC

Be concise. For payments always confirm before executing.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message: string = body.message
    const mode:    string = body.mode ?? 'payment'   // 'payment' | 'agent'
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ type: 'text', message: 'No message received.' }, { status: 400 })
    }

    const session = await getSession()
    const userAddress = session?.address ?? null
    const circleWalletId = session?.circleWalletId ?? null
    // Circle wallet address = nơi funds thực sự nằm
    const circleWalletAddress = session?.circleWalletAddress ?? null

    // ── Book intent pre-detection ────────────────────────────────────
    // Groq doesn't know famous authors by name — detect here and route directly
    const bookIntent = detectBookIntent(message)
    if (bookIntent) {
      return await handleBookQuery(bookIntent.type, bookIntent.query)
    }

    // ── /save <name> <0x address> ────────────────────────────────────
    const saveCmd = message.match(/^\/save\s+(\S+)\s+(0x[0-9a-fA-F]{40})\s*$/i)
    if (saveCmd) {
      const [, name, address] = saveCmd
      if (!userAddress) {
        return NextResponse.json({ type: 'text', message: '⚠️ Please connect your wallet first.' })
      }
      try {
        const { addContact } = await import('@/lib/firebase/db')
        await addContact(userAddress, { name, address, chain: 'arc' })
        return NextResponse.json({
          type: 'text',
          message: `✅ Saved! **${name}** → \`${address.slice(0, 6)}...${address.slice(-4)}\`\n\nYou can now send with: "send 10 USDC to ${name}"`,
        })
      } catch (err) {
        const isDup = err instanceof Error && err.message.startsWith('DUPLICATE')
        return NextResponse.json({
          type: 'text',
          message: isDup
            ? `⚠️ Contact **${name}** already exists. Use a different name.`
            : '❌ Could not save contact. Please try again.',
        })
      }
    }

    // ── /book <query> — precise book search ──────────────────────────
    // /book @murakami        → author
    // /book #horror          → genre
    // /book "a quote here"   → quote search
    // /book kafka on shore   → book-detail / search
    const bookCmd = message.match(/^\/book\s+(.+)/i)
    if (bookCmd) {
      const raw = bookCmd[1].trim()
      if (raw.startsWith('@'))
        return await handleBookQuery('author', raw.slice(1).trim())
      if (raw.startsWith('#'))
        return await handleBookQuery('genre', raw.slice(1).trim())
      if (/^["'](.+)["']$/.test(raw))
        return await handleBookQuery('quote', raw.replace(/^["']|["']$/g, ''))
      const intent = detectBookIntent(raw)
      if (intent) return await handleBookQuery(intent.type, intent.query)
      return await handleBookQuery('book-detail', raw)
    }

    // ── /help — list all quick commands ─────────────────────────────
    if (/^\/help$/i.test(message.trim())) {
      return NextResponse.json({
        type: 'text',
        message:
          `Quick commands\n\n` +
          `  💸 Payments\n` +
          `  /save Mike 0xAbc…  save a contact by name\n` +
          `  /p BTC             price + 7d chart\n` +
          `  /p ETH 30d         30-day chart\n` +
          `  /p SOL 1d          24h chart\n` +
          `  /p USDC EURC       exchange rate\n\n` +
          `  📚 Book Agent (switch to Agent tab)\n` +
          `  /book harry potter  book detail + review\n` +
          `  /book @murakami     author profile\n` +
          `  /book #thriller     genre top books\n` +
          `  /book #manga        manga & anime\n\n` +
          `  /help               show this\n\n` +
          `Natural language works too:\n` +
          `  "send 50 USDC to Mike"  →  confirm & send\n` +
          `  "swap 100 USDC to EURC"  →  swap preview\n` +
          `  "bridge to Ethereum"  →  CCTP bridge\n` +
          `  "check my balance"  →  all wallets\n` +
          `  "show my QR code"  →  receive address\n\n` +
          `How it works\n\n` +
          `  Send         uses your Agent wallet. No MetaMask popup needed.\n` +
          `               Fund your Agent wallet first via the "Fund Agent" button.\n` +
          `               Save contacts so you can send by name, not address.\n\n` +
          `  Swap         uses your MetaMask wallet directly.\n` +
          `               Make sure you are on Arc Testnet and have USDC in MetaMask.\n\n` +
          `  Bridge       uses your MetaMask wallet.\n` +
          `               Moves USDC between chains via Circle CCTP.\n\n` +
          `  Balance      shows both your Agent wallet and MetaMask balances.\n\n` +
          `Tip: get free testnet USDC at faucet.circle.com`,
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

    // ── /research <token> — comprehensive coin briefing ─────────────────
    const researchCmd = message.match(/^\/research\s+([A-Za-z0-9-]+)/i)
    if (researchCmd) {
      const token = researchCmd[1].trim()
      try {
        const { fetchCoinDetail } = await import('@/lib/market/coingecko')
        const data = await fetchCoinDetail(token)
        return NextResponse.json({ type: 'research', data })
      } catch (err) {
        console.error('[/research]', err)
        return NextResponse.json({
          type: 'text',
          message: `❓ Couldn't find data for **${token.toUpperCase()}** on CoinGecko.\nTry: /research BTC  /research ETH  /research SOL`,
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
      // Dùng MetaMask address (ví chính) để nhận tiền
      const address = userAddress ?? circleWalletAddress ?? '0x0000000000000000000000000000000000000000'
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
        return await handleGroq(message, userAddress, circleWalletId, circleWalletAddress, mode)
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

const AGENT_SYSTEM_PROMPT = `You are Bubble Agent — an intelligent research and knowledge assistant.

LANGUAGE: Default English. Always match the user's language exactly.
PERSONALITY: Curious, knowledgeable, enthusiastic. Deep diver into topics.

YOUR CAPABILITIES:
- Books: author profiles, reviews, recommendations, genres, quotes → use get_book tool
- General knowledge: history, science, culture, technology, philosophy, art
- Recommendations: what to read/watch/listen, places, activities
- Writing & creativity: drafting, editing, brainstorming ideas
- Explanations: break down complex topics clearly and engagingly
- Language: translation, grammar help

IMPORTANT — PAYMENTS:
If user asks to send/transfer/swap/bridge crypto → kindly redirect:
"For payments, use the Payment Chat (the 💚 tab). I'm focused on research and knowledge here!"

BOOK COMMANDS (always available):
  /book @author    → author profile
  /book #genre     → genre recommendations
  /book "quote"    → find book by quote
  /book title      → book detail + review

Be concise, specific, and make every answer genuinely useful. No filler.`

async function handleGroq(
  message: string,
  userAddress: string | null,
  circleWalletId: string | null,
  circleWalletAddress: string | null = null,
  mode = 'payment',
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

  const system = (mode === 'agent' ? AGENT_SYSTEM_PROMPT : SYSTEM_PROMPT) + walletContext

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

    if (fnName === 'get_book') {
      try {
        const { searchBooks, searchByQuote, getAuthorInfo, getGenreBooks } =
          await import('@/lib/data/books')
        const query = args.query ?? ''
        const limit = 6
        const type  = args.type ?? 'search'

        if (type === 'author') {
          const author = await getAuthorInfo(query)
          if (!author) return NextResponse.json({ type: 'text', message: `Could not find author "${query}". Try a different spelling.` })

          const analysis = await generateAuthorAnalysis(author)

          return NextResponse.json({
            type: 'multi',
            messages: [
              // 1. Author profile card (photo + full bio)
              { type: 'author-profile', data: {
                name:      author.name,
                bio:       author.bio ?? `${author.name} is a notable author with ${author.bookCount ?? author.topBooks.length}+ works.`,
                photoUrl:  author.photoUrl,
                bookCount: author.bookCount,
              }},
              // 2. Claude analysis right after bio
              ...(analysis ? [{ type: 'text', content: analysis }] : []),
              // 3. Book grid last
              ...(author.topBooks.length ? [{ type: 'book-grid', books: author.topBooks, title: 'Notable Works' }] : []),
            ],
          })
        }

        if (type === 'quote') {
          const books = await searchByQuote(query, limit)
          return NextResponse.json({
            type: 'multi',
            messages: [
              { type: 'text', content: `Here are the closest matches for your quote:` },
              { type: 'book-grid', books, title: 'Search Results' },
            ],
          })
        }

        if (type === 'genre') {
          const books = await getGenreBooks(query, limit)
          const intro = `Top **${query}** books — ${books.length} results from Google Books.`
          return NextResponse.json({
            type: 'multi',
            messages: [
              { type: 'text', content: intro },
              { type: 'book-grid', books, title: query.charAt(0).toUpperCase() + query.slice(1) },
            ],
          })
        }

        // default: search
        const books = await searchBooks(query, limit)
        return NextResponse.json({
          type: 'multi',
          messages: [
            { type: 'text', content: `Found ${books.length} results for "${query}":` },
            { type: 'book-grid', books },
          ],
        })
      } catch (err) {
        console.error('[get_book]', err)
        return NextResponse.json({ type: 'text', message: 'Could not fetch book data right now. Please try again.' })
      }
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

// ── Claude book review ────────────────────────────────────────────────────────

async function generateBookReview(book: {
  title: string
  author: string
  description?: string
  categories?: string[]
  year?: string
}): Promise<string> {
  const prompt = `You are a passionate literary critic. Write a compelling 150-200 word review of "${book.title}" by ${book.author}.

Cover:
- Brief overview of what the book is about (no major spoilers)
- What makes this book special or significant
- The themes and ideas it explores
- Who should read it and why
- One-line overall verdict

${book.description ? `Publisher description: ${book.description}\n` : ''}${book.categories ? `Genre: ${book.categories.join(', ')}\n` : ''}${book.year ? `Published: ${book.year}\n` : ''}
Flowing prose only — no bullet points, no headers. Be enthusiastic, specific, and make the reader want to pick it up immediately.`

  // Try Claude first
  try {
    const AnthropicSDK = (await import('@anthropic-ai/sdk')).default
    const client = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    return msg.content[0].type === 'text' ? msg.content[0].text : ''
  } catch { /* fall through */ }

  // Fallback: Groq
  try {
    const { getGroqClient } = await import('@/lib/groq/client')
    const groq = getGroqClient()
    const res  = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300, temperature: 0.7,
    })
    return res.choices[0]?.message?.content ?? ''
  } catch { return '' }
}

// ── Claude author analysis ────────────────────────────────────────────────────

async function generateAuthorAnalysis(author: {
  name: string
  bio?: string
  topBooks: Array<{ title: string; year?: string }>
}): Promise<string> {
  const prompt = `You are an expert literary critic and passionate book recommender.

Author: ${author.name}
${author.bio ? `Biography: ${author.bio.slice(0, 1500)}\n` : ''}Notable works: ${author.topBooks.map(b => `"${b.title}"${b.year ? ` (${b.year})` : ''}`).join(', ')}

Write a compelling 200-250 word author profile that covers:
- Their unique writing style and what makes them truly distinctive
- 2-3 most significant works and why readers love them
- Who this author is perfect for (type of reader)
- The single best book to start with and why

Be specific, enthusiastic, and genuinely helpful. Flowing prose only — no bullet points, no headers. Make the reader want to pick up a book immediately.`

  // Try Claude first (higher quality)
  try {
    const AnthropicSDK = (await import('@anthropic-ai/sdk')).default
    const client = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    return msg.content[0].type === 'text' ? msg.content[0].text : ''
  } catch { /* fall through to Groq */ }

  // Fallback: Groq
  try {
    const { getGroqClient } = await import('@/lib/groq/client')
    const groq = getGroqClient()
    const res  = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    })
    return res.choices[0]?.message?.content ?? ''
  } catch { return '' }
}

// ── Book intent detection ─────────────────────────────────────────────────────

const BOOK_GENRE_KEYWORDS: Record<string, string> = {
  // English
  'horror': 'horror', 'thriller': 'thriller', 'mystery': 'mystery',
  'sci-fi': 'science fiction', 'science fiction': 'science fiction',
  'fantasy': 'fantasy', 'romance': 'romance', 'biography': 'biography',
  'self-help': 'self help', 'non-fiction': 'nonfiction', 'fiction': 'fiction',
  'bestseller': 'bestsellers', 'best seller': 'bestsellers',
  'philosophy': 'philosophy', 'psychology': 'psychology',
  'history': 'history', 'business': 'business', 'personal development': 'personal development',
  'young adult': 'young adult', 'children': 'children', 'graphic novel': 'graphic novel',
  'classic': 'classics', 'poetry': 'poetry', 'short stories': 'short stories',
  // Vietnamese
  'kinh dị': 'horror', 'trinh thám': 'mystery', 'lãng mạn': 'romance',
  'khoa học viễn tưởng': 'science fiction', 'viễn tưởng': 'science fiction',
  'tự truyện': 'biography', 'hồi ký': 'memoir', 'kỹ năng': 'self help',
  'bán chạy': 'bestsellers', 'bán chạy nhất': 'bestsellers',
  'triết học': 'philosophy', 'tâm lý': 'psychology', 'lịch sử': 'history',
  'kinh doanh': 'business', 'phát triển bản thân': 'personal development',
  'thiếu nhi': 'children', 'cổ điển': 'classics', 'thơ': 'poetry',
  'tình yêu': 'love romance', 'phiêu lưu': 'adventure', 'hành động': 'action adventure',
  'văn học việt': 'vietnamese literature', 'văn học nước ngoài': 'world literature',
}

const FAMOUS_AUTHORS = [
  // English / International
  'stephen king', 'haruki murakami', 'agatha christie', 'j.k. rowling', 'jk rowling',
  'george orwell', 'ernest hemingway', 'f. scott fitzgerald', 'jane austen',
  'leo tolstoy', 'fyodor dostoevsky', 'gabriel garcia marquez', 'paulo coelho',
  'dan brown', 'james patterson', 'john grisham', 'nicholas sparks',
  'george r.r. martin', 'tolkien', 'j.r.r. tolkien', 'orwell',
  'dostoevsky', 'tolstoy', 'kafka', 'hemingway', 'fitzgerald',
  'mark twain', 'charles dickens', 'virginia woolf', 'oscar wilde',
  'albert camus', 'franz kafka', 'yuval noah harari',
  'malcolm gladwell', 'brene brown', 'james clear', 'dale carnegie',
  'napoleon hill', 'robin sharma', 'eckhart tolle', 'ryan holiday',
  'walter isaacson', 'simon sinek', 'cal newport', 'adam grant',
  'michelle obama', 'elon musk', 'steve jobs',
  // Vietnamese authors
  'nguyễn nhật ánh', 'nguyen nhat anh',
  'tô hoài', 'to hoai',
  'nam cao', 'nguyễn du', 'nguyen du',
  'bảo ninh', 'bao ninh',
  'nguyễn huy thiệp', 'nguyen huy thiep',
  'dương thu hương', 'duong thu huong',
  'nguyễn ngọc tư', 'nguyen ngoc tu',
]

const BOOK_TRIGGER_WORDS = [
  // English
  'book', 'books', 'novel', 'author', 'writer', 'read', 'reading', 'literature',
  'fiction', 'nonfiction', 'bestseller', 'recommend', 'suggest book',
  'what to read', 'good book', 'great book',
  // Manga / anime
  'manga', 'anime', 'manhwa', 'manhua', 'light novel', 'ln', 'webtoon',
  'shounen', 'shoujo', 'seinen', 'isekai', 'one piece', 'naruto', 'bleach',
  'attack on titan', 'demon slayer', 'jujutsu kaisen', 'my hero academia',
  // Vietnamese
  'sách', 'tác giả', 'đọc sách', 'truyện', 'tiểu thuyết', 'văn học',
  'đề xuất sách', 'gợi ý sách', 'top sách', 'bảng xếp hạng sách',
  'cuốn sách', 'quyển sách', 'nên đọc', 'hay nhất', 'đáng đọc',
  'truyện tranh', 'truyện manga', 'đọc truyện',
]

interface BookIntentResult {
  type: 'search' | 'author' | 'genre' | 'quote' | 'book-detail'
  query: string
}

const FAMOUS_BOOKS = [
  // International
  'harry potter', 'lord of the rings', 'the hobbit', 'hunger games',
  '1984', 'brave new world', 'animal farm', 'to kill a mockingbird',
  'the great gatsby', 'pride and prejudice', 'jane eyre',
  'the alchemist', 'twilight', 'the da vinci code',
  'gone with the wind', 'the catcher in the rye',
  'little women', 'wuthering heights', 'frankenstein',
  'the count of monte cristo', 'les miserables',
  'crime and punishment', 'war and peace', 'the trial',
  'one hundred years of solitude', 'love in the time of cholera',
  'atomic habits', 'thinking fast and slow', 'sapiens',
  'the subtle art of not giving a fuck', 'rich dad poor dad',
  'how to win friends and influence people', 'the power of habit',
  'the hitchhiker\'s guide', 'dune', 'ender\'s game',
  'the martian', 'ready player one', 'the fault in our stars',
  // Vietnamese — titles that contain genre words (must be checked before genre detection)
  'dế mèn phiêu lưu ký', 'dế mèn',
  'đất rừng phương nam',
  'mắt biếc', 'tôi thấy hoa vàng trên cỏ xanh',
  'cho tôi xin một vé đi tuổi thơ',
  'số đỏ', 'chí phèo', 'tắt đèn', 'lão hạc', 'vợ nhặt',
  'truyện kiều', 'đoạn trường tân thanh',
  'bình ngô đại cáo', 'nam quốc sơn hà',
  'đắc nhân tâm', 'nhà giả kim', 'hoàng tử bé',
  'tuổi thơ dữ dội', 'kính vạn hoa',
  'conan', 'thám tử lừng danh conan',
  'doraemon', 'dragon ball', 'naruto', 'one piece',
]

function detectBookIntent(message: string): BookIntentResult | null {
  const lower = message.toLowerCase().trim()

  // Non-author words to skip when extracting author from patterns
  const SKIP_WORDS = new Set([
    'hay', 'tốt', 'good', 'best', 'popular', 'new', 'old', 'free', 'cheap',
    'my', 'your', 'tôi', 'mình', 'bạn', 'nào', 'gì', 'đó', 'nổi tiếng',
  ])

  function toTitleCase(s: string) {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  // ── "Title by/của Author" pattern ────────────────────────────────
  // e.g. "kafka của murakami" → search "kafka murakami" as book-detail
  // This must run BEFORE famous-author check to prevent "kafka" → author Kafka
  const byAuthorPattern = /^(.+?)\s+(?:của|bởi|by)\s+(.+?)(?:\s*\?)?$/
  const byMatch = lower.match(byAuthorPattern)
  if (byMatch) {
    const titlePart  = byMatch[1].trim()
    const authorPart = byMatch[2].trim()
    const GENERIC = new Set(['sách', 'cuốn', 'quyển', 'truyện', 'tác giả', 'nhà văn', 'tôi', 'bạn', 'mình'])
    if (!GENERIC.has(titlePart) && titlePart.length > 1) {
      return { type: 'book-detail', query: `${toTitleCase(titlePart)} ${toTitleCase(authorPart)}` }
    }
  }

  // ── Explicit book detail patterns ─────────────────────────────────
  // "thông tin về X" / "giới thiệu X" / "review X" / "X là gì"
  const bookDetailPatterns: RegExp[] = [
    /^(?:thông\s+tin(?:\s+về)?|giới\s+thiệu(?:\s+(?:sách|về))?|nội\s+dung(?:\s+sách)?|tóm\s+tắt(?:\s+sách)?)\s+(.+?)(?:\s*\?)?$/,
    /^(?:review|đánh\s+giá|nhận\s+xét)\s+(?:sách\s+)?(.+?)(?:\s*\?)?$/,
    /^(.+?)\s+(?:là\s+(?:sách\s+)?gì|nội\s+dung\s+(?:là\s+)?gì|có\s+hay\s+không|đáng\s+đọc\s+không)(?:\s*\?)?$/,
    /^(?:tell\s+me\s+about|summary\s+of|review\s+of|about\s+(?:the\s+book)?)\s+(.+?)(?:\s*\?)?$/i,
    /^(?:what\s+is|what\'s)\s+(?:the\s+book\s+)?(.+?)\s+about(?:\s*\?)?$/i,
  ]
  for (const pattern of bookDetailPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const title = match[1].trim().replace(/['"]/g, '').trim()
      if (title.length > 2) return { type: 'book-detail', query: toTitleCase(title) }
    }
  }

  // ── Famous book titles (includes match — runs BEFORE genre keywords) ─
  // This prevents book titles containing genre words (e.g. "phiêu lưu")
  // from being misdetected as genre queries
  for (const book of FAMOUS_BOOKS) {
    if (lower.includes(book)) {
      return { type: 'book-detail', query: toTitleCase(book) }
    }
  }

  // ── Explicit author patterns ──────────────────────────────────────
  // "sách của X" / "tác giả X" / "X viết gì" / "books by X" / "about author X"
  const authorPatterns: RegExp[] = [
    /^(?:top\s+)?sách\s+của\s+(.+?)(?:\s*\?)?$/,
    /^(?:giới thiệu\s+)?(?:về\s+)?tác\s+giả\s+(.+?)(?:\s*\?)?$/,
    /^(.+?)\s+(?:viết|có)\s+(?:sách|cuốn|quyển|những sách)/,
    /^books?\s+by\s+(.+?)(?:\s*\?)?$/i,
    /^(?:tell me about\s+)?(.+?)'s?\s+books?(?:\s*\?)?$/i,
    /^(?:author|writer)\s+(.+?)(?:\s*\?)?$/i,
    /^about\s+author\s+(.+?)(?:\s*\?)?$/i,
  ]

  for (const pattern of authorPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const candidate = match[1].trim().replace(/\?$/, '').trim()
      if (candidate.length > 2 && !SKIP_WORDS.has(candidate)) {
        return { type: 'author', query: toTitleCase(candidate) }
      }
    }
  }

  // ── Famous authors ────────────────────────────────────────────────
  for (const author of FAMOUS_AUTHORS) {
    if (lower.includes(author)) {
      return { type: 'author', query: toTitleCase(author) }
    }
  }

  // ── Genre keywords ────────────────────────────────────────────────
  for (const [keyword, genre] of Object.entries(BOOK_GENRE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return { type: 'genre', query: genre }
    }
  }

  // ── General book trigger ──────────────────────────────────────────
  const hasBookTrigger = BOOK_TRIGGER_WORDS.some(w => lower.includes(w))
  if (hasBookTrigger) {
    let query = message.trim()
    for (const w of ['sách', 'cuốn sách', 'quyển sách', 'book', 'books', 'tìm sách', 'find book', 'top sách', 'top books', 'đề xuất', 'gợi ý', 'recommend']) {
      query = query.replace(new RegExp(w, 'gi'), '').trim()
    }
    query = query.trim() || message.trim()
    return { type: 'search', query }
  }

  return null
}

async function handleBookQuery(type: 'search' | 'author' | 'genre' | 'quote' | 'book-detail', query: string): Promise<Response> {
  try {
    const { searchBooks, searchByQuote, getAuthorInfo, getGenreBooks, getBookDetail, getMangaBooks } = await import('@/lib/data/books')
    const limit = 6

    // ── Book detail: precise single-book lookup ───────────────────────
    if (type === 'book-detail') {
      const book = await getBookDetail(query)
      if (!book) return handleBookQuery('search', query)

      const review = await generateBookReview({
        title:       book.title,
        author:      book.author,
        description: book.description,
        categories:  book.categories,
        year:        book.year,
      })
      // Fetch related books separately so they're actually related
      const related = await searchBooks(`${book.title} ${book.author}`, 4)
        .then(r => r.filter(b => b.id !== book.id).slice(0, 3))
        .catch(() => [])

      return NextResponse.json({
        type: 'multi',
        messages: [
          { type: 'book-detail', book },
          ...(review ? [{ type: 'text', content: review }] : []),
          ...(related.length ? [{ type: 'book-grid', books: related, title: 'Related Books' }] : []),
        ],
      })
    }

    if (type === 'author') {
      const author = await getAuthorInfo(query)
      if (!author) return NextResponse.json({ type: 'text', message: `Could not find author "${query}". Try a different spelling.` })

        const analysis = await generateAuthorAnalysis(author)

      return NextResponse.json({
        type: 'multi',
        messages: [
          // 1. Author profile card (photo + full bio)
          { type: 'author-profile', data: {
            name:      author.name,
            bio:       author.bio ?? `${author.name} is a notable author with ${author.bookCount ?? author.topBooks.length}+ works.`,
            photoUrl:  author.photoUrl,
            bookCount: author.bookCount,
          }},
          // 2. Claude analysis (right after bio)
          ...(analysis ? [{ type: 'text', content: analysis }] : []),
          // 3. Book grid last
          ...(author.topBooks.length ? [{ type: 'book-grid', books: author.topBooks, title: 'Notable Works' }] : []),
        ],
      })
    }

    if (type === 'quote') {
      const books = await searchByQuote(query, limit)
      return NextResponse.json({
        type: 'multi',
        messages: [
          { type: 'text', content: `Here are the closest matches for your quote:` },
          { type: 'book-grid', books, title: 'Search Results' },
        ],
      })
    }

    if (type === 'genre') {
      const isManga = /manga|anime|manhwa|manhua|light.?novel/i.test(query)
      const books = isManga
        ? await getMangaBooks(query, limit)
        : await getGenreBooks(query, limit)
      const label = query.charAt(0).toUpperCase() + query.slice(1)
      return NextResponse.json({
        type: 'multi',
        messages: [
          { type: 'text', content: `Top **${label}** — ${books.length} results:` },
          { type: 'book-grid', books, title: label },
        ],
      })
    }

    // search — sort by popularity
    const books = await searchBooks(query, limit)
    return NextResponse.json({
      type: 'multi',
      messages: [
        { type: 'text', content: `Results for **"${query}"**:` },
        { type: 'book-grid', books },
      ],
    })
  } catch (err) {
    console.error('[handleBookQuery]', err)
    return NextResponse.json({ type: 'text', message: 'Could not fetch book data right now. Please try again.' })
  }
}
