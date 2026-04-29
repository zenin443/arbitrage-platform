'use client'
import Link from 'next/link'

const C = {
  bg: '#0D1117', surface: '#161B22', surface2: '#1C2128', border: '#21262D', border2: '#30363D',
  text: '#E6EDF3', textSec: '#8B949E', textMut: '#484F58',
  green: '#3FB950', blue: '#388BFD', yellow: '#D29922', red: '#F85149', purple: '#A371F7',
}

// Left rail nav
function MockLeftRail({ active }: { active: string }) {
  const items = [
    { key: 'Intelligence', icon: '◉', color: C.blue },
    { key: 'Magnus', icon: '◈', color: C.purple },
    { key: 'DEX Markets', icon: '◆', color: C.yellow },
    { key: 'Funding Rates', icon: '◇', color: C.yellow },
    { key: 'Dashboard', icon: '◎', color: C.green },
    { key: 'Settings', icon: '⊙', color: C.textSec },
  ]
  return (
    <div style={{ width: 54, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 2, flexShrink: 0 }}>
      {items.map(item => (
        <div key={item.key} style={{ width: 38, padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRadius: 4, background: item.key === active ? `${item.color}15` : 'transparent', cursor: 'pointer' }}>
          <span style={{ fontSize: 14, color: item.key === active ? item.color : C.textMut }}>{item.icon}</span>
          <span style={{ fontSize: 7, color: item.key === active ? item.color : C.textMut, fontFamily: 'monospace', letterSpacing: 0.3, textAlign: 'center', lineHeight: 1.2 }}>{item.key.replace(' ', '\n')}</span>
        </div>
      ))}
    </div>
  )
}

