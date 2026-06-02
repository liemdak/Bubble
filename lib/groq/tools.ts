import type Groq from 'groq-sdk'

export const PAYMENT_TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'send_payment',
      description: 'Send USDC, EURC, or USYC to a contact name or wallet address',
      parameters: {
        type: 'object',
        properties: {
          recipient_name:    { type: 'string', description: 'Contact name, e.g. Mike' },
          recipient_address: { type: 'string', description: 'Wallet address starting with 0x' },
          amount:            { type: 'string', description: 'Amount as string, e.g. 50' },
          token:             { type: 'string', enum: ['USDC', 'EURC', 'USYC'] },
          chain:             { type: 'string', enum: ['arc', 'ethereum', 'solana', 'base'] },
        },
        required: ['amount', 'token'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'swap_tokens',
      description: 'Swap stablecoins on the same chain',
      parameters: {
        type: 'object',
        properties: {
          token_in:  { type: 'string', enum: ['USDC', 'EURC', 'USYC'] },
          token_out: { type: 'string', enum: ['USDC', 'EURC', 'USYC'] },
          amount_in: { type: 'string' },
          chain:     { type: 'string' },
        },
        required: ['token_in', 'token_out', 'amount_in'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bridge_tokens',
      description: 'Bridge USDC or EURC across chains via Circle CCTP',
      parameters: {
        type: 'object',
        properties: {
          token:      { type: 'string', enum: ['USDC', 'EURC'] },
          amount:     { type: 'string' },
          from_chain: { type: 'string', enum: ['arc', 'ethereum', 'solana', 'base'] },
          to_chain:   { type: 'string', enum: ['arc', 'ethereum', 'solana', 'base'] },
        },
        required: ['token', 'amount', 'from_chain', 'to_chain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_balance',
      description: 'Check wallet token balance',
      parameters: {
        type: 'object',
        properties: {
          token: { type: 'string', enum: ['USDC', 'EURC', 'USYC', 'all'] },
          chain: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_rate',
      description:
        'Get live price or exchange rate for any crypto token. ' +
        'Use for: "BTC price?", "ETH giá bao nhiêu?", "USDC/EURC rate?", "SOL hôm nay thế nào?". ' +
        'token_in is the token to price; token_out is the quote currency (default USD). ' +
        'For exchange rates between two tokens, set both token_in and token_out. ' +
        'For a single token price in USD, set token_in to the token and token_out to "USD".',
      parameters: {
        type: 'object',
        properties: {
          token_in:  {
            type: 'string',
            description: 'Token symbol or CoinGecko coin ID, e.g. BTC, ETH, SOL, USDC, EURC',
          },
          token_out: {
            type: 'string',
            description: 'Quote token or "USD" for USD price. e.g. EURC, USD, BTC',
          },
          amount: {
            type: 'string',
            description: 'Amount to convert, default 1',
          },
        },
        required: ['token_in'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_contact',
      description: 'Add a contact, look up an address, or list contacts',
      parameters: {
        type: 'object',
        properties: {
          action:         { type: 'string', enum: ['add', 'lookup', 'list'] },
          name:           { type: 'string' },
          wallet_address: { type: 'string' },
          chain:          { type: 'string' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_book',
      description:
        'Find books, author info, genre rankings, or search by quote/excerpt. ' +
        'Use for: "Stephen King books", "horror bestsellers", "who is Haruki Murakami", ' +
        '"find book with this quote: ...", "top sci-fi books", "books about AI".',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['search', 'author', 'genre', 'quote'],
            description: 'search=by title/keyword, author=author info+works, genre=genre ranking, quote=find book by excerpt',
          },
          query: {
            type: 'string',
            description: 'Search term, author name, genre, or quote text',
          },
          limit: {
            type: 'number',
            description: 'Number of results, default 5',
          },
        },
        required: ['type', 'query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_arc_docs',
      description: 'Search Arc blockchain documentation for technical info: contract addresses, APIs, gas, CCTP, Arc network specs, Circle SDK usage, testnet details',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to look up in Arc docs' },
        },
        required: ['query'],
      },
    },
  },
]
