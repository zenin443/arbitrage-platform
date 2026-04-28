'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import InfoCorner from '@/components/ui/InfoCorner'
import { formatNumber } from '@/lib/formatters'

const MAGNUS_TIP =
  'Autonomous paper trading bot that detects and executes arbitrage trades in simulation. Tracks win rate and trade count. View full details on the Magnus dashboard.'

function formatTimeAgo(timestamp: number): string {
  const diffMs  = Date.now() - timestamp
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  return `${diffH}h ago`
}

interface RecentTrade {
  symbol?: string;
  netProfit?: number;
  timestamp?: number;
}

interface MagnusStats {
  trades: number;
  winRate: number | string;
  capital: number;
}

interface MagnusApiData {
  totalTrades?: number;
  winRate?: number;
  totalPortfolioValueUsd?: number;
  portfolioValue?: number;
  capital?: number;
  recentTrades?: RecentTrade[];
  qualityMetrics?: {
    totalTrades?: number;
    winRate?: string | number;
  };
}

export default function MagnusAICard() {
  const [magnusData, setMagnusData] = useState<MagnusStats | null>(null)
  const [lastTrade, setLastTrade] = useState<RecentTrade | null>(null)
  const [authBlocked, setAuthBlocked] = useState(false)

  // U2: ref to stop polling after 401/403 — no stale-closure issue
  const gaveUpRef = useRef(false)

  useEffect(() => {
    async function fetchData() {
      // U2: stop retrying if endpoint is auth-blocked
      if (gaveUpRef.current) return
      // U4: skip when tab is hidden
      if (typeof document !== 'undefined' && document.hidden) return

      try {
        const r = await fetch('/api/magnus/alpha')
        if (r.status === 401 || r.status === 403) {
          gaveUpRef.current = true  // U2: never poll again this session
          setAuthBlocked(true)
          return
        }
        if (!r.ok) return
        const data: MagnusApiData = await r.json()
        if (!data) return
        setMagnusData({
          trades:  data.totalTrades ?? data.qualityMetrics?.totalTrades ?? 0,
          winRate: data.winRate     ?? data.qualityMetrics?.winRate     ?? 0,
          capital: data.capital     ?? data.totalPortfolioValueUsd      ?? data.portfolioValue ?? 19000,
        })
        setLastTrade(data.recentTrades?.[0] ?? null)
      } catch { /* non-fatal */ }
    }

    void fetchData()
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [])

  const trades   = magnusData?.trades   ?? 0
  const winRate  = magnusData?.winRate  ?? 0
  const capital  = magnusData?.capital  ?? 0
  const isLive   = trades > 0

  // Format win rate consistently — stored value is a raw number like 98.69
  const winRateDisplay = magnusData === null
    ? '…'
    : isLive
      ? `${parseFloat(String(winRate)).toFixed(1)}%`
      : '—'

  const tradesDisplay = magnusData === null
    ? '…'
    : isLive
      ? formatNumber(trades)
      : '—'

  const capitalDisplay = magnusData === null
    ? '…'
    : isLive
      ? `$${formatNumber(Math.round(capital))}`
      : '—'

  return (
    <div
      className="bg-[#161B22] border border-[#3FB950]/25 rounded-lg relative overflow-hidden"
      style={{ padding: 'var(--pad-md)', animation: 'glowPulse 3s infinite' }}
    >
      {/* Animated scan line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3FB950] to-transparent"
        style={{ animation: 'scanLine 4s linear infinite' }}
      />

      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#3FB950]" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#3FB950]" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#3FB950]" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#3FB950]" />

      {/* Header: bot icon + title + status + info */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          viewBox="0 0 36 36"
          width="36"
          height="36"
          className="flex-shrink-0"
          style={{ filter: 'drop-shadow(0 0 4px rgba(63,185,80,0.4))' }}
        >
          <rect x="6" y="8" width="24" height="20" rx="4" fill="#0D1117" stroke="#3FB950" strokeWidth="1.5" />
          <circle cx="14" cy="18" r="3" fill="#3FB950" opacity="0.9" />
          <circle cx="22" cy="18" r="3" fill="#3FB950" opacity="0.9" />
          <circle cx="14" cy="18" r="1.5" fill="#0D1117" />
          <circle cx="22" cy="18" r="1.5" fill="#0D1117" />
          <line x1="18" y1="8" x2="18" y2="3" stroke="#3FB950" strokeWidth="1.5" />
          <circle cx="18" cy="2" r="2" fill="#3FB950" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <rect x="12" y="22" width="2" height="3" fill="#3FB950" opacity="0.6" />
          <rect x="15" y="21" width="2" height="4" fill="#3FB950" opacity="0.8" />
          <rect x="18" y="22" width="2" height="3" fill="#3FB950" opacity="0.6" />
          <rect x="21" y="21" width="2" height="4" fill="#3FB950" opacity="0.8" />
          <line x1="0" y1="15" x2="6" y2="15" stroke="#3FB950" strokeWidth="0.5" opacity="0.4" />
          <line x1="30" y1="15" x2="36" y2="15" stroke="#3FB950" strokeWidth="0.5" opacity="0.4" />
          <line x1="0" y1="22" x2="6" y2="22" stroke="#3FB950" strokeWidth="0.5" opacity="0.4" />
          <line x1="30" y1="22" x2="36" y2="22" stroke="#3FB950" strokeWidth="0.5" opacity="0.4" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-[#E6EDF3]">Magnus AI</div>
          <div className="text-[10px] text-[#8B949E]">Arbitrage trader (paper)</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-[6px] h-[6px] rounded-full ${isLive ? 'bg-[#3FB950] animate-pulse' : 'bg-[#484F58]'}`} />
          <span
            className={`text-[10px] font-mono ${isLive ? 'text-[#3FB950]' : 'text-[#484F58]'}`}
          >
            {isLive ? 'LIVE' : 'IDLE'}
          </span>
          <InfoCorner text={MAGNUS_TIP} />
        </div>
      </div>

      {/* Stats: stacked inline text */}
      <div className="font-mono text-[11px] mb-1">
        <span className={`font-medium ${isLive ? 'text-[#3FB950]' : 'text-[#484F58]'}`}>{tradesDisplay}</span>
        <span className="text-[#484F58]"> trades · </span>
        <span className={`font-medium ${isLive ? 'text-[#3FB950]' : 'text-[#484F58]'}`}>{winRateDisplay}</span>
        <span className="text-[#484F58]"> win</span>
      </div>
      <div className="font-mono text-[11px] mb-2">
        <span className={magnusData === null ? 'text-[#484F58]' : 'text-[#E6EDF3]'}>{capitalDisplay}</span>
        <span className="text-[#484F58]"> capital</span>
      </div>

      {/* Activity waveform */}
      <div className="flex items-end justify-center gap-[2px] h-[24px] mb-3">
        {[8, 14, 6, 18, 10, 22, 8, 16, 12, 20, 7, 15].map((h, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-sm ${isLive ? 'bg-[#3FB950]' : 'bg-[#484F58]'}`}
            style={{
              height: `${h}px`,
              animation: isLive ? `dataPulse 1.2s ${i * 0.1}s infinite` : undefined,
            }}
          />
        ))}
      </div>

      {/* Last trade ticker */}
      {isLive && lastTrade ? (
        <div className="bg-[#0D1117] rounded p-1.5 mb-3 flex justify-between items-center font-mono gap-1 text-[10px]">
          <span className="text-[#484F58]">Last</span>
          <span className="text-[#E6EDF3] truncate">{lastTrade.symbol}</span>
          <span className="text-[#3FB950] flex-shrink-0">
            +${lastTrade.netProfit?.toFixed(2) ?? '0.00'}
          </span>
          <span className="text-[#484F58] flex-shrink-0">{formatTimeAgo(lastTrade.timestamp ?? 0)}</span>
        </div>
      ) : (
        <div className="bg-[#0D1117] rounded p-1.5 mb-3 text-center font-mono text-[10px] text-[#484F58]">
          {authBlocked ? 'Sign in to see live bot data' : magnusData === null ? 'Initializing…' : 'No trades yet'}
        </div>
      )}

      {/* CTA */}
      <Link
        href="/magnus"
        className="block text-center text-[11px] text-[#388BFD] py-1.5 bg-[#388BFD]/8 border border-[#388BFD]/25 rounded hover:bg-[#388BFD]/15 transition-colors"
      >
        View Magnus dashboard →
      </Link>
    </div>
  )
}
