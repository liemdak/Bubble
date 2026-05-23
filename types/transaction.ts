export type TxAction = 'send' | 'swap' | 'bridge' | 'deposit'
export type TxStatus = 'pending' | 'complete' | 'failed'

export interface Transaction {
  id: string
  user_id: string
  action: TxAction
  from_address?: string
  to_address?: string
  to_name?: string
  amount_in?: string
  token_in?: string
  amount_out?: string
  token_out?: string
  from_chain?: string
  to_chain?: string
  tx_hash?: string
  status: TxStatus
  arc_scan_url?: string
  created_at: string
}
