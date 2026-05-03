'use client'
import Link from 'next/link'

const C = {
  bg: '#0D1117', surface: '#161B22', surface2: '#1C2128', surface3: '#21262D',
  border: '#21262D', border2: '#30363D',
  text: '#E6EDF3', textSec: '#8B949E', textMut: '#484F58',
  green: '#3FB950', blue: '#388BFD', yellow: '#D29922',
  red: '#F85149', purple: '#A371F7', orange: '#F0883E',
}

// ── Shared nav bar (used in every mockup) ─────────────────────────────────
function MockNav({ active }: { active: string }) {
  const links = ['Intelligence', 'Magnus', 'DEX Markets', 'Funding Rates', 'Dashboard']
  return (
    <div style={{ height: 42, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0 }}>
      <span style={{ color: C.blue, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>⚡</span>
      <span style={{ color: C.text, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>Arbitrage Terminal</span>
      <span style={{ color: C.textMut, fontSize: 11 }}>|</span>
      <span style={{ color: C.textSec, fontFamily: 'monospace', fontSize: 10 }}>v0.7.4</span>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
      <span style={{ color: C.green, fontSize: 10, fontFamily: 'monospace' }}>LIVE</span>
      <span style={{ color: C.textMut, fontFamily: 'monospace', fontSize: 10 }}>16:30:45</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        {links.map(l => (
          <span key={l} style={{
            fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
            color: l === active ? C.text : C.textSec,
            fontWeight: l === active ? 600 : 400,
            borderBottom: l === active ? `1px solid ${C.green}` : 'none',
            paddingBottom: 1,
          }}>{l}</span>
        ))}
      </div>
      <span style={{ color: C.textMut, fontSize: 10, marginLeft: 8 }}>⚙</span>
      <div style={{ height: 18, padding: '0 8px', background: `${C.blue}20`, border: `1px solid ${C.blue}40`, borderRadius: 3, fontSize: 9, color: C.blue, display: 'flex', alignItems: 'center', fontFamily: 'monospace' }}>
        Sign In
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ value, label, sub, color }: { value: string; label: string; sub: string; color: string }) {
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 10px', borderLeft: `2px solid ${color}` }}>
      <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 3 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color, lineHeight: 1, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textSec }}>{sub}</div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ label, trailing }: { label: string; trailing?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <div style={{ width: 2, height: 10, background: C.blue, borderRadius: 1 }} />
      <span style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>{label.toUpperCase()}</span>
      {trailing && <span style={{ marginLeft: 'auto', fontSize: 9, color: C.textSec }}>{trailing}</span>}
    </div>
  )
}

// ── Confidence badge ───────────────────────────────────────────────────────
function Badge({ tone, children }: { tone: 'high' | 'med' | 'low'; children: string }) {
  const map = { high: [C.green, `${C.green}20`], med: [C.yellow, `${C.yellow}20`], low: [C.textMut, `${C.textMut}20`] }
  const [color, bg] = map[tone]
  return <span style={{ fontSize: 8, fontFamily: 'monospace', color, background: bg, padding: '1px 4px', borderRadius: 2 }}>{children}</span>
}

// ── Table row ─────────────────────────────────────────────────────────────
function GapRow({ symbol, type, spread, route, profit, dur, score, typeColor }: {
  symbol: string; type: string; spread: string; route: string; profit: string; dur: string; score: 'high'|'med'|'low'; typeColor: string
}) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: C.text }}>{symbol}</td>
      <td style={{ padding: '4px 8px' }}><span style={{ fontSize: 8, color: typeColor, background: `${typeColor}20`, padding: '1px 4px', borderRadius: 2, fontFamily: 'monospace' }}>{type}</span></td>
      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: C.green }}>{spread}</td>
      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10, color: C.textSec }}>{route}</td>
      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: C.green }}>{profit}</td>
      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10, color: C.textSec }}>{dur}</td>
      <td style={{ padding: '4px 8px' }}><Badge tone={score}>{score.toUpperCase()}</Badge></td>
    </tr>
  )
}

