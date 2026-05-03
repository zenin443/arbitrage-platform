'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Activity, TrendingUp, TrendingDown, Zap, Shield, Clock,
  BarChart2, ChevronDown, ChevronUp, RefreshCw, Circle,
  DollarSign, Award, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import StatCard from '@/components/ui/StatCard'
import SignalScoreGauge from '@/components/magnus/SignalScoreGauge'
import AlgoExplainerCard, { ALGO_DEFINITIONS } from '@/components/magnus/AlgoExplainerCard'
import SignalHeatmap from '@/components/magnus/SignalHeatmap'
import StrategyPnlWaterfall from '@/components/magnus/StrategyPnlWaterfall'
import { getBotById, type BotDefinition } from '@/lib/magnus/botRegistry'
import { useSimulators } from '@/contexts/SimulatorContext'

// ── Types ────────────────────────────────────────────────────────────────────

interface Trade {
  id: string
  timestamp: number
  symbol: string
  buyExchange: string
  sellExchange: string
  spreadPercent: number
  tradeSizeUsd: number
  netProfit: number
  type?: string
}

interface BotState {
  id: string
  name: string
  startingCapital: number
  totalPortfolioValueUsd: number
  totalPnl: number
  totalPnlPercent: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalFeesPaid: number
  maxDrawdown: number
  peakValue: number
  isRunning: boolean
  circuitBreakerActive: boolean
  recentTrades?: Trade[]
  startedAt: number
  lastTradeAt?: number | null
  voidedSignals?: number
}

// ── Bot tab configuration ────────────────────────────────────────────────────

const KEBAB_TO_CAMEL: Record<string, string> = {
  'magnus-beta-1k':       'magnusBeta1k',
  'magnus-beta-10k':      'magnusBeta10k',
  'magnus-alpha':         'magnusAlpha',
  'magnus-futures':       'magnusFutures',
  'magnus-rate-harvest':  'magnusRateHarvest',
  'magnus-pairs':         'magnusPairs',
  'magnus-cascade':       'magnusCascade',
  'magnus-calendar':      'magnusCalendar',
  'magnus-listing':       'magnusListing',
}

const BOT_TABS = [
  { id: 'magnus-beta-1k',      label: 'Beta $1K',     capital: '$1K',   color: 'cyan',   apiPath: '/api/simulators'          },
  { id: 'magnus-beta-10k',     label: 'Beta $10K',    capital: '$10K',  color: 'blue',   apiPath: '/api/simulators'          },
  { id: 'magnus-alpha',        label: 'Alpha',        capital: 'Flex',  color: 'violet', apiPath: '/api/magnus/alpha'        },
  { id: 'magnus-futures',      label: 'Futures',      capital: '$1K',   color: 'amber',  apiPath: '/api/magnus/futures'      },
  { id: 'magnus-rate-harvest', label: 'Rate Harvest', capital: '$5K',   color: 'green',  apiPath: '/api/magnus/rate-harvest' },
  { id: 'magnus-pairs',        label: 'Pairs',        capital: '$10K',  color: 'purple', apiPath: '/api/simulators'          },
  { id: 'magnus-cascade',      label: 'Cascade',      capital: '$3K',   color: 'orange', apiPath: '/api/simulators'          },
  { id: 'magnus-calendar',     label: 'Calendar',     capital: '$5K',   color: 'teal',   apiPath: '/api/simulators'          },
  { id: 'magnus-listing',      label: 'Listing',      capital: '$2K',   color: 'pink',   apiPath: '/api/simulators'          },
]

