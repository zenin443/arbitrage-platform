'use client'
import { useState } from 'react'
import Link from 'next/link'

/* ─────────────────────────────────────────────────────────────────────────
   CONCEPT E — OBSIDIAN · ALL 15 PAGES
   Full site wireframe in the Obsidian design system.
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
  teal:    '#14B8A6',
  orange:  '#F97316',
}
const MONO = "'IBM Plex Mono', 'Fira Code', monospace"
const SANS = "'IBM Plex Sans', 'Inter', system-ui, sans-serif"

/* ── Shared primitives ───────────────────────────────────────────────── */
function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function Label({ children, accent, noMb }: { children: string; accent?: string; noMb?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: noMb ? 0 : 9 }}>
      <div style={{ width: 2, height: 10, background: accent ?? C.gold, borderRadius: 1 }} />
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.mute, letterSpacing: 1.3 }}>{children.toUpperCase()}</span>
    </div>
  )
}

function Chip({ color, children, size = 9 }: { color: string; children: React.ReactNode; size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, background: color + '18', border: `1px solid ${color}40`, fontFamily: MONO, fontSize: size, color, letterSpacing: 0.6 }}>
      {children}
    </div>
  )
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontFamily: MONO, fontSize: 8, color, background: color + '18', padding: '2px 5px', borderRadius: 3, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{children}</span>
}

function KPI({ value, label, sub, color, live }: { value: string; label: string; sub?: string; color?: string; live?: boolean }) {
  const c = color ?? C.gold
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '11px 13px', borderLeft: `2px solid ${c}`, position: 'relative' }}>
      {live && <div style={{ position: 'absolute', top: 9, right: 9, width: 5, height: 5, borderRadius: '50%', background: c }} />}
      <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute, letterSpacing: 1.1, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: c, lineHeight: 1, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub }}>{sub}</div>}
    </div>
  )
}

function ScoreBadge({ s }: { s: 'HIGH'|'MED'|'LOW' }) {
  const c = { HIGH: C.green, MED: C.gold, LOW: C.mute }[s]
  return <Tag color={c}>{s}</Tag>
}

