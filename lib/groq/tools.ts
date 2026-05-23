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
          chain:             { type: 'string', enum: ['arc', 'ethereum', 'solana', 'base'], description: 'Default: arc' },
        },
        required: ['amount', 'token'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'swap_tokens',
      description: 'Swap stablecoins on the same chain, e.g. 100 USDC to EURC',
      parameters: {
        type: 'object',
        properties: {
          token_in:  { type: 'string', enum: ['USDC', 'EURC', 'USYC'] },
          token_out: { type: 'string', enum: ['USDC', 'EURC', 'USYC'] },
          amount_in: { type: 'string', description: 'Amount to sell' },
          chain:     { type: 'string', description: 'Default: arc' },
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
          token: { type: 'string', enum: ['USDC', 'EURC', 'USYC', 'all'], description: 'Default: all' },
          chain: { type: 'string', description: 'Default: arc' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_rate',
      description: 'Get exchange rate between two stablecoins',
      parameters: {
        type: 'object',
        properties: {
          token_in:  { type: 'string', enum: ['USDC', 'EURC', 'USYC'] },
          token_out: { type: 'string', enum: ['USDC', 'EURC', 'USYC'] },
          amount:    { type: 'string', description: 'Amount to quote, default: 1' },
        },
        required: ['token_in', 'token_out'],
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
          chain:          { type: 'string', description: 'Default: arc' },
        },
        required: ['action'],
      },
    },
  },
]
