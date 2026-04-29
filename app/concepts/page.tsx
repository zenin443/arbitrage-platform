'use client'
import Link from 'next/link'

const C = {
  bg: '#0D1117', surface: '#161B22', surface2: '#1C2128',
  border: '#21262D', border2: '#30363D',
  text: '#E6EDF3', textSec: '#8B949E', textMut: '#484F58',
  green: '#3FB950', blue: '#388BFD', yellow: '#D29922',
  red: '#F85149', purple: '#A371F7',
}

// ── Miniature page diagram ─────────────────────────────────────────────────
function LayoutDiagram({
  variant,
  activeLabel,
}: {
  variant: 'four-pane' | 'adaptive' | 'left-rail' | 'modal-auth'
  activeLabel?: string
}) {
  const nav = (
    <div style={{ height: 28, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6 }}>
      <div style={{ width: 8, height: 8, background: C.blue, borderRadius: 2 }} />
      <div style={{ flex: 1, display: 'flex', gap: 4 }}>
        {['INT','MAG','DEX','FND','DSH'].map(l => (
          <div key={l} style={{ fontSize: 5, color: l === activeLabel ? C.green : C.textMut, fontFamily: 'monospace', padding: '1px 3px', background: l === activeLabel ? `${C.green}18` : 'transparent', borderRadius: 2 }}>{l}</div>
        ))}
      </div>
      <div style={{ width: 24, height: 6, background: `${C.green}40`, borderRadius: 2 }} />
    </div>
  )

  if (variant === 'four-pane') {
    return (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', height: 160 }}>
        {nav}
        <div style={{ display: 'flex', height: 132 }}>
          <div style={{ width: 44, background: C.surface2, borderRight: `1px solid ${C.border}`, padding: 4 }}>
            {[...Array(6)].map((_, i) => <div key={i} style={{ height: 7, background: C.border2, borderRadius: 2, marginBottom: 3 }} />)}
          </div>
          <div style={{ width: 50, background: C.surface, borderRight: `1px solid ${C.border}`, padding: 4 }}>
            <div style={{ height: 7, background: C.border2, borderRadius: 2, marginBottom: 4 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {[...Array(4)].map((_, i) => <div key={i} style={{ height: 22, background: C.surface2, borderRadius: 2, border: `1px solid ${C.border}` }} />)}
            </div>
            {[...Array(4)].map((_, i) => <div key={i} style={{ height: 6, background: C.border2, borderRadius: 1, marginTop: 3 }} />)}
          </div>
          <div style={{ flex: 1, padding: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 5 }}>
              {[C.green, C.blue, C.yellow, C.green].map((c, i) => (
                <div key={i} style={{ height: 26, background: C.surface2, borderRadius: 3, border: `1px solid ${C.border}`, borderLeft: `2px solid ${c}` }} />
              ))}
            </div>
            {[...Array(5)].map((_, i) => <div key={i} style={{ height: 8, background: i === 0 ? C.surface2 : 'transparent', borderRadius: 2, marginBottom: 2, display: 'flex', gap: 3, alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
              {[25, 15, 12, 20, 14, 14].map((w, j) => <div key={j} style={{ width: `${w}%`, height: 4, background: i === 0 ? C.border2 : C.textMut, borderRadius: 1, opacity: i === 0 ? 1 : 0.5 }} />)}
            </div>)}
          </div>
          <div style={{ width: 40, background: C.surface2, borderLeft: `1px solid ${C.border}`, padding: 4 }}>
            {[...Array(5)].map((_, i) => <div key={i} style={{ height: 7, background: C.border2, borderRadius: 2, marginBottom: 3 }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'adaptive') {
    return (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', height: 160 }}>
        {nav}
        <div style={{ display: 'flex', height: 132 }}>
          <div style={{ width: 44, background: C.surface2, borderRight: `1px solid ${C.border}`, padding: 4 }}>
            {['ALL','USDT','USDC','BTC'].map(t => <div key={t} style={{ fontSize: 5, color: t === 'ALL' ? C.text : C.textMut, marginBottom: 2, fontFamily: 'monospace' }}>{t}</div>)}
            <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
            {[...Array(5)].map((_, i) => <div key={i} style={{ height: 6, background: C.border2, borderRadius: 1, marginBottom: 2 }} />)}
          </div>
          <div style={{ flex: 1, padding: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 5 }}>
              {[C.green, C.blue, C.yellow, C.green].map((c, i) => (
                <div key={i} style={{ height: 26, background: C.surface2, borderRadius: 3, border: `1px solid ${C.border}`, borderLeft: `2px solid ${c}` }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr 2fr', gap: 3, marginBottom: 5 }}>
              {[C.blue, C.purple, C.yellow].map((c, i) => (
                <div key={i} style={{ height: 30, background: C.surface2, borderRadius: 3, border: `1px solid ${C.border}`, borderTop: `2px solid ${c}` }} />
              ))}
            </div>
            {[...Array(5)].map((_, i) => <div key={i} style={{ height: 8, background: i === 0 ? C.surface2 : 'transparent', borderRadius: 2, marginBottom: 2, display: 'flex', gap: 3, alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
              {[20, 14, 12, 24, 16, 8, 6].map((w, j) => <div key={j} style={{ width: `${w}%`, height: 4, background: i === 0 ? C.border2 : C.textMut, borderRadius: 1, opacity: i === 0 ? 1 : 0.5 }} />)}
            </div>)}
          </div>
          <div style={{ width: 44, background: C.surface2, borderLeft: `1px solid ${C.border}`, padding: 4 }}>
            {[...Array(6)].map((_, i) => <div key={i} style={{ height: 7, background: C.border2, borderRadius: 2, marginBottom: 3 }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'left-rail') {
    return (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', height: 160 }}>
        <div style={{ height: 28, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6 }}>
          <div style={{ width: 8, height: 8, background: C.blue, borderRadius: 2 }} />
          <span style={{ fontSize: 7, fontFamily: 'monospace', color: C.text }}>Arbitrage Terminal</span>
          <div style={{ flex: 1 }} />
          <div style={{ width: 24, height: 6, background: `${C.green}40`, borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', height: 132 }}>
          <div style={{ width: 22, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0', gap: 6 }}>
            {[C.green, C.blue, C.yellow, C.textSec, C.purple, C.textSec].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, background: i === 0 ? `${c}30` : 'transparent', borderRadius: 3, border: `1px solid ${i === 0 ? c : C.border2}` }} />
            ))}
          </div>
          <div style={{ flex: 1, padding: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 5 }}>
              {[C.green, C.blue, C.yellow, C.green].map((c, i) => (
                <div key={i} style={{ height: 26, background: C.surface2, borderRadius: 3, border: `1px solid ${C.border}`, borderLeft: `2px solid ${c}` }} />
              ))}
            </div>
            {[...Array(6)].map((_, i) => <div key={i} style={{ height: 8, background: i === 0 ? C.surface2 : 'transparent', borderRadius: 2, marginBottom: 2, display: 'flex', gap: 3, alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
              {[20, 14, 12, 24, 16, 8].map((w, j) => <div key={j} style={{ width: `${w}%`, height: 4, background: i === 0 ? C.border2 : C.textMut, borderRadius: 1, opacity: i === 0 ? 1 : 0.5 }} />)}
            </div>)}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'modal-auth') {
    return (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', height: 160, position: 'relative' }}>
        {nav}
        {/* Blurred background terminal */}
        <div style={{ height: 132, filter: 'blur(2px)', opacity: 0.3, padding: 6 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <div style={{ width: 44, background: C.surface2, borderRadius: 2, height: 120 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, marginBottom: 4 }}>
                {[...Array(4)].map((_, i) => <div key={i} style={{ height: 22, background: C.surface2, borderRadius: 2 }} />)}
              </div>
              {[...Array(5)].map((_, i) => <div key={i} style={{ height: 7, background: C.border2, marginBottom: 2, borderRadius: 1 }} />)}
            </div>
          </div>
        </div>
        {/* Modal overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ width: 100, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 7, fontFamily: 'monospace', color: C.text, marginBottom: 6, textAlign: 'center' }}>Sign In</div>
            {[...Array(2)].map((_, i) => <div key={i} style={{ height: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, marginBottom: 4 }} />)}
            <div style={{ height: 12, background: C.green, borderRadius: 3, marginTop: 6 }} />
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ── Page diagram for specific page types ──────────────────────────────────
function PageTypeDiagram({ type, label }: { type: string; label: string }) {
  const colors: Record<string, string> = {
    'trading': C.blue, 'bots': C.purple, 'funding': C.yellow,
    'settings': C.textSec, 'login': C.green, 'dex': C.blue,
  }
  const c = colors[type] || C.textSec

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 8, color: C.textSec, marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{ width: 70, height: 48, background: C.surface2, borderRadius: 3, border: `1px solid ${C.border}`, borderTop: `2px solid ${c}`, padding: 4, margin: '0 auto' }}>
        <div style={{ height: 4, background: C.border2, borderRadius: 1, marginBottom: 3, width: '80%' }} />
        <div style={{ height: 4, background: C.border2, borderRadius: 1, marginBottom: 3, width: '60%' }} />
        <div style={{ height: 4, background: C.border2, borderRadius: 1, width: '70%' }} />
      </div>
    </div>
  )
}

// ── Concept card ───────────────────────────────────────────────────────────
function ConceptCard({
  letter, title, tagline, variant, recommended, decisions, pages, href,
}: {
  letter: string; title: string; tagline: string
  variant: 'four-pane' | 'adaptive' | 'left-rail' | 'modal-auth'
  recommended?: boolean; decisions: string[]; pages: {type: string; label: string}[]; href: string
}) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${recommended ? C.green : C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, background: recommended ? C.green : C.border2, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: recommended ? C.bg : C.text }}>
          {letter}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 1 }}>{title}</div>
          <div style={{ fontSize: 11, color: C.textSec }}>{tagline}</div>
        </div>
        {recommended && (
          <div style={{ fontSize: 9, background: `${C.green}20`, color: C.green, border: `1px solid ${C.green}40`, borderRadius: 3, padding: '2px 6px', fontFamily: 'monospace', letterSpacing: 0.5 }}>
            RECOMMENDED
          </div>
        )}
      </div>

      {/* Layout diagram */}
      <div style={{ padding: 16 }}>
        <LayoutDiagram variant={variant} activeLabel="DSH" />
      </div>

      {/* Key decisions */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>KEY DECISIONS</div>
        {decisions.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: recommended ? C.green : C.blue, marginTop: 4, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.textSec, lineHeight: 1.4 }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Page coverage */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>HOW PAGES CHANGE</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-around' }}>
          {pages.map(p => <PageTypeDiagram key={p.type} type={p.type} label={p.label} />)}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
        <Link href={href} style={{ display: 'block', textAlign: 'center', padding: '6px 0', background: recommended ? C.green : C.surface2, color: recommended ? C.bg : C.text, borderRadius: 4, fontSize: 11, fontWeight: 600, textDecoration: 'none', fontFamily: 'monospace', letterSpacing: 0.5 }}>
          VIEW FULL CONCEPT →
        </Link>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ConceptsIndexPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: C.blue, fontSize: 14, fontFamily: 'monospace', fontWeight: 600 }}>⚡ Arbitrage Terminal</span>
        <span style={{ color: C.textMut }}>|</span>
        <span style={{ color: C.textMut, fontSize: 11, fontFamily: 'monospace' }}>v0.7.4</span>
        <span style={{ color: C.textMut }}>|</span>
        <span style={{ color: C.yellow, fontSize: 11 }}>UI/UX CONCEPTS</span>
        <span style={{ color: C.textMut, fontSize: 11 }}>— Preview only, no live data</span>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← Back to App</Link>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
        {/* Title block */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 8px', fontFamily: 'monospace' }}>
            Site-Wide UI/UX Concepts
          </h1>
          <p style={{ fontSize: 14, color: C.textSec, margin: 0, lineHeight: 1.6 }}>
            4 design directions for unifying Dashboard's terminal aesthetic across all pages.
            All concepts share identical nav, color system (#0D1117, #161B22), and typography (IBM Plex).
            The difference is <em>how much of the Dashboard's layout structure extends to each page type.</em>
          </p>
        </div>

        {/* Audit summary strip */}
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 16px', marginBottom: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>BROKEN NAV</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>5 pages</div>
            <div style={{ fontSize: 10, color: C.textSec }}>Magnus, Settings, DEX, Login, Signup</div>
          </div>
          <div style={{ width: 1, background: C.border }} />
          <div>
            <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>WRONG COLOR SYSTEM</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.yellow }}>2 pages</div>
            <div style={{ fontSize: 10, color: C.textSec }}>Magnus (gray/cyan), Login/Signup (green-600)</div>
          </div>
          <div style={{ width: 1, background: C.border }} />
          <div>
            <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>WRONG LAYOUT</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.yellow }}>4 pages</div>
            <div style={{ fontSize: 10, color: C.textSec }}>Magnus, Settings, Account, Pricing</div>
          </div>
          <div style={{ width: 1, background: C.border }} />
          <div>
            <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>PAGES IN SCOPE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>9 pages</div>
            <div style={{ fontSize: 10, color: C.textSec }}>Intelligence, Magnus, DEX, Funding, Settings, Account, Pricing, Login, Signup</div>
          </div>
          <div style={{ width: 1, background: C.border }} />
          <div>
            <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1 }}>REFERENCE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>Dashboard</div>
            <div style={{ fontSize: 10, color: C.textSec }}>4-pane trading terminal — the gold standard</div>
          </div>
        </div>

        {/* Concept cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          <ConceptCard
            letter="A"
            title="Pure Terminal Extension"
            tagline="Extend Dashboard's exact 4-pane shell to every data page"
            variant="four-pane"
            decisions={[
              'Every data page (Magnus, Funding, DEX) gets left sidebar + center + right panel',
              'Left sidebar content changes per page — bots list, rates list, etc.',
              'Settings and Account: chrome stays, sidebars collapse by default',
              'Login/Signup: terminal nav + centered card on #0D1117 background',
            ]}
            pages={[
              { type: 'bots', label: 'Magnus' },
              { type: 'funding', label: 'Funding' },
              { type: 'settings', label: 'Settings' },
              { type: 'login', label: 'Login' },
            ]}
            href="/concepts/a"
          />

          <ConceptCard
            letter="B"
            title="Adaptive Terminal"
            tagline="Same DNA — nav, colors, cards — layout adapts to page purpose"
            variant="adaptive"
            recommended
            decisions={[
              'Identical nav bar on 100% of pages — brand, v0.7.4, LIVE, clock, same 5 links',
              'Data pages (Magnus, Funding, DEX): 2-pane — compact left context + fluid center',
              'Utility pages (Settings, Account): terminal header + single max-w-2xl column',
              'Pricing: terminal header + 4-col plan grid using Dashboard card primitives',
              'Auth: terminal header + centered card — #3FB950 CTA, correct branding',
            ]}
            pages={[
              { type: 'bots', label: 'Magnus' },
              { type: 'funding', label: 'Funding' },
              { type: 'settings', label: 'Settings' },
              { type: 'login', label: 'Login' },
            ]}
            href="/concepts/b"
          />

          <ConceptCard
            letter="C"
            title="Left Rail Navigation"
            tagline="Persistent 60px icon rail replaces horizontal nav links"
            variant="left-rail"
            decisions={[
              'All page links move into a 60px vertical icon rail on the left edge',
              'Top bar shows only brand + LIVE + clock — no link clutter',
              'Content area gains full horizontal width — more data visible',
              'Similar to TradingView / Bybit — modern trading terminal feel',
            ]}
            pages={[
              { type: 'trading', label: 'Dashboard' },
              { type: 'bots', label: 'Magnus' },
              { type: 'funding', label: 'Funding' },
              { type: 'dex', label: 'DEX' },
            ]}
            href="/concepts/c"
          />

          <ConceptCard
            letter="D"
            title="Dark Overlay Auth"
            tagline="Concept B + login/signup as cinematic terminal overlay"
            variant="modal-auth"
            decisions={[
              'Everything identical to Concept B — nav, layouts, color system',
              'Login and Signup pages show blurred terminal in the background',
              'Auth form appears as a centered modal overlay — "unlocking" the terminal',
              'Higher effort to implement, strongest brand impression for new users',
            ]}
            pages={[
              { type: 'bots', label: 'Magnus' },
              { type: 'settings', label: 'Settings' },
              { type: 'login', label: 'Login' },
              { type: 'login', label: 'Signup' },
            ]}
            href="/concepts/d"
          />
        </div>

        {/* ── NEW CONCEPTS: E + G ─────────────────────────────────────── */}
        <div style={{ marginTop: 40, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.textMut, letterSpacing: 1.2 }}>PREMIUM TIER — BUILT &amp; READY TO REVIEW</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Concept E */}
            <div style={{ background: C.surface, border: `1px solid #E8B84B40`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ height: 6, background: 'linear-gradient(90deg, #E8B84B, #B8891A)' }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, background: '#E8B84B', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 14, fontWeight: 900, color: '#06080D' }}>E</div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#E8B84B', lineHeight: 1 }}>Obsidian</div>
                        <div style={{ fontSize: 11, color: C.textMut, marginTop: 2 }}>Ultra-premium · Gold accent · UHNI terminal</div>
                      </div>
                    </div>
                  </div>
                  <Link href="/concepts/e" style={{ padding: '8px 18px', background: '#E8B84B', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#06080D', textDecoration: 'none', letterSpacing: 0.4 }}>
                    Open →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {['#06080D bg','Gold accent','Glass panels','IBM Plex fonts','4 pages built'].map(t => (
                    <span key={t} style={{ fontFamily: 'monospace', fontSize: 9, color: '#E8B84B', background: '#E8B84B18', border: '1px solid #E8B84B40', padding: '2px 7px', borderRadius: 10 }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {['Dashboard','Magnus','Login','Settings'].map(p => (
                    <div key={p} style={{ background: '#06080D', border: '1px solid #1C2636', borderRadius: 4, padding: '6px 0', textAlign: 'center', fontFamily: 'monospace', fontSize: 9, color: '#8A96A8' }}>{p}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Concept G */}
            <div style={{ background: C.surface, border: '1px solid #7C3AED40', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ height: 6, background: 'linear-gradient(90deg, #7C3AED, #06B6D4)' }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 14, fontWeight: 900, color: '#E8F0FF' }}>G</div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#A78BFA', lineHeight: 1 }}>Neural</div>
                        <div style={{ fontSize: 11, color: C.textMut, marginTop: 2 }}>Deep navy · Purple AI · Cyan live · Green profit</div>
                      </div>
                    </div>
                  </div>
                  <Link href="/concepts/g" style={{ padding: '8px 18px', background: 'linear-gradient(90deg, #7C3AED, #3B82F6)', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#E8F0FF', textDecoration: 'none', letterSpacing: 0.4 }}>
                    Open →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {['#060B14 bg','Neural purple','Cyan signals','Color-coded AI','4 pages built'].map(t => (
                    <span key={t} style={{ fontFamily: 'monospace', fontSize: 9, color: '#A78BFA', background: '#7C3AED18', border: '1px solid #7C3AED40', padding: '2px 7px', borderRadius: 10 }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {['Dashboard','Magnus','Login','Funding'].map(p => (
                    <div key={p} style={{ background: '#060B14', border: '1px solid #1E2D42', borderRadius: 4, padding: '6px 0', textAlign: 'center', fontFamily: 'monospace', fontSize: 9, color: '#6B82A0' }}>{p}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Common system strip */}
        <div style={{ marginTop: 28, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 20 }}>
          <div style={{ fontSize: 11, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 16 }}>
            SHARED DESIGN SYSTEM — IDENTICAL ACROSS ALL CONCEPTS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: C.textSec, marginBottom: 8, fontWeight: 600 }}>Color Palette</div>
              {[
                ['#0D1117', 'Page background'],
                ['#161B22', 'Surface'],
                ['#21262D', 'Border'],
                ['#E6EDF3', 'Primary text'],
                ['#8B949E', 'Secondary text'],
                ['#3FB950', 'Green / profit'],
                ['#388BFD', 'Blue / info'],
                ['#D29922', 'Yellow / warning'],
                ['#F85149', 'Red / loss'],
              ].map(([hex, label]) => (
                <div key={hex} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 14, height: 14, background: hex, borderRadius: 2, border: `1px solid ${C.border2}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: C.textSec, fontFamily: 'monospace' }}>{hex}</span>
                  <span style={{ fontSize: 10, color: C.textMut }}>{label}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textSec, marginBottom: 8, fontWeight: 600 }}>Typography</div>
              {[
                ['Nav links', '11px', 'IBM Plex Sans', C.text],
                ['Table header', '9px UPPER', 'IBM Plex Mono', C.textMut],
                ['Table data', '12px', 'IBM Plex Mono', C.text],
                ['Stat label', '9px UPPER', 'IBM Plex Sans', C.textSec],
                ['Stat value', '20px bold', 'IBM Plex Mono', C.text],
                ['Section label', '9px UPPER', 'IBM Plex Sans', C.textMut],
                ['Badge', '9px', 'IBM Plex Mono', C.green],
              ].map(([name, size, font, color]) => (
                <div key={name as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: color as string, fontFamily: font as string }}>{name as string}</span>
                  <span style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace' }}>{size as string}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textSec, marginBottom: 8, fontWeight: 600 }}>Nav (Universal)</div>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: C.blue, fontFamily: 'monospace' }}>⚡ Arbitrage Terminal</span>
                  <span style={{ color: C.textMut, fontSize: 9 }}>|</span>
                  <span style={{ fontSize: 9, color: C.textSec, fontFamily: 'monospace' }}>v0.7.4</span>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green }} />
                  <span style={{ fontSize: 9, color: C.green }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Intelligence','Magnus','DEX','Funding','Dashboard'].map((l, i) => (
                    <span key={l} style={{ fontSize: 9, color: i === 4 ? C.green : C.textSec, fontFamily: 'monospace', borderBottom: i === 4 ? `1px solid ${C.green}` : 'none', paddingBottom: 1 }}>{l}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: C.textSec }}>Same on every page. Active link highlighted in green.</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textSec, marginBottom: 8, fontWeight: 600 }}>Card Primitive</div>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: 8 }}>
                <div style={{ fontSize: 8, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 4 }}>STAT CARD</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[{v:'4,753',l:'Gaps / hr',c:C.green},{v:'91',l:'Profitable',c:C.green},{v:'0.043%',l:'Avg Spread',c:C.yellow},{v:'0.39%',l:'Best Spread',c:C.blue}].map(s => (
                    <div key={s.l} style={{ background: C.surface2, borderRadius: 3, padding: '4px 6px', borderLeft: `2px solid ${s.c}` }}>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 8, color: C.textMut }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: C.textSec }}>Identical card style everywhere. Color-coded by metric type.</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: C.textMut }}>
          Click any concept card above to see full page mockups · These pages are static previews only, no live data
        </div>
      </div>
    </div>
  )
}
