'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const STORAGE_KEY = 'arbitrance_risk_banner_dismissed'
const AUTH_PATHS = ['/login', '/signup']

export default function RiskBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (AUTH_PATHS.some((p) => pathname?.startsWith(p))) {
      setVisible(false)
      return
    }
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (!dismissed) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [pathname])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore storage errors
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="complementary"
      aria-label="Risk disclaimer"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: '#161B22',
        borderTop: '1px solid #21262D',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {/* Warning icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D29922"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: '2px' }}
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#8B949E',
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: '#E6EDF3', fontWeight: 500 }}>Not financial advice.</span>{' '}
            Arbitrance Terminal is a market data tool, not an investment advisor. Trading involves
            significant risk of loss.{' '}
            {expanded && (
              <span>
                Spread data shown is indicative only and does not account for fees, slippage, or
                execution delays. All trading decisions are yours alone. Past spreads do not
                predict future opportunities. We are not responsible for any trading losses.{' '}
              </span>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#388BFD',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          </p>
        </div>

        {/* Right actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <Link
            href="/legal/risk-disclaimer"
            style={{
              fontSize: '12px',
              color: '#388BFD',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Full disclaimer
          </Link>
          <button
            onClick={dismiss}
            aria-label="Dismiss risk disclaimer"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              color: '#8B949E',
              fontSize: '16px',
              lineHeight: 1,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