function THead({ cols, rightFrom = 99 }: { cols: string[]; rightFrom?: number }) {
  return (
    <thead>
      <tr style={{ background: C.lift }}>
        {cols.map((h, i) => (
          <th key={h + i} style={{ padding: '5px 9px', textAlign: i >= rightFrom ? 'right' : 'left', fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}

function Nav({ active }: { active: string }) {
  const links = ['Intelligence', 'Magnus', 'DEX Markets', 'Funding Rates', 'Dashboard']
  return (
    <nav style={{ height: 48, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 900, color: C.bg }}>A</span>
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1 }}>Arbitrage Terminal</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>v0.7.4</div>
        </div>
      </div>
      <div style={{ width: 1, height: 16, background: C.border }} />
      <Chip color={C.green} size={8}><Dot color={C.green} size={4} />LIVE</Chip>
      <span style={{ fontFamily: MONO, fontSize: 9, color: C.mute }}>16:30:45</span>
      <div style={{ flex: 1 }} />
      {links.map(l => (
        <span key={l} style={{ fontFamily: SANS, fontSize: 11, color: l === active ? C.text : C.sub, fontWeight: l === active ? 600 : 400, paddingBottom: 2, borderBottom: l === active ? `1px solid ${C.gold}` : '1px solid transparent', cursor: 'pointer', letterSpacing: 0.1 }}>{l}</span>
      ))}
      <div style={{ width: 1, height: 16, background: C.border }} />
      <span style={{ fontSize: 13, color: C.mute }}>⚙</span>
      <div style={{ padding: '4px 12px', border: `1px solid ${C.gold}50`, borderRadius: 4, fontFamily: MONO, fontSize: 9, color: C.gold, cursor: 'pointer' }}>Sign In</div>
    </nav>
  )
}

function PageWrap({ label, accent, children, fullWidth }: { label: string; accent?: string; children: React.ReactNode; fullWidth?: boolean }) {
  const ac = accent ?? C.gold
  return (
    <div>
      <div style={{ padding: '4px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, display: 'inline-flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ width: 2, height: 14, background: ac, borderRadius: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 700 }}>{label}</span>
        <Chip color={ac} size={8}>OBSIDIAN</Chip>
      </div>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', ...(fullWidth ? {} : {}) }}>
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   1. DASHBOARD
══════════════════════════════════════════════════════════════════════ */
function DashboardWire() {
  const rows = [
    { sym: 'INJ/USDT',  route: 'hyperliquid → bitfinex', sp: '0.39%', net: '0.24%', pnl: '+$2.39', liq: '$20K', type: 'DEX-CEX', sc: 'HIGH' as const },
    { sym: 'DOT/USDT',  route: 'bingx → okx',            sp: '0.31%', net: '0.16%', pnl: '+$1.60', liq: '$35K', type: 'CEX-CEX', sc: 'HIGH' as const },
    { sym: 'SOL/USDC',  route: 'coinbase → mexc',         sp: '0.28%', net: '0.13%', pnl: '+$1.30', liq: '$18K', type: 'CEX-CEX', sc: 'MED'  as const },
    { sym: 'WIF/USDT',  route: 'bingx → okx',             sp: '0.22%', net: '0.07%', pnl: '+$0.70', liq: '$8K',  type: 'S-F',     sc: 'MED'  as const },
    { sym: 'ETH/USDC',  route: 'uniswap → binance',       sp: '0.19%', net: '0.04%', pnl: '+$0.40', liq: '$50K', type: 'DEX-CEX', sc: 'LOW'  as const },
  ]
  const typeColor = (t: string) => ({ 'DEX-CEX': C.purple, 'CEX-CEX': C.blue, 'S-F': C.gold })[t] ?? C.sub

  return (
    <PageWrap label="DASHBOARD">
      <Nav active="Dashboard" />
      <div style={{ display: 'flex', height: 390 }}>
        {/* Watchlist sidebar */}
        <div style={{ width: 162, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
            <Label children="Watchlist" />
            <div style={{ height: 24, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              <span style={{ fontFamily: SANS, fontSize: 9, color: C.mute }}>Search...</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'hidden' }}>
            {[['BTC','67,214','+0.2',C.green],['ETH','3,521','-0.1',C.red],['SOL','168.4','+1.3',C.green],['WIF','2.84','+0.8',C.green],['INJ','28.50','-0.4',C.red],['DOT','6.82','+0.3',C.green],['ORDI','42.10','+2.1',C.green],['NEAR','7.14','-0.2',C.red]].map(([c,p,ch,cl]) => (
              <div key={c as string} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', padding: '4px 12px', borderBottom: `1px solid ${C.border}14`, gap: 3, alignItems: 'center' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.text, fontWeight: 600 }}>{c as string}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{p as string}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: cl as string }}>{ch as string}%</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
            <Label children="Magnus Alpha" accent={C.purple} />
            <div style={{ background: C.bg, border: `1px solid ${C.purple}30`, borderRadius: 5, padding: '7px 10px' }}>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: C.purple, lineHeight: 1 }}>98.7%</div>
              <div style={{ fontFamily: SANS, fontSize: 8, color: C.sub, marginTop: 2 }}>win rate · 2,534 trades</div>
            </div>
          </div>
        </div>
        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 26, background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: SANS, fontSize: 9, color: C.mute }}>Trade on Binance — lowest fees in crypto →</span>
          </div>
          <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 12 }}>
              <KPI value="18"    label="Exchanges" sub="active feeds"  color={C.blue} />
              <KPI value="128"   label="Symbols"   sub="tracked"       color={C.sub}  />
              <KPI value="4,753" label="Gaps / hr" sub="↑ from 3,200"  color={C.green} live />
              <KPI value="0.39%" label="Best Spread" sub="INJ/USDT"    color={C.gold} live />
            </div>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Label children="Live Profitable Gaps" accent={C.blue} noMb />
              <div style={{ flex: 1 }} />
              <Chip color={C.green} size={8}><Dot color={C.green} size={4} />LIVE · 4,753 gaps/hr</Chip>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['SYMBOL','ROUTE','SPREAD','NET %','EST. PROFIT','LIQUIDITY','TYPE','SCORE']} rightFrom={2} />
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                    <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 8, color: C.sub }}>{r.route}</td>
                    <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green, fontWeight: 600 }}>{r.sp}</td>
                    <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green }}>{r.net}</td>
                    <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 700 }}>{r.pnl}</td>
                    <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.liq}</td>
                    <td style={{ padding: '6px 9px', textAlign: 'right' }}><Tag color={typeColor(r.type)}>{r.type}</Tag></td>
                    <td style={{ padding: '6px 9px', textAlign: 'right' }}><ScoreBadge s={r.sc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Right panel */}
        <div style={{ width: 156, background: C.panel, borderLeft: `1px solid ${C.border}`, padding: 12 }}>
          <Label children="Signal Insight" />
          <div style={{ background: C.bg, border: `1px solid ${C.gold}30`, borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 1 }}>INJ/USDT</div>
            <div style={{ fontFamily: SANS, fontSize: 8, color: C.sub, marginBottom: 6 }}>hyperliquid → bitfinex</div>
            <div style={{ fontFamily: MONO, fontSize: 20, color: C.green, fontWeight: 700 }}>+$2.39</div>
            <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute, marginTop: 2 }}>0.39% · 24s · HIGH</div>
          </div>
          <Label children="Coverage" accent={C.blue} />
          {[['Binance',95,C.green],['OKX',90,C.green],['Bybit',88,C.blue],['MEXC',65,C.sub]].map(([ex,w,c]) => (
            <div key={ex as string} style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{ex as string}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: c as string }}>{w as number}%</span>
              </div>
              <div style={{ height: 2, background: C.border, borderRadius: 1 }}>
                <div style={{ width: `${w}%`, height: '100%', background: c as string, borderRadius: 1 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2. INTELLIGENCE
══════════════════════════════════════════════════════════════════════ */
function IntelligenceWire() {
  const rows = [
    { sym: 'BTC/USDT',  type: 'CEX-CEX', sp: '0.31%', net: '0.16%', route: 'binance → okx',   pnl: '+$1.60', dur: '18s', sc: 'HIGH' as const },
    { sym: 'SOL/USDC',  type: 'DEX-CEX', sp: '0.28%', net: '0.13%', route: 'coinbase → mexc', pnl: '+$1.30', dur: '31s', sc: 'MED'  as const },
    { sym: 'INJ/USDT',  type: 'DEX-CEX', sp: '0.39%', net: '0.24%', route: 'hyperliquid → bitfinex', pnl: '+$2.39', dur: '24s', sc: 'HIGH' as const },
    { sym: 'WIF/USDT',  type: 'S-F',     sp: '0.22%', net: '0.07%', route: 'bingx → okx',     pnl: '+$0.70', dur: '42s', sc: 'MED'  as const },
    { sym: 'NEAR/USDT', type: 'CEX-CEX', sp: '0.17%', net: '0.02%', route: 'bybit → mexc',    pnl: '+$0.20', dur: '55s', sc: 'LOW'  as const },
  ]
  const typeC = (t: string) => ({ 'DEX-CEX': C.purple, 'CEX-CEX': C.blue, 'S-F': C.gold })[t] ?? C.sub

  return (
    <PageWrap label="INTELLIGENCE">
      <Nav active="Intelligence" />
      <div style={{ display: 'flex', height: 430 }}>
        {/* Left sidebar */}
        <div style={{ width: 156, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '10px 12px', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
              {['ALL','USDT','USDC','BTC'].map((t, i) => (
                <div key={t} style={{ padding: '2px 6px', background: i === 0 ? C.gold + '20' : 'transparent', border: `1px solid ${i === 0 ? C.gold + '50' : C.border}`, borderRadius: 3, fontFamily: MONO, fontSize: 8, color: i === 0 ? C.gold : C.sub }}>{t}</div>
              ))}
            </div>
            <Label children="Pulse" />
            <div style={{ display: 'flex', gap: 8 }}>
              <div><div style={{ fontFamily: MONO, fontSize: 14, color: C.green, fontWeight: 700 }}>4,753</div><div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>gaps/hr</div></div>
              <div><div style={{ fontFamily: MONO, fontSize: 14, color: C.sub, fontWeight: 700 }}>128</div><div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>tracked</div></div>
            </div>
          </div>
          <div>
            <Label children="Top Routes" />
            {[['Binance → OKX','38%',C.blue],['Hyperliquid → Bitfinex','24%',C.purple],['BingX → OKX','21%',C.blue],['Coinbase → MEXC','17%',C.teal]].map(([r,p,c]) => (
              <div key={r as string} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{r as string}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: c as string }}>{p as string}</span>
                </div>
                <div style={{ height: 2, background: C.border, borderRadius: 1 }}>
                  <div style={{ width: p as string, height: '100%', background: c as string, borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <Label children="Gap Types" />
            {[['CEX-CEX','52%',C.blue],['DEX-CEX','31%',C.purple],['S-F','17%',C.gold]].map(([t,p,c]) => (
              <div key={t as string} style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{t as string}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: c as string }}>{p as string}</span>
                </div>
                <div style={{ height: 2, background: C.border, borderRadius: 1 }}>
                  <div style={{ width: p as string, height: '100%', background: c as string, borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <Label children="Magnus Alpha" accent={C.purple} />
            <div style={{ background: C.bg, border: `1px solid ${C.purple}30`, borderRadius: 5, padding: '7px 9px' }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.purple }}>98.7%</div>
              <div style={{ fontFamily: SANS, fontSize: 8, color: C.sub }}>2,534 trades · $16K</div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 26, background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: SANS, fontSize: 9, color: C.mute }}>Upgrade to Pro — live feed + Magnus AI signals →</span>
          </div>
          <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 10 }}>
              <KPI value="10,000" label="Gaps Detected" sub="+12% today"     color={C.blue} />
              <KPI value="491"    label="Profitable"    sub="4.9% rate"       color={C.green} live />
              <KPI value="0.043%" label="Avg Spread"    sub="+0.003% vs 24h"  color={C.gold} />
              <KPI value="0.39%"  label="Best Spread"   sub="INJ/USDT"        color={C.gold} live />
            </div>
            {/* Widgets row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr', gap: 7, marginBottom: 10, height: 120 }}>
              {/* Heatmap */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px' }}>
                <Label children="ARB Heatmap" noMb />
                <div style={{ marginTop: 7, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 2 }}>
                  {['BTC','ETH','SOL','INJ','WIF','DOT','BNB','NEAR','ARB','OP','MATIC','AVAX'].map((s, i) => {
                    const intensity = [90,75,60,85,70,55,45,65,50,40,35,30][i]
                    const c = intensity > 80 ? C.green : intensity > 60 ? C.gold : intensity > 40 ? C.blue : C.mute
                    return <div key={s} style={{ height: 18, background: c + '30', border: `1px solid ${c}50`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: MONO, fontSize: 6, color: c }}>{s}</span>
                    </div>
                  })}
                </div>
              </div>
              {/* Spread dist */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px' }}>
                <Label children="Spread Dist" noMb />
                <div style={{ marginTop: 7, display: 'flex', gap: 2, alignItems: 'flex-end', height: 60 }}>
                  {[45,72,88,95,78,62,48,35,24,16].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, background: i < 3 ? C.green + '60' : i < 7 ? C.gold + '60' : C.mute + '60', borderRadius: '2px 2px 0 0' }} />
                  ))}
                </div>
              </div>
              {/* Type profit */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px' }}>
                <Label children="Type Profit" noMb />
                <div style={{ marginTop: 7 }}>
                  {[['CEX-CEX',72,C.blue],['DEX-CEX',85,C.purple],['S-F',61,C.gold]].map(([t,w,c]) => (
                    <div key={t as string} style={{ marginBottom: 7 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{t as string}</span>
                        <span style={{ fontFamily: MONO, fontSize: 8, color: c as string }}>{w as number}%</span>
                      </div>
                      <div style={{ height: 3, background: C.border, borderRadius: 1 }}>
                        <div style={{ width: `${w}%`, height: '100%', background: c as string, borderRadius: 1 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Filters + table */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'center' }}>
              {['ALL (697)','USDT (551)','USDC (103)','BTC (4)'].map((t, i) => (
                <div key={t} style={{ padding: '3px 9px', background: i === 0 ? C.gold + '18' : 'transparent', border: `1px solid ${i === 0 ? C.gold + '50' : C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 8, color: i === 0 ? C.gold : C.sub }}>{t}</div>
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['SYMBOL','TYPE','SPREAD','NET %','ROUTE','EST. PROFIT','DURATION','SCORE']} rightFrom={2} />
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                    <td style={{ padding: '5px 9px' }}><Tag color={typeC(r.type)}>{r.type}</Tag></td>
                    <td style={{ padding: '5px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green, fontWeight: 600 }}>{r.sp}</td>
                    <td style={{ padding: '5px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green }}>{r.net}</td>
                    <td style={{ padding: '5px 9px', fontFamily: MONO, fontSize: 8, color: C.sub }}>{r.route}</td>
                    <td style={{ padding: '5px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 700 }}>{r.pnl}</td>
                    <td style={{ padding: '5px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.dur}</td>
                    <td style={{ padding: '5px 9px', textAlign: 'right' }}><ScoreBadge s={r.sc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ width: 152, background: C.panel, borderLeft: `1px solid ${C.border}`, padding: 12 }}>
          <Label children="Most Gapped" />
          {[['BTC',53,'0.072%'],['ETH',53,'0.075%'],['SOL',41,'0.063%'],['INJ',38,'0.091%']].map(([s,c,p]) => (
            <div key={s as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.text, fontWeight: 600 }}>{s as string}</span>
              <span style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{c as number}</span>
              <span style={{ fontFamily: MONO, fontSize: 8, color: C.green }}>{p as string}</span>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <Label children="Price Variance" accent={C.blue} />
            {[['Binance',62,C.green],['OKX',55,C.blue],['Bybit',48,C.blue],['MEXC',38,C.sub]].map(([ex,w,c]) => (
              <div key={ex as string} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: C.sub }}>{ex as string}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: c as string }}>{w as number}%</span>
                </div>
                <div style={{ height: 2, background: C.border, borderRadius: 1 }}>
                  <div style={{ width: `${w}%`, height: '100%', background: c as string, borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3. MAGNUS
══════════════════════════════════════════════════════════════════════ */
function MagnusWire() {
  const [active, setActive] = useState('NEXUS')
  const bots = [
    { id: 'NEXUS',  strategy: 'Alpha · CEX/DEX',  win: '98.7%', pnl: '+$16,000', color: C.gold   },
    { id: 'HERMES', strategy: 'Futures · Multi',   win: '94.2%', pnl: '+$7,800',  color: C.blue   },
    { id: 'KRONOS', strategy: 'Calendar Spread',   win: '87.1%', pnl: '+$3,200',  color: C.purple },
    { id: 'ATLAS',  strategy: 'Pairs Trading',     win: '91.3%', pnl: '+$5,100',  color: C.cyan   },
    { id: 'VEGA',   strategy: 'Simulator',         win: '—',     pnl: '—',        color: C.mute   },
  ]
  const bot = bots.find(b => b.id === active)!
  const trades = [
    { t: '16:28', sym: 'INJ/USDT',  pnl: '+$2.39', dur: '24s', sc: 'HIGH' as const },
    { t: '16:25', sym: 'DOT/USDT',  pnl: '+$1.87', dur: '18s', sc: 'HIGH' as const },
    { t: '16:21', sym: 'SOL/USDC',  pnl: '+$3.12', dur: '31s', sc: 'MED'  as const },
    { t: '16:17', sym: 'WIF/USDT',  pnl: '-$0.45', dur: '42s', sc: 'LOW'  as const },
    { t: '16:14', sym: 'ETH/USDC',  pnl: '+$5.66', dur: '12s', sc: 'HIGH' as const },
  ]
  return (
    <PageWrap label="MAGNUS — AI BOT PERFORMANCE" accent={C.purple}>
      <Nav active="Magnus" />
      <div style={{ display: 'flex', height: 440 }}>
        {/* Bot list */}
        <div style={{ width: 188, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
            <Label children="AI Fleet" accent={C.purple} />
            <Chip color={C.green} size={8}><Dot color={C.green} size={4} />4 LIVE</Chip>
          </div>
          <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {bots.map(b => (
              <div key={b.id} onClick={() => setActive(b.id)} style={{ padding: '9px 11px', borderRadius: 6, cursor: 'pointer', background: b.id === active ? b.color + '12' : C.card, border: `1px solid ${b.id === active ? b.color + '50' : C.border}`, borderLeft: `3px solid ${b.id === active ? b.color : 'transparent'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: b.id === active ? b.color : C.text }}>{b.id}</span>
                  {b.id !== 'VEGA' && <Dot color={C.green} size={4} />}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute, marginBottom: 4 }}>{b.strategy}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.sub }}>{b.win}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: b.pnl.startsWith('+') ? C.green : C.mute, fontWeight: 600 }}>{b.pnl}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Performance */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: bot.color + '0C', border: `1px solid ${bot.color}30`, borderRadius: 7 }}>
            <div style={{ width: 38, height: 38, background: bot.color + '20', border: `1px solid ${bot.color}60`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 900, color: bot.color }}>{bot.id[0]}</span>
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: bot.color }}>{bot.id}</div>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>{bot.strategy}</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.green }}>{bot.pnl}</div>
              <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>cumulative P&L</div>
            </div>
            <Chip color={bot.id === 'VEGA' ? C.mute : C.green} size={8}>{bot.id === 'VEGA' ? 'SIMULATION' : 'LIVE'}</Chip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            <KPI value={bot.win}  label="Win Rate"    color={C.green} sub="90 days" />
            <KPI value="2,534"    label="Trades"      color={C.blue}  sub="all time" />
            <KPI value="2.1%"     label="Max DD"      color={C.red}   sub="peak-trough" />
            <KPI value="4.7"      label="Sharpe"      color={C.gold}  sub="risk-adj" live />
          </div>
          {/* Chart */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', flex: 1 }}>
            <Label children="Equity Curve" accent={bot.color} />
            <svg width="100%" height="80" viewBox="0 0 700 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mcg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bot.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={bot.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[20,40,60].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke={C.border} strokeWidth="0.5" />)}
              <path d="M0,72 C80,68 160,60 240,50 C310,40 360,44 430,32 C500,20 560,16 630,8 L700,3" fill="none" stroke={bot.color} strokeWidth="2" />
              <path d="M0,72 C80,68 160,60 240,50 C310,40 360,44 430,32 C500,20 560,16 630,8 L700,3 L700,80 L0,80 Z" fill="url(#mcg)" />
            </svg>
          </div>
          {/* Trades */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['TIME','SYMBOL','P&L','DUR','CONF']} rightFrom={2} />
            <tbody>
              {trades.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '5px 9px', fontFamily: MONO, fontSize: 8, color: C.mute }}>{r.t}</td>
                  <td style={{ padding: '5px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                  <td style={{ padding: '5px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: r.pnl.startsWith('+') ? C.green : C.red, fontWeight: 700 }}>{r.pnl}</td>
                  <td style={{ padding: '5px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.dur}</td>
                  <td style={{ padding: '5px 9px', textAlign: 'right' }}><ScoreBadge s={r.sc} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   4. FUNDING RATES
══════════════════════════════════════════════════════════════════════ */
function FundingRatesWire() {
  const rows = [
    { sym: 'BTC/USDT', bi: '+0.0100%', bb: '+0.0089%', ok: '+0.0102%', best: 'OKX',     arb: '0.0013%', opp: false },
    { sym: 'SOL/USDT', bi: '+0.0213%', bb: '+0.0187%', ok: '+0.0221%', best: 'OKX',     arb: '0.0034%', opp: true  },
    { sym: 'WIF/USDT', bi: '+0.0342%', bb: '+0.0311%', ok: '+0.0358%', best: 'OKX',     arb: '0.0047%', opp: true  },
    { sym: 'INJ/USDT', bi: '-0.0089%', bb: '-0.0102%', ok: '-0.0094%', best: 'Binance', arb: '0.0013%', opp: false },
    { sym: 'ETH/USDT', bi: '+0.0054%', bb: '+0.0061%', ok: '+0.0058%', best: 'Bybit',   arb: '0.0007%', opp: false },
  ]
  return (
    <PageWrap label="FUNDING RATES" accent={C.cyan}>
      <Nav active="Funding Rates" />
      <div style={{ display: 'flex', height: 360 }}>
        <div style={{ width: 144, background: C.panel, borderRight: `1px solid ${C.border}`, padding: 12 }}>
          <Label children="Filters" accent={C.cyan} />
          {['ALL','USDT','USDC','BTC'].map((t, i) => (
            <div key={t} style={{ padding: '4px 8px', marginBottom: 4, background: i === 0 ? C.cyan + '18' : 'transparent', border: `1px solid ${i === 0 ? C.cyan + '50' : C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 8, color: i === 0 ? C.cyan : C.sub }}>{t}</div>
          ))}
          <div style={{ marginTop: 10 }}>
            <Label children="Exchanges" accent={C.blue} />
            {['Binance','Bybit','OKX','Bitget'].map((e, i) => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, background: i < 3 ? C.blue + '30' : 'transparent', border: `1px solid ${C.rim}`, borderRadius: 2 }} />
                <span style={{ fontFamily: SANS, fontSize: 9, color: i < 3 ? C.text : C.sub }}>{e}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <KPI value="3" label="Arb Opps" sub="≥ 0.003%" color={C.gold} />
          </div>
        </div>
        <div style={{ flex: 1, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 12 }}>
            <KPI value="18"    label="Exchanges" sub="futures data"   color={C.blue} />
            <KPI value="127"   label="Symbols"   sub="tracked"        color={C.sub} />
            <KPI value="3"     label="Arb Opps"  sub="above threshold" color={C.gold} live />
            <KPI value="08:00" label="Next Reset" sub="in 4h 30m"     color={C.cyan} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['SYMBOL','BINANCE','BYBIT','OKX','BEST EXCHANGE','ARB SPREAD','']} rightFrom={1} />
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: r.opp ? C.gold + '05' : 'transparent' }}>
                  <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: r.bi.startsWith('+') ? C.green : C.red }}>{r.bi}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: r.bb.startsWith('+') ? C.green : C.red }}>{r.bb}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: r.ok.startsWith('+') ? C.green : C.red }}>{r.ok}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.cyan }}>{r.best}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: r.opp ? C.gold : C.sub, fontWeight: r.opp ? 600 : 400 }}>{r.arb}</td>
                  <td style={{ padding: '6px 9px' }}>{r.opp && <Tag color={C.gold}>OPP</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   5. CROSS-CHAIN
══════════════════════════════════════════════════════════════════════ */
function CrossChainWire() {
  const rows = [
    { sym: 'USDC',   buyC: 'Ethereum',  sellC: 'Arbitrum',  gross: '0.41%', bridge: '0.08%', net: '0.33%', pnl: '+$3.30', liq: '$50K', sc: 'HIGH' as const },
    { sym: 'ETH',    buyC: 'Optimism',  sellC: 'Base',      gross: '0.28%', bridge: '0.06%', net: '0.22%', pnl: '+$2.20', liq: '$38K', sc: 'HIGH' as const },
    { sym: 'MATIC',  buyC: 'Polygon',   sellC: 'Ethereum',  gross: '0.19%', bridge: '0.12%', net: '0.07%', pnl: '+$0.70', liq: '$12K', sc: 'MED'  as const },
    { sym: 'ARB',    buyC: 'Arbitrum',  sellC: 'Optimism',  gross: '0.15%', bridge: '0.10%', net: '0.05%', pnl: '+$0.50', liq: '$8K',  sc: 'LOW'  as const },
  ]
  const chainC = (c: string) => ['Ethereum','Base'].includes(c) ? C.blue : ['Arbitrum','Optimism'].includes(c) ? C.purple : C.teal
  return (
    <PageWrap label="CROSS-CHAIN ARBITRAGE" accent={C.teal}>
      <Nav active="Intelligence" />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 12 }}>
          <KPI value="11"    label="Chains"      sub="monitored"     color={C.teal} />
          <KPI value="4"     label="Opps Now"    sub="above 0.20%"   color={C.green} live />
          <KPI value="0.33%" label="Best Net"    sub="USDC · Eth→Arb" color={C.gold} live />
          <KPI value="0.09%" label="Avg Bridge"  sub="estimated"     color={C.sub} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['SYMBOL','BUY CHAIN','→','SELL CHAIN','GROSS %','BRIDGE COST','NET %','P&L @$1K','LIQUIDITY','CONF']} rightFrom={4} />
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                <td style={{ padding: '6px 9px' }}><Tag color={chainC(r.buyC)}>{r.buyC}</Tag></td>
                <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 10, color: C.teal }}>→</td>
                <td style={{ padding: '6px 9px' }}><Tag color={chainC(r.sellC)}>{r.sellC}</Tag></td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green }}>{r.gross}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.red }}>{r.bridge}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green, fontWeight: 600 }}>{r.net}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 700 }}>{r.pnl}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.liq}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right' }}><ScoreBadge s={r.sc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   6. TRIANGULAR
══════════════════════════════════════════════════════════════════════ */
function TriangularWire() {
  const rows = [
    { ex: 'Binance', path: 'BTC → ETH → USDT → BTC', gross: '0.52%', fees: '0.15%', net: '0.37%', pnl: '+$3.70', sc: 'HIGH' as const },
    { ex: 'OKX',     path: 'SOL → BTC → USDT → SOL', gross: '0.41%', fees: '0.15%', net: '0.26%', pnl: '+$2.60', sc: 'HIGH' as const },
    { ex: 'Bybit',   path: 'INJ → ETH → USDT → INJ', gross: '0.35%', fees: '0.15%', net: '0.20%', pnl: '+$2.00', sc: 'MED'  as const },
    { ex: 'Binance', path: 'WIF → SOL → USDT → WIF', gross: '0.27%', fees: '0.15%', net: '0.12%', pnl: '+$1.20', sc: 'MED'  as const },
    { ex: 'OKX',     path: 'ARB → ETH → USDT → ARB', gross: '0.21%', fees: '0.15%', net: '0.06%', pnl: '+$0.60', sc: 'LOW'  as const },
  ]
  const exC = (e: string) => ({ 'Binance': C.gold, 'OKX': C.blue, 'Bybit': C.orange })[e] ?? C.sub
  return (
    <PageWrap label="TRIANGULAR ARBITRAGE" accent={C.orange}>
      <Nav active="Intelligence" />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 12 }}>
          <KPI value="5"     label="Opps Now"  sub="net positive"     color={C.green} live />
          <KPI value="0.37%" label="Best Net"  sub="Binance BTC loop" color={C.gold} live />
          <KPI value="0.15%" label="Avg Fees"  sub="3 legs"           color={C.sub} />
          <KPI value="8"     label="Exchanges" sub="monitored"        color={C.blue} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['EXCHANGE','PATH','GROSS %','FEES','NET %','P&L @$1K','CONF']} rightFrom={2} />
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '6px 9px' }}><Tag color={exC(r.ex)}>{r.ex}</Tag></td>
                <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.path}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green }}>{r.gross}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.red }}>{r.fees}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green, fontWeight: 600 }}>{r.net}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 700 }}>{r.pnl}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right' }}><ScoreBadge s={r.sc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   7. DEX
══════════════════════════════════════════════════════════════════════ */
function DexWire() {
  return (
    <PageWrap label="DEX ARBITRAGE" accent={C.purple}>
      <Nav active="Intelligence" />
      <div style={{ display: 'flex', height: 380 }}>
        {/* Token pair sidebar */}
        <div style={{ width: 156, background: C.panel, borderRight: `1px solid ${C.border}`, padding: 12 }}>
          <Label children="Pairs" accent={C.purple} />
          {[['ETH/USDC','$3,521','DEX'],['SOL/USDC','$168.4','DEX'],['WIF/SOL','$2.84','DEX'],['INJ/USDT','$28.50','DEX'],['ARB/ETH','$1.15','DEX']].map(([p,pr,t], i) => (
            <div key={p as string} style={{ padding: '8px 10px', marginBottom: 4, background: i === 0 ? C.purple + '12' : C.card, border: `1px solid ${i === 0 ? C.purple + '40' : C.border}`, borderRadius: 5, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: i === 0 ? C.purple : C.text, fontWeight: 600 }}>{p as string}</span>
                <Tag color={C.purple}>{t as string}</Tag>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.sub }}>{pr as string}</span>
            </div>
          ))}
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            <KPI value="$3,521" label="ETH/USDC"  sub="current price"  color={C.blue} />
            <KPI value="0.31%"  label="Arb Spread" sub="Uni v3 → Curve" color={C.green} live />
            <KPI value="$2.1M"  label="Pool TVL"   sub="Uniswap v3"    color={C.sub} />
            <KPI value="0.3%"   label="Pool Fee"   sub="active tier"   color={C.gold} />
          </div>
          {/* Price chart */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', flex: 1 }}>
            <Label children="Price Comparison · Uniswap vs Curve vs Balancer" accent={C.purple} />
            <svg width="100%" height="90" viewBox="0 0 700 90" preserveAspectRatio="none">
              {[20,40,60,80].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke={C.border} strokeWidth="0.5" />)}
              <path d="M0,45 C100,42 200,48 300,44 C400,40 500,46 600,42 L700,44" fill="none" stroke={C.purple} strokeWidth="1.5" />
              <path d="M0,47 C100,50 200,44 300,48 C400,52 500,46 600,50 L700,48" fill="none" stroke={C.blue} strokeWidth="1.5" strokeDasharray="4,2" />
              <path d="M0,50 C100,46 200,52 300,50 C400,48 500,54 600,48 L700,52" fill="none" stroke={C.teal} strokeWidth="1.5" strokeDasharray="2,3" />
            </svg>
            <div style={{ display: 'flex', gap: 16 }}>
              {[[C.purple,'Uniswap v3'],[C.blue,'Curve'],[C.teal,'Balancer']].map(([c,l]) => (
                <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 16, height: 2, background: c as string }} />
                  <span style={{ fontFamily: SANS, fontSize: 9, color: C.sub }}>{l as string}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Pool depth */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px' }}>
            <Label children="Orderbook Depth" accent={C.blue} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: C.green, letterSpacing: 0.8, marginBottom: 5 }}>BIDS</div>
                {[['$3,520.50','12.4 ETH'],['$3,519.80','8.1 ETH'],['$3,518.20','22.7 ETH']].map(([p,s]) => (
                  <div key={p as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.green }}>{p as string}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.sub }}>{s as string}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: C.red, letterSpacing: 0.8, marginBottom: 5 }}>ASKS</div>
                {[['$3,521.20','9.8 ETH'],['$3,522.00','14.3 ETH'],['$3,524.50','31.1 ETH']].map(([p,s]) => (
                  <div key={p as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.red }}>{p as string}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.sub }}>{s as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   8. NEW LISTINGS
══════════════════════════════════════════════════════════════════════ */
function NewListingsWire() {
  const listings = [
    { sym: 'OMNI', ex: 'Binance', status: 'new',      price: '$2.14',  h1: '+4.2%', d1: '+18.7%', vol: '$14.2M', c: C.green },
    { sym: 'REZ',  ex: 'Bybit',   status: 'tracking', price: '$0.142', h1: '+1.1%', d1: '+8.3%',  vol: '$6.8M',  c: C.blue  },
    { sym: 'SAGA', ex: 'OKX',     status: 'new',      price: '$3.81',  h1: '-2.3%', d1: '+31.2%', vol: '$22.4M', c: C.red   },
    { sym: 'TNSR', ex: 'Binance', status: 'tracking', price: '$1.07',  h1: '+0.8%', d1: '+12.4%', vol: '$9.1M',  c: C.green },
    { sym: 'W',    ex: 'Bybit',   status: 'new',      price: '$0.631', h1: '-0.5%', d1: '+5.8%',  vol: '$4.3M',  c: C.sub   },
    { sym: 'AEVO', ex: 'OKX',     status: 'completed',price: '$1.28',  h1: '-1.2%', d1: '-3.1%',  vol: '$3.7M',  c: C.red   },
  ]
  const statusC = (s: string) => ({ new: C.green, tracking: C.blue, completed: C.mute })[s] ?? C.sub
  const exC = (e: string) => ({ Binance: C.gold, Bybit: C.blue, OKX: C.cyan })[e] ?? C.sub
  return (
    <PageWrap label="NEW LISTINGS SCANNER" accent={C.green}>
      <Nav active="Intelligence" />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 12 }}>
          <KPI value="6"     label="New Today"   sub="last 24h"      color={C.green} live />
          <KPI value="18"    label="Tracking"    sub="active"        color={C.blue} />
          <KPI value="+18.7%" label="Best 24h"  sub="OMNI · Binance" color={C.gold} live />
          <KPI value="4"     label="Exchanges"  sub="monitored"     color={C.sub} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {listings.map(l => (
            <div key={l.sym} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag color={statusC(l.status)}>{l.status.toUpperCase()}</Tag>
                  <Tag color={exC(l.ex)}>{l.ex}</Tag>
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 2 }}>{l.sym}/USDT</div>
              <div style={{ fontFamily: MONO, fontSize: 14, color: C.sub, marginBottom: 8 }}>{l.price}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>1H</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: l.h1.startsWith('+') ? C.green : C.red, fontWeight: 600 }}>{l.h1}</div>
                </div>
                <div>
                  <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>24H</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: l.d1.startsWith('+') ? C.green : C.red, fontWeight: 600 }}>{l.d1}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>VOL</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.sub }}>{l.vol}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   9. DEX MARKETS
══════════════════════════════════════════════════════════════════════ */
function DexMarketsWire() {
  const pools = [
    { pair: 'ETH/USDC', dex: 'Uniswap v3', tvl: '$2.1B', vol: '$380M', fee: '0.05%', apy: '12.4%', sc: 'HIGH' as const },
    { pair: 'BTC/USDC', dex: 'Uniswap v3', tvl: '$890M', vol: '$210M', fee: '0.30%', apy: '8.7%',  sc: 'HIGH' as const },
    { pair: 'SOL/USDC', dex: 'Orca',       tvl: '$340M', vol: '$88M',  fee: '0.30%', apy: '14.2%', sc: 'MED'  as const },
    { pair: 'WBTC/ETH', dex: 'Curve',      tvl: '$280M', vol: '$41M',  fee: '0.04%', apy: '6.8%',  sc: 'MED'  as const },
  ]
  const dexC = (d: string) => ({'Uniswap v3':C.purple,'Orca':C.cyan,'Curve':C.blue,'Balancer':C.teal})[d] ?? C.sub
  return (
    <PageWrap label="DEX MARKETS" accent={C.teal}>
      <Nav active="DEX Markets" />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 12 }}>
          <KPI value="12"    label="DEXes"        sub="monitored"    color={C.teal} />
          <KPI value="$4.2B" label="Total TVL"    sub="all pools"    color={C.sub} />
          <KPI value="$890M" label="24h Volume"   sub="across DEXes" color={C.blue} live />
          <KPI value="14.2%" label="Top APY"      sub="SOL/USDC"    color={C.gold} live />
        </div>
        {/* DEX selector row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {['All DEXes','Uniswap v3','Curve','Orca','Balancer'].map((d, i) => (
            <div key={d} style={{ padding: '4px 12px', background: i === 0 ? C.teal + '18' : 'transparent', border: `1px solid ${i === 0 ? C.teal + '50' : C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 8, color: i === 0 ? C.teal : C.sub, cursor: 'pointer' }}>{d}</div>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['PAIR','DEX','TVL','24H VOLUME','FEE TIER','EST. APY','DEPTH']} rightFrom={2} />
          <tbody>
            {pools.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.pair}</td>
                <td style={{ padding: '6px 9px' }}><Tag color={dexC(r.dex)}>{r.dex}</Tag></td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.sub }}>{r.tvl}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.blue }}>{r.vol}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.fee}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.gold, fontWeight: 600 }}>{r.apy}</td>
                <td style={{ padding: '6px 9px', textAlign: 'right' }}><ScoreBadge s={r.sc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   10. ALERTS
══════════════════════════════════════════════════════════════════════ */
function AlertsWire() {
  const alerts = [
    { t: '16:28', sym: 'INJ/USDT',  sp: '0.39%', buy: 'Hyperliquid',  bP: '$28.39', sell: 'Bitfinex', sP: '$28.50', type: 'DEX-CEX' },
    { t: '16:21', sym: 'DOT/USDT',  sp: '0.31%', buy: 'BingX',        bP: '$6.80',  sell: 'OKX',      sP: '$6.82',  type: 'CEX-CEX' },
    { t: '16:14', sym: 'SOL/USDC',  sp: '0.28%', buy: 'Coinbase',     bP: '$167.9', sell: 'MEXC',     sP: '$168.4', type: 'CEX-CEX' },
    { t: '16:07', sym: 'WIF/USDT',  sp: '0.22%', buy: 'BingX',        bP: '$2.83',  sell: 'OKX',      sP: '$2.84',  type: 'S-F'     },
    { t: '15:59', sym: 'ETH/USDC',  sp: '0.19%', buy: 'Uniswap',      bP: '$3,514', sell: 'Binance',  sP: '$3,521', type: 'DEX-CEX' },
  ]
  const typeC = (t: string) => ({ 'DEX-CEX': C.purple, 'CEX-CEX': C.blue, 'S-F': C.gold })[t] ?? C.sub
  return (
    <PageWrap label="ALERTS" accent={C.gold}>
      <Nav active="Intelligence" />
      <div style={{ display: 'flex', height: 420 }}>
        {/* Config panel */}
        <div style={{ width: 200, background: C.panel, borderRight: `1px solid ${C.border}`, padding: 14 }}>
          <Label children="Alert Config" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginBottom: 5 }}>Min Spread Threshold</div>
              <div style={{ height: 32, background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold, fontWeight: 700 }}>0.20%</span>
                <span style={{ fontFamily: SANS, fontSize: 8, color: C.mute }}>threshold</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginBottom: 5 }}>Notification Method</div>
              {[['Browser','●',C.green],['Email','●',C.green],['Webhook','○',C.mute]].map(([m,dot,c]) => (
                <div key={m as string} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0' }}>
                  <span style={{ color: c as string, fontSize: 10 }}>{dot as string}</span>
                  <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>{m as string}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginBottom: 5 }}>Alert Frequency</div>
              <div style={{ padding: '6px 10px', background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 4, fontFamily: MONO, fontSize: 10, color: C.text }}>Every 5 minutes</div>
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginBottom: 5 }}>Daily Limit</div>
              <div style={{ padding: '6px 10px', background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 4, fontFamily: MONO, fontSize: 10, color: C.text }}>50 alerts</div>
            </div>
            <div style={{ height: 32, marginTop: 6, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.bg, cursor: 'pointer' }}>
              Save Config
            </div>
          </div>
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 12 }}>
            <KPI value="47"   label="Today"      sub="alerts fired"  color={C.blue} live />
            <KPI value="3"    label="Last Hour"  sub="alerts"        color={C.sub}  />
            <KPI value="0.39%" label="Max Spread" sub="INJ · today"  color={C.gold} />
            <KPI value="0:41"  label="Avg Age"   sub="gap duration"  color={C.sub}  />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['TIME','SYMBOL','SPREAD','BUY EXCHANGE','BUY PRICE','SELL EXCHANGE','SELL PRICE','TYPE']} rightFrom={2} />
            <tbody>
              {alerts.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 8, color: C.mute }}>{r.t}</td>
                  <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.sym}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 10, color: C.green, fontWeight: 600 }}>{r.sp}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.blue }}>{r.buy}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.bP}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.blue }}>{r.sell}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.sP}</td>
                  <td style={{ padding: '6px 9px', textAlign: 'right' }}><Tag color={typeC(r.type)}>{r.type}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   11. LOGIN
