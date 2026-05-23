import type { Tool } from '@google/generative-ai'
import { SchemaType } from '@google/generative-ai'

export const PAYMENT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'send_payment',
        description: 'Send USDC, EURC, or USYC stablecoins to a contact name or wallet address',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            recipient_name:    { type: SchemaType.STRING, description: 'Contact name, e.g. Mike' },
            recipient_address: { type: SchemaType.STRING, description: 'Wallet address starting with 0x' },
            amount:            { type: SchemaType.STRING, description: 'Numeric amount as string, e.g. 50' },
            token:             { type: SchemaType.STRING, description: 'One of: USDC, EURC, USYC' },
            chain:             { type: SchemaType.STRING, description: 'One of: arc, ethereum, solana, base. Default: arc' },
          },
          required: ['amount', 'token'],
        },
      },
      {
        name: 'swap_tokens',
        description: 'Swap stablecoins on the same chain, e.g. 100 USDC to EURC',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            token_in:  { type: SchemaType.STRING, description: 'Token to sell: USDC, EURC, or USYC' },
            token_out: { type: SchemaType.STRING, description: 'Token to buy: USDC, EURC, or USYC' },
            amount_in: { type: SchemaType.STRING, description: 'Amount to sell as string' },
            chain:     { type: SchemaType.STRING, description: 'Chain to swap on. Default: arc' },
          },
          required: ['token_in', 'token_out', 'amount_in'],
        },
      },
      {
        name: 'bridge_tokens',
        description: 'Bridge stablecoins across chains via Circle CCTP',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            token:      { type: SchemaType.STRING, description: 'USDC or EURC' },
            amount:     { type: SchemaType.STRING, description: 'Amount to bridge' },
            from_chain: { type: SchemaType.STRING, description: 'Source chain: arc, ethereum, solana, base' },
            to_chain:   { type: SchemaType.STRING, description: 'Destination chain: arc, ethereum, solana, base' },
          },
          required: ['token', 'amount', 'from_chain', 'to_chain'],
        },
      },
      {
        name: 'get_balance',
        description: 'Check wallet balance for USDC, EURC, USYC, or all tokens',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            token: { type: SchemaType.STRING, description: 'USDC, EURC, USYC, or all. Default: all' },
            chain: { type: SchemaType.STRING, description: 'Chain to check. Default: arc' },
          },
        },
      },
      {
        name: 'get_rate',
        description: 'Get current exchange rate between two stablecoins',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            token_in:  { type: SchemaType.STRING, description: 'Token to sell: USDC, EURC, USYC' },
            token_out: { type: SchemaType.STRING, description: 'Token to buy: USDC, EURC, USYC' },
            amount:    { type: SchemaType.STRING, description: 'Amount to quote. Default: 1' },
          },
          required: ['token_in', 'token_out'],
        },
      },
      {
        name: 'manage_contact',
        description: 'Add a new contact, look up an address by name, or list all contacts',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            action:         { type: SchemaType.STRING, description: 'add, lookup, or list' },
            name:           { type: SchemaType.STRING, description: 'Contact display name' },
            wallet_address: { type: SchemaType.STRING, description: '0x wallet address' },
            chain:          { type: SchemaType.STRING, description: 'Chain for the contact. Default: arc' },
          },
          required: ['action'],
        },
      },
    ],
  },
]
