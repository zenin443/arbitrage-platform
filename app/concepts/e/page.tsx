'use client'
import { useState } from 'react'
import Link from 'next/link'

/* ─────────────────────────────────────────────────────────────────────────
   CONCEPT E — OBSIDIAN
   Ultra-premium dark. Gold as the exclusive accent. Every element earns
   its place. Designed to feel like a $50K/yr institutional terminal.
───────────────────────────────────────────────────────────────────────── */

const C = {
  bg:      '#06080D',
  panel:   '#0C1018',
  card:    '#111822',
  lift:    '#161E28',
  border:  '#1C2636',
  rim:     '#243040',
  text:    '#EDF2FF',
  sub:     '#7A8899',
  mute:    '#3A4455',
  gold:    '#E8B84B',
  goldLo:  '#B8891A',
  green:   '#22C55E',
  blue:    '#3B82F6',
  red:     '#EF4444',
  purple:  '#A78BFA',
  cyan:    '#06B6D4',
}
const MONO = "'IBM Plex Mono', 'Fira Code', monospace"
const SANS = "'IBM Plex Sans', 'Inter', system-ui, sans-serif"

/* ── Reusable primitives ──────────────────────────────────────────────── */
const pill = (color: string) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px', borderRadius: 10,
  background: color + '16', border: `1px solid ${color}40`,
  fontFamily: MONO, fontSize: 9, color, letterSpacing: 0.6,
} as React.CSSProperties)

const tag = (color: string) => ({
  display: 'inline-block', padding: '2px 6px', borderRadius: 3,
  background: color + '18', fontFamily: MONO, fontSize: 8, color, letterSpacing: 0.4,
} as React.CSSProperties)

function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function Label({ children, accent }: { children: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <div style={{ width: 2, height: 11, background: accent ?? C.gold, borderRadius: 1 }} />
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.mute, letterSpacing: 1.4 }}>{children.toUpperCase()}</span>
    </div>
  )
}

function ConceptBadge({ label }: { label: string }) {
  return (
    <div style={{ padding: '4px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.mute, letterSpacing: 1 }}>PAGE</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 700 }}>{label}</span>
      <span style={{ ...pill(C.gold), fontSize: 8 }}>CONCEPT E</span>
    </div>
  )
}

/* ── Universal nav ────────────────────────────────────────────────────── */
function Nav({ active, authOnly }: { active?: string; authOnly?: boolean }) {
  const links = ['Intelligence','Magnus','DEX Markets','Funding Rates','Dashboard']
  return (
    <nav style={{ height: 50, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14, flexShrink: 0 }}>
      {/* Logo mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 26, height: 26, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 900, color: C.bg }}>A</span>
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: 0.1 }}>Arbitrage Terminal</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.5 }}>v0.7.4</div>
        </div>
      </div>

      <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

      {/* Live */}
      <div style={pill(C.green)}>
        <Dot color={C.green} size={5} />
        LIVE
      </div>
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.mute }}>16:30:45</span>

      <div style={{ flex: 1 }} />

      {/* Nav links */}
      {!authOnly && links.map(l => (
        <span key={l} style={{
          fontFamily: SANS, fontSize: 12, letterSpacing: 0.1,
          color: l === active ? C.text : C.sub,
          fontWeight: l === active ? 600 : 400,
          paddingBottom: 2,
          borderBottom: l === active ? `1px solid ${C.gold}` : '1px solid transparent',
          cursor: 'pointer',
        }}>{l}</span>
      ))}

      {authOnly && <span style={{ fontFamily: SANS, fontSize: 11, color: C.sub }}>Already have an account? <span style={{ color: C.gold, cursor: 'pointer' }}>Sign in</span></span>}

      <div style={{ width: 1, height: 18, background: C.border, margin: '0 2px' }} />
      <span style={{ fontSize: 14, color: C.mute, cursor: 'pointer' }}>⚙</span>
      <div style={{ padding: '5px 14px', border: `1px solid ${C.gold}60`, borderRadius: 4, fontFamily: MONO, fontSize: 10, color: C.gold, cursor: 'pointer', letterSpacing: 0.4 }}>Sign In</div>
    </nav>
  )
}

