export const metadata = {
  title: 'Terms of Service — Arbitrance Terminal',
  description: 'The rules that keep the Arbitrance Terminal platform fair and functional.',
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
  warningBox: {
    background: '#1C2128',
    border: '1px solid #21262D',
    borderLeft: '3px solid #D29922',
    borderRadius: '6px',
    padding: '12px 16px',
    marginTop: '14px',
  } as React.CSSProperties,
}

export default function TermsOfServicePage() {
  return (
    <main style={{ maxWidth: '896px', margin: '0 auto', padding: '48px 24px 96px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#E6EDF3', marginBottom: '8px' }}>
          Terms of Service
        </h1>
        <p style={{ color: '#8B949E', fontSize: '15px', marginBottom: '16px' }}>
          The rules that keep this platform fair and functional.
        </p>
        <span style={{ background: '#21262D', color: '#8B949E', fontSize: '12px', padding: '3px 10px', borderRadius: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
          Last updated: May 2026
        </span>
      </div>

      {/* 1 — Acceptance */}
      <div style={S.card}>
        <h2 style={S.heading}>1. Acceptance</h2>
        <p style={S.body}>
          By creating an account or accessing the Arbitrance Terminal service (the{' '}
          <span style={S.strong}>&ldquo;Service&rdquo;</span>), you confirm that you have read,
          understood, and agree to be bound by these Terms of Service and our{' '}
          <a href="/legal/privacy" style={{ color: '#388BFD', textDecoration: 'none' }}>Privacy Policy</a>.
          If you do not agree, do not use the Service. These Terms form a legally binding agreement
          between you and Arbitrance Terminal.
        </p>
      </div>

      {/* 2 — Service Description */}
      <div style={S.card}>
        <h2 style={S.heading}>2. Service Description</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          Arbitrance Terminal is a <span style={S.strong}>market data intelligence and visualization tool</span>.
          We aggregate, normalize, and present publicly available exchange pricing data to help users
          identify potential spread differentials across cryptocurrency markets.
        </p>
        <div style={S.warningBox}>
          <p style={{ ...S.body, color: '#D29922', fontWeight: 500, marginBottom: '8px' }}>Important Clarification</p>
          <p style={S.body}>
            <span style={S.strong}>We are NOT:</span> a financial advisor, investment advisor, broker-dealer,
            registered trading platform, signal service provider, or regulated financial institution.
            Nothing displayed on this platform constitutes investment advice, a recommendation to trade,
            or a solicitation of any financial transaction.
          </p>
        </div>
      </div>

      {/* 3 — Eligibility */}
      <div style={S.card}>
        <h2 style={S.heading}>3. Eligibility</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'You must be at least 18 years of age to use this Service.',
            'You must be legally permitted to access and trade cryptocurrency assets in your jurisdiction.',
            'You are solely responsible for determining whether your use of this Service complies with applicable local laws and regulations.',
            'We reserve the right to restrict access to the Service in jurisdictions where doing so is required by law.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4 — Subscription & Billing */}
      <div style={S.card}>
        <h2 style={S.heading}>4. Subscription &amp; Billing</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            <><span style={S.strong}>Billing cycles:</span> Subscriptions are billed monthly or annually in advance via Stripe. All prices are shown in USD.</>,
            <><span style={S.strong}>Free tier:</span> A free tier is available with limited feature access. No payment method is required for the free tier.</>,
            <><span style={S.strong}>Auto-renewal:</span> Paid plans renew automatically. You may cancel at any time before the renewal date to avoid the next charge.</>,
            <><span style={S.strong}>Refunds:</span> Annual plans may be refunded on a pro-rated basis if requested within 7 days of the charge date. Monthly plan charges are non-refundable.</>,
            <><span style={S.strong}>Price changes:</span> We will provide 30 days notice before increasing prices for existing subscribers.</>,
          ].map((item, i) => (
            <li key={i} style={{ ...S.li, marginBottom: '10px' }}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 5 — Acceptable Use */}
      <div style={S.card}>
        <h2 style={S.heading}>5. Acceptable Use</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>You agree that you will <span style={S.strong}>NOT</span>:</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Scrape, copy, cache, or redistribute signal data or platform output to third parties.',
            'Reverse-engineer, decompile, or attempt to extract source code or proprietary algorithms.',
            'Share account credentials or allow multiple users to access a single subscription.',
            'Use the Service to facilitate or plan market manipulation, wash trading, or other prohibited activities.',
            'Use automated bots, crawlers, or scraping tools to access the Service beyond normal product use.',
            'Resell, white-label, or sublicense access to the Service without a written partnership agreement.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 6 — Intellectual Property */}
      <div style={S.card}>
        <h2 style={S.heading}>6. Intellectual Property</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          The Arbitrance Terminal platform — including its software, UI design, data normalization
          algorithms, brand assets, and documentation — is owned by us and protected by applicable
          copyright, trademark, and intellectual property laws.
        </p>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          Market pricing data displayed on the platform is sourced from public exchange APIs and
          remains the property of the respective exchanges.
        </p>
        <p style={S.body}>
          You are granted a limited, non-exclusive, non-transferable, revocable license to use the
          Service for your personal or internal business purposes, subject to these Terms.
        </p>
      </div>

      {/* 7 — Disclaimers */}
      <div style={S.card}>
        <h2 style={S.heading}>7. Disclaimers</h2>
        <p style={{ ...S.body, marginBottom: '14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: '#8B949E' }}>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND,
          EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          OR NON-INFRINGEMENT.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'We do not warrant that spread data is accurate, complete, real-time, or error-free.',
            'Exchange API data may be delayed, throttled, or temporarily unavailable.',
            'Past spread differentials do not predict, guarantee, or indicate future arbitrage opportunities.',
            'We make no representations about the profitability of any trading strategy informed by our data.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 8 — Limitation of Liability */}
      <div style={S.card}>
        <h2 style={S.heading}>8. Limitation of Liability</h2>
        <p style={{ ...S.body, marginBottom: '14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: '#8B949E' }}>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL AGGREGATE LIABILITY TO YOU
          FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED
          THE TOTAL AMOUNT YOU PAID US IN THE THREE (3) MONTHS PRECEDING THE DATE THE CLAIM AROSE.
        </p>
        <p style={S.body}>
          In no event shall we be liable for: trading losses or missed opportunities; decisions made
          based on platform data; exchange outages or API failures; indirect, incidental, special,
          consequential, or punitive damages; or loss of profits, revenue, or data.
        </p>
      </div>

      {/* 9 — Termination */}
      <div style={S.card}>
        <h2 style={S.heading}>9. Termination</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'You may delete your account at any time from the account settings page.',
            'We may suspend or permanently terminate accounts that violate these Terms, with or without prior notice.',
            'Upon termination, your right to access the Service ceases immediately.',
            'Sections 7 (Disclaimers), 8 (Limitation of Liability), and 9 (Termination) survive the termination of these Terms.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 10 — Governing Law */}
      <div style={S.card}>
        <h2 style={S.heading}>10. Governing Law</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          These Terms are governed by and construed in accordance with applicable law. Any dispute
          arising from or relating to these Terms or the Service shall be resolved through binding
          arbitration, except that either party may seek injunctive or other equitable relief in
          a court of competent jurisdiction to prevent irreparable harm.
        </p>
        <p style={S.body}>
          Class action waiver: You agree to resolve disputes on an individual basis and waive any
          right to participate in a class action lawsuit or class-wide arbitration.
        </p>
      </div>

      {/* 11 — Changes to Terms */}
      <div style={S.card}>
        <h2 style={S.heading}>11. Changes to These Terms</h2>
        <p style={S.body}>
          We may modify these Terms at any time. We will provide at least{' '}
          <span style={S.strong}>14 days notice</span> of material changes via email notification
          and/or an in-app banner. Your continued use of the Service after the notice period
          constitutes acceptance of the updated Terms. If you do not agree to the changes, you
          must stop using the Service before the changes take effect.
        </p>
      </div>
    </main>
  )
}
