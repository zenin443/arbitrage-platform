'use client'
import { useState } from 'react'
import Link from 'next/link'

/* ─────────────────────────────────────────────────────────────────────────
   CONCEPT G — NEURAL
   Deep navy intelligence terminal. Purple for AI/Magnus, green for profit,
   cyan for live signals. The "neural arbitrage command center" aesthetic.
   Every AI-driven section has its own color identity.
───────────────────────────────────────────────────────────────────────── */

const C = {
  bg:      '#060B14',
  panel:   '#0A1120',
  card:    '#0F1928',
  lift:    '#142030',
  border:  '#1E2D42',
  rim:     '#263C58',
  text:    '#E8F0FF',
  sub:     '#6B82A0',
  mute:    '#2E4060',
  // Neural identity colors
  neural:  '#7C3AED',   // deep purple — AI intelligence
  violet:  '#A78BFA',   // lighter purple — Magnus accents
  cyan:    '#06B6D4',   // live signal indicator
  green:   '#10B981',   // profit / positive
  blue:    '#3B82F6',   // data / information
  gold:    '#F59E0B',   // high value / premium
  red:     '#F43F5E',   // loss / danger
  teal:    '#14B8A6',   // DEX / cross-chain
}
const MONO = "'IBM Plex Mono', 'Fira Code', monospace"
const SANS = "'IBM Plex Sans', 'Inter', system-ui, sans-serif"

/* ── Primitives ───────────────────────────────────────────────────────── */
function Dot({ color, size = 6, pulse }: { color: string; size?: number; pulse?: boolean }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, position: 'relative' }}>
      {pulse && <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', background: color, opacity: 0.3 }} />}
    </div>
  )
}

function Label({ children, accent, noMargin }: { children: string; accent?: string; noMargin?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: noMargin ? 0 : 10 }}>
      <div style={{ width: 2, height: 11, background: accent ?? C.violet, borderRadius: 1 }} />
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.mute, letterSpacing: 1.4 }}>{children.toUpperCase()}</span>
    </div>
  )
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, background: color + '18', border: `1px solid ${color}40`, fontFamily: MONO, fontSize: 9, color, letterSpacing: 0.6 }}>
      {children}
    </div>
  )
}

function KPI({ value, label, sub, color, live }: { value: string; label: string; sub?: string; color?: string; live?: boolean }) {
  const c = color ?? C.violet
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '12px 14px', borderLeft: `2px solid ${c}`, position: 'relative' }}>
      {live && <div style={{ position: 'absolute', top: 10, right: 10, width: 5, height: 5, borderRadius: '50%', background: c }} />}
      <div style={{ fontFamily: SANS, fontSize: 9, color: C.mute, letterSpacing: 1.1, marginBottom: 5 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: c, lineHeight: 1, marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>{sub}</div>}
    </div>
  )
}

function Badge({ s }: { s: 'HIGH'|'MED'|'LOW' }) {
  const c = { HIGH: C.green, MED: C.gold, LOW: C.mute }[s]
  return <span style={{ fontFamily: MONO, fontSize: 8, color: c, background: c + '18', padding: '2px 5px', borderRadius: 3, letterSpacing: 0.4 }}>{s}</span>
}

function TypeTag({ t }: { t: string }) {
  const map: Record<string, string> = { 'DEX-CEX': C.teal, 'S-F': C.gold, 'CEX-CEX': C.blue }
  const c = map[t] ?? C.sub
  return <span style={{ fontFamily: MONO, fontSize: 8, color: c, background: c + '18', padding: '2px 5px', borderRadius: 3 }}>{t}</span>
}