const COLOR_MAP: Record<string, { ring: string; badge: string; text: string; glow: string }> = {
  cyan:   { ring: 'ring-cyan-500/40',   badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',   text: 'text-cyan-400',   glow: '#06b6d4' },
  blue:   { ring: 'ring-blue-500/40',   badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',   text: 'text-blue-400',   glow: '#3b82f6' },
  violet: { ring: 'ring-violet-500/40', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/30', text: 'text-violet-400', glow: '#8b5cf6' },
  amber:  { ring: 'ring-amber-500/40',  badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',  text: 'text-amber-400',  glow: '#f59e0b' },
  green:  { ring: 'ring-green-500/40',  badge: 'bg-green-500/10 text-green-300 border-green-500/30',  text: 'text-green-400',  glow: '#22c55e' },
  purple: { ring: 'ring-purple-500/40', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30', text: 'text-purple-400', glow: '#a855f7' },
  orange: { ring: 'ring-orange-500/40', badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30', text: 'text-orange-400', glow: '#f97316' },
  teal:   { ring: 'ring-teal-500/40',   badge: 'bg-teal-500/10 text-teal-300 border-teal-500/30',   text: 'text-teal-400',   glow: '#14b8a6' },
  pink:   { ring: 'ring-pink-500/40',   badge: 'bg-pink-500/10 text-pink-300 border-pink-500/30',   text: 'text-pink-400',   glow: '#ec4899' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 2): string {
  if (!isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtUsd(n: number): string {
  if (!isFinite(n)) return '—'
  return '$' + fmt(Math.abs(n))
}
function fmtPct(n: number): string { return fmt(n) + '%' }
function timeSince(ms: number | null | undefined): string {
  if (!ms) return 'never'
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// Simulated Sharpe from win rate + drawdown
function estimateSharpe(wr: number, dd: number): string {
  if (!wr || !dd) return '—'
  const sharpe = (wr / 100) / Math.max(0.5, dd)
  return fmt(sharpe * 10, 1)
}

// ── Sub-components ───────────────────────────────────────────────────────────


function RiskMeter({ drawdown, circuitBreaker }: { drawdown: number; circuitBreaker: boolean }) {
  const pct = Math.min(100, drawdown * 6.67)
  const color = circuitBreaker ? '#F85149' : drawdown > 10 ? '#F85149' : drawdown > 5 ? '#D29922' : '#3FB950'
  return (
    <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#484F58] uppercase tracking-wider font-mono">Risk Meter</span>
        {circuitBreaker && (
          <span className="text-[10px] text-[#F85149] font-medium animate-pulse font-mono">CIRCUIT BREAKER</span>
        )}
      </div>
      <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#484F58] font-mono">
        <span>Safe</span>
        <span style={{ color }}>DD: {fmtPct(drawdown)}</span>
        <span>Halt</span>
      </div>
    </div>
  )
}

function TradeRow({ trade, index }: { trade: Trade; index: number }) {
  const profit = trade.netProfit
  return (
    <tr className={`border-t border-[#21262D]/50 ${index % 2 === 0 ? 'bg-[#0D1117]/30' : ''}`}>
      <td className="px-3 py-1.5 text-[11px] text-[#484F58] font-mono whitespace-nowrap">
        {timeSince(trade.timestamp)}
      </td>
      <td className="px-3 py-1.5 text-[11px] text-[#E6EDF3] font-mono">{trade.symbol}</td>
      <td className="px-3 py-1.5 text-[11px] text-[#8B949E] font-mono capitalize">{trade.type ?? 'cex_cex'}</td>
      <td className="px-3 py-1.5 text-[11px] text-[#8B949E] font-mono">
        {trade.buyExchange} → {trade.sellExchange}
      </td>
      <td className="px-3 py-1.5 text-[11px] font-mono text-[#388BFD]">{fmtPct(trade.spreadPercent)}</td>
      <td className={`px-3 py-1.5 text-[11px] font-mono font-medium ${profit >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
        {profit >= 0 ? '+' : ''}{fmtUsd(profit)}
      </td>
    </tr>
  )
}

// ── Empty-state identity + reason sub-components ─────────────────────────────

type AuthState = 'anon' | 'authed_locked' | 'authed_no_data' | 'authed_ok'

function BotIdentityHeader({
  bot,
  color,
  liveStatus = 'initializing',
  activeExchangeCount,
}: {
  bot: BotDefinition | undefined
  color: string
  liveStatus?: 'live' | 'initializing' | 'locked' | 'coming_soon'
  activeExchangeCount?: number
}) {
  const clr = COLOR_MAP[color] ?? COLOR_MAP.cyan!
  if (!bot) return null

  function StatusChip() {
    if (liveStatus === 'live') {
      return (
        <span className="flex items-center gap-1.5 text-[11px] text-[#3FB950] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse inline-block" />
          LIVE — {activeExchangeCount ?? 0} exchanges
        </span>
      )
    }
    if (liveStatus === 'locked') {
      return (
        <span className="flex items-center gap-1.5 text-[11px] text-[#484F58] font-mono">
          <span className="w-1.5 h-1.5 rounded-full border border-[#484F58] inline-block" />
          LOCKED
        </span>
      )
    }
    if (liveStatus === 'coming_soon') {
      return (
        <span className="flex items-center gap-1.5 text-[11px] text-[#484F58] font-mono">
          <span className="w-1.5 h-1.5 rounded-full border border-[#484F58] inline-block" />
          COMING SOON
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-[#D29922] font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D29922] animate-pulse inline-block" />
        INITIALIZING
      </span>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <h2
            className="font-mono font-bold leading-none"
            style={{ fontSize: '28px', color: bot.glowHex, textShadow: `0 0 20px ${bot.glowHex}50` }}
          >
            {bot.codename}
          </h2>
          <p className="text-[#8B949E] text-[11px] mt-1 font-mono">{bot.tagline}</p>
        </div>
        <span
          className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium border"
          style={{
            color: bot.glowHex,
            borderColor: `${bot.glowHex}50`,
            background: `${bot.glowHex}1A`,
          }}
        >
          {bot.strategyClass}
        </span>
      </div>

      {/* Benchmark chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded border border-[#21262D] bg-[#161B22] text-[#8B949E] font-mono">
          Win Rate: <span className="text-[#E6EDF3]">{bot.winRateBenchmark}</span>
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded border border-[#21262D] bg-[#161B22] text-[#8B949E] font-mono">
          Signals/Day: <span className="text-[#E6EDF3]">{bot.signalsPerDay}</span>
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded border border-[#21262D] bg-[#161B22] text-[#8B949E] font-mono">
          Sharpe: <span className="text-[#E6EDF3]">{bot.sharpe}</span>
        </span>
      </div>

      {/* Identity chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${clr.badge}`}>{bot.capitalLabel}</span>
        <span className="text-[10px] px-2 py-0.5 rounded border border-[#21262D] bg-[#161B22] text-[#8B949E] font-mono">
          {bot.strategyClass}
        </span>
        {bot.quoteCurrency && (
          <span className="text-xs px-2 py-0.5 rounded border border-gray-700 bg-gray-800/40 font-mono"
            style={{
              color: bot.quoteCurrency === 'USDT' ? '#3FB950'
                : bot.quoteCurrency === 'USDC' ? '#388BFD'
                : '#D29922',
            }}
          >
            {bot.quoteCurrency}
          </span>
        )}
        <StatusChip />
      </div>
    </div>
  )
}

function BotEmptyStateForReason({
  reason,
  bot,
  botId,
}: {
  reason: AuthState
  bot: BotDefinition | undefined
  botId: string
}) {
  const algo = ALGO_DEFINITIONS[botId]

  if (reason === 'authed_ok') {
    return (
      <div className="flex items-center justify-center h-32 text-[#484F58] text-[12px] font-mono">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading bot data…
      </div>
    )
  }

  if (reason === 'anon') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-5 space-y-3">
          <h3 className="text-[#E6EDF3] font-medium text-[14px] font-mono">Sign in to view live trade detail</h3>
          <p className="text-[12px] text-[#8B949E] font-mono">
            Aggregate stats are public. Trade-level data requires authentication.
          </p>
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <Link
              href="/login"
              className="px-4 py-2 rounded bg-[#388BFD] hover:bg-[#58a6ff] text-white text-[12px] font-mono font-medium transition-colors"
            >
              Sign In
            </Link>
            <a
              href="#"
              className="text-[12px] text-[#8B949E] hover:text-[#E6EDF3] font-mono underline underline-offset-2"
            >
              Why? Read about our IP protection
            </a>
          </div>
        </div>
        {algo && <AlgoExplainerCard algo={algo} defaultOpen={true} />}
      </div>
    )
  }

  if (reason === 'authed_locked') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[#D29922]/30 bg-[#D29922]/5 p-5 space-y-3">
          <h3 className="text-[#E6EDF3] font-medium text-[14px] font-mono">Available on Magnus tier</h3>
          <p className="text-[12px] text-[#8B949E] font-mono">
            {bot?.codename ?? 'This bot'} requires the Magnus tier ($249/mo) or above. Unlock all 9 bot detail panels, real-time trade feeds, and advanced signals.
          </p>
          <div className="pt-1">
            <Link
              href="/pricing"
              className="inline-block px-4 py-2 rounded bg-[#D29922] hover:bg-[#e3b341] text-[#0D1117] text-[12px] font-mono font-medium transition-colors"
            >
              Upgrade to Magnus
            </Link>
          </div>
        </div>
        {algo && <AlgoExplainerCard algo={algo} defaultOpen={false} />}
      </div>
    )
  }

  // authed_no_data
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-5 space-y-3">
        <h3 className="text-[#E6EDF3] font-medium text-[14px] font-mono">Strategy launching soon</h3>
        <p className="text-[12px] text-[#8B949E] font-mono">
          {bot?.codename ?? 'This strategy'} is in final development. Paper trading begins in the next sprint. The algorithm is documented below.
        </p>
      </div>
      {algo && <AlgoExplainerCard algo={algo} defaultOpen={true} />}
    </div>
  )
}

// ── Bot Panel ────────────────────────────────────────────────────────────────

// U2 fix: module-scope set persists across BotPanel remounts (tab switches).
// A per-instance useRef resets on unmount/remount — this does not.
const SESSION_FAILED_ENDPOINTS = new Set<string>();

function BotPanel({ botId, color }: { botId: string; color: string }) {
  const [state, setState] = useState<BotState | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [showTrades, setShowTrades] = useState(true)
  const [authState, setAuthState] = useState<AuthState>('anon')
  const clr = COLOR_MAP[color] ?? COLOR_MAP.cyan!
  const algo = ALGO_DEFINITIONS[botId]

  // U1: read simulator data from shared context — no direct fetch for simulator bots
  const { simulators, authBlocked: simAuthBlocked } = useSimulators()
  const simulatorsRef = useRef(simulators)
  simulatorsRef.current = simulators

  // U7: only show loading skeleton on the very first fetch
  const hasLoadedRef = useRef(false)

  const stateEndpoint =
    botId === 'magnus-alpha'        ? '/api/magnus/alpha' :
    botId === 'magnus-futures'      ? '/api/magnus/futures' :
    botId === 'magnus-rate-harvest' ? '/api/magnus/rate-harvest' :
    '/api/simulators'

  const load = useCallback(async () => {
    // U4: skip when tab is hidden
    if (typeof document !== 'undefined' && document.hidden) return
    // U7: only show loading spinner on first load — keep stale data visible on refetches
    if (!hasLoadedRef.current) setLoading(true)

    try {
      if (stateEndpoint === '/api/simulators') {
        // U1: read from shared context cache — no network call
        if (simAuthBlocked) {
          setAuthState('anon')
        } else {
          const found = simulatorsRef.current.find((b) => b.id === botId) as BotState | undefined
          if (found) {
            setState(found)
            setAuthState('authed_ok')
          } else if (simulatorsRef.current.length > 0) {
            // data loaded but this bot not in list
            setAuthState('authed_no_data')
          }
          // else: context still loading — keep previous state
        }
      } else {
        // U2: give up if this endpoint already returned 401/403 in this session.
        // SESSION_FAILED_ENDPOINTS is module-scope — survives tab switches.
        if (SESSION_FAILED_ENDPOINTS.has(stateEndpoint)) return

        const r = await fetch(stateEndpoint)
        if (r.ok) {
          const data = await r.json() as BotState
          if (data) {
            setState(data)
            setAuthState('authed_ok')
          } else {
            setAuthState('authed_no_data')
          }
        } else if (r.status === 401 || r.status === 403) {
          // U2: record in module-scope set — persists across remounts
          SESSION_FAILED_ENDPOINTS.add(stateEndpoint)
          setAuthState(r.status === 401 ? 'anon' : 'authed_locked')
        } else if (r.status === 404) {
          setAuthState('authed_no_data')
        }
      }

      // Trades (only for bots with dedicated trade endpoints)
      const tradesEndpoint =
        botId === 'magnus-alpha'        ? '/api/magnus/alpha/trades' :
        botId === 'magnus-futures'      ? '/api/magnus/futures/trades' :
        botId === 'magnus-rate-harvest' ? '/api/magnus/rate-harvest/trades' :
        null

      if (tradesEndpoint && !SESSION_FAILED_ENDPOINTS.has(stateEndpoint)) {
        const r2 = await fetch(`${tradesEndpoint}?limit=20`)
        if (r2.ok) setTrades(await r2.json() as Trade[])
      }

    } catch { /* non-fatal */ } finally {
      setLoading(false)
      hasLoadedRef.current = true
    }
  }, [botId, stateEndpoint, simAuthBlocked])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 6_000)
    return () => clearInterval(t)
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[#484F58] font-mono text-[12px]">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading {botId}…
      </div>
    )
  }

  if (!state) {
    const bot = getBotById(botId)
    const liveStatus =
      authState === 'authed_locked'  ? 'locked' :
      authState === 'authed_no_data' ? 'coming_soon' :
      'initializing'
    return (
      <div className="space-y-4">
        <BotIdentityHeader bot={bot} color={color} liveStatus={liveStatus} />
        <BotEmptyStateForReason reason={authState} bot={bot} botId={botId} />
      </div>
    )
  }

  const pnlPositive = state.totalPnl >= 0
  const sharpe = estimateSharpe(state.winRate, state.maxDrawdown)
  const calmar = state.maxDrawdown > 0
    ? fmt((state.totalPnlPercent / state.maxDrawdown) * 10, 1)
    : '—'
  const avgScore = state.totalTrades > 0
    ? Math.round(50 + (state.winRate - 75))
    : 50

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${state.isRunning ? 'bg-[#3FB950] animate-pulse' : 'bg-[#484F58]'}`} />
          <span className="text-[12px] text-[#C9D1D9] font-medium font-mono">{state.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${clr.badge}`}>
            {state.isRunning ? 'LIVE' : 'PAUSED'}
          </span>
          {state.circuitBreakerActive && (
            <span className="text-[10px] px-2 py-0.5 rounded border bg-[#F85149]/15 text-[#F85149] border-[#F85149]/30 animate-pulse font-mono">
              CIRCUIT BREAKER
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#484F58] font-mono">
          <Clock className="w-3 h-3" />
          Last trade: {timeSince(state.lastTradeAt)}
        </div>
      </div>

      {/* Key stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          label="Portfolio"
          value={fmtUsd(state.totalPortfolioValueUsd)}
          sub={`Started: ${fmtUsd(state.startingCapital)}`}
        />
        <StatCard
          label="Total PnL"
          value={(pnlPositive ? '+' : '') + fmtUsd(state.totalPnl)}
          sub={fmtPct(state.totalPnlPercent)}
          positive={pnlPositive}
        />
        <StatCard label="Trades" value={state.totalTrades.toLocaleString()} sub={`${state.winningTrades}W / ${state.losingTrades}L`} />
        <StatCard label="Win Rate" value={fmtPct(state.winRate)} sub="rolling" positive={state.winRate > 80} />
        <StatCard label="Fees Paid" value={fmtUsd(state.totalFeesPaid)} />
        <StatCard label="Max Drawdown" value={fmtPct(state.maxDrawdown)} positive={state.maxDrawdown < 5} />
      </div>

      {/* Score gauge + risk metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Signal Score Gauge */}
        <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] text-[#484F58] uppercase tracking-wider font-mono">Signal Quality</span>
          <SignalScoreGauge score={avgScore} size="md" />
          <span className="text-[10px] text-[#484F58] font-mono">avg. execution score</span>
        </div>

        {/* Risk metrics */}
        <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3 space-y-2.5">
          <span className="text-[10px] text-[#484F58] uppercase tracking-wider block font-mono">Risk Metrics</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Sharpe Ratio</span>
            <span className="font-mono text-[#3FB950]">{sharpe}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Max Drawdown</span>
            <span className={`font-mono ${state.maxDrawdown > 10 ? 'text-[#F85149]' : 'text-[#D29922]'}`}>
              {fmtPct(state.maxDrawdown)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Calmar Ratio</span>
            <span className="font-mono text-[#388BFD]">{calmar}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Peak Value</span>
            <span className="font-mono text-[#E6EDF3]">{fmtUsd(state.peakValue)}</span>
          </div>
        </div>

        {/* Trade efficiency */}
        <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3 space-y-2.5">
          <span className="text-[10px] text-[#484F58] uppercase tracking-wider block font-mono">Efficiency</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Profit Factor</span>
            <span className="font-mono text-[#E6EDF3]">
              {state.losingTrades > 0
                ? fmt((state.winningTrades / state.losingTrades) * (state.winRate / (100 - state.winRate)), 2)
                : '∞'}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Avg PnL/Trade</span>
            <span className={`font-mono ${state.totalTrades > 0 && state.totalPnl / state.totalTrades >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
              {state.totalTrades > 0 ? fmtUsd(state.totalPnl / state.totalTrades) : '—'}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Fee/Trade</span>
            <span className="font-mono text-[#8B949E]">
              {state.totalTrades > 0 ? fmtUsd(state.totalFeesPaid / state.totalTrades) : '—'}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B949E] font-mono">Voided Signals</span>
            <span className="font-mono text-[#484F58]">{state.voidedSignals ?? '—'}</span>
          </div>
        </div>

        {/* Risk meter */}
        <RiskMeter drawdown={state.maxDrawdown} circuitBreaker={state.circuitBreakerActive ?? false} />
      </div>

      {/* Algorithm explainer */}
      {algo && <AlgoExplainerCard algo={algo} />}

      {/* Recent trades table */}
      {(trades.length > 0 || state.recentTrades?.length) && (
        <div className="rounded-lg border border-[#21262D] bg-[#161B22] overflow-hidden">
          <button
            onClick={() => setShowTrades(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1C2128] transition-colors"
          >
            <span className="text-[10px] font-medium text-[#8B949E] uppercase tracking-wider font-mono">
              Recent Trades ({(trades.length || state.recentTrades?.length || 0)})
            </span>
            {showTrades ? <ChevronUp className="w-3.5 h-3.5 text-[#484F58]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#484F58]" />}
          </button>
          {showTrades && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0D1117]/50">
                    {['Time', 'Symbol', 'Type', 'Route', 'Spread', 'Net PnL'].map(h => (
                      <th key={h} className="px-3 py-2 text-[10px] text-[#484F58] font-normal uppercase tracking-wider font-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(trades.length ? trades : state.recentTrades ?? []).slice(0, 20).map((t, i) => (
                    <TradeRow key={t.id ?? i} trade={t} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── All-bots summary row ─────────────────────────────────────────────────────

function AllBotsSummary({ states }: { states: Record<string, BotState> }) {
  const totalAum  = Object.values(states).reduce((s, b) => s + (b.totalPortfolioValueUsd ?? 0), 0)
  const totalPnl  = Object.values(states).reduce((s, b) => s + (b.totalPnl ?? 0), 0)
  const totalTrades = Object.values(states).reduce((s, b) => s + (b.totalTrades ?? 0), 0)
  const avgWr     = Object.values(states).length > 0
    ? Object.values(states).reduce((s, b) => s + (b.winRate ?? 0), 0) / Object.values(states).length
    : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3">
        <div className="text-[10px] text-[#484F58] mb-1 font-mono uppercase tracking-wider">Total AUM (Paper)</div>
        <div className="text-[20px] font-medium text-[#E6EDF3] font-mono">{fmtUsd(totalAum)}</div>
        <div className="text-[10px] text-[#484F58] mt-0.5 font-mono">across all bots</div>
      </div>
      <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3">
        <div className="text-[10px] text-[#484F58] mb-1 font-mono uppercase tracking-wider">Total PnL</div>
        <div className={`text-[20px] font-medium font-mono ${totalPnl >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
          {totalPnl >= 0 ? '+' : '-'}{fmtUsd(totalPnl)}
        </div>
      </div>
      <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3">
        <div className="text-[10px] text-[#484F58] mb-1 font-mono uppercase tracking-wider">Total Trades</div>
        <div className="text-[20px] font-medium text-[#E6EDF3] font-mono">{totalTrades.toLocaleString()}</div>
        <div className="text-[10px] text-[#484F58] mt-0.5 font-mono">all strategies</div>
      </div>
      <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-3">
        <div className="text-[10px] text-[#484F58] mb-1 font-mono uppercase tracking-wider">Avg Win Rate</div>
        <div className="text-[20px] font-medium text-[#388BFD] font-mono">{fmtPct(avgWr)}</div>
        <div className="text-[10px] text-[#484F58] mt-0.5 font-mono">cross-strategy</div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MagnusPage() {
  const [activeTab, setActiveTab] = useState('magnus-beta-1k')
  const [summaryStates, setSummaryStates] = useState<Record<string, BotState>>({})
  const [now, setNow] = useState<string>('')

  // U1: read simulator bots from shared context for the summary waterfall
  const { simulators } = useSimulators()

  useEffect(() => {
    const update = () => setNow(new Date().toUTCString().replace('GMT', 'UTC'))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  // Populate summary states for simulator bots directly from context (no fetch)
  useEffect(() => {
    if (simulators.length === 0) return
    setSummaryStates(prev => {
      const next = { ...prev }
      const simulatorBots = BOT_TABS.filter(b => b.apiPath === '/api/simulators')
      for (const bot of simulatorBots) {
        const found = simulators.find(s => s.id === bot.id)
        if (found) next[bot.id] = found as unknown as BotState
      }
      return next
    })
  }, [simulators])

  // Load summary states for bots with UNIQUE endpoints (alpha, futures, rate-harvest)
  // U2: stop retrying on 401/403
  useEffect(() => {
    const failedEndpoints = new Set<string>()
    async function loadUniqueEndpoints() {
      // U4: skip when tab is hidden
      if (typeof document !== 'undefined' && document.hidden) return
      const uniqueEndpointBots = BOT_TABS.filter(b => b.apiPath !== '/api/simulators')
      for (const bot of uniqueEndpointBots) {
        if (failedEndpoints.has(bot.apiPath)) continue // U2: already gave up
        try {
          const r = await fetch(bot.apiPath)
          if (r.status === 401 || r.status === 403) {
            failedEndpoints.add(bot.apiPath) // U2: stop retrying this endpoint
            continue
          }
          if (r.ok) {
            const data = await r.json() as BotState
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              setSummaryStates(prev => ({ ...prev, [bot.id]: data }))
            }
          }
        } catch { /* non-fatal */ }
      }
    }
    void loadUniqueEndpoints()
    const t = setInterval(() => void loadUniqueEndpoints(), 10_000)
    return () => clearInterval(t)
  }, [])

  const activeBot = BOT_TABS.find(b => b.id === activeTab)!
  const clr = COLOR_MAP[activeBot.color] ?? COLOR_MAP.cyan!

  const fleetBars = useMemo(() => {
    return BOT_TABS.map(tab => {
      const s = summaryStates[tab.id]
      const bot = getBotById(tab.id)
      return {
        id: tab.id,
        label: bot?.codename ?? tab.label,
        pnl: s?.totalPnl ?? 0,
        trades: s?.totalTrades ?? 0,
        color: bot?.glowHex ?? '#06b6d4',
      }
    })
  }, [summaryStates])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0D1117] text-[#E6EDF3]">
      {/* Header — matches Dashboard/Intelligence */}
      <AppHeader
        activePage="/magnus"
        statusSlot={<span className="text-[10px] font-mono text-[#06B6D4] mr-1">{BOT_TABS.length} bots</span>}
      />

      <main className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
        {/* Page title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[16px] font-medium font-mono flex items-center gap-2 text-[#E6EDF3]">
              <BarChart2 className="w-4 h-4 text-[#388BFD]" />
              Magnus AI — Quant Command Center
            </h1>
            <p className="text-[11px] text-[#484F58] mt-1 font-mono">
              9 paper trading bots · 15 signal sources · 18 exchanges · 128 pairs monitored
            </p>
          </div>
          <div className="text-[10px] text-[#484F58] font-mono">
            {now}
          </div>
        </div>

        {/* Fleet summary row */}
        <AllBotsSummary states={summaryStates} />

        {/* Bot tab bar */}
        {(() => {
          const ENRICHED_TABS = BOT_TABS.map(tab => {
            const bot = getBotById(tab.id)
            return {
              ...tab,
              codename: bot?.codename ?? tab.label,
              tagline: bot?.tagline ?? '',
              glowHex: bot?.glowHex ?? '#888888',
            }
          })
          return (
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-4 scrollbar-none">
              {ENRICHED_TABS.map(tab => {
                const bColor = COLOR_MAP[tab.color] ?? COLOR_MAP.cyan!
                const s = summaryStates[tab.id]
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.tagline}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-medium whitespace-nowrap transition-all border font-mono
                      ${isActive
                        ? `${bColor.badge} ${bColor.ring} ring-1`
                        : 'text-[#8B949E] border-transparent hover:border-[#21262D] hover:bg-[#161B22]'
                      }`}
                  >
                    <span
                      className="inline-block transition-opacity"
                      style={{
                        color: tab.glowHex,
                        fontSize: '12px',
                        lineHeight: 1,
                        opacity: isActive ? 1 : 0.45
                      }}
                      aria-hidden="true"
                    >
                      ●
                    </span>
                    <span className="font-mono font-medium tracking-wide">{tab.codename}</span>
                    {s && (
                      <span className={`text-[10px] font-mono ${s.totalPnl >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
                        {s.totalPnl >= 0 ? '+' : ''}{fmt(s.totalPnlPercent, 1)}%
                      </span>
                    )}
                    {!s && (
                      <span className="text-[10px] opacity-60">· {tab.capital}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Active bot panel */}
        <div className={`rounded-lg border p-5 ${clr.ring} ring-1 bg-[#161B22]/60`}>
          <BotPanel botId={activeTab} color={activeBot.color} />
        </div>

        {/* Fleet context */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-3">
            <h3 className="text-[10px] font-medium text-[#484F58] mb-3 uppercase tracking-wider font-mono">
              Fleet PnL Contribution
            </h3>
            <StrategyPnlWaterfall bars={fleetBars} />
          </div>
          <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-3">
            <h3 className="text-[10px] font-medium text-[#484F58] mb-3 uppercase tracking-wider font-mono">
              Signal Density Heatmap
            </h3>
            <SignalHeatmap data={[]} />
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
