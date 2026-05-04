export const metadata = {
  title: 'Cookie Policy — Arbitrance Terminal',
  description: 'A plain-English explanation of how Arbitrance Terminal uses cookies.',
}

const S = {
  card: {
    background: '#161B22',
    border: '1px solid #21262D',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '16px',
  } as React.CSSProperties,
  heading: {
    color: '#388BFD',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: '14px',
  } as React.CSSProperties,
  body: {
    color: '#8B949E',
    fontSize: '14px',
    lineHeight: 1.7,
  } as React.CSSProperties,
  strong: {
    color: '#E6EDF3',
  } as React.CSSProperties,
  code: {
    background: '#1C2128',
    color: '#BC8CFF',
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '1px 6px',
    borderRadius: '4px',
    fontSize: '13px',
  } as React.CSSProperties,
  li: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    color: '#8B949E',
    fontSize: '14px',
    lineHeight: 1.7,
  } as React.CSSProperties,
  dot: {
    color: '#388BFD',
    flexShrink: 0,
    marginTop: '2px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
    fontFamily: "'IBM Plex Mono', monospace",
  } as React.CSSProperties,
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    color: '#8B949E',
    borderBottom: '1px solid #21262D',
    fontWeight: 500,
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  td: {
    padding: '10px 12px',
    color: '#8B949E',
    borderBottom: '1px solid #161B22',
    fontSize: '13px',
    verticalAlign: 'top' as const,
  } as React.CSSProperties,
}

const cookies = [
  {
    name: 'auth_token',
    type: 'Essential',
    duration: 'Session',
    purpose: 'Authenticates your logged-in session. httpOnly — inaccessible to JavaScript.',
    required: true,
  },
  {
    name: 'csrf_token',
    type: 'Essential',
    duration: 'Session',
    purpose: 'Protects against cross-site request forgery (CSRF) attacks.',
    required: true,
  },
  {
    name: 'refresh_token',
    type: 'Essential',
    duration: '30 days',
    purpose: 'Allows session renewal without re-entering credentials. httpOnly, Secure, SameSite=Strict.',
    required: true,
  },
  {
    name: 'ph_*',
    type: 'Analytics',
    duration: '1 year',
    purpose: 'PostHog analytics — tracks aggregate feature usage. Anonymized, no PII. Opt out in settings.',
    required: false,
  },
]

