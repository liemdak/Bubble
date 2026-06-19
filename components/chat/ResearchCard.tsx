'use client'

import { useState } from 'react'
import type { CoinDetail } from '@/lib/market/coingecko'

interface Props {
  data: CoinDetail
}

const TAB_LABELS = ['Market', 'Technical', 'Social', 'About'] as const
type Tab = typeof TAB_LABELS[number]

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1)    return '$' + n.toFixed(2)
  if (n >= 0.01) return '$' + n.toFixed(4)
  return '$' + n.toFixed(8)
}

function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtSupply(n: number | null, sym: string): string {
  if (n === null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B ${sym}`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M ${sym}`
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${sym}`
}

function fmtCount(n: number | null): string {
  if (n === null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Change({ v }: { v: number }) {
  const color = v > 0 ? '#4ade80' : v < 0 ? '#f87171' : 'rgba(255,255,255,0.4)'
  return (
    <span style={{ color, fontWeight: 600 }}>
      {v > 0 ? '+' : ''}{v.toFixed(2)}%
    </span>
  )
}

// ── Sparkline (pure SVG) ─────────────────────────────────────────────────────

function Sparkline({ points, high, low }: { points: { t: number; p: number }[]; high: number; low: number }) {
  if (points.length < 2) return null
  const W = 420
  const H = 80
  const pad = 4
  const range = high - low || 1
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2))
  const ys = points.map(p => pad + (1 - (p.p - low) / range) * (H - pad * 2))
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const fill = `${d} L${(W - pad).toFixed(1)},${H} L${pad},${H} Z`
  const up = points[points.length - 1].p >= points[0].p
  const stroke = up ? '#4ade80' : '#f87171'
  const fillColor = up ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 80, display: 'block' }}
      preserveAspectRatio="none"
    >
      <path d={fill} fill={fillColor} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── RSI gauge ────────────────────────────────────────────────────────────────

function RsiGauge({ value }: { value: number }) {
  const pct  = value / 100
  const color = value >= 70 ? '#f87171' : value <= 30 ? '#4ade80' : '#facc15'
  const label = value >= 70 ? 'Overbought' : value <= 30 ? 'Oversold' : 'Neutral'
  const barW  = 260
  const fillW = pct * barW

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          RSI (14)
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {value} · {label}
        </span>
      </div>
      {/* Track */}
      <div style={{
        position: 'relative', height: 6, borderRadius: 4,
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        {/* Zone markers */}
        <div style={{
          position: 'absolute', left: '30%', top: 0, bottom: 0, width: '40%',
          background: 'rgba(250,204,21,0.06)',
        }} />
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${fillW / barW * 100}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
        <span>0 · Oversold</span>
        <span>50</span>
        <span>100 · Overbought</span>
      </div>
    </div>
  )
}

// ── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', flexShrink: 0, marginRight: 12 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.88)',
        textAlign: 'right',
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 8, padding: 3,
    }}>
      {TAB_LABELS.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            flex: 1, padding: '5px 0',
            borderRadius: 6, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            transition: 'all 0.14s',
            background: active === t ? 'rgba(163,230,53,0.14)' : 'transparent',
            color:      active === t ? '#a3e635'              : 'rgba(255,255,255,0.38)',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ResearchCard({ data }: Props) {
  const [tab, setTab] = useState<Tab>('Market')

  const athPct = data.price > 0 && data.ath > 0
    ? ((data.price - data.ath) / data.ath * 100).toFixed(1)
    : null

  return (
    <div style={{
      background: 'rgba(10,10,20,0.80)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 16,
      overflow: 'hidden',
      width: 'min(calc(100vw - 32px), 480px)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      fontFamily: 'inherit',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Symbol + rank */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              {data.symbol}
            </span>
            <span style={{
              marginLeft: 8, fontSize: 12, color: 'rgba(255,255,255,0.38)',
              fontWeight: 400,
            }}>
              {data.name}
            </span>
          </div>
          {data.rank > 0 && (
            <span style={{
              background: 'rgba(163,230,53,0.10)',
              color: '#a3e635', border: '1px solid rgba(163,230,53,0.20)',
              borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 600,
            }}>
              #{data.rank}
            </span>
          )}
        </div>

        {/* Price + changes */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>
            {fmtPrice(data.price)}
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
              1h <Change v={data.change1h} />
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
              24h <Change v={data.change24h} />
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
              7d <Change v={data.change7d} />
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
              30d <Change v={data.change30d} />
            </span>
          </div>
        </div>
      </div>

      {/* ── Sparkline ── */}
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0 2px' }}>
        <Sparkline points={data.chartPoints} high={data.chartHigh} low={data.chartLow} />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '2px 6px 6px',
          fontSize: 10, color: 'rgba(255,255,255,0.22)',
        }}>
          <span>14d low: {fmtPrice(data.chartLow)}</span>
          <span style={{ color: 'rgba(255,255,255,0.16)' }}>CoinGecko</span>
          <span>14d high: {fmtPrice(data.chartHigh)}</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ padding: '12px 14px 0' }}>
        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: '4px 18px 18px', minHeight: 200 }}>

        {tab === 'Market' && (
          <div>
            <Row label="Market Cap"      value={fmtBig(data.marketCap)} />
            <Row label="24h Volume"      value={fmtBig(data.volume24h)} />
            <Row label="Vol / Mcap"      value={data.marketCap > 0 ? `${(data.volume24h / data.marketCap * 100).toFixed(2)}%` : '—'} />
            <Row label="Circulating"     value={fmtSupply(data.circulatingSupply, data.symbol)} mono />
            <Row label="Total Supply"    value={fmtSupply(data.totalSupply, data.symbol)} mono />
            <Row label="Max Supply"      value={fmtSupply(data.maxSupply, data.symbol)} mono />
            <Row
              label="ATH"
              value={
                <span>
                  {fmtPrice(data.ath)}
                  {athPct && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#f87171' }}>
                      {athPct}%
                    </span>
                  )}
                </span>
              }
            />
            <Row label="ATH Date"        value={fmtDate(data.athDate)} />
            <Row label="ATL"             value={fmtPrice(data.atl)} />
            <Row label="ATL Date"        value={fmtDate(data.atlDate)} />
            <Row label="30d Change"      value={<Change v={data.change30d} />} />
          </div>
        )}

        {tab === 'Technical' && (
          <div style={{ paddingTop: 14 }}>
            {data.rsi14 !== null ? (
              <RsiGauge value={data.rsi14} />
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
                Not enough historical data to compute RSI.
              </p>
            )}

            <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Price changes
              </div>
              <Row label="1h"   value={<Change v={data.change1h} />} />
              <Row label="24h"  value={<Change v={data.change24h} />} />
              <Row label="7d"   value={<Change v={data.change7d} />} />
              <Row label="30d"  value={<Change v={data.change30d} />} />
            </div>

            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                14-day range
              </div>
              <Row label="High" value={fmtPrice(data.chartHigh)} />
              <Row label="Low"  value={fmtPrice(data.chartLow)} />
              <Row label="Range" value={`${(((data.chartHigh - data.chartLow) / data.chartLow) * 100).toFixed(1)}%`} />
            </div>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', marginTop: 14, lineHeight: 1.6 }}>
              MACD and Bollinger Bands coming soon.
            </p>
          </div>
        )}

        {tab === 'Social' && (
          <div style={{ paddingTop: 6 }}>
            <Row
              label="Twitter / X"
              value={
                data.twitterFollowers !== null
                  ? `${fmtCount(data.twitterFollowers)} followers`
                  : '—'
              }
            />
            <Row
              label="Reddit"
              value={
                data.redditSubscribers !== null
                  ? `${fmtCount(data.redditSubscribers)} subscribers`
                  : '—'
              }
            />
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Community activity
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 1.7, margin: 0 }}>
                Whale alerts, large transfers, and on-chain social signals coming soon via Surf API.
              </p>
            </div>
          </div>
        )}

        {tab === 'About' && (
          <div style={{ paddingTop: 10 }}>
            {data.description ? (
              <p style={{
                fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75,
                margin: '0 0 14px',
              }}>
                {data.description}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>No description available.</p>
            )}
            {data.homepage && (
              <a
                href={data.homepage}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  fontSize: 12, color: '#a3e635',
                  textDecoration: 'none',
                  border: '1px solid rgba(163,230,53,0.25)',
                  borderRadius: 100,
                  padding: '4px 12px',
                  transition: 'background 0.12s',
                }}
              >
                Official website ↗
              </a>
            )}
            <div style={{ marginTop: 14 }}>
              <Row label="CoinGecko ID" value={data.id} mono />
            </div>
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '8px 18px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>
          Live via CoinGecko · Arc Testnet
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.14)' }}>
          /research {data.symbol}
        </span>
      </div>
    </div>
  )
}
