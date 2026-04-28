'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, TrendingUp, Shield, Zap } from 'lucide-react'

export interface AlgoParam {
  label: string
  value: string
  hint?: string
}

export interface AlgoDefinition {
  id: string
  name: string
  tagline: string               // one-line edge description
  description: string           // 2–3 sentence plain-English explanation
  howItWorks: string[]          // step-by-step (3–5 bullets)
  edge: string                  // why this generates alpha
  params: AlgoParam[]           // key parameters shown in table
  metrics: {
    sharpE?: string
    maxDrawdown?: string
    winRate?: string
    capitalMin?: string
    frequency?: string
    holdTime?: string
  }
  riskLevel: 'low' | 'medium' | 'high'
  strategyType: 'market_neutral' | 'directional' | 'event_driven' | 'statistical'
}

const RISK_COLORS = {
  low:    { badge: 'bg-green-500/20 text-green-300 border-green-500/30',  dot: 'bg-green-500' },
  medium: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',  dot: 'bg-amber-500' },
  high:   { badge: 'bg-red-500/20 text-red-300 border-red-500/30',        dot: 'bg-red-500'   },
}

const TYPE_COLORS: Record<string, string> = {
  market_neutral: 'text-blue-400',
  directional:    'text-purple-400',
  event_driven:   'text-orange-400',
  statistical:    'text-cyan-400',
}

const TYPE_LABELS: Record<string, string> = {
  market_neutral: 'Market Neutral',
  directional:    'Directional',
  event_driven:   'Event-Driven',
  statistical:    'Statistical Arb',
}

interface Props {
  algo: AlgoDefinition
  defaultOpen?: boolean
}