// ── PAGE MOCKUP: MAGNUS ────────────────────────────────────────────────────
function MagnusMockup() {
  const bots = [
    { id: 'VEGA', type: 'Simulator', win: '—', trades: '—', pnl: '—', status: 'sim', color: C.blue },
    { id: 'NEXUS', type: 'Alpha', win: '98.7%', trades: '2,534', pnl: '+$16.0K', status: 'live', color: C.green },
    { id: 'HERMES', type: 'Futures', win: '94.2%', trades: '1,201', pnl: '+$7.8K', status: 'live', color: C.purple },
    { id: 'KRONOS', type: 'Calendar', win: '87.1%', trades: '438', pnl: '+$3.2K', status: 'live', color: C.yellow },
    { id: 'ATLAS', type: 'Pairs', win: '91.3%', trades: '889', pnl: '+$5.1K', status: 'live', color: C.blue },
  ]

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.green}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.green}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.green }}>MAGNUS</span>
        <span style={{ fontSize: 9, color: C.textSec }}>— 2-pane layout · left sidebar (bot list) + center (performance)</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: C.green, background: `${C.green}20`, padding: '1px 6px', borderRadius: 2, fontFamily: 'monospace' }}>NEW DESIGN</span>
      </div>
      <MockNav active="Magnus" />
      <div style={{ display: 'flex', height: 340 }}>
        {/* Left sidebar — bot list */}
        <div style={{ width: 160, background: C.surface, borderRight: `1px solid ${C.border}`, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeader label="Fleet" trailing="5 bots" />
          {bots.map(b => (
            <div key={b.id} style={{ padding: '6px 8px', background: b.id === 'NEXUS' ? `${C.green}10` : C.surface2, border: `1px solid ${b.id === 'NEXUS' ? C.green : C.border}`, borderRadius: 4, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: b.color }}>{b.id}</span>
                <span style={{ fontSize: 8, color: b.status === 'live' ? C.green : C.textMut }}>{b.status === 'live' ? '● LIVE' : '○ SIM'}</span>
              </div>
              <div style={{ fontSize: 8, color: C.textSec }}>{b.type}</div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: b.pnl.startsWith('+') ? C.green : C.textSec, marginTop: 2 }}>{b.pnl}</div>
            </div>
          ))}
        </div>

        {/* Center — performance */}
        <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            <StatCard value="98.7%" label="Win Rate" sub="last 90 days" color={C.green} />
            <StatCard value="2,534" label="Total Trades" sub="all strategies" color={C.blue} />
            <StatCard value="$16.0K" label="Total P&L" sub="paper capital" color={C.green} />
            <StatCard value="0.63%" label="Avg Trade" sub="return per trade" color={C.yellow} />
          </div>

          {/* Active strategy detail */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: C.green }}>NEXUS</span>
              <span style={{ fontSize: 9, color: C.green, background: `${C.green}15`, padding: '2px 6px', borderRadius: 2, fontFamily: 'monospace' }}>ALPHA · LIVE</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: C.textSec }}>Multi-exchange arbitrage · CEX/DEX</span>
            </div>
            {/* Mini chart placeholder */}
            <div style={{ height: 60, background: C.bg, borderRadius: 4, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <svg width="100%" height="50" viewBox="0 0 400 50">
                <polyline points="0,40 40,35 80,30 120,25 160,28 200,20 240,15 280,18 320,10 360,8 400,5" fill="none" stroke={C.green} strokeWidth="1.5" />
                <polyline points="0,40 40,35 80,30 120,25 160,28 200,20 240,15 280,18 320,10 360,8 400,5" fill={`${C.green}10`} />
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[['Win streak', '14'], ['Max drawdown', '2.1%'], ['Sharpe ratio', '4.7']].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: C.text }}>{v}</div>
                  <div style={{ fontSize: 9, color: C.textSec }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent trades table */}
          <SectionHeader label="Recent Trades" trailing="last 10" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Time', 'Symbol', 'Route', 'P&L', 'Duration', 'Score'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 0.5, fontWeight: 600 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['16:28', 'INJ/USDT', 'hyperliquid → bitfinex', '+$2.39', '24s', C.green],
                ['16:25', 'DOT/USDT', 'bingx → okx', '+$1.87', '18s', C.green],
                ['16:21', 'SOL/USDC', 'coinbase → mexc', '+$3.12', '31s', C.green],
                ['16:17', 'WIF/USDT', 'bingx → okx', '-$0.45', '42s', C.red],
                ['16:14', 'ETH/USDC', 'uniswap → binance', '+$5.66', '12s', C.green],
              ].map(([t, s, r, pnl, dur, c], i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 9, color: C.textSec }}>{t as string}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10, color: C.text }}>{s as string}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 9, color: C.textSec }}>{r as string}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10, color: c as string }}>{pnl as string}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 9, color: C.textSec }}>{dur as string}</td>
                  <td style={{ padding: '4px 8px' }}><Badge tone="high">HIGH</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── PAGE MOCKUP: FUNDING RATES ────────────────────────────────────────────
