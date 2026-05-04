export const metadata = {
  title: 'Privacy Policy — Arbitrance Terminal',
  description: 'How Arbitrance Terminal collects, uses, and protects your data.',
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
    marginBottom: '6px',
    color: '#8B949E',
    fontSize: '14px',
    lineHeight: 1.7,
  } as React.CSSProperties,
  dot: {
    color: '#388BFD',
    flexShrink: 0,
    marginTop: '2px',
  } as React.CSSProperties,
}

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: '896px', margin: '0 auto', padding: '48px 24px 96px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#E6EDF3', marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#8B949E', fontSize: '15px', marginBottom: '16px' }}>
          We collect only what we need. We never sell your data.
        </p>
        <span style={{ background: '#21262D', color: '#8B949E', fontSize: '12px', padding: '3px 10px', borderRadius: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
          Last updated: May 2026
        </span>
      </div>

      {/* Section 1 — Data We Collect */}
      <div style={S.card}>
        <h2 style={S.heading}>Data We Collect</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          We collect the minimum data required to operate the platform. Specifically:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
          {[
            <><span style={S.strong}>Email address</span> — used for account creation, billing receipts, and service communications.</>,
            <><span style={S.strong}>Hashed password</span> — stored using bcrypt (cost factor 12). We never store or transmit plaintext passwords.</>,
            <><span style={S.strong}>Session tokens</span> — stored as httpOnly cookies; never accessible to JavaScript on the page.</>,
            <><span style={S.strong}>Subscription status</span> — plan tier and billing period, sourced via Stripe webhooks.</>,
            <><span style={S.strong}>Product usage events</span> — page views, feature interactions, and session duration collected in anonymized, aggregate form.</>,
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p style={{ ...S.body, background: '#1C2128', borderRadius: '6px', padding: '10px 14px', border: '1px solid #21262D' }}>
          <span style={S.strong}>We do NOT collect:</span> exchange API keys, portfolio holdings, trade history, order data, or any financial account credentials. We have no visibility into your exchange accounts.
        </p>
      </div>

      {/* Section 2 — How We Use Data */}
      <div style={S.card}>
        <h2 style={S.heading}>How We Use Data</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>Your data is used exclusively for:</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Service delivery, authentication, and session management',
            'Billing and subscription management via Stripe',
            'Product analytics — aggregate only, never linked to individual identities',
            'Security monitoring and abuse prevention',
            'Responding to support requests',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p style={{ ...S.body, marginTop: '14px' }}>
          <span style={S.strong}>We do not</span> use your data for advertising, third-party profiling, or automated decision-making that affects your rights.
        </p>
      </div>

      {/* Section 3 — Data Processors */}
      <div style={S.card}>
        <h2 style={S.heading}>Data Processors</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          We work with a minimal set of processors, each bound by a Data Processing Agreement (DPA):
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            <><span style={S.code}>Stripe</span> <span style={S.strong}>— Payments.</span> PCI DSS Level 1 certified. Stripe processes and stores all payment card data; we never receive raw card numbers.</>,
            <><span style={S.code}>Vercel</span> <span style={S.strong}>— Hosting.</span> SOC 2 Type II certified. Application code and API requests are served via Vercel infrastructure.</>,
            <><span style={S.code}>PostHog</span> <span style={S.strong}>— Analytics (optional).</span> EU-hosted option available. Anonymized usage events only. You can opt out at any time via account settings.</>,
          ].map((item, i) => (
            <li key={i} style={{ ...S.li, marginBottom: '12px' }}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p style={{ ...S.body, marginTop: '8px' }}>We do not sell or rent data to any third party under any circumstances.</p>
      </div>

      {/* Section 4 — Data Retention */}
      <div style={S.card}>
        <h2 style={S.heading}>Data Retention</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Active account data is retained while your subscription is active, plus a 30-day grace period after cancellation.',
            'Deleted account data is purged from our systems within 90 days of deletion request.',
            'Stripe retains payment transaction records for up to 7 years to satisfy legal and financial compliance obligations.',
            'Anonymized, aggregate analytics data may be retained indefinitely as it cannot be linked to any individual.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 5 — Security */}
      <div style={S.card}>
        <h2 style={S.heading}>Security</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          We apply security controls proportionate to the sensitivity of the data we hold:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            <><span style={S.code}>AES-256</span> encryption at rest for database records.</>,
            <><span style={S.code}>TLS 1.3</span> for all data in transit — no legacy cipher suites permitted.</>,
            <>Passwords hashed with <span style={S.code}>bcrypt</span> at cost factor 12 — computationally infeasible to reverse.</>,
            <>Auth tokens stored as <span style={S.code}>httpOnly</span>, <span style={S.code}>Secure</span>, <span style={S.code}>SameSite=Strict</span> cookies — inaccessible to JavaScript.</>,
            <>Auth endpoints are rate-limited and protected against brute-force attacks.</>,
            <>We do not store exchange API keys, private keys, seed phrases, or any secrets you may use in your own trading workflow.</>,
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 6 — Your Rights */}
      <div style={S.card}>
        <h2 style={S.heading}>Your Rights</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          Depending on your location, you may have the following rights:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
          {[
            <><span style={S.strong}>GDPR (EU/EEA):</span> Right to access, rectify, erase, portability, restrict processing, and object to processing.</>,
            <><span style={S.strong}>CCPA (California):</span> Right to know what data we collect, right to delete, and right to opt-out of sale (we do not sell data).</>,
          ].map((item, i) => (
            <li key={i} style={{ ...S.li, marginBottom: '10px' }}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p style={S.body}>
          To exercise any right, email{' '}
          <a href="mailto:support@arbitrance.com" style={{ color: '#388BFD', textDecoration: 'none' }}>
            support@arbitrance.com
          </a>
          . We will respond within 30 days. Identity verification may be required before fulfilling requests.
        </p>
      </div>

      {/* Section 7 — Cookies */}
      <div style={S.card}>
        <h2 style={S.heading}>Cookies</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
          {[
            <><span style={S.strong}>Session cookie</span> — Required. httpOnly, expires on browser close. Used for authentication.</>,
            <><span style={S.strong}>CSRF token</span> — Required. Protects against cross-site request forgery attacks.</>,
            <><span style={S.strong}>Analytics cookie</span> — Optional. Used to understand aggregate feature usage. Opt out in account settings.</>,
          ].map((item, i) => (
            <li key={i} style={{ ...S.li, marginBottom: '10px' }}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p style={S.body}>We do not set any third-party advertising or tracking cookies.</p>
      </div>

      {/* Section 8 — Contact */}
      <div style={S.card}>
        <h2 style={S.heading}>Contact</h2>
        <p style={S.body}>
          For privacy-related questions, data requests, or concerns, contact us at{' '}
          <a href="mailto:support@arbitrance.com" style={{ color: '#388BFD', textDecoration: 'none' }}>
            support@arbitrance.com
          </a>
          . Our response SLA for privacy requests is <span style={S.strong}>48 business hours</span>.
        </p>
      </div>
    </main>
  )
}