function ConceptBadge({ label, accent }: { label: string; accent?: string }) {
  return (
    <div style={{ padding: '4px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{ width: 2, height: 14, background: accent ?? C.violet, borderRadius: 1 }} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 700 }}>{label}</span>
      <Chip color={C.violet}>CONCEPT G · NEURAL</Chip>
    </div>
  )
}

/* ── Neural nav ───────────────────────────────────────────────────────── */
function Nav({ active, authOnly }: { active?: string; authOnly?: boolean }) {
  const links = ['Intelligence','Magnus','DEX Markets','Funding Rates','Dashboard']
  return (
    <nav style={{ height: 50, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14, flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.neural}, ${C.cyan})`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 900, color: C.text }}>A</span>
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1 }}>Arbitrage Terminal</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>v0.7.4 · neural edition</div>
        </div>
      </div>

      <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

      {/* Live indicator */}
      <Chip color={C.cyan}><Dot color={C.cyan} size={4} pulse />LIVE</Chip>
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.mute }}>16:30:45</span>

      <div style={{ flex: 1 }} />

      {!authOnly && links.map(l => (
        <span key={l} style={{
          fontFamily: SANS, fontSize: 12, letterSpacing: 0.1,
          color: l === active ? C.text : C.sub,
          fontWeight: l === active ? 600 : 400,
          paddingBottom: 2,
          borderBottom: l === active ? `1px solid ${C.violet}` : '1px solid transparent',
          cursor: 'pointer',
        }}>{l}</span>
      ))}

      {authOnly && <span style={{ fontFamily: SANS, fontSize: 11, color: C.sub }}>Have an account? <span style={{ color: C.violet, cursor: 'pointer' }}>Sign in</span></span>}

      <div style={{ width: 1, height: 18, background: C.border, margin: '0 2px' }} />
      <span style={{ fontSize: 14, color: C.mute, cursor: 'pointer' }}>⚙</span>
      <div style={{ padding: '5px 14px', border: `1px solid ${C.violet}60`, borderRadius: 4, fontFamily: MONO, fontSize: 10, color: C.violet, cursor: 'pointer', letterSpacing: 0.4 }}>Sign In</div>
    </nav>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════════════════════════════ */
function DashboardPage() {
  const gaps = [
    { sym: 'INJ/USDT',  route: 'hyperliquid → bitfinex', sp: '0.39%', net: '0.24%', pnl: '+$2.39', type: 'DEX-CEX', sc: 'HIGH' as const },
    { sym: 'DOT/USDT',  route: 'bingx → okx',            sp: '0.31%', net: '0.16%', pnl: '+$1.60', type: 'CEX-CEX', sc: 'HIGH' as const },
    { sym: 'SOL/USDC',  route: 'coinbase → mexc',         sp: '0.28%', net: '0.13%', pnl: '+$1.30', type: 'CEX-CEX', sc: 'MED'  as const },
    { sym: 'WIF/USDT',  route: 'bingx → okx',             sp: '0.22%', net: '0.07%', pnl: '+$0.70', type: 'S-F',     sc: 'MED'  as const },
    { sym: 'ETH/USDC',  route: 'uniswap → binance',       sp: '0.19%', net: '0.04%', pnl: '+$0.40', type: 'DEX-CEX', sc: 'LOW'  as const },
    { sym: 'ORDI/USDT', route: 'mexc → okx',              sp: '0.17%', net: '0.02%', pnl: '+$0.20', type: 'CEX-CEX', sc: 'LOW'  as const },
  ]

  return (
    <div>
      <ConceptBadge label="DASHBOARD" accent={C.cyan} />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <Nav active="Dashboard" />
        <div style={{ display: 'flex', height: 420 }}>

          {/* Left sidebar */}
          <div style={{ width: 168, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {['ALL','USDT','USDC','BTC'].map((t, i) => (
                  <div key={t} style={{ padding: '3px 7px', background: i === 0 ? C.cyan + '20' : 'transparent', border: `1px solid ${i === 0 ? C.cyan + '50' : C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 8, color: i === 0 ? C.cyan : C.sub, cursor: 'pointer' }}>{t}</div>
                ))}
              </div>
              <div style={{ height: 26, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: SANS, fontSize: 10, color: C.mute }}>Search assets...</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
              {[
                ['BTC','67,214','+0.2',C.green],['ETH','3,521','-0.1',C.red],
                ['SOL','168.4','+1.3',C.green],['WIF','2.84','+0.8',C.green],
                ['INJ','28.50','-0.4',C.red],['ORDI','42.10','+2.1',C.green],
                ['DOT','6.82','+0.3',C.green],['NEAR','7.14','-0.2',C.red],
              ].map(([coin,price,chg,cl]) => (
                <div key={coin as string} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', padding: '5px 14px', borderBottom: `1px solid ${C.border}14`, gap: 4, alignItems: 'center' }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{coin as string}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.sub }}>{price as string}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: cl as string }}>{chg as string}%</span>
                </div>
              ))}
            </div>
            {/* Neural Magnus card */}
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
              <Label children="Neural Alpha" accent={C.violet} />
              <div style={{ background: `${C.neural}12`, border: `1px solid ${C.neural}40`, borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Dot color={C.green} size={5} pulse />
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.green, letterSpacing: 0.8 }}>LIVE</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.violet, lineHeight: 1 }}>98.7%</div>
                <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginTop: 2 }}>win rate · 2,534 trades</div>
                <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 9, color: C.green }}>+$16,000 P&L</div>
              </div>
            </div>
          </div>

          {/* Center */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 28, background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: SANS, fontSize: 10, color: C.mute }}>⚡ Full Intelligence Dashboard — 90 coins · 18 exchanges · live scoring →</span>
            </div>
            <div style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                <KPI value="18"     label="Exchanges"  sub="active feeds"  color={C.blue} />
                <KPI value="4,753"  label="Gaps / hr"  sub="↑ from 3,200"  color={C.cyan} live />
                <KPI value="91"     label="Profitable" sub="2.1% rate"     color={C.green} />
                <KPI value="0.39%"  label="Best Spread" sub="INJ/USDT"     color={C.gold} live />
              </div>

              {/* Neural signal header */}
              <div style={{ background: `${C.neural}10`, border: `1px solid ${C.neural}30`, borderRadius: 6, padding: '8px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, background: C.neural + '30', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: C.violet, fontSize: 11 }}>⚡</span>
                </div>
                <div>
                  <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.text }}>Neural Signal Heatmap</div>
                  <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>Live signals · polled every 2s · net spread after all fees</div>
                </div>
                <div style={{ flex: 1 }} />
                <Chip color={C.cyan}><Dot color={C.cyan} size={4} />LIVE · 2s refresh</Chip>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.lift }}>
                    {['Symbol','Route','Spread','Net %','Est. Profit','Type','Score'].map((h,i) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: i > 1 ? 'right' : 'left', fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8, fontWeight: 600 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((r,i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                      <td style={{ padding: '7px 10px', fontFamily: MONO, fontSize: 11, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                      <td style={{ padding: '7px 10px', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.route}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: C.green, fontWeight: 600 }}>{r.sp}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: C.green }}>{r.net}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: C.gold, fontWeight: 700 }}>{r.pnl}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right' }}><TypeTag t={r.type} /></td>
                      <td style={{ padding: '7px 10px', textAlign: 'right' }}><Badge s={r.sc} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ width: 164, background: C.panel, borderLeft: `1px solid ${C.border}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label children="Top Signal" accent={C.cyan} />
              <div style={{ background: `${C.cyan}0C`, border: `1px solid ${C.cyan}30`, borderRadius: 6, padding: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.cyan, fontWeight: 600, marginBottom: 2 }}>INJ/USDT</div>
                <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginBottom: 8 }}>hyperliquid → bitfinex</div>
                <div style={{ fontFamily: MONO, fontSize: 22, color: C.green, fontWeight: 700, lineHeight: 1 }}>+$2.39</div>
                <div style={{ fontFamily: SANS, fontSize: 9, color: C.mute, marginTop: 3 }}>0.39% spread · 24s · HIGH</div>
                <div style={{ marginTop: 8, height: 2, background: C.border, borderRadius: 1 }}>
                  <div style={{ width: '78%', height: '100%', background: C.cyan, borderRadius: 1 }} />
                </div>
              </div>
            </div>
            <div>
              <Label children="Active Gaps" accent={C.green} />
              {[['INJ','hyperliquid → bitfinex',C.teal],['DOT','bingx → okx',C.blue],['SOL','coinbase → mexc',C.blue],['ETH','uniswap → binance',C.teal]].map(([sym,route,c]) => (
                <div key={sym as string} style={{ padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{sym as string}</span>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: c as string }}>→</span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>{(route as string).split(' → ')[1]}</div>
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
   MAGNUS PAGE — Neural command center
══════════════════════════════════════════════════════════════════════ */
function MagnusPage() {
  const [active, setActive] = useState('NEXUS')
  const bots = [
    { id: 'NEXUS',  strategy: 'Alpha · CEX/DEX',  win: '98.7%', trades: 2534, pnl: '+$16,000', dd: '2.1%', sharpe: '4.7', color: C.violet  },
    { id: 'HERMES', strategy: 'Futures · Multi',   win: '94.2%', trades: 1201, pnl: '+$7,800',  dd: '3.4%', sharpe: '3.2', color: C.blue    },
    { id: 'KRONOS', strategy: 'Calendar Spread',   win: '87.1%', trades: 438,  pnl: '+$3,200',  dd: '4.1%', sharpe: '2.8', color: C.teal    },
    { id: 'ATLAS',  strategy: 'Pairs Trading',     win: '91.3%', trades: 889,  pnl: '+$5,100',  dd: '2.8%', sharpe: '3.5', color: C.cyan    },
    { id: 'VEGA',   strategy: 'Simulator',         win: '—',     trades: 0,    pnl: '—',        dd: '—',    sharpe: '—',   color: C.mute    },
  ]
  const bot = bots.find(b => b.id === active)!
  const trades = [
    { t: '16:28', sym: 'INJ/USDT',  route: 'hyperliquid → bitfinex', pnl: '+$2.39', dur: '24s', sc: 'HIGH' as const },
    { t: '16:25', sym: 'DOT/USDT',  route: 'bingx → okx',            pnl: '+$1.87', dur: '18s', sc: 'HIGH' as const },
    { t: '16:21', sym: 'SOL/USDC',  route: 'coinbase → mexc',         pnl: '+$3.12', dur: '31s', sc: 'MED'  as const },
    { t: '16:17', sym: 'WIF/USDT',  route: 'bingx → okx',             pnl: '-$0.45', dur: '42s', sc: 'LOW'  as const },
    { t: '16:14', sym: 'ETH/USDC',  route: 'uniswap → binance',       pnl: '+$5.66', dur: '12s', sc: 'HIGH' as const },
  ]

  return (
    <div>
      <ConceptBadge label="MAGNUS — NEURAL AI BOTS" accent={C.violet} />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.neural}40`, borderRadius: 10, overflow: 'hidden' }}>
        {/* Neural Magnus header strip */}
        <div style={{ height: 36, background: `linear-gradient(90deg, ${C.neural}20, transparent)`, borderBottom: `1px solid ${C.neural}30`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12 }}>
          <Dot color={C.violet} size={6} pulse />
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.violet, letterSpacing: 0.8 }}>MAGNUS NEURAL ENGINE</span>
          <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>· AI-driven arbitrage fleet · 4 strategies live</span>
          <div style={{ flex: 1 }} />
          <Chip color={C.violet}>NEURAL ACTIVE</Chip>
        </div>
        <Nav active="Magnus" />
        <div style={{ display: 'flex', height: 480 }}>

          {/* Bot list */}
          <div style={{ width: 200, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <Label children="AI Fleet" accent={C.violet} />
            </div>
            <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {bots.map(b => (
                <div
                  key={b.id}
                  onClick={() => setActive(b.id)}
                  style={{
                    padding: '11px 12px', borderRadius: 7, cursor: 'pointer',
                    background: b.id === active ? b.color + '12' : C.card,
                    border: `1px solid ${b.id === active ? b.color + '50' : C.border}`,
                    borderLeft: `3px solid ${b.id === active ? b.color : 'transparent'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: b.id === active ? b.color : C.text }}>{b.id}</span>
                    {b.id !== 'VEGA' && <Dot color={C.green} size={5} />}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 9, color: C.mute, marginBottom: 5 }}>{b.strategy}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: b.win === '—' ? C.mute : C.sub }}>{b.win}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: b.pnl.startsWith('+') ? C.green : C.mute, fontWeight: 600 }}>{b.pnl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance detail */}
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

            {/* Bot identity header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: bot.color + '0C', border: `1px solid ${bot.color}30`, borderRadius: 8 }}>
              <div style={{ width: 44, height: 44, background: bot.color + '20', border: `1px solid ${bot.color}60`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 900, color: bot.color }}>{bot.id[0]}</span>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: bot.color, lineHeight: 1 }}>{bot.id}</div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub, marginTop: 3 }}>{bot.strategy}</div>
              </div>
              <div style={{ flex: 1 }} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.green, lineHeight: 1 }}>{bot.pnl}</div>
                <div style={{ fontFamily: SANS, fontSize: 9, color: C.mute, textAlign: 'right', marginTop: 2 }}>cumulative P&L</div>
              </div>
              <Chip color={bot.id === 'VEGA' ? C.mute : C.green}>
                <Dot color={bot.id === 'VEGA' ? C.mute : C.green} size={4} />
                {bot.id === 'VEGA' ? 'SIMULATION' : 'LIVE'}
              </Chip>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              <KPI value={bot.win} label="Win Rate" color={C.green} sub="last 90 days" />
              <KPI value={String(bot.trades || '—')} label="Total Trades" color={C.blue} sub="all time" />
              <KPI value={bot.dd} label="Max Drawdown" color={C.red} sub="peak to trough" />
              <KPI value={bot.sharpe} label="Sharpe Ratio" color={C.gold} sub="risk-adjusted" live />
            </div>

            {/* Chart */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Label children="Equity Curve" accent={bot.color} noMargin />
                <div style={{ flex: 1 }} />
                {['7D','1M','3M','ALL'].map((t,i) => (
                  <span key={t} style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 3, background: i === 3 ? bot.color + '20' : 'transparent', color: i === 3 ? bot.color : C.mute, cursor: 'pointer', marginLeft: 4 }}>{t}</span>
                ))}
              </div>
              <svg width="100%" height="90" viewBox="0 0 700 90" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`ng${active}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={bot.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={bot.color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Grid */}
                {[20,40,60,80].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke={C.border} strokeWidth="0.5" />)}
                {/* Curve */}
                <path d="M0,82 C60,78 120,72 200,62 C270,52 320,55 380,44 C440,32 490,35 560,22 C610,14 660,8 700,4"
                  fill="none" stroke={bot.color} strokeWidth="2.5" />
                <path d="M0,82 C60,78 120,72 200,62 C270,52 320,55 380,44 C440,32 490,35 560,22 C610,14 660,8 700,4 L700,90 L0,90 Z"
                  fill={`url(#ng${active})`} />
              </svg>
            </div>

            {/* Trades table */}
            <div>
              <Label children="Recent Executions" accent={C.cyan} />
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.lift }}>
                    {['Time','Symbol','Route','P&L','Duration','Confidence'].map((h,i) => (
                      <th key={h} style={{ padding: '5px 10px', textAlign: i >= 3 ? 'right' : 'left', fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8, fontWeight: 600 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((r,i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 9, color: C.mute }}>{r.t}</td>
                      <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                      <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.route}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: r.pnl.startsWith('+') ? C.green : C.red, fontWeight: 700 }}>{r.pnl}</td>
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
   LOGIN — Neural overlay style
══════════════════════════════════════════════════════════════════════ */
function LoginPage() {
  return (
    <div>
      <ConceptBadge label="LOGIN / SIGNUP" accent={C.violet} />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.neural}40`, borderRadius: 10, overflow: 'hidden' }}>
        <nav style={{ height: 50, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 12 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.neural}, ${C.cyan})`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 900, color: C.text }}>A</span>
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1 }}>Arbitrage Terminal</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>v0.7.4</div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.sub }}>New here? <span style={{ color: C.violet, cursor: 'pointer' }}>Create free account →</span></span>
        </nav>

        <div style={{ padding: '36px 24px', display: 'flex', gap: 48, justifyContent: 'center', alignItems: 'flex-start' }}>
          {/* Live intelligence preview */}
          <div style={{ width: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Dot color={C.cyan} size={6} pulse />
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.cyan, letterSpacing: 1 }}>LIVE INTELLIGENCE</span>
            </div>
            {[{v:'4,753',l:'Gaps detected / hr',c:C.cyan},{v:'91',l:'Profitable gaps now',c:C.green},{v:'0.39%',l:'Best spread · INJ',c:C.gold},{v:'18',l:'Exchanges connected',c:C.blue}].map(s => (
              <div key={s.l} style={{ marginBottom: 16, paddingLeft: 10, borderLeft: `2px solid ${s.c}30` }}>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
            {/* Neural strategy mini list */}
            <div style={{ background: `${C.neural}10`, border: `1px solid ${C.neural}30`, borderRadius: 6, padding: '10px 12px', marginTop: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.violet, letterSpacing: 1, marginBottom: 8 }}>NEURAL BOTS RUNNING</div>
              {[['NEXUS','Alpha','+$16K'],['HERMES','Futures','+$7.8K']].map(([n,t,p]) => (
                <div key={n as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.violet }}>{n as string} </span>
                    <span style={{ fontFamily: SANS, fontSize: 9, color: C.mute }}>{t as string}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.green }}>{p as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Auth card */}
          <div style={{ width: 360, background: C.panel, border: `1px solid ${C.neural}40`, borderRadius: 12, padding: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${C.neural}, ${C.cyan})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 900, color: C.text }}>A</span>
              </div>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 4 }}>Access Neural</div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textAlign: 'center', marginBottom: 26 }}>Sign in to your Arbitrage Terminal account</div>

            {[['Email address','you@example.com'],['Password','••••••••••']].map(([l,p]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub, marginBottom: 5 }}>{l}</div>
                <div style={{ height: 40, background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 6, padding: '0 14px', display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 12, color: C.mute }}>{p}</div>
              </div>
            ))}

            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <span style={{ fontFamily: SANS, fontSize: 10, color: C.violet, cursor: 'pointer' }}>Forgot password?</span>
            </div>

            <div style={{ height: 44, background: `linear-gradient(90deg, ${C.neural}, ${C.blue})`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.text, cursor: 'pointer', letterSpacing: 0.5 }}>
              Sign In to Neural
            </div>

            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontFamily: SANS, fontSize: 10, color: C.mute }}>or</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['Google','GitHub'].map(p => (
                <div key={p} style={{ height: 38, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 11, color: C.sub, cursor: 'pointer' }}>{p}</div>
              ))}
            </div>

            <div style={{ marginTop: 16, textAlign: 'center', fontFamily: SANS, fontSize: 10, color: C.mute }}>
              Free · 15s delayed · <span style={{ color: C.cyan }}>Upgrade for live neural feed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   FUNDING RATES — Neural data table