/* ── KPI card ─────────────────────────────────────────────────────────── */
function KPI({ value, label, sub, color, live }: { value: string; label: string; sub?: string; color?: string; live?: boolean }) {
  const c = color ?? C.gold
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '12px 14px', borderLeft: `2px solid ${c}`, position: 'relative' }}>
      {live && <div style={{ position: 'absolute', top: 10, right: 10, width: 5, height: 5, borderRadius: '50%', background: c, opacity: 0.9 }} />}
      <div style={{ fontFamily: SANS, fontSize: 9, color: C.mute, letterSpacing: 1.1, marginBottom: 5 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: c, lineHeight: 1, marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>{sub}</div>}
    </div>
  )
}

/* ── Confidence badge ─────────────────────────────────────────────────── */
function Badge({ s }: { s: 'HIGH'|'MED'|'LOW' }) {
  const map = { HIGH: C.green, MED: C.gold, LOW: C.mute }
  return <span style={tag(map[s])}>{s}</span>
}

/* ── Type tag ─────────────────────────────────────────────────────────── */
function TypeTag({ t }: { t: string }) {
  const c = t === 'DEX-CEX' ? C.purple : t === 'S-F' ? C.gold : C.blue
  return <span style={tag(c)}>{t}</span>
}

/* ══════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════════════════════════════ */
function DashboardPage() {
  const rows = [
    { sym: 'INJ/USDT',  route: 'hyperliquid → bitfinex', sp: '0.39%', net: '0.24%', pnl: '+$2.39', type: 'DEX-CEX', sc: 'HIGH' },
    { sym: 'DOT/USDT',  route: 'bingx → okx',            sp: '0.31%', net: '0.16%', pnl: '+$1.60', type: 'CEX-CEX', sc: 'HIGH' },
    { sym: 'SOL/USDC',  route: 'coinbase → mexc',         sp: '0.28%', net: '0.13%', pnl: '+$1.30', type: 'CEX-CEX', sc: 'MED'  },
    { sym: 'WIF/USDT',  route: 'bingx → okx',             sp: '0.22%', net: '0.07%', pnl: '+$0.70', type: 'S-F',     sc: 'MED'  },
    { sym: 'ETH/USDC',  route: 'uniswap → binance',       sp: '0.19%', net: '0.04%', pnl: '+$0.40', type: 'DEX-CEX', sc: 'LOW'  },
    { sym: 'ORDI/USDT', route: 'mexc → okx',              sp: '0.17%', net: '0.02%', pnl: '+$0.20', type: 'CEX-CEX', sc: 'LOW'  },
  ]

  return (
    <div>
      <ConceptBadge label="DASHBOARD" />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <Nav active="Dashboard" />
        <div style={{ display: 'flex', height: 400 }}>
          {/* Watchlist sidebar */}
          <div style={{ width: 168, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <Label children="Watchlist" />
              <input readOnly style={{ width: '100%', height: 26, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '0 8px', fontFamily: SANS, fontSize: 10, color: C.sub, boxSizing: 'border-box' }} placeholder="Search..." />
            </div>
            <div style={{ flex: 1, padding: '8px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0 14px 6px', borderBottom: `1px solid ${C.border}` }}>
                {['Coin','Price','Chg'].map(h => <span key={h} style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8 }}>{h.toUpperCase()}</span>)}
              </div>
              {[
                ['BTC','67,214','+0.2',C.green],['ETH','3,521','-0.1',C.red],
                ['SOL','168.4','+1.3',C.green],['WIF','2.84','+0.8',C.green],
                ['INJ','28.50','-0.4',C.red],['ORDI','42.10','+2.1',C.green],
                ['DOT','6.82','+0.3',C.green],['NEAR','7.14','-0.2',C.red],
              ].map(([coin, price, chg, cl]) => (
                <div key={coin as string} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '5px 14px', borderBottom: `1px solid ${C.border}14`, alignItems: 'center' }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{coin as string}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.sub }}>{price as string}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: cl as string }}>{chg as string}%</span>
                </div>
              ))}
            </div>
            {/* Magnus mini card */}
            <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}` }}>
              <Label children="Magnus Alpha" accent={C.purple} />
              <div style={{ background: C.bg, border: `1px solid ${C.purple}30`, borderRadius: 5, padding: '8px 10px' }}>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: C.purple, lineHeight: 1 }}>98.7%</div>
                <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginTop: 2 }}>win rate</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.mute, marginTop: 4 }}>2,534 trades · $16K</div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Ad strip */}
            <div style={{ height: 28, background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: SANS, fontSize: 10, color: C.mute }}>Trade on Binance — lowest fees in crypto →</span>
            </div>
            <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                <KPI value="18" label="Exchanges" sub="active feeds" color={C.blue} />
                <KPI value="128" label="Symbols" sub="tracked" color={C.sub} />
                <KPI value="4,753" label="Gaps / hr" sub="↑ from 3,200" color={C.green} live />
                <KPI value="0.39%" label="Best Spread" sub="DOT/USDT" color={C.gold} live />
              </div>

              {/* Table header */}
              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Label children="Live Profitable Gaps" accent={C.blue} />
                <span style={{ fontFamily: SANS, fontSize: 10, color: C.mute }}>polled every 2s · net spread after fees</span>
                <div style={{ flex: 1 }} />
                <span style={{ ...pill(C.green), fontSize: 8 }}><Dot color={C.green} size={4} />LIVE · 4,753 gaps/hr</span>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.lift }}>
                    {['Symbol','Route','Spread','Net %','Est. Profit','Type','Score'].map((h, i) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: i > 1 ? 'right' : 'left', fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8, fontWeight: 600 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                      <td style={{ padding: '7px 10px', fontFamily: MONO, fontSize: 11, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                      <td style={{ padding: '7px 10px', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.route}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: C.green, fontWeight: 600 }}>{r.sp}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: C.green }}>{r.net}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: C.gold, fontWeight: 700 }}>{r.pnl}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right' }}><TypeTag t={r.type} /></td>
                      <td style={{ padding: '7px 10px', textAlign: 'right' }}><Badge s={r.sc as any} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right insight panel */}
          <div style={{ width: 164, background: C.panel, borderLeft: `1px solid ${C.border}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label children="Signal Insight" accent={C.gold} />
              <div style={{ background: C.bg, border: `1px solid ${C.gold}30`, borderRadius: 6, padding: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 2 }}>INJ/USDT</div>
                <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginBottom: 8 }}>hyperliquid → bitfinex</div>
                <div style={{ fontFamily: MONO, fontSize: 22, color: C.green, fontWeight: 700, lineHeight: 1 }}>+$2.39</div>
                <div style={{ fontFamily: SANS, fontSize: 9, color: C.mute, marginTop: 3 }}>0.39% · 24s · HIGH</div>
                <div style={{ marginTop: 8, height: 2, background: C.border, borderRadius: 1 }}>
                  <div style={{ width: '75%', height: '100%', background: C.green, borderRadius: 1 }} />
                </div>
                <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute, marginTop: 3 }}>Liquidity: $20K available</div>
              </div>
            </div>
            <div>
              <Label children="Exchange Coverage" accent={C.blue} />
              {[['Binance',95,C.green],['OKX',90,C.green],['Bybit',88,C.blue],['Hyperliquid',72,C.blue],['MEXC',65,C.sub]].map(([ex,w,c]) => (
                <div key={ex as string} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.sub }}>{ex as string}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: c as string }}>{w as number}%</span>
                  </div>
                  <div style={{ height: 2, background: C.border, borderRadius: 1 }}>
                    <div style={{ width: `${w}%`, height: '100%', background: c as string, borderRadius: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MAGNUS PAGE
══════════════════════════════════════════════════════════════════════ */
function MagnusPage() {
  const [active, setActive] = useState('NEXUS')
  const bots = [
    { id: 'NEXUS',  strategy: 'Alpha · CEX/DEX',  win: '98.7%', trades: 2534,  pnl: '+$16,000', dd: '2.1%', sharpe: '4.7', color: C.gold   },
    { id: 'HERMES', strategy: 'Futures · Multi',   win: '94.2%', trades: 1201,  pnl: '+$7,800',  dd: '3.4%', sharpe: '3.2', color: C.blue   },
    { id: 'KRONOS', strategy: 'Calendar Spread',   win: '87.1%', trades: 438,   pnl: '+$3,200',  dd: '4.1%', sharpe: '2.8', color: C.purple },
    { id: 'ATLAS',  strategy: 'Pairs Trading',     win: '91.3%', trades: 889,   pnl: '+$5,100',  dd: '2.8%', sharpe: '3.5', color: C.cyan   },
    { id: 'VEGA',   strategy: 'Simulator',         win: '—',     trades: 0,     pnl: '—',        dd: '—',    sharpe: '—',   color: C.mute   },
  ]
  const bot = bots.find(b => b.id === active)!
  const trades = [
    { t: '16:28', sym: 'INJ/USDT',  route: 'hyperliquid → bitfinex', pnl: '+$2.39', dur: '24s',  sc: 'HIGH' as const },
    { t: '16:25', sym: 'DOT/USDT',  route: 'bingx → okx',            pnl: '+$1.87', dur: '18s',  sc: 'HIGH' as const },
    { t: '16:21', sym: 'SOL/USDC',  route: 'coinbase → mexc',         pnl: '+$3.12', dur: '31s',  sc: 'MED'  as const },
    { t: '16:17', sym: 'WIF/USDT',  route: 'bingx → okx',             pnl: '-$0.45', dur: '42s',  sc: 'LOW'  as const },
    { t: '16:14', sym: 'ETH/USDC',  route: 'uniswap → binance',       pnl: '+$5.66', dur: '12s',  sc: 'HIGH' as const },
  ]

  return (
    <div>
      <ConceptBadge label="MAGNUS — AI BOT PERFORMANCE" />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <Nav active="Magnus" />
        <div style={{ display: 'flex', height: 480 }}>

          {/* Bot list sidebar */}
          <div style={{ width: 196, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <Label children="Fleet" accent={C.purple} />
              <div style={{ ...pill(C.green), width: 'fit-content' }}>
                <Dot color={C.green} size={4} />4 LIVE
              </div>
            </div>
            <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {bots.map(b => (
                <div
                  key={b.id}
                  onClick={() => setActive(b.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 7, cursor: 'pointer',
                    background: b.id === active ? b.color + '12' : C.card,
                    border: `1px solid ${b.id === active ? b.color + '50' : C.border}`,
                    borderLeft: `3px solid ${b.id === active ? b.color : 'transparent'}`,
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: b.id === active ? b.color : C.text }}>{b.id}</span>
                    {b.id !== 'VEGA' && <Dot color={C.green} size={5} />}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 9, color: C.mute, marginBottom: 5 }}>{b.strategy}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: b.win === '—' ? C.mute : C.text }}>{b.win}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: b.pnl.startsWith('+') ? C.green : C.mute, fontWeight: b.pnl.startsWith('+') ? 600 : 400 }}>{b.pnl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance center */}
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>

            {/* Bot header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: bot.color + '18', border: `1px solid ${bot.color}50`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 900, color: bot.color }}>{bot.id[0]}</span>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: bot.color, lineHeight: 1 }}>{bot.id}</div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub, marginTop: 2 }}>{bot.strategy}</div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ ...pill(bot.id === 'VEGA' ? C.mute : C.green) }}>
                <Dot color={bot.id === 'VEGA' ? C.mute : C.green} size={5} />
                {bot.id === 'VEGA' ? 'SIMULATION' : 'LIVE'}
              </div>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              <KPI value={bot.win}    label="Win Rate"    color={C.green}  sub="last 90 days" />
              <KPI value={String(bot.trades || '—')} label="Total Trades" color={C.blue} sub="all strategies" />
              <KPI value={bot.pnl}   label="Total P&L"   color={bot.pnl.startsWith('+') ? C.green : C.mute} sub="paper capital" live={bot.pnl.startsWith('+')} />
              <KPI value={bot.sharpe} label="Sharpe Ratio" color={C.gold} sub="risk-adjusted" />
            </div>

            {/* PnL chart */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Label children="Cumulative P&L" accent={bot.color} />
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {['7D','1M','3M','ALL'].map((t, i) => (
                    <span key={t} style={{ fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 3, background: i === 3 ? bot.color + '20' : 'transparent', color: i === 3 ? bot.color : C.mute, cursor: 'pointer' }}>{t}</span>
                  ))}
                </div>
              </div>
              <svg width="100%" height="90" viewBox="0 0 700 90" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`g${bot.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={bot.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={bot.color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d="M0,80 C70,75 140,68 210,58 C280,46 350,48 420,36 C490,24 560,18 630,10 C660,7 680,5 700,3"
                  fill="none" stroke={bot.color} strokeWidth="2" />
                <path d="M0,80 C70,75 140,68 210,58 C280,46 350,48 420,36 C490,24 560,18 630,10 C660,7 680,5 700,3 L700,90 L0,90 Z"
                  fill={`url(#g${bot.id})`} />
                {/* Grid lines */}
                {[20,40,60].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke={C.border} strokeWidth="0.5" />)}
              </svg>
            </div>

            {/* Recent trades */}
            <div>
              <Label children="Recent Trades" />
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.lift }}>
                    {['Time','Symbol','Route','P&L','Duration','Score'].map((h, i) => (
                      <th key={h} style={{ padding: '5px 10px', textAlign: i >= 3 ? 'right' : 'left', fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8, fontWeight: 600 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                      <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 9, color: C.mute }}>{r.t}</td>
                      <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                      <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.route}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: r.pnl.startsWith('+') ? C.green : C.red, fontWeight: 600 }}>{r.pnl}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.dur}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}><Badge s={r.sc} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════════════ */