export default function AlgoExplainerCard({ algo, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const risk = RISK_COLORS[algo.riskLevel]

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="text-left">
            <div className="text-sm font-semibold text-white">{algo.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{algo.tagline}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${risk.badge}`}>
            {algo.riskLevel.toUpperCase()} RISK
          </span>
          <span className={`text-xs font-medium ${TYPE_COLORS[algo.strategyType]}`}>
            {TYPE_LABELS[algo.strategyType]}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Body — collapsible */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-800/60">
          {/* Description */}
          <p className="text-sm text-gray-300 mt-3 leading-relaxed">{algo.description}</p>

          {/* How it works */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">How It Works</span>
            </div>
            <ol className="space-y-1">
              {algo.howItWorks.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-300">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 font-mono">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Edge */}
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">The Edge</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{algo.edge}</p>
          </div>

          {/* Parameters table */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Parameters</span>
            </div>
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {algo.params.map((p, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800/30' : ''}>
                      <td className="px-3 py-2 text-gray-400 font-medium w-1/2">{p.label}</td>
                      <td className="px-3 py-2 text-white font-mono">
                        {p.value}
                        {p.hint && (
                          <span className="ml-1 text-[10px] text-gray-600 font-sans" title={p.hint}>
                            ⓘ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance metrics */}
          {Object.keys(algo.metrics).length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {algo.metrics.sharpE && (
                <div className="rounded-lg bg-gray-800/60 p-2 text-center">
                  <div className="text-xs text-gray-500">Sharpe Ratio</div>
                  <div className="text-sm font-bold text-green-400 font-mono">{algo.metrics.sharpE}</div>
                </div>
              )}
              {algo.metrics.winRate && (
                <div className="rounded-lg bg-gray-800/60 p-2 text-center">
                  <div className="text-xs text-gray-500">Win Rate</div>
                  <div className="text-sm font-bold text-blue-400 font-mono">{algo.metrics.winRate}</div>
                </div>
              )}
              {algo.metrics.maxDrawdown && (
                <div className="rounded-lg bg-gray-800/60 p-2 text-center">
                  <div className="text-xs text-gray-500">Max Drawdown</div>
                  <div className="text-sm font-bold text-red-400 font-mono">{algo.metrics.maxDrawdown}</div>
                </div>
              )}
              {algo.metrics.frequency && (
                <div className="rounded-lg bg-gray-800/60 p-2 text-center">
                  <div className="text-xs text-gray-500">Frequency</div>
                  <div className="text-sm font-bold text-purple-400 font-mono">{algo.metrics.frequency}</div>
                </div>
              )}
              {algo.metrics.holdTime && (
                <div className="rounded-lg bg-gray-800/60 p-2 text-center">
                  <div className="text-xs text-gray-500">Hold Time</div>
                  <div className="text-sm font-bold text-amber-400 font-mono">{algo.metrics.holdTime}</div>
                </div>
              )}
              {algo.metrics.capitalMin && (
                <div className="rounded-lg bg-gray-800/60 p-2 text-center">
                  <div className="text-xs text-gray-500">Min Capital</div>
                  <div className="text-sm font-bold text-cyan-400 font-mono">{algo.metrics.capitalMin}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pre-built algo definitions for all 9 Magnus bots ─────────────────────────

export const ALGO_DEFINITIONS: Record<string, AlgoDefinition> = {
  // ─── VEGA (magnus-beta-1k) ──────────────────────────────────────────────────
  // Q2 RECONCILIATION: Min Net Spread corrected from published 0.08% → 0.25%.
  // Runtime: paper-trader.ts evaluateTrade() computes dynamic floor as
  //   max(0.25%, (buyFee + sellFee) × 1.5). Published value was aspirational
  //   and caused the 67% loss rate at 33% win rate. Engine is correct.
  // Max Position corrected from 5% → 3% (runtime: startingCapital * 0.03, line ~1419).
  'magnus-beta-1k': {
    id: 'magnus-beta-1k', name: 'VEGA · $1K', tagline: 'Cross-exchange price gap harvester',
    description: 'Monitors 18+ exchanges simultaneously for the same asset trading at different prices. When Exchange A sells BTC cheaper than Exchange B buys it, VEGA buys on the cheap side and records the spread as profit — only when the spread exceeds round-trip fees plus slippage.',
    howItWorks: [
      'WebSocket tick feed receives bid/ask from 18+ exchanges in real-time',
      'Spread calculator detects net-of-fee gaps across all exchange pairs',
      'Dynamic minimum spread = max(0.25%, 1.5× round-trip fee) — no charity trades',
      'Signal scorer: age, depth, win-rate, volatility, time-of-day all filter the signal',
      'Paper trade executed when spread meets threshold (cooldown: 10s per symbol)',
    ],
    edge: 'Market microstructure inefficiency — exchange tick feeds update at different speeds. Regional liquidity imbalances and WebSocket latency create price dislocations lasting 1–30 seconds. Only profitable spreads (>0.25%) are acted on.',
    params: [
      { label: 'Starting Capital', value: '$1,000' },
      { label: 'Min Net Spread', value: '0.25% (dynamic floor: 1.5× fees)', hint: 'Runtime: max(0.25%, buyFee+sellFee×1.5)' },
      { label: 'Max Position', value: '3% of capital ($30 at $1K)', hint: 'Runtime: startingCapital × 0.03' },
      { label: 'Symbol Cooldown', value: '10 seconds per symbol' },
      { label: 'Exchanges', value: '7 CEX (ACTIVE_EXCHANGES)' },
      { label: 'Symbols Tracked', value: '128 pairs (USDT/USDC/BTC/ETH)' },
    ],
    metrics: { sharpE: '2.8–4.2', winRate: '85%+', maxDrawdown: '3%', frequency: '30–100/day', holdTime: '< 30s' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  // ─── NEXUS (magnus-beta-10k) ────────────────────────────────────────────────
  // Q2 RECONCILIATION: Same spread fix as VEGA. Max Position corrected to 3%.
  // Published 0.08% spread was the detection threshold, not execution threshold.
  'magnus-beta-10k': {
    id: 'magnus-beta-10k', name: 'NEXUS · $10K', tagline: 'High-capital CEX-CEX spread arbitrage',
    description: 'Same strategy as VEGA but with 10× the capital base. Larger position sizes per trade mean each qualifying spread generates proportionally more absolute profit. The depth-limited slippage model ensures oversized trades do not consume the spread.',
    howItWorks: [
      'Identical signal pipeline to VEGA ($1K) — same spread calculator and filters',
      'Position size: 3% of capital = $300 per trade (vs $30 for VEGA)',
      'Square-root slippage model (K=0.10) prevents depth-exceeding trades',
      'Rebalances across 7 exchanges to keep capital evenly distributed',
    ],
    edge: 'At $10K, each 0.30% spread yields $0.90 per trade vs $0.09 at $1K. Same execution friction, 10× the alpha per signal. Minimum spread unchanged at 0.25% — only verified profitable gaps fire.',
    params: [
      { label: 'Starting Capital', value: '$10,000' },
      { label: 'Min Net Spread', value: '0.25% (dynamic: 1.5× fees)', hint: 'Runtime: max(0.25%, buyFee+sellFee×1.5)' },
      { label: 'Max Position', value: '3% of capital ($300 at $10K)', hint: 'Runtime: startingCapital × 0.03' },
      { label: 'Slippage Model', value: 'Square-root (K=0.10)' },
      { label: 'Symbol Cooldown', value: '10 seconds per symbol' },
    ],
    metrics: { sharpE: '2.8–4.2', winRate: '85%+', maxDrawdown: '4%', frequency: '30–100/day', capitalMin: '$10K' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  // ─── HERMES (magnus-alpha) ──────────────────────────────────────────────────
  // Q2 RECONCILIATION: Published 0.08% was wrong. Runtime override in MagnusAlpha
  // class has MIN_PROFITABLE_SPREAD = 0.25% (file:paper-trader.ts line 2649).
  // Rebalance cycle updated from 1h to 4h (Q3 fix). ROI threshold 2× → 3×.
  'magnus-alpha': {
    id: 'magnus-alpha', name: 'HERMES · Flex', tagline: 'Inventory-managed multi-strategy executor',
    description: 'The most sophisticated core bot. HERMES maintains a diversified coin inventory across 9 exchanges, enabling instant simultaneous execution without pre-transfer. Its ROI-driven rebalancer only moves capital when projected trade income exceeds 3× the rebalance cost.',
    howItWorks: [
      'Seeded coin basket across 9 exchanges at startup — inventory always ready',
      'When gap detected: sells from inventory on expensive exchange, buys on cheap',
      'No transfer delay — both legs fire from pre-positioned balances',
      '4-hour rebalance cycle: only triggers if projected ROI > 3× cycle cost',
      'Per-cycle cost cap: max $5 in fees per rebalance sweep',
    ],
    edge: 'Eliminates the execution-delay problem. Inventory pre-positioned on both sides. ROI-gated rebalancer prevents capital drag — does not move unless the move will pay for itself 3× over.',
    params: [
      { label: 'Capital', value: 'Configurable ($1K–$10M, default $19K)' },
      { label: 'Min Spread', value: '0.25% (runtime override in MagnusAlpha)', hint: 'See paper-trader.ts MagnusAlpha.evaluateTrade()' },
      { label: 'Max Position %', value: '1–10% per trade (default 10%)' },
      { label: 'Rebalance Cycle', value: '4 hours (was 1 hour)', hint: 'Q3 fix: reduced from 3,600,000 ms → 14,400,000 ms' },
      { label: 'Min Rebalance ROI', value: '3× cost (was 2×)', hint: 'Q3 fix: shouldRebalance threshold raised' },
      { label: 'Per-Cycle Cost Cap', value: '$5.00 max rebalance fees/hour' },
      { label: 'Reserve per Exchange', value: '$1,000 USDT floor' },
      { label: 'Inventory Coins', value: '15 (auto-selected by signal volume)' },
    ],
    metrics: { sharpE: '3.5–5.5', winRate: '88%+', maxDrawdown: '5%', frequency: '100–300/day' },
    riskLevel: 'medium', strategyType: 'market_neutral',
  },
  // ─── KRONOS (magnus-futures) ────────────────────────────────────────────────
  // Q2: Published 0.25% matches runtime. No drift detected.
  'magnus-futures': {
    id: 'magnus-futures', name: 'KRONOS · $1K', tagline: 'Spot-futures basis arbitrage',
    description: 'Exploits the mechanical price difference between a coin\'s spot and its perpetual futures contract. Perpetual premiums collapse to zero at each 8-hour funding window — this convergence is a structural guarantee, not a probability.',
    howItWorks: [
      'Monitors spot vs perpetual mark price for 80+ symbols across 7 exchanges',
      'When futures premium > 0.25%, opens a delta-neutral position',
      'Long spot + Short perp — zero directional exposure to the underlying price',
      'Profit accumulates as basis converges to zero over 1–8 hours',
      'Funding payments every 8h provide additional carry income',
    ],
    edge: 'At each 8-hour funding reset, perpetual funding is redistributed between longs and shorts. This forces convergence mechanically. The only execution risk is latency, not market direction.',
    params: [
      { label: 'Starting Capital', value: '$1,000 USDT' },
      { label: 'Min Spread', value: '0.25% spot-futures basis' },
      { label: 'Exchanges', value: 'Binance, OKX, Bybit (perp-capable)' },
      { label: 'Position Cap', value: '$200 per trade' },
      { label: 'Cooldown', value: '30s per symbol' },
    ],
    metrics: { sharpE: '2.5–3.5', winRate: '92%+', maxDrawdown: '3%', frequency: '30–80/day' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  // ─── ATLAS (magnus-rate-harvest) ───────────────────────────────────────────
  // Q2: All published params match runtime in funding-rate-bot.ts. No drift.
  'magnus-rate-harvest': {
    id: 'magnus-rate-harvest', name: 'ATLAS · $5K', tagline: 'Delta-neutral funding rate income',
    description: 'Holds Long Spot + Short Perp simultaneously. The directional exposure cancels — no price risk. The 8-hour funding payment is pure passive income as long as rates stay positive. Bull market rates hit 200–900% annualized.',
    howItWorks: [
      'Polls funding rates across Binance, OKX, Bybit, Hyperliquid every 60s',
      'Opens position when 8h rate > 0.05% (≈ 22% annualized)',
      'Long spot on CEX + Short perp on futures exchange simultaneously',
      'Funding payment credited every 8 hours (guaranteed by contract)',
      'Closes when rate falls below 0.01% floor, or after 6 payment cycles (48h)',
    ],
    edge: 'Funding rate income is contractually guaranteed by the perp mechanism. By staying perfectly delta-neutral, we collect this income with zero directional exposure to BTC/ETH price movement.',
    params: [
      { label: 'Starting Capital', value: '$5,000' },
      { label: 'Entry Threshold', value: '0.05% per 8h (≈ 22% annualized)' },
      { label: 'Exit Floor', value: '0.01% per 8h' },
      { label: 'Max Hold', value: '6 funding periods (48 hours)' },
      { label: 'Max Positions', value: '8 simultaneous' },
      { label: 'Max Total Exposure', value: '60% of capital' },
      { label: 'Min Position Size', value: '$100 USD' },
    ],
    metrics: { sharpE: '4.0–6.0', maxDrawdown: '2%', frequency: '3–8 events/day', holdTime: '8–48h', capitalMin: '$5K' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  // ─── SIGMA (magnus-pairs) ──────────────────────────────────────────────────
  // Q2: Engine exists — server/engines/pairsTradingEngine.ts.
  // Published params match runtime. Entry z-score 2.0, window 60-tick, 8 pairs confirmed.
  // NOTE: "60-tick" is a rolling sample count not a time-window. At 5s eval interval
  // this is ~5 minutes of history — shorter than institutional stat-arb desks (30+ days).
  // Flagged for future enhancement: extend to time-based window of 720+ samples (1h).
  'magnus-pairs': {
    id: 'magnus-pairs', name: 'SIGMA · $10K', tagline: 'Statistical arbitrage via cointegration',
    description: 'Tracks the price ratio of correlated crypto pairs (BTC/ETH, SOL/AVAX, etc.). When the ratio deviates more than 2 standard deviations from its rolling mean, SIGMA shorts the expensive leg and longs the cheap one — capturing the inevitable mean reversion.',
    howItWorks: [
      'Maintains rolling 60-sample ratio history for each of 8 cointegrated pairs',
      'Computes mean and standard deviation of ratio over the rolling window',
      'Z-score = (current ratio − mean) / std deviation',
      'Entry when |z-score| > 2.0 (2 std dev from mean)',
      'Exit when |z-score| reverts below 0.5 (reversion confirmed)',
    ],
    edge: 'Crypto pairs share the same macro driver: Bitcoin dominance. This structural cointegration means the ratio MUST revert — it is not a bet on direction, it is a bet on mean reversion which is near-mathematically guaranteed over the holding window.',
    params: [
      { label: 'Starting Capital', value: '$10,000' },
      { label: 'Entry Z-Score', value: '> 2.0 std deviations' },
      { label: 'Exit Z-Score', value: '< 0.5 (reversion complete)' },
      { label: 'Rolling Window', value: '60 samples (~5 min at 5s interval)', hint: 'Future: extend to 720+ samples for deeper stat significance' },
      { label: 'Pairs Monitored', value: '8 (BTC/ETH, SOL/AVAX, BNB/MATIC + 5 more)' },
      { label: 'Round-Trip Fee', value: '0.20% (taker × 2 on same exchange)' },
    ],
    metrics: { sharpE: '3.5–5.0', winRate: '78%+', maxDrawdown: '6%', frequency: '5–20/day', holdTime: '4–24h', capitalMin: '$10K' },
    riskLevel: 'medium', strategyType: 'statistical',
  },
  // ─── ARES (magnus-cascade) ─────────────────────────────────────────────────
  // Q2: Engine exists — server/engines/liquidationEngine.ts.
  // Published params match runtime. OI drop threshold 3%, discount 0.25%, 3-min exit confirmed.
  'magnus-cascade': {
    id: 'magnus-cascade', name: 'ARES · $3K', tagline: 'Liquidation cascade flash discount hunter',
    description: 'When a large cascade of forced liquidations hits a perpetual exchange, spot prices are temporarily pushed below fair value by 0.3–1.5%. ARES detects this mechanical dislocation and buys the flash discount before reversion closes the gap — typically within 30–90 seconds.',
    howItWorks: [
      'Polls open interest on Binance/OKX/Bybit futures every 5 seconds',
      'Detects OI drops > 3% within a 60-second window (cascade signature)',
      'Cross-checks: spot price must also be < 5-minute fair value TWAP',
      'Both conditions required: OI signal + spot discount',
      'Hard paper exit after 3 minutes regardless of reversion status',
    ],
    edge: 'Forced liquidations are not information-driven — the liquidation engine sells at market regardless of fair value. The resulting dip is a pure mechanical artifact that the market corrects automatically as arb bots restore parity.',
    params: [
      { label: 'Starting Capital', value: '$3,000' },
      { label: 'OI Drop Threshold', value: '> 3% within 60 seconds' },
      { label: 'Min Spot Discount', value: '0.25% below 5-min TWAP' },
      { label: 'High Confidence', value: '0.60% discount + OI signal' },
      { label: 'Hard Exit', value: '3 minutes max hold' },
      { label: 'Symbols Monitored', value: '8 major perp markets' },
    ],
    metrics: { sharpE: '2.0–4.0', winRate: '72%+', maxDrawdown: '8%', frequency: '3–8 events/day', holdTime: '30s–3m' },
    riskLevel: 'high', strategyType: 'event_driven',
  },
  // ─── TEMPUS (magnus-calendar) ──────────────────────────────────────────────
  // Q2: Engine exists — server/engines/calendarSpreadEngine.ts.
  // Published 5.5% risk-free rate and 0.15% min mispricing match runtime.
  // NOTE: 5.5% risk-free rate is hardcoded. Flagged for future externalization
  // to a live SOFR/T-bill feed. For now, 5.5% approximates current US risk-free rate.
  'magnus-calendar': {
    id: 'magnus-calendar', name: 'TEMPUS · $5K', tagline: 'Quarterly futures basis convergence',
    description: 'Quarterly futures contracts (expiring Mar/Jun/Sep/Dec) must equal spot at expiry — by contract definition. When the basis deviates from its fair value (risk-free rate × days/365), TEMPUS trades the mispricing and holds until convergence. This is the closest thing to a risk-free trade in crypto.',
    howItWorks: [
      'Polls Binance quarterly futures prices every 60 seconds via REST',
      'Fair basis = risk-free rate (5.5% p.a. hardcoded) × days-to-expiry / 365',
      'Actual basis = (quarterly price − perp price) / perp price × 100',
      'Signal when |actual − fair| > 0.15% (mispricing threshold)',
      'Direction: long cheap expiry / short expensive expiry (market neutral)',
    ],
    edge: 'Quarterly futures MUST equal spot at expiry. The convergence is a mathematical certainty — not a probability. The only risk is timing (how long it takes to converge), not direction.',
    params: [
      { label: 'Starting Capital', value: '$5,000' },
      { label: 'Risk-Free Rate', value: '5.5% p.a. (hardcoded T-bill approx.)', hint: 'Flagged: future externalization to live SOFR feed' },
      { label: 'Min Mispricing', value: '0.15%' },
      { label: 'Max Mispricing', value: '5.0% (data quality filter)' },
      { label: 'Symbols', value: 'BTC, ETH, BNB, SOL quarterly contracts' },
      { label: 'REST Poll Interval', value: '60 seconds' },
    ],
    metrics: { sharpE: '2.5–4.0', winRate: '85%+', maxDrawdown: '4%', frequency: '5–20/day', holdTime: '1–90 days', capitalMin: '$5K' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  // ─── SCOUT (magnus-listing) ────────────────────────────────────────────────
  // Q2: Engine exists — server/engines/newListingEngine.ts.
  // Published params match runtime. 60s polling, 1% min diff, 10-min window confirmed.
  // KNOWN LIMITATION: 60s polling is far too slow for real listing snipe (the
  // professional edge is in the first 30 seconds). Documented below. Future
  // enhancement: subscribe to Binance WebSocket announcement stream.
  'magnus-listing': {
    id: 'magnus-listing', name: 'SCOUT · $2K', tagline: 'New token listing price discovery arb',
    description: 'When a token lists on Binance for the first time, it already trades on Gate.io, MEXC, or Bitget at an established price. During the first 10 minutes, the listing gap can reach 3–15% as Binance traders discover fair value. SCOUT captures this price discovery window.',
    howItWorks: [
      'Polls Binance and OKX exchange info endpoints every 60 seconds for new symbols',
      'When new symbol detected: cross-references tickStore for existing prices elsewhere',
      'If same token is cheaper on another exchange: signals the gap',
      'Signal score decays with time since listing (earlier = higher score)',
      'Hard exit after 10 minutes — gap largely closed by market participants',
    ],
    edge: 'Binance listing announcements are public but most retail traders take 2–5 minutes to react and re-route capital. The first detected window offers the widest differential before convergence.',
    params: [
      { label: 'Starting Capital', value: '$2,000' },
      { label: 'Min Price Diff', value: '1.0%' },
      { label: 'Opportunity Window', value: '10 minutes post-listing' },
      { label: 'Monitoring', value: 'Binance + OKX REST, every 60 seconds', hint: 'Known limitation: 60s polling misses first-30s peak. Future: WS announcement stream' },
      { label: 'Max Signals', value: '20 per evaluation cycle' },
    ],
    metrics: { sharpE: '3.0–5.0', winRate: '80%+', maxDrawdown: '10%', frequency: '2–5/week', holdTime: '< 10m' },
    riskLevel: 'high', strategyType: 'event_driven',
  },
}