export default function CookiePolicyPage() {
  return (
    <main style={{ maxWidth: '896px', margin: '0 auto', padding: '48px 24px 96px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#E6EDF3', marginBottom: '8px' }}>
          Cookie Policy
        </h1>
        <p style={{ color: '#8B949E', fontSize: '15px', marginBottom: '16px' }}>
          A plain-English explanation of how we use cookies.
        </p>
        <span style={{ background: '#21262D', color: '#8B949E', fontSize: '12px', padding: '3px 10px', borderRadius: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
          Last updated: May 2026
        </span>
      </div>

      {/* Intro */}
      <div style={S.card}>
        <h2 style={S.heading}>What Are Cookies?</h2>
        <p style={S.body}>
          Cookies are small text files stored in your browser when you visit a website. They are used
          to remember your session, protect against attacks, and (optionally) understand how you use
          the platform. We use a minimal set of cookies — only what is necessary to operate the
          Service securely.
        </p>
      </div>

      {/* Essential cookies */}
      <div style={S.card}>
        <h2 style={S.heading}>Essential Cookies</h2>
        <p style={{ ...S.body, marginBottom: '16px' }}>
          These cookies are <span style={S.strong}>required</span> for the platform to function.
          They cannot be disabled without breaking authentication and security features.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ ...S.li, marginBottom: '14px' }}>
            <span style={S.dot}>›</span>
            <div>
              <span style={{ ...S.strong, display: 'block', marginBottom: '4px' }}>
                <code style={S.code}>auth_token</code> — Session authentication
              </span>
              <span style={S.body}>
                Stored as an <span style={S.code}>httpOnly</span> cookie, meaning it is never
                accessible to JavaScript running on the page. Expires when you close your browser
                or explicitly log out. Without this cookie, the platform cannot verify your identity.
              </span>
            </div>
          </li>
          <li style={{ ...S.li, marginBottom: '14px' }}>
            <span style={S.dot}>›</span>
            <div>
              <span style={{ ...S.strong, display: 'block', marginBottom: '4px' }}>
                <code style={S.code}>csrf_token</code> — CSRF protection
              </span>
              <span style={S.body}>
                A cryptographic token tied to your session, used to validate that form submissions
                and API requests originate from our platform rather than a malicious third-party site.
              </span>
            </div>
          </li>
          <li style={S.li}>
            <span style={S.dot}>›</span>
            <div>
              <span style={{ ...S.strong, display: 'block', marginBottom: '4px' }}>
                <code style={S.code}>refresh_token</code> — Session renewal
              </span>
              <span style={S.body}>
                Persists for 30 days, allowing your session to be renewed automatically without
                re-entering your password. Stored as <span style={S.code}>httpOnly</span>,{' '}
                <span style={S.code}>Secure</span>, <span style={S.code}>SameSite=Strict</span>.
              </span>
            </div>
          </li>
        </ul>
      </div>

      {/* Analytics cookies */}
      <div style={S.card}>
        <h2 style={S.heading}>Analytics Cookies</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          These cookies are <span style={S.strong}>optional</span> and used to understand aggregate
          product usage patterns. They do not track personal information and cannot be used to
          identify you individually.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={S.li}>
            <span style={S.dot}>›</span>
            <div>
              <span style={{ ...S.strong, display: 'block', marginBottom: '4px' }}>
                <code style={S.code}>ph_*</code> — PostHog analytics
              </span>
              <span style={S.body}>
                Used to track anonymized feature interactions (e.g. which pages are visited,
                which features are used most). All data is aggregated — no PII is collected or
                transmitted. EU-hosted instance available. You can opt out at any time in your
                account settings.
              </span>
            </div>
          </li>
        </ul>
      </div>

      {/* Cookie table */}
      <div style={S.card}>
        <h2 style={S.heading}>Cookie Reference</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Duration</th>
                <th style={S.th}>Purpose</th>
                <th style={S.th}>Required</th>
              </tr>
            </thead>
            <tbody>
              {cookies.map((c) => (
                <tr key={c.name} style={{ background: 'transparent' }}>
                  <td style={S.td}><span style={{ color: '#BC8CFF' }}>{c.name}</span></td>
                  <td style={S.td}>{c.type}</td>
                  <td style={S.td}>{c.duration}</td>
                  <td style={{ ...S.td, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px' }}>{c.purpose}</td>
                  <td style={S.td}>
                    <span style={{ color: c.required ? '#3FB950' : '#8B949E' }}>
                      {c.required ? 'Yes' : 'Optional'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How to control */}
      <div style={S.card}>
        <h2 style={S.heading}>How to Control Cookies</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          You have several options for managing cookies:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
          {[
            <><span style={S.strong}>Account settings:</span> Opt out of analytics cookies from your account settings page — no browser configuration required.</>,
            <><span style={S.strong}>Browser settings:</span> You can configure your browser to block or delete cookies. Note: blocking essential cookies will prevent you from logging in.</>,
            <><span style={S.strong}>Incognito/private browsing:</span> Session cookies are automatically cleared when you close a private browsing window.</>,
          ].map((item, i) => (
            <li key={i} style={{ ...S.li, marginBottom: '10px' }}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p style={S.body}>
          We do not use advertising cookies, cross-site tracking cookies, or any cookies set by
          third-party ad networks.
        </p>
      </div>

      {/* Contact */}
      <div style={S.card}>
        <h2 style={S.heading}>Questions?</h2>
        <p style={S.body}>
          If you have questions about our use of cookies, contact us at{' '}
          <a href="mailto:support@arbitrance.com" style={{ color: '#388BFD', textDecoration: 'none' }}>
            support@arbitrance.com
          </a>
          . See also our{' '}
          <a href="/legal/privacy" style={{ color: '#388BFD', textDecoration: 'none' }}>Privacy Policy</a>{' '}
          for full details on data handling.
        </p>
      </div>
    </main>
  )
}