function LoginPage() {
  return (
    <div>
      <ConceptBadge label="LOGIN" />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {/* Auth-only nav */}
        <nav style={{ height: 50, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 12 }}>
          <div style={{ width: 26, height: 26, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 900, color: C.bg }}>A</span>
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1 }}>Arbitrage Terminal</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>v0.7.4</div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.sub }}>New here? <span style={{ color: C.gold, cursor: 'pointer' }}>Create free account →</span></span>
        </nav>

        {/* Page body */}
        <div style={{ padding: '40px 24px', display: 'flex', gap: 48, justifyContent: 'center', alignItems: 'flex-start' }}>

          {/* Live stats — left column */}
          <div style={{ width: 200, paddingTop: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.mute, letterSpacing: 1.2, marginBottom: 16 }}>RIGHT NOW</div>
            {[
              { v: '4,753', l: 'Gaps detected / hr', c: C.green },
              { v: '91',    l: 'Profitable gaps',    c: C.green },
              { v: '0.39%', l: 'Best spread',        c: C.gold  },
              { v: '18',    l: 'Exchanges live',     c: C.blue  },
            ].map(s => (
              <div key={s.l} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6 }}>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, lineHeight: 1.5 }}>
                Free tier includes 15s delayed data across all exchanges. Upgrade for live feed.
              </div>
            </div>
          </div>

          {/* Auth card */}
          <div style={{ width: 360, background: C.panel, border: `1px solid ${C.rim}`, borderRadius: 12, padding: 32 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.mute, letterSpacing: 2, textAlign: 'center', marginBottom: 10 }}>ARBITRAGE TERMINAL</div>
            <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 4 }}>Welcome back</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.sub, textAlign: 'center', marginBottom: 28 }}>Sign in to access live intelligence</div>

            {[['Email address','you@example.com'],['Password','••••••••••']].map(([l,p]) => (
              <div key={l} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub, marginBottom: 6 }}>{l}</div>
                <div style={{ height: 40, background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 6, padding: '0 14px', display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 12, color: C.mute }}>{p}</div>
              </div>
            ))}

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <span style={{ fontFamily: SANS, fontSize: 10, color: C.gold, cursor: 'pointer' }}>Forgot password?</span>
            </div>

            <div style={{ height: 44, background: C.gold, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.bg, cursor: 'pointer', letterSpacing: 0.5 }}>
              Sign In
            </div>

            <div style={{ margin: '18px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontFamily: SANS, fontSize: 10, color: C.mute }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['Google','GitHub'].map(provider => (
                <div key={provider} style={{ height: 38, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 11, color: C.sub, cursor: 'pointer', gap: 6 }}>
                  {provider}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   SETTINGS PAGE
══════════════════════════════════════════════════════════════════════ */
function SettingsPage() {
  return (
    <div>
      <ConceptBadge label="SETTINGS" />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <Nav active="Dashboard" />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 20px' }}>
          <div style={{ width: '100%', maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 700, color: C.text }}>Settings</div>
              <div style={{ ...pill(C.blue), fontSize: 8 }}>PRO</div>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.sub, marginBottom: 22 }}>Account preferences, alerts, and API configuration</div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 22 }}>
              {['Profile','Alerts','API Keys','Notifications','Billing'].map((t,i) => (
                <div key={t} style={{ padding: '8px 16px', fontFamily: MONO, fontSize: 10, letterSpacing: 0.3, color: i === 0 ? C.gold : C.sub, borderBottom: i === 0 ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer' }}>{t}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Profile section */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18 }}>
                <Label children="Profile Information" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[['Display Name','Parvez'],['Email','parvez@example.com'],['Timezone','UTC−4 · New York'],['Account Type','PRO · since Jan 2025']].map(([l,v]) => (
                    <div key={l}>
                      <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginBottom: 6 }}>{l}</div>
                      <div style={{ height: 36, background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 5, padding: '0 12px', display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 11, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts section */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18 }}>
                <Label children="Alert Thresholds" accent={C.gold} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    ['Minimum Spread','0.2%',C.gold],
                    ['Notification Method','Browser + Email',C.blue],
                    ['Daily Alert Limit','50 alerts',C.sub],
                    ['Exchange Filter','All 18 exchanges',C.sub],
                  ].map(([l,v,c]) => (
                    <div key={l as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: SANS, fontSize: 11, color: C.sub }}>{l as string}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: c as string, fontWeight: 500 }}>{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <div style={{ height: 36, padding: '0 18px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, fontFamily: MONO, fontSize: 11, color: C.sub, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>Cancel</div>
              <div style={{ height: 36, padding: '0 22px', background: C.gold, borderRadius: 5, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.bg, display: 'flex', alignItems: 'center', cursor: 'pointer', letterSpacing: 0.4 }}>Save Changes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════════ */
export default function ConceptEPage() {
  return (
    <div style={{ background: '#040608', minHeight: '100vh', color: C.text, fontFamily: SANS }}>
      {/* Page header */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/concepts" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none' }}>← All Concepts</Link>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <div style={{ width: 24, height: 24, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 900, color: C.bg }}>E</div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1 }}>Obsidian</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub }}>Ultra-premium dark · gold accent · institutional terminal</div>
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/concepts/e/all" style={{ padding: '6px 16px', background: C.gold, borderRadius: 5, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.bg, textDecoration: 'none', letterSpacing: 0.4 }}>View All 15 Pages →</Link>
        <Link href="/concepts/g" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none' }}>View Concept G: Neural →</Link>
        <Link href="/" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none' }}>← App</Link>
      </div>

      {/* Design system identity bar */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', display: 'flex', gap: 28, alignItems: 'center', overflowX: 'auto' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 1.2, flexShrink: 0 }}>DESIGN SYSTEM</span>
        {[
          { hex: '#06080D', label: 'Background' },
          { hex: '#0C1018', label: 'Surface' },
          { hex: '#111822', label: 'Card' },
          { hex: '#E8B84B', label: 'Gold accent' },
          { hex: '#22C55E', label: 'Profit' },
          { hex: '#3B82F6', label: 'Info' },
          { hex: '#A78BFA', label: 'AI/Magnus' },
          { hex: '#EF4444', label: 'Loss' },
        ].map(s => (
          <div key={s.hex} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, background: s.hex, borderRadius: 3, border: `1px solid ${C.rim}` }} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{s.hex}</div>
              <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>{s.label}</div>
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.gold }}>IBM Plex Mono</span>
          <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginLeft: 12 }}>IBM Plex Sans</span>
        </div>
      </div>

      {/* Page mockups */}
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <DashboardPage />
        <MagnusPage />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <LoginPage />
          <SettingsPage />
        </div>
      </div>
    </div>
  )
}
