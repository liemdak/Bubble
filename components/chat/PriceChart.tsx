'use client'

import {
  AreaChart, Area, Tooltip, ResponsiveContainer,
} from 'recharts'

export interface ChartPoint { t: number; p: number }

export interface PriceChartProps {
  symbol:       string
  currentPrice: number
  change24h:    number
  chartData:    ChartPoint[]
  period:       string
  high:         number
  low:          number
  marketCap?:   number
  volume24h?:   number
}

function fmt$(n: number): string {
  if (n >= 1_000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1)     return `$${n.toFixed(2)}`
  return `$${n.toFixed(6)}`
}

function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function fmtDate(ts: number, period: string): string {
  if (period === '1d') {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PriceChart({
  symbol, currentPrice, change24h, chartData, period, high, low, marketCap, volume24h,
}: PriceChartProps) {
  const isUp  = change24h >= 0
  const color = isUp ? '#a3e635' : '#f87171'
  const gradId = `cg-${symbol}-${period}`

  return (
    <div style={{
      background:   '#0d0d0d',
      border:       '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding:      '14px 16px 12px',
      width:        'min(calc(100vw - 56px), 480px)',
      boxShadow:    'rgb(10,10,13) 2px 2px 0px 0px',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, marginBottom: 3 }}>
            {symbol.toUpperCase()}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            {fmt$(currentPrice)}
          </div>
        </div>
        <div style={{
          fontSize:   12,
          fontWeight: 600,
          color:      color,
          background: isUp ? 'rgba(163,230,53,0.12)' : 'rgba(248,113,113,0.12)',
          border:     `1px solid ${isUp ? 'rgba(163,230,53,0.2)' : 'rgba(248,113,113,0.2)'}`,
          padding:    '4px 10px',
          borderRadius: 100,
          marginTop:  2,
        }}>
          {isUp ? '+' : ''}{change24h.toFixed(2)}%
        </div>
      </div>

      {/* ── Sparkline chart ── */}
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>

          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as ChartPoint
              return (
                <div style={{
                  background:   '#1c1c1c',
                  border:       '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding:      '5px 9px',
                  fontSize:     11,
                }}>
                  <div style={{ color: '#fff', fontWeight: 700 }}>{fmt$(d.p)}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{fmtDate(d.t, period)}</div>
                </div>
              )
            }}
          />

          <Area
            type="monotone"
            dataKey="p"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* ── Market cap + Volume row ── */}
      {(marketCap || volume24h) && (
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          marginTop:      10,
          padding:        '8px 0',
          borderTop:      '1px solid rgba(255,255,255,0.06)',
          borderBottom:   '1px solid rgba(255,255,255,0.06)',
        }}>
          {marketCap ? (
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.8, marginBottom: 2 }}>MARKET CAP</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{fmtBig(marketCap)}</div>
            </div>
          ) : <div />}
          {volume24h ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.8, marginBottom: 2 }}>VOL 24H</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{fmtBig(volume24h)}</div>
            </div>
          ) : <div />}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        marginTop:      8,
        fontSize:       10,
        color:          'rgba(255,255,255,0.28)',
      }}>
        <span>L {fmt$(low)}</span>
        <span style={{ color: 'rgba(255,255,255,0.18)' }}>{period} · CoinGecko</span>
        <span>H {fmt$(high)}</span>
      </div>
    </div>
  )
}