function FundingRatesMockup() {
  const rows = [
    { sym: 'BTC/USDT', binance: '+0.0100%', bybit: '+0.0089%', okx: '+0.0102%', best: 'OKX', arb: '+0.0013%', opp: true },
    { sym: 'ETH/USDT', binance: '+0.0054%', bybit: '+0.0061%', okx: '+0.0058%', best: 'Bybit', arb: '+0.0007%', opp: false },
    { sym: 'SOL/USDT', binance: '+0.0213%', bybit: '+0.0187%', okx: '+0.0221%', best: 'OKX', arb: '+0.0034%', opp: true },
    { sym: 'INJ/USDT', binance: '-0.0089%', bybit: '-0.0102%', okx: '-0.0094%', best: 'Binance', arb: '-0.0013%', opp: false },
    { sym: 'WIF/USDT', binance: '+0.0342%', bybit: '+0.0311%', okx: '+0.0358%', best: 'OKX', arb: '+0.0047%', opp: true },
  ]
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.yellow}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.yellow}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.yellow }}>FUNDING RATES</span>
        <span style={{ fontSize: 9, color: C.textSec }}>— 2-pane layout · left filter panel + full center table</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: C.yellow, background: `${C.yellow}20`, padding: '1px 6px', borderRadius: 2, fontFamily: 'monospace' }}>NEW DESIGN</span>
      </div>
      <MockNav active="Funding Rates" />
      <div style={{ display: 'flex', height: 280 }}>
        {/* Left sidebar */}
        <div style={{ width: 140, background: C.surface, borderRight: `1px solid ${C.border}`, padding: 10 }}>
          <SectionHeader label="Filters" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 8, color: C.textSec, marginBottom: 4 }}>QUOTE</div>
            {['ALL', 'USDT', 'USDC', 'BTC'].map((t, i) => (
              <div key={t} style={{ padding: '4px 6px', background: i === 0 ? `${C.yellow}15` : 'transparent', borderRadius: 3, fontSize: 10, fontFamily: 'monospace', color: i === 0 ? C.yellow : C.textSec, marginBottom: 2, cursor: 'pointer' }}>{t}</div>
            ))}
          </div>
          <div style={{ height: 1, background: C.border, marginBottom: 8 }} />
          <SectionHeader label="Exchanges" />
          {['Binance', 'Bybit', 'OKX', 'Bitget', 'Hyperliquid'].map((e, i) => (
            <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, border: `1px solid ${C.border2}`, borderRadius: 2, background: i < 3 ? `${C.yellow}30` : 'transparent' }} />
              <span style={{ fontSize: 10, color: i < 3 ? C.text : C.textSec }}>{e}</span>
            </div>
          ))}
          <div style={{ height: 1, background: C.border, marginBottom: 8 }} />
          <SectionHeader label="Stats" />
          <StatCard value="3" label="Arb Opps" sub="above threshold" color={C.yellow} />
        </div>

        {/* Center table */}
        <div style={{ flex: 1, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
            <StatCard value="18" label="Exchanges" sub="tracked" color={C.blue} />
            <StatCard value="127" label="Symbols" sub="with futures" color={C.text} />
            <StatCard value="3" label="Arb Opps" sub="> 0.003% spread" color={C.yellow} />
            <StatCard value="08:00" label="Next Reset" sub="in 4h 30m" color={C.textSec} />
          </div>
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SectionHeader label="Live Funding Rates" />
            <span style={{ fontSize: 9, color: C.textSec, marginLeft: 4 }}>8h reset cycle · sorted by arbitrage spread</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                {['Symbol', 'Binance', 'Bybit', 'OKX', 'Best Exchange', 'Arb Spread', ''].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 0.5, fontWeight: 600 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sym} style={{ borderBottom: `1px solid ${C.border}`, background: r.opp ? `${C.yellow}05` : 'transparent' }}>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 11, color: C.text }}>{r.sym}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 10, color: r.binance.startsWith('+') ? C.green : C.red }}>{r.binance}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 10, color: r.bybit.startsWith('+') ? C.green : C.red }}>{r.bybit}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 10, color: r.okx.startsWith('+') ? C.green : C.red }}>{r.okx}</td>
                  <td style={{ padding: '5px 8px', fontSize: 10, color: C.blue, fontFamily: 'monospace' }}>{r.best}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 10, color: r.arb.startsWith('+') ? C.yellow : C.textSec }}>{r.arb}</td>
                  <td style={{ padding: '5px 8px' }}>{r.opp && <Badge tone="med">OPP</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── PAGE MOCKUP: SETTINGS ─────────────────────────────────────────────────
function SettingsMockup() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.textSec}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.textSec}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.textSec }}>SETTINGS</span>
        <span style={{ fontSize: 9, color: C.textSec }}>— Terminal header + single content column (max-w-2xl)</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: C.textSec, background: `${C.textSec}20`, padding: '1px 6px', borderRadius: 2, fontFamily: 'monospace' }}>NEW DESIGN</span>
      </div>
      <MockNav active="Dashboard" />
      <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        {/* Page title */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace', marginBottom: 2 }}>Settings</div>
          <div style={{ fontSize: 11, color: C.textSec }}>Account preferences and alert configuration</div>
        </div>
        {/* Tab nav — matching dashboard tab style */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          {['Profile', 'Alerts', 'API Keys', 'Notifications'].map((t, i) => (
            <div key={t} style={{ padding: '6px 12px', fontSize: 11, fontFamily: 'monospace', color: i === 0 ? C.text : C.textSec, borderBottom: i === 0 ? `2px solid ${C.green}` : '2px solid transparent', cursor: 'pointer' }}>{t}</div>
          ))}
        </div>
        {/* Form section */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 10, background: C.blue, borderRadius: 1 }} />
            PROFILE INFORMATION
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Display Name', 'Parvez'], ['Email', 'parvez@example.com']].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.textSec, marginBottom: 4, fontFamily: 'monospace' }}>{l}</div>
                <div style={{ height: 28, background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 3, padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: 11, fontFamily: 'monospace', color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
          <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 10, background: C.yellow, borderRadius: 1 }} />
            SPREAD ALERTS
          </div>
          {[['Min Spread Threshold', '0.2%'], ['Notification Method', 'Browser + Email']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '6px 8px', background: C.surface2, borderRadius: 3 }}>
              <span style={{ fontSize: 11, color: C.text }}>{l}</span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: C.yellow }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ height: 28, padding: '0 16px', background: C.green, borderRadius: 4, fontSize: 11, color: C.bg, fontFamily: 'monospace', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            Save Changes
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PAGE MOCKUP: LOGIN ────────────────────────────────────────────────────
function LoginMockup() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.green}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.green}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.green }}>LOGIN</span>
        <span style={{ fontSize: 9, color: C.textSec }}>— Terminal header + centered auth card · no sidebars</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: C.green, background: `${C.green}20`, padding: '1px 6px', borderRadius: 2, fontFamily: 'monospace' }}>NEW DESIGN</span>
      </div>
      {/* Minimal nav — no links, just brand */}
      <div style={{ height: 42, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
        <span style={{ color: C.blue, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>⚡</span>
        <span style={{ color: C.text, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>Arbitrage Terminal</span>
        <span style={{ color: C.textMut, fontSize: 11 }}>|</span>
        <span style={{ color: C.textSec, fontFamily: 'monospace', fontSize: 10 }}>v0.7.4</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: C.textSec }}>Don't have an account? <span style={{ color: C.blue }}>Sign up →</span></span>
      </div>
      {/* Centered card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: 320, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 24 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 6 }}>ARBITRAGE TERMINAL</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'monospace', marginBottom: 4 }}>Sign In</div>
            <div style={{ fontSize: 10, color: C.textSec }}>Access real-time arbitrage intelligence</div>
          </div>
          {/* Fields */}
          {[['Email', 'you@example.com'], ['Password', '••••••••']].map(([l, p]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.textSec, marginBottom: 4, fontFamily: 'monospace' }}>{l}</div>
              <div style={{ height: 32, background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 3, padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: 11, fontFamily: 'monospace', color: C.textMut }}>{p}</div>
            </div>
          ))}
          {/* CTA */}
          <div style={{ height: 34, background: C.green, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: C.bg, marginTop: 14, cursor: 'pointer' }}>
            Sign In
          </div>
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10, color: C.textMut }}>
            Free tier: 15s delayed data · <span style={{ color: C.blue }}>Upgrade for live</span>
          </div>
          {/* Branding fix note */}
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10, fontSize: 9, color: C.textMut, textAlign: 'center' }}>
            "Arbitrage Terminal" consistent branding · #3FB950 CTA · no emoji
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PAGE MOCKUP: PRICING ──────────────────────────────────────────────────
function PricingMockup() {
  const plans = [
    { name: 'FREE', price: '$0', color: C.textSec, features: ['15s delayed data', '3 exchanges', 'Public gaps only', 'No alerts'] },
    { name: 'PRO', price: '$29', color: C.blue, features: ['Live data', '18 exchanges', 'All gap types', '10 alerts'], popular: true },
    { name: 'ELITE', price: '$79', color: C.purple, features: ['Live + WebSocket', 'All exchanges', 'Magnus AI signals', 'Unlimited alerts'] },
    { name: 'CUSTOM', price: 'Contact', color: C.yellow, features: ['White label', 'API access', 'Co-location', 'SLA support'] },
  ]
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.blue}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.blue}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.blue }}>PRICING</span>
        <span style={{ fontSize: 9, color: C.textSec }}>— Terminal header + 4-col plan grid using Dashboard card primitives</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: C.blue, background: `${C.blue}20`, padding: '1px 6px', borderRadius: 2, fontFamily: 'monospace' }}>NEW DESIGN</span>
      </div>
      <MockNav active="Dashboard" />
      <div style={{ padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 6 }}>ARBITRAGE TERMINAL</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'monospace', marginBottom: 4 }}>Choose Your Plan</div>
          <div style={{ fontSize: 11, color: C.textSec }}>Real-time crypto arbitrage intelligence · no contracts</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {plans.map(p => (
            <div key={p.name} style={{ background: p.popular ? `${C.blue}08` : C.surface, border: `1px solid ${p.popular ? C.blue : C.border}`, borderRadius: 6, padding: 12, borderTop: `3px solid ${p.color}` }}>
              <div style={{ fontSize: 9, color: p.color, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: C.text, marginBottom: 10 }}>{p.price}<span style={{ fontSize: 10, color: C.textSec, fontWeight: 400 }}>{p.price !== 'Contact' ? '/mo' : ''}</span></div>
              {p.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ color: p.color, fontSize: 8 }}>✓</span>
                  <span style={{ fontSize: 10, color: C.textSec }}>{f}</span>
                </div>
              ))}
              <div style={{ height: 26, background: p.popular ? C.blue : C.surface2, border: `1px solid ${p.popular ? C.blue : C.border}`, borderRadius: 3, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'monospace', color: p.popular ? C.bg : C.text, fontWeight: p.popular ? 700 : 400 }}>
                {p.price === '$0' ? 'Get Started Free' : p.price === 'Contact' ? 'Contact Sales' : 'Subscribe'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── BEFORE / AFTER STRIP ──────────────────────────────────────────────────
function BeforeAfterStrip() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 24 }}>
      <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 12 }}>WHAT CHANGES — BEFORE vs AFTER (CONCEPT B)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
        {[
          { page: 'Magnus', before: 'gray/cyan Tailwind, centered column, "Arbitrance" branding', after: '2-pane · left bot list + center performance · correct nav', severity: 'red' },
          { page: 'DEX Markets', before: 'Placeholder splash, no nav, no data', after: '2-pane table · exchange price comparison · live data', severity: 'red' },
          { page: 'Settings', before: 'No global nav, th-* tokens, document layout', after: 'Terminal header + tabbed column, same #161B22 system', severity: 'yellow' },
          { page: 'Login / Signup', before: 'No nav, "Arbitrance Terminal" + emoji, green-600 CTA', after: 'Brand nav + centered card, #3FB950 CTA, correct naming', severity: 'yellow' },
          { page: 'Pricing', before: 'Wrong version v0.8.0, missing nav links', after: 'Correct nav, v0.7.4, plan cards with Dashboard primitives', severity: 'yellow' },
        ].map((row, i) => (
          <div key={row.page} style={{ padding: '10px 12px', borderRight: i < 4 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text, fontFamily: 'monospace', marginBottom: 6 }}>{row.page}</div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 8, color: C.red, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 2 }}>BEFORE</div>
              <div style={{ fontSize: 9, color: C.textSec, lineHeight: 1.4 }}>{row.before}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: C.green, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 2 }}>AFTER</div>
              <div style={{ fontSize: 9, color: C.text, lineHeight: 1.4 }}>{row.after}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ConceptBPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Concept header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/concepts" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← All Concepts</Link>
        <span style={{ color: C.textMut }}>|</span>
        <div style={{ width: 20, height: 20, background: C.green, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.bg, fontFamily: 'monospace' }}>B</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>Adaptive Terminal</span>
        <span style={{ fontSize: 9, background: `${C.green}20`, color: C.green, border: `1px solid ${C.green}40`, borderRadius: 3, padding: '2px 8px', fontFamily: 'monospace' }}>RECOMMENDED</span>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← Back to App</Link>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 4px', lineHeight: 1.6 }}>
            Same DNA as Dashboard — identical nav, color system, card + table primitives.
            Layout <em>adapts</em> to the purpose of each page rather than forcing a rigid 4-pane everywhere.
          </p>
        </div>

        <BeforeAfterStrip />

        <div style={{ fontSize: 11, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 16 }}>PAGE MOCKUPS — HOW EACH FIXED PAGE LOOKS UNDER CONCEPT B</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <MagnusMockup />
          <FundingRatesMockup />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SettingsMockup />
            <LoginMockup />
          </div>
          <PricingMockup />
        </div>

        <div style={{ marginTop: 24, background: C.surface, border: `1px solid ${C.green}40`, borderRadius: 6, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>IMPLEMENTATION SCOPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Files changed', value: '9 pages', sub: 'app/magnus, app/dex-markets, app/funding-rates, app/settings, app/account, app/pricing, app/login, app/signup + shared nav', color: C.blue },
              { label: 'Shared components', value: '2 new', sub: 'UnifiedNav (replaces per-page navs) · TerminalShell (wrapper for utility pages)', color: C.purple },
              { label: 'No backend changes', value: '0 APIs', sub: 'Pure frontend/CSS work — all API routes, data logic, and server code untouched', color: C.green },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 4 }}>{item.label.toUpperCase()}</div>
                <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.value}</div>
                <div style={{ fontSize: 10, color: C.textSec, lineHeight: 1.5 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
