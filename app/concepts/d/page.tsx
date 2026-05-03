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

// The blurred background — dashboard visible behind the modal
function BlurredTerminal() {
  return (
    <div style={{ position: 'absolute', inset: 0, filter: 'blur(3px)', opacity: 0.25 }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 140, background: C.surface, borderRadius: 4, height: 240 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 8 }}>
              {[...Array(4)].map((_, i) => <div key={i} style={{ height: 48, background: C.surface2, borderRadius: 4 }} />)}
            </div>
            {[...Array(6)].map((_, i) => <div key={i} style={{ height: 26, background: i % 2 === 0 ? C.surface2 : 'transparent', borderRadius: 2, marginBottom: 2 }} />)}
          </div>
          <div style={{ width: 130, background: C.surface2, borderRadius: 4, height: 240 }} />
        </div>
      </div>
    </div>
  )
}

function LoginModal() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.green}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.green}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.green }}>LOGIN — CONCEPT D</span>
        <span style={{ fontSize: 9, color: C.textSec }}>Blurred terminal behind · auth modal in foreground · cinematic "unlocking" experience</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: C.green, background: `${C.green}20`, padding: '1px 6px', borderRadius: 2, fontFamily: 'monospace' }}>NEW DESIGN</span>
      </div>
      {/* Minimal nav on login — just brand, no page links */}
      <div style={{ height: 42, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
        <span style={{ color: C.blue, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>⚡</span>
        <span style={{ color: C.text, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>Arbitrage Terminal</span>
        <span style={{ color: C.textMut }}>|</span>
        <span style={{ color: C.textSec, fontFamily: 'monospace', fontSize: 10 }}>v0.7.4</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: C.textSec }}>New? <span style={{ color: C.blue }}>Create account →</span></span>
      </div>
      {/* Overlay area */}
      <div style={{ position: 'relative', height: 340 }}>
        <BlurredTerminal />
        {/* Overlay tint */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.72)' }} />
        {/* Modal */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 340, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 8, padding: 28, position: 'relative' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 3, marginBottom: 8 }}>ARBITRAGE TERMINAL</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: 'monospace', marginBottom: 6 }}>Sign In</div>
              <div style={{ fontSize: 11, color: C.textSec }}>Access real-time arbitrage intelligence</div>
            </div>

            {/* Context strip — shows what they're about to see */}
            <div style={{ background: C.bg, border: `1px solid ${C.green}30`, borderRadius: 4, padding: '8px 12px', marginBottom: 16, display: 'flex', gap: 16 }}>
              {[{v:'4,753',l:'Gaps/hr',c:C.green},{v:'91',l:'Profitable',c:C.green},{v:'0.39%',l:'Best Spread',c:C.yellow}].map(s => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 8, color: C.textMut }}>{s.l}</div>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, marginRight: 4 }} />
                <span style={{ fontSize: 9, color: C.green, fontFamily: 'monospace' }}>LIVE NOW</span>
              </div>
            </div>

            {/* Fields */}
            {[['Email', 'you@example.com'], ['Password', '••••••••••']].map(([l, p]) => (
              <div key={l} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.textSec, marginBottom: 4, fontFamily: 'monospace' }}>{l}</div>
                <div style={{ height: 34, background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 4, padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 12, fontFamily: 'monospace', color: C.textMut }}>{p}</div>
              </div>
            ))}

            {/* CTA */}
            <div style={{ height: 36, background: C.green, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: C.bg, marginTop: 8, cursor: 'pointer' }}>
              Sign In — Unlock Live Data
            </div>

            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10, color: C.textMut }}>
              Free tier: 15s delayed data · <span style={{ color: C.blue }}>Upgrade for live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignupModal() {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.blue}40`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${C.blue}10`, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: C.blue }}>SIGNUP — CONCEPT D</span>
        <span style={{ fontSize: 9, color: C.textSec }}>Same overlay treatment · emphasises what users are signing up for</span>
      </div>
      <div style={{ height: 42, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
        <span style={{ color: C.blue, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>⚡ Arbitrage Terminal</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: C.textSec }}>Already have an account? <span style={{ color: C.blue }}>Sign in →</span></span>
      </div>
      <div style={{ position: 'relative', height: 300 }}>
        <BlurredTerminal />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.72)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 360, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 8, padding: 24 }}>
            <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 3, marginBottom: 6, textAlign: 'center' }}>ARBITRAGE TERMINAL</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'monospace', marginBottom: 4, textAlign: 'center' }}>Create Account</div>
            <div style={{ fontSize: 10, color: C.textSec, textAlign: 'center', marginBottom: 16 }}>Free forever · Upgrade anytime</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[['Name', 'Your Name'], ['Email', 'you@example.com']].map(([l, p]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: C.textSec, marginBottom: 3, fontFamily: 'monospace' }}>{l}</div>
                  <div style={{ height: 28, background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 3, padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: 10, fontFamily: 'monospace', color: C.textMut }}>{p}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: C.textSec, marginBottom: 3, fontFamily: 'monospace' }}>Password</div>
              <div style={{ height: 28, background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 3, padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: 10, fontFamily: 'monospace', color: C.textMut }}>••••••••</div>
            </div>
            <div style={{ height: 32, background: C.green, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: C.bg, marginTop: 12 }}>
              Create Free Account
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// B pages (for comparison) are same as Concept B — just shown alongside D
function DiffStrip() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
      <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 12 }}>CONCEPT D vs CONCEPT B — THE ONLY DIFFERENCE</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textSec, fontWeight: 600, marginBottom: 8 }}>Concept B — Auth pages</div>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: 12 }}>
            <div style={{ height: 22, background: C.surface, borderRadius: 2, marginBottom: 8, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              <span style={{ fontSize: 8, color: C.blue, fontFamily: 'monospace' }}>⚡ Arbitrage Terminal | v0.7.4</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <div style={{ width: 160, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: 10 }}>
                <div style={{ fontSize: 7, color: C.textMut, textAlign: 'center', marginBottom: 4 }}>Sign In</div>
                {[...Array(2)].map((_, i) => <div key={i} style={{ height: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, marginBottom: 4 }} />)}
                <div style={{ height: 10, background: C.green, borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ fontSize: 9, color: C.textSec, textAlign: 'center', marginTop: 4 }}>Clean dark background · centered card</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.textSec, fontWeight: 600, marginBottom: 8 }}>Concept D — Auth pages</div>
          <div style={{ background: C.bg, border: `1px solid ${C.green}40`, borderRadius: 4, padding: 12 }}>
            <div style={{ height: 22, background: C.surface, borderRadius: 2, marginBottom: 8, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              <span style={{ fontSize: 8, color: C.blue, fontFamily: 'monospace' }}>⚡ Arbitrage Terminal | v0.7.4</span>
            </div>
            <div style={{ position: 'relative', height: 80 }}>
              <div style={{ position: 'absolute', inset: 0, filter: 'blur(1px)', opacity: 0.2, display: 'flex', gap: 4, padding: 4 }}>
                <div style={{ width: 40, background: C.surface, borderRadius: 2 }} />
                <div style={{ flex: 1, background: C.surface2, borderRadius: 2 }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 140, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 4, padding: 8 }}>
                  <div style={{ fontSize: 7, color: C.textMut, textAlign: 'center', marginBottom: 4 }}>Sign In — Unlock Live Data</div>
                  {[...Array(2)].map((_, i) => <div key={i} style={{ height: 7, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, marginBottom: 3 }} />)}
                  <div style={{ height: 9, background: C.green, borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: C.textSec, textAlign: 'center', marginTop: 4 }}>Blurred terminal behind · overlay modal on top</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, padding: '8px 12px', background: C.bg, borderRadius: 4, fontSize: 11, color: C.textSec, lineHeight: 1.5 }}>
        All data pages (Magnus, DEX, Funding, Settings, Account, Pricing) are <strong style={{ color: C.text }}>identical</strong> between B and D.
        Only Login and Signup are different. The live stats strip inside the modal reinforces the product value at the moment of signup.
      </div>
    </div>
  )
}

export default function ConceptDPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/concepts" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← All Concepts</Link>
        <span style={{ color: C.textMut }}>|</span>
        <div style={{ width: 20, height: 20, background: C.border2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>D</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>Dark Overlay Auth</span>
        <span style={{ fontSize: 9, background: `${C.blue}20`, color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 3, padding: '2px 8px', fontFamily: 'monospace' }}>CONCEPT B + MODAL AUTH</span>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 11, color: C.textSec, textDecoration: 'none' }}>← Back to App</Link>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 28 }}>
        <p style={{ fontSize: 13, color: C.textSec, marginBottom: 24 }}>
          Identical to Concept B across all data pages. The only difference: Login and Signup show the live terminal blurred in the background,
          with the auth card as a foreground overlay. The live stats (4,753 gaps/hr · 91 profitable · 0.39% best spread) display inside the modal
          to show users exactly what they're about to unlock.
        </p>
        <div style={{ fontSize: 9, color: C.textMut, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 16 }}>AUTH PAGE MOCKUPS — CONCEPT D</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <LoginModal />
          <SignupModal />
        </div>
        <DiffStrip />
      </div>
    </div>
  )
}
