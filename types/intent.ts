export type TokenSymbol = 'USDC' | 'EURC' | 'USYC'
export type ChainName = 'arc' | 'ethereum' | 'solana' | 'base'

export interface SendIntent {
  type: 'send_payment'
  recipient_name?: string
  recipient_address?: string
  amount: string
  token: TokenSymbol
  chain: ChainName
  user_address?: string   // sender's MetaMask address — set server-side for client execution
}

export interface SwapIntent {
  type: 'swap_tokens'
  token_in: TokenSymbol
  token_out: TokenSymbol
  amount_in: string
  chain: ChainName
}

export interface BridgeIntent {
  type: 'bridge_tokens'
  token: 'USDC' | 'EURC'
  amount: string
  from_chain: ChainName
  to_chain: ChainName
}

export interface BalanceIntent {
  type: 'get_balance'
  token: TokenSymbol | 'all'
  chain: ChainName
}

export interface RateIntent {
  type: 'get_rate'
  token_in: TokenSymbol
  token_out: TokenSymbol
  amount: string
}

export interface ContactIntent {
  type: 'manage_contact'
  action: 'add' | 'lookup' | 'list'
  name?: string
  wallet_address?: string
  chain: ChainName
}

export interface FundAgentIntent {
  type: 'fund_agent'
  amount: string
  token: TokenSymbol
  agent_address: string   // Circle wallet (destination)
  user_address:  string   // MetaMask wallet (source)
}

export interface RefundAgentIntent {
  type: 'refund_agent'
  amount: string
  token: TokenSymbol
}

export type PaymentIntent =
  | SendIntent
  | SwapIntent
  | BridgeIntent
  | BalanceIntent
  | RateIntent
  | ContactIntent
  | FundAgentIntent
  | RefundAgentIntent

export interface ConfirmationCard {
  intent: PaymentIntent
  resolved_address?: string
  gas_fee: string
  total_display: string
}
