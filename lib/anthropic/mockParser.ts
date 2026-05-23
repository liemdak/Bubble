import type { ConfirmationCard, PaymentIntent, TokenSymbol, ChainName } from '@/types/intent'

// Demo contacts — will be replaced by Supabase in Step 8
const DEMO_CONTACTS: Record<string, string> = {
  mike:   '0x1234567890123456789012345678901234567890',
  sarah:  '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
  alice:  '0xDeadBeef1234567890DeadBeef1234567890Dead',
}

const TOKENS: TokenSymbol[] = ['USDC', 'EURC', 'USYC']
const CHAINS: ChainName[] = ['arc', 'ethereum', 'solana', 'base']

function matchToken(s: string): TokenSymbol {
  const up = s.toUpperCase()
  if (up.includes('EURC')) return 'EURC'
  if (up.includes('USYC')) return 'USYC'
  return 'USDC'
}

function matchChain(s: string): ChainName {
  const low = s.toLowerCase()
  if (low.includes('eth')) return 'ethereum'
  if (low.includes('sol')) return 'solana'
  if (low.includes('base')) return 'base'
  return 'arc'
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export type ParseResult =
  | { type: 'confirm'; card: ConfirmationCard }
  | { type: 'text'; message: string }

export function parseIntent(message: string): ParseResult {
  const msg = message.toLowerCase().trim()

  // ── GREETING ──────────────────────────────────────────────────────
  if (/^(hi|hello|hey|chào|xin chào|alo|howdy|sup|yo|hola|bonjour)\b/i.test(msg)) {
    return {
      type: 'text',
      message: `Hey! 👋 I'm Bubble — your payment assistant.\n\nTry: "send 50 USDC to Mike", "check my balance", or "swap 100 USDC to EURC".`,
    }
  }

  // ── SEND ──────────────────────────────────────────────────────────
  // "send 100 usdc to mike", "send 50 to sarah", "send usdc 20 alice"
  const sendRe = /send\s+([\d.]+)?\s*(usdc|eurc|usyc)?\s*(?:to\s+)?(\w+)?(?:\s+([\d.]+))?\s*(usdc|eurc|usyc)?/i
  const sendM = msg.match(sendRe)
  if (msg.startsWith('send') && sendM) {
    const amount = sendM[1] ?? sendM[4] ?? '10'
    const token = matchToken((sendM[2] ?? sendM[5] ?? 'usdc'))
    const recipientRaw = sendM[3]

    if (!recipientRaw) {
      return { type: 'text', message: 'Who do you want to send to? Example: "send 50 USDC to Mike"' }
    }

    // Check if it's a 0x address
    const isAddress = /^0x[0-9a-f]{40}/i.test(recipientRaw)
    const contactAddr = DEMO_CONTACTS[recipientRaw.toLowerCase()]
    const resolvedAddress = isAddress ? recipientRaw : contactAddr

    if (!resolvedAddress && !isAddress) {
      return {
        type: 'text',
        message: `I don't have "${recipientRaw}" in your contacts. Try adding them first: "add ${recipientRaw} 0x..."`,
      }
    }

    const intent: PaymentIntent = {
      type: 'send_payment',
      recipient_name: isAddress ? undefined : recipientRaw,
      recipient_address: resolvedAddress,
      amount,
      token,
      chain: 'arc',
    }

    const card: ConfirmationCard = {
      intent,
      resolved_address: shortAddr(resolvedAddress!),
      gas_fee: '$0.006',
      total_display: `≈ ${(parseFloat(amount) + 0.006).toFixed(3)} ${token}`,
    }

    return { type: 'confirm', card }
  }

  // ── SWAP ──────────────────────────────────────────────────────────
  // "swap 50 usdc to eurc", "swap usdc eurc 100"
  const swapRe = /swap\s+([\d.]+)?\s*(usdc|eurc|usyc)\s*(?:to|for)?\s*(usdc|eurc|usyc)(?:\s+([\d.]+))?/i
  const swapM = msg.match(swapRe)
  if (msg.startsWith('swap') && swapM) {
    const amount = swapM[1] ?? swapM[4] ?? '50'
    const tokenIn = matchToken(swapM[2])
    const tokenOut = matchToken(swapM[3])

    if (tokenIn === tokenOut) {
      return { type: 'text', message: `You're swapping ${tokenIn} for ${tokenOut} — they're the same token! Pick a different one.` }
    }

    const intent: PaymentIntent = {
      type: 'swap_tokens',
      token_in: tokenIn,
      token_out: tokenOut,
      amount_in: amount,
      chain: 'arc',
    }

    const rate = tokenIn === 'USDC' && tokenOut === 'EURC' ? 0.92 : 1.08
    const amountOut = (parseFloat(amount) * rate).toFixed(2)

    const card: ConfirmationCard = {
      intent,
      gas_fee: '$0.006',
      total_display: `≈ ${amountOut} ${tokenOut}`,
    }

    return { type: 'confirm', card }
  }

  // ── BRIDGE ────────────────────────────────────────────────────────
  // "bridge 100 usdc to ethereum", "bridge usdc 50 base"
  const bridgeRe = /bridge\s+([\d.]+)?\s*(usdc|eurc)?\s*(?:to\s+)?(\w+)/i
  const bridgeM = msg.match(bridgeRe)
  if (msg.startsWith('bridge') && bridgeM) {
    const amount = bridgeM[1] ?? '50'
    const token = matchToken(bridgeM[2] ?? 'usdc') as 'USDC' | 'EURC'
    const toChain = matchChain(bridgeM[3] ?? 'ethereum')

    const intent: PaymentIntent = {
      type: 'bridge_tokens',
      token,
      amount,
      from_chain: 'arc',
      to_chain: toChain,
    }

    const card: ConfirmationCard = {
      intent,
      gas_fee: '$0.006',
      total_display: `${amount} ${token} → ${toChain.toUpperCase()} (~20s)`,
    }

    return { type: 'confirm', card }
  }

  // ── BALANCE ───────────────────────────────────────────────────────
  if (/balance|how much|wallet|funds/.test(msg)) {
    return {
      type: 'text',
      message: '💰 Your balances on Arc Testnet:\n• USDC: 420.50\n• EURC: 85.20\n• USYC: 0.00\n\n(Connect your real wallet to see live balances)',
    }
  }

  // ── RATE ──────────────────────────────────────────────────────────
  if (/rate|price|how much is|convert/.test(msg)) {
    return {
      type: 'text',
      message: '📈 Current rates on Arc:\n• 1 USDC = 0.92 EURC\n• 1 EURC = 1.087 USDC\n• USYC = $1.052 (yield-bearing)\n\nRates update every block (~0.5s)',
    }
  }

  // ── ADD CONTACT ───────────────────────────────────────────────────
  // "add mike 0x1234..."
  const addRe = /add\s+(\w+)\s+(0x[0-9a-fA-F]{40})/i
  const addM = msg.match(addRe)
  if ((msg.startsWith('add') || msg.startsWith('save')) && addM) {
    return {
      type: 'text',
      message: `✓ Added **${addM[1]}** (${shortAddr(addM[2])}) to your contacts. Now you can say "send 50 USDC to ${addM[1]}"`,
    }
  }

  // ── HISTORY ───────────────────────────────────────────────────────
  if (/history|transactions|recent|sent|received/.test(msg)) {
    return {
      type: 'text',
      message: '📋 Recent transactions:\n• Sent 50 USDC to Sarah · 2 min ago ✓\n• Received 100 USDC from Mike · 1h ago ✓\n• Swapped 20 USDC → EURC · 3h ago ✓\n\n[View all in History tab]',
    }
  }

  // ── HELP ──────────────────────────────────────────────────────────
  if (/help|what can|how|guide/.test(msg)) {
    return {
      type: 'text',
      message: `Here's what I can do:\n\n📤 **Send**: "send 50 USDC to Mike"\n🔄 **Swap**: "swap 100 USDC to EURC"\n🌉 **Bridge**: "bridge 50 USDC to Ethereum"\n💰 **Balance**: "check my balance"\n📈 **Rates**: "USDC to EURC rate"\n👥 **Contacts**: "add Sarah 0x1234..."\n\nAll on Arc Testnet — gas fees ~$0.006, sponsored!`,
    }
  }

  // ── DEFAULT ───────────────────────────────────────────────────────
  return {
    type: 'text',
    message: `I'm not sure what you mean by "${message}". Try:\n• "send 50 USDC to Mike"\n• "check my balance"\n• "swap 100 USDC to EURC"\n\nOr type "help" to see all commands.`,
  }
}
