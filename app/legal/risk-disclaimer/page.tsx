export const metadata = {
  title: 'Risk Disclaimer — Arbitrance Terminal',
  description: 'Important risk information for users of the Arbitrance Terminal market data platform.',
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
  li: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    color: '#8B949E',
    fontSize: '14px',
    lineHeight: 1.7,
  } as React.CSSProperties,
  dot: {
    color: '#D29922',
    flexShrink: 0,
    marginTop: '2px',
  } as React.CSSProperties,
}

export default function RiskDisclaimerPage() {
  return (
    <main style={{ maxWidth: '896px', margin: '0 auto', padding: '48px 24px 96px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D29922" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#E6EDF3', margin: 0 }}>
            Risk Disclaimer
          </h1>
        </div>
        <p style={{ color: '#8B949E', fontSize: '15px', marginBottom: '16px' }}>
          Please read this carefully before using Arbitrance Terminal.
        </p>
        <span style={{ background: '#21262D', color: '#8B949E', fontSize: '12px', padding: '3px 10px', borderRadius: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
          Last updated: May 2026
        </span>
      </div>

      {/* Critical notice */}
      <div style={{ ...S.card, border: '1px solid #D29922', background: '#161B22' }}>
        <p style={{ color: '#D29922', fontSize: '13px', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Not Financial Advice
        </p>
        <p style={{ ...S.body, color: '#E6EDF3', fontSize: '15px' }}>
          Arbitrance Terminal is a <span style={{ color: '#D29922', fontWeight: 600 }}>market data intelligence tool</span>, not
          a financial advisor, investment advisor, broker-dealer, or regulated financial institution.
          Nothing on this platform constitutes investment advice, a trading recommendation, or a
          solicitation to buy or sell any asset.
        </p>
      </div>

      {/* Section 1 */}
      <div style={S.card}>
        <h2 style={S.heading}>What This Platform Is</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          Arbitrance Terminal aggregates and displays publicly available cryptocurrency pricing data
          from exchange APIs. Our platform:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Shows spread differentials between exchanges — we do NOT predict whether those spreads will be profitable by the time you execute.',
            'Displays funding rate data — historical funding rates do not guarantee future rate levels.',
            'Aggregates publicly available price feeds — data may be delayed, incomplete, or subject to API errors.',
            'Provides data visualization tools — we do not direct, manage, or execute any trades on your behalf.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 2 */}
      <div style={S.card}>
        <h2 style={S.heading}>Cryptocurrency Trading Risks</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          Cryptocurrency trading involves <span style={S.strong}>substantial risk of loss</span>. Before trading, you should understand:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            <><span style={S.strong}>Market volatility:</span> Cryptocurrency prices can move dramatically in seconds. Spreads that appear profitable may close or reverse before execution.</>,
            <><span style={S.strong}>Execution risk:</span> Arbitrage is subject to slippage, exchange fees, withdrawal limits, and transfer time. Stated spreads do not account for these costs.</>,
            <><span style={S.strong}>Counterparty risk:</span> Exchanges can freeze funds, become insolvent, or experience technical failures at any time.</>,
            <><span style={S.strong}>Regulatory risk:</span> The legal status of cryptocurrency trading varies by jurisdiction and may change without notice.</>,
            <><span style={S.strong}>Leverage risk:</span> Futures and perpetual contracts involve leverage that can amplify losses beyond your initial capital.</>,
            <><span style={S.strong}>Liquidity risk:</span> Market depth shown in our data may not reflect available liquidity at the time of execution.</>,
          ].map((item, i) => (
            <li key={i} style={{ ...S.li, marginBottom: '10px' }}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 3 */}
      <div style={S.card}>
        <h2 style={S.heading}>Data Accuracy & Limitations</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Price data is sourced from third-party exchange APIs that may be delayed, throttled, or temporarily unavailable.',
            'We do not guarantee data accuracy, completeness, or timeliness.',
            'Spread calculations are indicative only and do not account for trading fees, gas costs, withdrawal minimums, or transfer delays.',
            'Historical data shown on the platform does not guarantee or predict future market conditions.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 4 */}
      <div style={S.card}>
        <h2 style={S.heading}>Your Responsibility</h2>
        <p style={{ ...S.body, marginBottom: '14px' }}>
          By using Arbitrance Terminal, you acknowledge and accept that:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'All trading decisions are your own. You are solely responsible for any trades you execute.',
            'You will conduct your own due diligence before making any financial decisions.',
            'You will consult a qualified financial advisor if you require personalized investment guidance.',
            'You understand the risks associated with cryptocurrency trading and have sufficient knowledge and experience.',
            'You will not hold Arbitrance Terminal liable for trading losses or decisions made based on platform data.',
          ].map((item, i) => (
            <li key={i} style={S.li}>
              <span style={S.dot}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 5 */}
      <div style={S.card}>
        <h2 style={S.heading}>No Liability for Losses</h2>
        <p style={S.body}>
          To the maximum extent permitted by applicable law, Arbitrance Terminal, its owners, officers,
          employees, and affiliates shall not be liable for any trading losses, missed opportunities,
          financial damages, or consequential losses arising from your use of — or reliance on — data
          provided by this platform. See our{' '}
          <a href="/legal/terms" style={{ color: '#388BFD', textDecoration: 'none' }}>Terms of Service</a>{' '}
          for full details on our limitation of liability.
        </p>
      </div>
    </main>
  )
}
