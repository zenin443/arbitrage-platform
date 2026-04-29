'use client'
import Link from 'next/link'

const C = {
  bg: '#0D1117', surface: '#161B22', surface2: '#1C2128', border: '#21262D', border2: '#30363D',
  text: '#E6EDF3', textSec: '#8B949E', textMut: '#484F58',
  green: '#3FB950', blue: '#388BFD', yellow: '#D29922', red: '#F85149', purple: '#A371F7',
}

function MockNav({ active }: { active: string }) {
  const links = ['Intelligence', 'Magnus', 'DEX Markets', 'Funding Rates', 'Dashboard']
  return (
    <div style={{ height: 42, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0 }}>
      <span style={{ color: C.blue, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>⚡</span>
      <span style={{ color: C.text, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>Arbitrage Terminal</span>
      <span style={{ color: C.textMut }}>|</span>
      <span style={{ color: C.textSec, fontFamily: 'monospace', fontSize: 10 }}>v0.7.4</span>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
      <span style={{ color: C.green, fontSize: 10 }}>LIVE</span>
      <span style={{ color: C.textMut, fontFamily: 'monospace', fontSize: 10 }}>16:30:45</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        {links.map(l => (
          <span key={l} style={{ fontSize: 11, fontFamily: 'monospace', color: l === active ? C.text : C.textSec, fontWeight: l === active ? 600 : 400, borderBottom: l === active ? `1px solid ${C.green}` : 'none', paddingBottom: 1 }}>{l}</span>
        ))}
      </div>
      <span style={{ color: C.textMut, fontSize: 10, marginLeft: 8 }}>⚙</span>
    </div>
  )
}

function Stat4({ items }: { items: {v:string;l:string;c:string}[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
      {items.map(i => (
        <div key={i.l} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 10px', borderLeft: `2px solid ${i.c}` }}>
          <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 2 }}>{i.l.toUpperCase()}</div>
          <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: i.c }}>{i.v}</div>
        </div>
      ))}
    </div>
  )
}

// Magnus — 4-pane version
function Magnus4Pane() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.purple}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.purple}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.purple }}>MAGNUS — 4-PANE LAYOUT</span>
        <span style={{ fontSize: 9, color: C.textSec }}>Left watchlist · center charts · right trade panel — mirrors Dashboard exactly</span>
      </div>
      <MockNav active="Magnus" />
      <div style={{ display: 'flex', height: 320 }}>
        {/* Pane 1 — Bot list (like watchlist) */}
        <div style={{ width: 140, background: C.surface, borderRight: `1px solid ${C.border}`, padding: 8 }}>
          <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>FLEET</div>
          <div style={{ fontSize: 8, color: C.textSec, marginBottom: 4 }}>Bot · Strategy · PnL</div>
          {[['NEXUS','Alpha','+$16K',C.green],['HERMES','Futures','+$7.8K',C.purple],['KRONOS','Calendar','+$3.2K',C.yellow],['ATLAS','Pairs','+$5.1K',C.blue],['VEGA','Sim','—',C.textMut]].map(([n,t,p,c]) => (
            <div key={n as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
              <div><div style={{ fontSize: 10, fontFamily: 'monospace', color: c as string }}>{n as string}</div><div style={{ fontSize: 8, color: C.textMut }}>{t as string}</div></div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: p === '—' ? C.textMut : C.green }}>{p as string}</div>
            </div>
          ))}
        </div>
        {/* Pane 2 — Coin detail (like CoinDetailPanel) */}
        <div style={{ width: 180, background: C.surface2, borderRight: `1px solid ${C.border}`, padding: 10 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: C.green, marginBottom: 4 }}>NEXUS</div>
          <div style={{ fontSize: 9, color: C.textSec, marginBottom: 8 }}>Alpha · Multi-exchange CEX/DEX</div>
          <div style={{ height: 60, background: C.bg, borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
            <svg width="100%" height="60" viewBox="0 0 180 60"><polyline points="0,50 30,40 60,35 90,25 120,20 150,12 180,8" fill="none" stroke={C.green} strokeWidth="1.5" /></svg>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[['Win Rate','98.7%',C.green],['Trades','2,534',C.blue],['PnL','+$16K',C.green],['Sharpe','4.7',C.yellow]].map(([l,v,c]) => (
              <div key={l as string} style={{ background: C.surface, borderRadius: 3, padding: '4px 6px' }}>
                <div style={{ fontSize: 8, color: C.textMut }}>{l as string}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: c as string }}>{v as string}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Pane 3 — Center (main content) */}
        <div style={{ flex: 1, padding: 12 }}>
          <Stat4 items={[{v:'98.7%',l:'Win Rate',c:C.green},{v:'2,534',l:'Trades',c:C.blue},{v:'+$16K',l:'Total PnL',c:C.green},{v:'0.63%',l:'Avg Return',c:C.yellow}]} />
          <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>RECENT TRADES</div>
          {[['16:28','INJ/USDT','hyperliquid→bitfinex','+$2.39',C.green],['16:25','DOT/USDT','bingx→okx','+$1.87',C.green],['16:21','SOL/USDC','coinbase→mexc','+$3.12',C.green],['16:17','WIF/USDT','bingx→okx','-$0.45',C.red]].map(([t,s,r,p,c],i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontFamily: 'monospace' }}>
              <span style={{ color: C.textMut, width: 36 }}>{t as string}</span>
              <span style={{ color: C.text, width: 80 }}>{s as string}</span>
              <span style={{ color: C.textSec, flex: 1 }}>{r as string}</span>
              <span style={{ color: c as string }}>{p as string}</span>
            </div>
          ))}
        </div>
        {/* Pane 4 — Right signal panel */}
        <div style={{ width: 140, background: C.surface2, borderLeft: `1px solid ${C.border}`, padding: 10 }}>
          <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>SIGNAL PANEL</div>
          <div style={{ background: C.surface, border: `1px solid ${C.green}40`, borderRadius: 4, padding: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: C.green, fontFamily: 'monospace', marginBottom: 2 }}>ACTIVE TRADE</div>
            <div style={{ fontSize: 10, color: C.text }}>INJ/USDT</div>
            <div style={{ fontSize: 9, color: C.textSec }}>hyperliquid → bitfinex</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.green, marginTop: 4 }}>+$2.39</div>
          </div>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 24, background: C.surface, borderRadius: 3, marginBottom: 4 }} />)}
        </div>
      </div>
    </div>
  )
}