function MockTopBar() {
  return (
    <div style={{ height: 42, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0 }}>
      <span style={{ color: C.blue, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>⚡</span>
      <span style={{ color: C.text, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>Arbitrage Terminal</span>
      <span style={{ color: C.textMut }}>|</span>
      <span style={{ color: C.textSec, fontFamily: 'monospace', fontSize: 10 }}>v0.7.4</span>
      <div style={{ flex: 1 }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
      <span style={{ color: C.green, fontSize: 10 }}>LIVE</span>
      <span style={{ color: C.textMut, fontFamily: 'monospace', fontSize: 10 }}>16:30:45</span>
      <span style={{ color: C.textMut, marginLeft: 8 }}>|</span>
      <span style={{ fontSize: 9, color: C.textSec, fontFamily: 'monospace' }}>18 exchanges active</span>
      <span style={{ color: C.textMut }}>⚙</span>
    </div>
  )
}

function DashboardRail() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.green}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.green}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.green }}>DASHBOARD — CONCEPT C</span>
        <span style={{ fontSize: 9, color: C.textSec }}>60px icon rail replaces horizontal nav links · top bar shows brand + status only · full content width</span>
      </div>
      <MockTopBar />
      <div style={{ display: 'flex', height: 300 }}>
        <MockLeftRail active="Dashboard" />
        {/* Content takes full remaining width */}
        <div style={{ flex: 1, display: 'flex' }}>
          {/* Watchlist */}
          <div style={{ width: 150, background: C.surface2, borderRight: `1px solid ${C.border}`, padding: 8 }}>
            <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>WATCHLIST</div>
            {[['BTC/USDT','$67,214','+0.2%',C.green],['ETH/USDT','$3,521','-0.1%',C.red],['SOL/USDT','$168','+1.3%',C.green],['WIF/USDT','$2.84','+0.8%',C.green],['INJ/USDT','$28.5','-0.4%',C.red]].map(([s,p,c,cl]) => (
              <div key={s as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontSize: 9 }}>
                <span style={{ fontFamily: 'monospace', color: C.text }}>{(s as string).split('/')[0]}</span>
                <span style={{ fontFamily: 'monospace', color: C.textSec }}>{p as string}</span>
                <span style={{ fontFamily: 'monospace', color: cl as string }}>{c as string}</span>
              </div>
            ))}
          </div>
          {/* Main — wider now without horizontal nav taking a fixed height */}
          <div style={{ flex: 1, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
              {[{v:'18',l:'Exchanges',c:C.blue},{v:'128',l:'Symbols',c:C.text},{v:'4,753',l:'Gaps/hr',c:C.green},{v:'0.39%',l:'Best Spread',c:C.yellow}].map(s => (
                <div key={s.l} style={{ background: C.surface2, borderLeft: `2px solid ${s.c}`, borderRadius: 4, padding: '6px 8px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>{s.l.toUpperCase()}</div>
                  <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontFamily: 'monospace' }}>
                <span style={{ width: 80, color: C.text }}>INJ/USDT</span>
                <span style={{ width: 60, color: C.green }}>0.39%</span>
                <span style={{ flex: 1, color: C.textSec }}>hyperliquid → bitfinex</span>
                <span style={{ color: C.green }}>+$2.39</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MagnusRail() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.purple}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.purple}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.purple }}>MAGNUS — CONCEPT C</span>
        <span style={{ fontSize: 9, color: C.textSec }}>Same rail · bot list sidebar + full performance center</span>
      </div>
      <MockTopBar />
      <div style={{ display: 'flex', height: 260 }}>
        <MockLeftRail active="Magnus" />
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ width: 140, background: C.surface2, borderRight: `1px solid ${C.border}`, padding: 8 }}>
            <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>FLEET</div>
            {[['NEXUS','+$16K',C.green],['HERMES','+$7.8K',C.purple],['KRONOS','+$3.2K',C.yellow],['ATLAS','+$5.1K',C.blue],['VEGA','SIM',C.textMut]].map(([n,p,c]) => (
              <div key={n as string} style={{ padding: '5px 6px', background: n === 'NEXUS' ? `${C.green}10` : C.surface, border: `1px solid ${n === 'NEXUS' ? C.green : C.border}`, borderRadius: 3, marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: c as string }}>{n as string}</div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: c as string }}>{p as string}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
              {[{v:'98.7%',l:'Win Rate',c:C.green},{v:'2,534',l:'Trades',c:C.blue},{v:'+$16K',l:'PnL',c:C.green},{v:'4.7',l:'Sharpe',c:C.yellow}].map(s => (
                <div key={s.l} style={{ background: C.surface2, borderLeft: `2px solid ${s.c}`, borderRadius: 3, padding: '5px 7px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 7, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>{s.l.toUpperCase()}</div>
                  <div style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontFamily: 'monospace' }}>
                <span style={{ color: C.textMut, width: 32 }}>16:2{i}</span>
                <span style={{ color: C.text, width: 70 }}>INJ/USDT</span>
                <span style={{ flex: 1, color: C.textSec }}>hyperliquid → bitfinex</span>
                <span style={{ color: C.green }}>+$2.{i+1}9</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConceptCPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/concepts" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← All Concepts</Link>
        <span style={{ color: C.textMut }}>|</span>
        <div style={{ width: 20, height: 20, background: C.border2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>C</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>Left Rail Navigation</span>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← Back to App</Link>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 28 }}>
        <p style={{ fontSize: 13, color: C.textSec, marginBottom: 8 }}>
          All page navigation moves to a 60px persistent vertical icon rail. Top bar shows brand + status only — no link clutter.
          Content area gains back the full horizontal width. Feel: closer to TradingView or Bybit than Bloomberg.
        </p>
        <div style={{ background: C.surface, border: `1px solid ${C.yellow}40`, borderRadius: 4, padding: '8px 12px', marginBottom: 24, fontSize: 11, color: C.yellow }}>
          Note: This requires the biggest nav change of all 4 concepts — the horizontal link bar is fully removed.
          Users who are used to the current nav will need a short adjustment period.
        </div>
        <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 16 }}>PAGE MOCKUPS — CONCEPT C</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DashboardRail />
          <MagnusRail />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: C.green, fontFamily: 'monospace', marginBottom: 6 }}>ADVANTAGES</div>
                {['Full-width content — 54px more usable horizontal space on every page', 'Modern trading terminal feel (TradingView, Bybit)', 'Tooltip labels on hover keep nav discoverable', 'Top bar stays minimal and uncluttered'].map(p => (
                  <div key={p} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: C.green, fontSize: 8 }}>+</span>
                    <span style={{ fontSize: 11, color: C.textSec }}>{p}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.red, fontFamily: 'monospace', marginBottom: 6 }}>TRADEOFFS</div>
                {['Biggest departure from current nav — horizontal → vertical is a UX shift', 'Rail competes with existing left sidebars — need to decide how they nest', 'Implementation touches every page for the shell restructure', 'Auth pages still need a different treatment — no rail on login/signup'].map(p => (
                  <div key={p} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: C.red, fontSize: 8 }}>−</span>
                    <span style={{ fontSize: 11, color: C.textSec }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