══════════════════════════════════════════════════════════════════════ */
function LoginWire() {
  return (
    <PageWrap label="LOGIN">
      <nav style={{ height: 48, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
        <div style={{ width: 24, height: 24, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 900, color: C.bg }}>A</span>
        </div>
        <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.text }}>Arbitrage Terminal</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>New here? <span style={{ color: C.gold }}>Create account →</span></span>
      </nav>
      <div style={{ padding: '36px 24px', display: 'flex', gap: 48, justifyContent: 'center' }}>
        {/* Live stats */}
        <div style={{ width: 196, paddingTop: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 1.2, marginBottom: 14 }}>RIGHT NOW</div>
          {[{v:'4,753',l:'Gaps / hr',c:C.green},{v:'91',l:'Profitable now',c:C.green},{v:'0.39%',l:'Best spread',c:C.gold},{v:'18',l:'Exchanges live',c:C.blue}].map(s => (
            <div key={s.l} style={{ marginBottom: 14, paddingLeft: 10, borderLeft: `2px solid ${s.c}30` }}>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
        {/* Auth card */}
        <div style={{ width: 340, background: C.panel, border: `1px solid ${C.rim}`, borderRadius: 10, padding: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 2, textAlign: 'center', marginBottom: 8 }}>ARBITRAGE TERMINAL</div>
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 3 }}>Welcome back</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textAlign: 'center', marginBottom: 22 }}>Sign in to access live intelligence</div>
          {[['Email address','you@example.com'],['Password','••••••••••']].map(([l,p]) => (
            <div key={l} style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginBottom: 4 }}>{l}</div>
              <div style={{ height: 36, background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 5, padding: '0 12px', display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 11, color: C.mute }}>{p}</div>
            </div>
          ))}
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <span style={{ fontFamily: SANS, fontSize: 9, color: C.gold }}>Forgot password?</span>
          </div>
          <div style={{ height: 40, background: C.gold, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.bg }}>Sign In</div>
          <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontFamily: SANS, fontSize: 9, color: C.mute }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['Google','GitHub'].map(p => (
              <div key={p} style={{ height: 34, background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 10, color: C.sub }}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   12. SIGNUP
══════════════════════════════════════════════════════════════════════ */
function SignupWire() {
  return (
    <PageWrap label="SIGN UP">
      <nav style={{ height: 48, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
        <div style={{ width: 24, height: 24, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 900, color: C.bg }}>A</span>
        </div>
        <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: C.text }}>Arbitrage Terminal</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>Have an account? <span style={{ color: C.gold }}>Sign in →</span></span>
      </nav>
      <div style={{ padding: '36px 24px', display: 'flex', gap: 48, justifyContent: 'center' }}>
        {/* Feature bullets */}
        <div style={{ width: 196, paddingTop: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 1.2, marginBottom: 14 }}>FREE TIER INCLUDES</div>
          {['15s delayed CEX arbitrage data','128 symbols across 18 exchanges','Alert config (up to 10/day)','Spread history (7 days)','Magnus AI simulator access'].map(f => (
            <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ color: C.green, fontSize: 10, marginTop: 1 }}>✓</span>
              <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub, lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.gold, marginBottom: 4 }}>PRO UPGRADE</div>
            <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, lineHeight: 1.4 }}>Live feed + Magnus AI live bots from $19.95/mo</div>
          </div>
        </div>
        {/* Signup form */}
        <div style={{ width: 340, background: C.panel, border: `1px solid ${C.rim}`, borderRadius: 10, padding: 28 }}>
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 3 }}>Create your account</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textAlign: 'center', marginBottom: 22 }}>Free forever · no credit card required</div>
          {[['Display Name','Your name'],['Email address','you@example.com'],['Password','Choose a password'],['Confirm Password','Repeat password']].map(([l,p]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginBottom: 4 }}>{l}</div>
              <div style={{ height: 34, background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 5, padding: '0 12px', display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 11, color: C.mute }}>{p}</div>
            </div>
          ))}
          {/* Plan picker */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginBottom: 6 }}>Start plan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[['Free','$0/mo',C.sub],['Trader','$19.95/mo',C.gold]].map(([n,p,c]) => (
                <div key={n} style={{ padding: '7px 10px', background: n === 'Free' ? C.gold + '12' : C.card, border: `1px solid ${n === 'Free' ? C.gold + '50' : C.border}`, borderRadius: 5 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: n === 'Free' ? C.gold : C.sub, fontWeight: 600 }}>{n}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: c }}>{p}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 40, background: C.gold, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.bg }}>Create Account</div>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   13. ACCOUNT