// Settings — 4-pane with collapsed sidebars
function Settings4Pane() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.textSec}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.textSec}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.textSec }}>SETTINGS — 4-PANE (SIDEBARS COLLAPSED)</span>
        <span style={{ fontSize: 9, color: C.textSec }}>Full terminal chrome · sidebars collapse to icon strips by default</span>
      </div>
      <MockNav active="Dashboard" />
      <div style={{ display: 'flex', height: 220 }}>
        {/* Collapsed left sidebar */}
        <div style={{ width: 28, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 8 }}>
          <div style={{ fontSize: 8, color: C.textMut }}>≡</div>
          {[...Array(4)].map((_, i) => <div key={i} style={{ width: 12, height: 12, background: C.surface2, borderRadius: 2 }} />)}
        </div>
        {/* Main settings content */}
        <div style={{ flex: 1, padding: 16 }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            {['Profile', 'Alerts', 'API Keys', 'Notifications'].map((t, i) => (
              <div key={t} style={{ padding: '5px 10px', fontSize: 10, fontFamily: 'monospace', color: i === 0 ? C.text : C.textSec, borderBottom: i === 0 ? `2px solid ${C.green}` : '2px solid transparent' }}>{t}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Display Name', 'Parvez'], ['Email', 'parvez@example.com'], ['Plan', 'PRO'], ['Member since', 'Jan 2025']].map(([l, v]) => (
              <div key={l} style={{ background: C.surface2, borderRadius: 3, padding: '8px 10px' }}>
                <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Collapsed right sidebar */}
        <div style={{ width: 28, background: C.surface2, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 8 }}>
          <div style={{ fontSize: 8, color: C.textMut }}>≡</div>
          {[...Array(3)].map((_, i) => <div key={i} style={{ width: 12, height: 12, background: C.surface, borderRadius: 2 }} />)}
        </div>
      </div>
    </div>
  )
}

export default function ConceptAPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/concepts" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← All Concepts</Link>
        <span style={{ color: C.textMut }}>|</span>
        <div style={{ width: 20, height: 20, background: C.border2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>A</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>Pure Terminal Extension</span>
        <span style={{ fontSize: 9, background: `${C.textSec}20`, color: C.textSec, border: `1px solid ${C.border2}`, borderRadius: 3, padding: '2px 8px', fontFamily: 'monospace' }}>OPTION</span>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← Back to App</Link>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 28 }}>
        <p style={{ fontSize: 13, color: C.textSec, marginBottom: 24 }}>
          Dashboard's exact 4-pane shell extends to every data page.
          Every page has: resizable watchlist/context sidebar (left) · main content (center) · signal/detail panel (right).
          Settings and utility pages keep the chrome but collapse sidebars to 28px icon strips.
        </p>
        <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 16 }}>PAGE MOCKUPS — CONCEPT A</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Magnus4Pane />
          <Settings4Pane />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 12 }}>Tradeoffs vs Concept B</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: C.green, fontFamily: 'monospace', marginBottom: 6 }}>ADVANTAGES</div>
                {['Maximum consistency — every page feels identical to Dashboard', 'No layout decisions needed per-page', 'User learns one layout, applies everywhere'].map(p => (
                  <div key={p} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: C.green, fontSize: 8 }}>+</span>
                    <span style={{ fontSize: 11, color: C.textSec }}>{p}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.red, fontFamily: 'monospace', marginBottom: 6 }}>TRADEOFFS</div>
                {['Settings/Account: 4-pane feels forced — sidebars have nothing to show', 'Pricing page: ecommerce in a trading shell looks awkward', 'More implementation work — must design sidebar content for every page'].map(p => (
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