══════════════════════════════════════════════════════════════════════ */
function FundingPage() {
  const rows = [
    { sym: 'BTC/USDT', binance: '+0.0100%', bybit: '+0.0089%', okx: '+0.0102%', best: 'OKX',     arb: '0.0013%', opp: true  },
    { sym: 'SOL/USDT', binance: '+0.0213%', bybit: '+0.0187%', okx: '+0.0221%', best: 'OKX',     arb: '0.0034%', opp: true  },
    { sym: 'INJ/USDT', binance: '-0.0089%', bybit: '-0.0102%', okx: '-0.0094%', best: 'Binance', arb: '0.0013%', opp: false },
    { sym: 'ETH/USDT', binance: '+0.0054%', bybit: '+0.0061%', okx: '+0.0058%', best: 'Bybit',   arb: '0.0007%', opp: false },
    { sym: 'WIF/USDT', binance: '+0.0342%', bybit: '+0.0311%', okx: '+0.0358%', best: 'OKX',     arb: '0.0047%', opp: true  },
  ]

  return (
    <div>
      <ConceptBadge label="FUNDING RATES" accent={C.gold} />
      <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <Nav active="Funding Rates" />
        <div style={{ display: 'flex', height: 300 }}>
          {/* Left filter sidebar */}
          <div style={{ width: 148, background: C.panel, borderRight: `1px solid ${C.border}`, padding: 12 }}>
            <Label children="Filters" accent={C.gold} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
              {['ALL','USDT','USDC'].map((t, i) => (
                <div key={t} style={{ padding: '5px 8px', background: i === 0 ? C.gold + '18' : 'transparent', border: `1px solid ${i === 0 ? C.gold + '50' : C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 9, color: i === 0 ? C.gold : C.sub, cursor: 'pointer' }}>{t}</div>
              ))}
            </div>
            <Label children="Exchanges" accent={C.blue} />
            {['Binance','Bybit','OKX','Bitget'].map((e,i) => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 11, height: 11, border: `1px solid ${C.rim}`, borderRadius: 2, background: i < 3 ? C.blue + '30' : 'transparent', flexShrink: 0 }} />
                <span style={{ fontFamily: SANS, fontSize: 10, color: i < 3 ? C.text : C.sub }}>{e}</span>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <KPI value="3" label="Arb Opps" sub="above threshold" color={C.gold} />
            </div>
          </div>

          {/* Table area */}
          <div style={{ flex: 1, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
              <KPI value="18" label="Exchanges" sub="with futures" color={C.blue} />
              <KPI value="127" label="Symbols" sub="tracked" color={C.sub} />
              <KPI value="3" label="Arb Opps" sub="> 0.003% spread" color={C.gold} live />
              <KPI value="08:00" label="Next Reset" sub="in 4h 30m" color={C.cyan} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.lift }}>
                  {['Symbol','Binance','Bybit','OKX','Best Exchange','Arb Spread',''].map((h,i) => (
                    <th key={h+i} style={{ padding: '5px 10px', textAlign: 'left', fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8, fontWeight: 600 }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: r.opp ? C.gold + '05' : 'transparent' }}>
                    <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 11, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                    <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: r.binance.startsWith('+') ? C.green : C.red }}>{r.binance}</td>
                    <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: r.bybit.startsWith('+') ? C.green : C.red }}>{r.bybit}</td>
                    <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: r.okx.startsWith('+') ? C.green : C.red }}>{r.okx}</td>
                    <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: C.cyan }}>{r.best}</td>
                    <td style={{ padding: '6px 10px', fontFamily: MONO, fontSize: 10, color: r.opp ? C.gold : C.sub, fontWeight: r.opp ? 600 : 400 }}>{r.arb}</td>
                    <td style={{ padding: '6px 10px' }}>{r.opp && <Chip color={C.gold}>OPP</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════════ */
export default function ConceptGPage() {
  return (
    <div style={{ background: '#040810', minHeight: '100vh', color: C.text, fontFamily: SANS }}>
      {/* Page header */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/concepts" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none' }}>← All Concepts</Link>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <div style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${C.neural}, ${C.cyan})`, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 900, color: C.text }}>G</div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1 }}>Neural</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub }}>Deep navy · purple AI identity · cyan live signals · green profit</div>
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/concepts/e" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none' }}>← View Concept E: Obsidian</Link>
        <Link href="/" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none', marginLeft: 12 }}>← App</Link>
      </div>

      {/* Design system identity bar */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', display: 'flex', gap: 28, alignItems: 'center', overflowX: 'auto' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 1.2, flexShrink: 0 }}>DESIGN SYSTEM</span>
        {[
          { hex: '#060B14', label: 'Background' },
          { hex: '#0A1120', label: 'Panel' },
          { hex: '#7C3AED', label: 'Neural/AI' },
          { hex: '#A78BFA', label: 'Magnus' },
          { hex: '#06B6D4', label: 'Live signal' },
          { hex: '#10B981', label: 'Profit' },
          { hex: '#3B82F6', label: 'Info' },
          { hex: '#F59E0B', label: 'High value' },
          { hex: '#14B8A6', label: 'DEX/chain' },
          { hex: '#F43F5E', label: 'Loss' },
        ].map(s => (
          <div key={s.hex} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, background: s.hex, borderRadius: 3, border: `1px solid ${C.rim}` }} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{s.hex}</div>
              <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>{s.label}</div>
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.violet }}>IBM Plex Mono</span>
          <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>IBM Plex Sans</span>
        </div>
      </div>

      {/* Page mockups */}
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <DashboardPage />
        <MagnusPage />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <LoginPage />
          <FundingPage />
        </div>
      </div>
    </div>
  )
}