══════════════════════════════════════════════════════════════════════ */
function AccountWire() {
  const payments = [
    { date: 'Apr 1, 2026',  plan: 'Pro',    amount: '$49.95', method: 'Stripe',  status: 'paid' },
    { date: 'Mar 1, 2026',  plan: 'Pro',    amount: '$49.95', method: 'Stripe',  status: 'paid' },
    { date: 'Feb 1, 2026',  plan: 'Trader', amount: '$19.95', method: 'USDC',    status: 'paid' },
    { date: 'Jan 1, 2026',  plan: 'Trader', amount: '$19.95', method: 'USDC',    status: 'paid' },
  ]
  return (
    <PageWrap label="ACCOUNT">
      <Nav active="Dashboard" />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 680 }}>
          {/* Profile card */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, background: C.gold + '20', border: `1px solid ${C.gold}50`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.gold }}>P</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: C.text }}>Parvez</span>
                <Tag color={C.gold}>PRO</Tag>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.sub }}>parvez@example.com</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.mute, marginTop: 2 }}>Member since Jan 2025 · UTC-4</div>
            </div>
            <div style={{ padding: '7px 16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, fontFamily: MONO, fontSize: 9, color: C.sub, cursor: 'pointer' }}>Edit Profile</div>
          </div>
          {/* Plan card */}
          <div style={{ background: C.panel, border: `1px solid ${C.gold}30`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Label children="Current Plan" noMb />
              <div style={{ padding: '6px 16px', background: C.gold, borderRadius: 4, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.bg }}>Manage Subscription</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[{v:'PRO',l:'Plan tier',c:C.gold},{v:'Apr 30, 2026',l:'Renews',c:C.sub},{v:'Live Feed + Magnus',l:'Access level',c:C.green}].map(s => (
                <div key={s.l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: '8px 12px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontFamily: SANS, fontSize: 8, color: C.mute, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Payment history */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <Label children="Payment History" />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['DATE','PLAN','AMOUNT','METHOD','STATUS']} />
              <tbody>
                {payments.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.date}</td>
                    <td style={{ padding: '6px 9px' }}><Tag color={r.plan === 'Pro' ? C.gold : C.blue}>{r.plan}</Tag></td>
                    <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 10, color: C.text, fontWeight: 600 }}>{r.amount}</td>
                    <td style={{ padding: '6px 9px', fontFamily: MONO, fontSize: 9, color: C.sub }}>{r.method}</td>
                    <td style={{ padding: '6px 9px' }}><Tag color={C.green}>{r.status}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   14. SETTINGS
══════════════════════════════════════════════════════════════════════ */
function SettingsWire() {
  const [tab, setTab] = useState('Profile')
  const tabs = ['Profile','Alerts','API Keys','Notifications','Billing']
  return (
    <PageWrap label="SETTINGS">
      <Nav active="Dashboard" />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 700 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
            <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, color: C.text }}>Settings</div>
            <Chip color={C.blue} size={8}>PRO</Chip>
          </div>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
            {tabs.map(t => (
              <div key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', fontFamily: MONO, fontSize: 9, letterSpacing: 0.4, color: t === tab ? C.gold : C.sub, borderBottom: t === tab ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer' }}>{t}</div>
            ))}
          </div>
          {tab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, padding: 16 }}>
                <Label children="Profile Information" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['Display Name','Parvez'],['Email','parvez@example.com'],['Timezone','UTC-4 · New York'],['Account Type','PRO · since Jan 2025']].map(([l,v]) => (
                    <div key={l}>
                      <div style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginBottom: 4 }}>{l}</div>
                      <div style={{ height: 32, background: C.bg, border: `1px solid ${C.rim}`, borderRadius: 4, padding: '0 10px', display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 10, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, padding: 16 }}>
                <Label children="Alert Thresholds" accent={C.gold} />
                {[['Minimum Spread','0.20%',C.gold],['Notification Method','Browser + Email',C.blue],['Daily Alert Limit','50 alerts',C.sub],['Exchange Filter','All 18 exchanges',C.sub]].map(([l,v,c]) => (
                  <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>{l as string}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: c as string, fontWeight: 500 }}>{v as string}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'API Keys' && (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, padding: 16 }}>
              <Label children="Exchange API Keys" accent={C.blue} />
              {['Binance','OKX','Bybit','MEXC'].map((ex, i) => (
                <div key={ex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>{ex}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {i < 2 ? <Tag color={C.green}>Connected</Tag> : <Tag color={C.mute}>Not set</Tag>}
                    <div style={{ padding: '4px 10px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 8, color: C.sub, cursor: 'pointer' }}>{i < 2 ? 'Edit' : 'Add Key'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab !== 'Profile' && tab !== 'API Keys' && (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, padding: 16 }}>
              <Label children={tab} />
              <div style={{ fontFamily: SANS, fontSize: 11, color: C.mute, padding: '20px 0', textAlign: 'center' }}>Configure {tab.toLowerCase()} preferences</div>
            </div>
          )}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <div style={{ height: 34, padding: '0 16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 10, color: C.sub, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>Cancel</div>
            <div style={{ height: 34, padding: '0 20px', background: C.gold, borderRadius: 4, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.bg, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>Save Changes</div>
          </div>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   15. PRICING
══════════════════════════════════════════════════════════════════════ */
function PricingWire() {
  const plans = [
    {
      id: 'free', name: 'Free', price: '$0', sub: 'forever',
      color: C.sub, cta: 'Start Free',
      features: ['15s delayed CEX data','128 symbols','18 exchanges','7-day history','10 alerts/day','Simulator access'],
    },
    {
      id: 'trader', name: 'Trader', price: '$19.95', sub: '/month',
      color: C.blue, cta: 'Start Trader',
      features: ['Live CEX data','All symbols','All 18 exchanges','30-day history','Unlimited alerts','Email notifications','Magnus Simulator'],
    },
    {
      id: 'pro', name: 'Pro', price: '$49.95', sub: '/month',
      color: C.gold, cta: 'Start Pro', popular: true,
      features: ['Live CEX + DEX data','All symbols · DEX pairs','Full exchange coverage','90-day history','Priority alerts','Magnus AI Live Bots','API access','Cross-chain scanner'],
    },
    {
      id: 'institutional', name: 'Institutional', price: '$499', sub: '/month',
      color: C.purple, cta: 'Contact Us',
      features: ['Everything in Pro','White-label option','Dedicated support','Custom alert rules','Historical data export','SLA guarantee','Multiple seats'],
    },
  ]
  const features = ['Live data feed','DEX markets','Magnus AI bots','Cross-chain','Triangular','Alerts','API access','Historical data','Multiple seats']
  const matrix: Record<string, (boolean|string)[]> = {
    'Live data feed':   [false,'15s delay',true,true],
    'DEX markets':      [false,false,true,true],
    'Magnus AI bots':   ['Simulator','Simulator','Live',true],
    'Cross-chain':      [false,false,true,true],
    'Triangular':       [false,true,true,true],
    'Alerts':           ['10/day','Unlimited','Priority','Custom'],
    'API access':       [false,false,true,true],
    'Historical data':  ['7 days','30 days','90 days','Unlimited'],
    'Multiple seats':   [false,false,false,true],
  }
  return (
    <PageWrap label="PRICING">
      <Nav active="Dashboard" />
      <div style={{ padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>Simple, transparent pricing</div>
          <div style={{ fontFamily: SANS, fontSize: 13, color: C.sub }}>Crypto payments (USDC/USDT) and card accepted. Cancel anytime.</div>
        </div>
        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          {plans.map(p => (
            <div key={p.id} style={{ background: p.popular ? C.panel : C.card, border: `1px solid ${p.popular ? C.gold + '50' : C.border}`, borderRadius: 9, padding: 18, position: 'relative' }}>
              {p.popular && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '2px 12px', background: C.gold, borderRadius: 10, fontFamily: MONO, fontSize: 8, fontWeight: 700, color: C.bg, whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: C.text }}>{p.price}</span>
                <span style={{ fontFamily: SANS, fontSize: 10, color: C.sub }}>{p.sub}</span>
              </div>
              <div style={{ margin: '12px 0', height: 1, background: C.border }} />
              <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: p.color, fontSize: 9, marginTop: 1 }}>✓</span>
                    <span style={{ fontFamily: SANS, fontSize: 9, color: C.sub, lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 34, background: p.popular ? C.gold : 'transparent', border: `1px solid ${p.popular ? 'transparent' : p.color + '60'}`, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, fontWeight: p.popular ? 700 : 400, color: p.popular ? C.bg : p.color, cursor: 'pointer' }}>{p.cta}</div>
            </div>
          ))}
        </div>
        {/* Feature matrix */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.lift }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 0.8, width: '30%' }}>FEATURE</th>
                {plans.map(p => (
                  <th key={p.id} style={{ padding: '8px 14px', textAlign: 'center', fontFamily: MONO, fontSize: 9, color: p.color, letterSpacing: 0.4 }}>{p.name.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f, fi) => (
                <tr key={f} style={{ borderBottom: `1px solid ${C.border}`, background: fi % 2 === 0 ? 'transparent' : C.bg + '60' }}>
                  <td style={{ padding: '6px 14px', fontFamily: SANS, fontSize: 10, color: C.sub }}>{f}</td>
                  {(matrix[f] ?? [false,false,false,false]).map((v, vi) => (
                    <td key={vi} style={{ padding: '6px 14px', textAlign: 'center', fontFamily: MONO, fontSize: 9 }}>
                      {v === true ? <span style={{ color: C.green }}>✓</span> : v === false ? <span style={{ color: C.mute }}>—</span> : <span style={{ color: plans[vi].color }}>{v as string}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrap>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN EXPORT — All 15 pages
══════════════════════════════════════════════════════════════════════ */
export default function ObsidianAllPages() {
  const sections: { group: string; color: string; pages: { label: string; component: React.ReactNode }[] }[] = [
    {
      group: 'Core Trading',
      color: C.gold,
      pages: [
        { label: 'Dashboard',    component: <DashboardWire /> },
        { label: 'Intelligence', component: <IntelligenceWire /> },
        { label: 'Magnus',       component: <MagnusWire /> },
      ],
    },
    {
      group: 'Opportunity Scanners',
      color: C.green,
      pages: [
        { label: 'Funding Rates',  component: <FundingRatesWire /> },
        { label: 'Cross-Chain',    component: <CrossChainWire /> },
        { label: 'Triangular',     component: <TriangularWire /> },
        { label: 'DEX Arbitrage',  component: <DexWire /> },
      ],
    },
    {
      group: 'Discovery',
      color: C.teal,
      pages: [
        { label: 'New Listings', component: <NewListingsWire /> },
        { label: 'DEX Markets',  component: <DexMarketsWire /> },
      ],
    },
    {
      group: 'Tools',
      color: C.gold,
      pages: [
        { label: 'Alerts', component: <AlertsWire /> },
      ],
    },
    {
      group: 'Auth',
      color: C.sub,
      pages: [
        { label: 'Login',  component: <LoginWire /> },
        { label: 'Sign Up', component: <SignupWire /> },
      ],
    },
    {
      group: 'Account',
      color: C.blue,
      pages: [
        { label: 'Account',  component: <AccountWire /> },
        { label: 'Settings', component: <SettingsWire /> },
        { label: 'Pricing',  component: <PricingWire /> },
      ],
    },
  ]

  const totalPages = sections.reduce((acc, s) => acc + s.pages.length, 0)

  return (
    <div style={{ background: '#040608', minHeight: '100vh', color: C.text, fontFamily: SANS }}>
      {/* Top header */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/concepts/e" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none' }}>← Concept E</Link>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <div style={{ width: 26, height: 26, background: C.gold, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 900, color: C.bg }}>E</div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1 }}>Obsidian — All {totalPages} Pages</div>
          <div style={{ fontFamily: SANS, fontSize: 10, color: C.sub, marginTop: 1 }}>Full site wireframe in the Obsidian design system</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Quick jump */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {sections.map(s => (
            <a key={s.group} href={`#${s.group.replace(/\s/g, '-')}`} style={{ fontFamily: MONO, fontSize: 8, color: C.sub, textDecoration: 'none', padding: '2px 8px', border: `1px solid ${C.border}`, borderRadius: 4 }}>{s.group}</a>
          ))}
        </div>
        <Link href="/" style={{ fontFamily: SANS, fontSize: 11, color: C.sub, textDecoration: 'none', marginLeft: 8 }}>← App</Link>
      </div>

      {/* Design tokens strip */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '9px 24px', display: 'flex', gap: 24, alignItems: 'center', overflowX: 'auto' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: C.mute, letterSpacing: 1.2, flexShrink: 0 }}>OBSIDIAN TOKENS</span>
        {Object.entries(C).slice(0, 11).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, background: v, borderRadius: 3, border: `1px solid ${C.rim}` }} />
            <span style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>{k}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.gold }}>IBM Plex Mono</span>
          <span style={{ fontFamily: SANS, fontSize: 9, color: C.sub, marginLeft: 10 }}>IBM Plex Sans</span>
        </div>
      </div>

      {/* Page sections */}
      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '28px 20px' }}>
        {sections.map((section, si) => (
          <div key={section.group} id={section.group.replace(/\s/g, '-')} style={{ marginBottom: 44 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 3, height: 20, background: section.color, borderRadius: 2 }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: section.color, letterSpacing: 1.4, fontWeight: 700 }}>{section.group.toUpperCase()}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.mute }}>{section.pages.length} page{section.pages.length > 1 ? 's' : ''}</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>§{si + 1} of {sections.length}</span>
            </div>
            {/* Pages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {section.pages.map(p => (
                <div key={p.label}>{p.component}</div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 20, padding: '18px 0', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: C.mute }}>{totalPages} pages · Obsidian Design System · Concept E</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/concepts/e" style={{ fontFamily: MONO, fontSize: 9, color: C.sub, textDecoration: 'none' }}>← Concept E</Link>
            <Link href="/concepts/g" style={{ fontFamily: MONO, fontSize: 9, color: C.sub, textDecoration: 'none' }}>Concept G: Neural →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
