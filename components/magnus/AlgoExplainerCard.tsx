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
                      <td className="px-3 py-2 text-white font-mono">{p.value}</td>
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
  'magnus-beta-1k': {
    id: 'magnus-beta-1k', name: 'Magnus Beta · $1K', tagline: 'Cross-exchange price gap harvester',
    description: 'Monitors 18+ exchanges simultaneously for the same asset trading at different prices. When Exchange A sells BTC cheaper than Exchange B buys it, Magnus executes both sides simultaneously for risk-free profit.',
    howItWorks: [
      'WebSocket tick feed receives bid/ask from 18+ exchanges in real-time',
      'Spread calculator detects net-of-fee gaps across all exchange pairs',
      'Signal scorer filters gaps by execution probability and liquidity depth',
      'Paper trade executed at both bid and ask simultaneously (delta-neutral)',
      'Profit credited as gap closes (within 0.5–30 seconds)',
    ],
    edge: 'Market microstructure inefficiency — not all exchanges update prices at the same speed. Regional liquidity imbalances, order flow differences, and WebSocket latency create persistent price dislocations that last 1–30 seconds.',
    params: [
      { label: 'Starting Capital', value: '$1,000' },
      { label: 'Min Net Spread', value: '0.08%' },
      { label: 'Max Position', value: '5% of capital' },
      { label: 'Exchanges', value: '18 CEX + 3 DEX' },
      { label: 'Symbols Tracked', value: '128 pairs' },
      { label: 'Cooldown per symbol', value: '10 seconds' },
    ],
    metrics: { sharpE: '2.8–4.2', winRate: '94%+', maxDrawdown: '3%', frequency: '50–200/day', holdTime: '< 30s' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  'magnus-beta-10k': {
    id: 'magnus-beta-10k', name: 'Magnus Beta · $10K', tagline: 'High-capital CEX-CEX spread arbitrage',
    description: 'Same strategy as $1K Beta but with larger position sizes. Higher capital means more meaningful absolute profits per trade while staying within liquidity constraints on major pairs.',
    howItWorks: [
      'Identical to Beta $1K — same signal sources and filters',
      'Position sizes 10× larger — captures more absolute profit per gap',
      'Liquidity depth checked against larger trade sizes (depth limiter active)',
      'Rebalances across 9 exchanges to maintain even capital distribution',
    ],
    edge: 'At $10K, each 0.15% spread = $15 profit per trade vs $1.50 at $1K. Same execution cost, proportionally more alpha captured from each signal.',
    params: [
      { label: 'Starting Capital', value: '$10,000' },
      { label: 'Min Net Spread', value: '0.08%' },
      { label: 'Max Position', value: '5% of capital ($500)' },
      { label: 'Depth Limit', value: 'On (square-root slippage model)' },
    ],
    metrics: { sharpE: '2.8–4.2', winRate: '94%+', maxDrawdown: '4%', frequency: '50–200/day', capitalMin: '$10K' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  'magnus-alpha': {
    id: 'magnus-alpha', name: 'Magnus Alpha', tagline: 'Inventory-managed multi-strategy executor',
    description: 'The most sophisticated core bot. Magnus Alpha maintains a diversified coin inventory across 9 exchanges, enabling instant execution without needing to buy first. It actively rebalances inventory every cycle and uses predictive rebalancing to position for upcoming gaps.',
    howItWorks: [
      'Buys a basket of coins at startup across 9 exchanges (inventory model)',
      'When gap detected: sells inventory on expensive exchange, buys on cheap',
      'No transfer delay — both legs execute from existing balances',
      'Hourly rebalance cycle restores target allocations using cheapest source',
      'Predictive rebalancing: pre-positions for symbols with historically persistent gaps',
    ],
    edge: 'Eliminates the "execution delay" problem of transfer-based arb. Inventory is already on both exchanges. This enables sub-second paper execution vs minutes/hours for transfer-based approaches.',
    params: [
      { label: 'Capital', value: 'Configurable ($1K–$10M)' },
      { label: 'Max Position %', value: '1–10% per trade' },
      { label: 'Rebalance Mode', value: 'Predictive + Reactive' },
      { label: 'Reserve per Exchange', value: '$50 USDT (floor)' },
      { label: 'Inventory Coins', value: '15 (auto-selected by volume)' },
    ],
    metrics: { sharpE: '3.5–5.5', winRate: '96%+', maxDrawdown: '5%', frequency: '200–500/day' },
    riskLevel: 'medium', strategyType: 'market_neutral',
  },
  'magnus-futures': {
    id: 'magnus-futures', name: 'Magnus Futures', tagline: 'Spot-futures basis arbitrage',
    description: 'Exploits the price difference between a coin\'s spot market and its perpetual futures contract. When futures trade at a premium to spot, Magnus buys spot and shorts futures — collecting the basis as the prices converge.',
    howItWorks: [
      'Monitors spot vs perpetual prices for 80+ symbols across 7 exchanges',
      'When futures premium > 0.25%, opens a delta-neutral position',
      'Long spot, Short perp — zero directional exposure to BTC/ETH price',
      'Profit from convergence (basis must go to 0 at funding resets)',
      'Also collects funding rate payments every 8 hours as a bonus',
    ],
    edge: 'Futures must converge to spot at funding payment time. This convergence is mechanical — not probabilistic. The only risk is execution speed, not market direction.',
    params: [
      { label: 'Starting Capital', value: '$1,000 USDT' },
      { label: 'Min Spread', value: '0.25% spot-futures gap' },
      { label: 'Exchanges', value: '7 (perp-capable)' },
      { label: 'Position Cap', value: '$200 per trade' },
      { label: 'Cooldown', value: '30s per symbol' },
    ],
    metrics: { sharpE: '2.5–3.5', winRate: '92%+', maxDrawdown: '3%', frequency: '30–80/day' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  'magnus-rate-harvest': {
    id: 'magnus-rate-harvest', name: 'Magnus Rate Harvest', tagline: 'Delta-neutral funding rate income',
    description: 'Collects the 8-hour funding rate payment on perpetual contracts. By holding Long Spot + Short Perp simultaneously, the position is completely immune to price movements while earning passive income every 8 hours as long as funding is positive.',
    howItWorks: [
      'Monitors funding rates across Binance, OKX, Bybit, Hyperliquid every 60s',
      'Opens position when 8h rate > 0.05% (22% annualized)',
      'Long spot on CEX + Short perp on futures exchange simultaneously',
      'Every 8 hours: funding payment credited to portfolio automatically',
      'Closes position if rate drops below 0.01% or after 6 payments (48h)',
    ],
    edge: 'During bull markets, perpetual funding rates spike to 0.1–0.5% per 8h (45–225% annualized). This income is GUARANTEED if you stay delta-neutral — price direction is completely irrelevant.',
    params: [
      { label: 'Starting Capital', value: '$5,000' },
      { label: 'Entry Threshold', value: '0.05% per 8h (22% ann.)' },
      { label: 'Exit Floor', value: '0.01% per 8h' },
      { label: 'Max Hold', value: '6 payments (48 hours)' },
      { label: 'Max Positions', value: '8 simultaneous' },
      { label: 'Max Exposure', value: '60% of capital' },
    ],
    metrics: { sharpE: '4.0–6.0', maxDrawdown: '2%', frequency: '3–8 events/day', holdTime: '8–48h', capitalMin: '$5K' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  'magnus-pairs': {
    id: 'magnus-pairs', name: 'Magnus Pairs', tagline: 'Statistical arbitrage via cointegration',
    description: 'BTC and ETH always move together over time (they\'re cointegrated). When the BTC/ETH ratio deviates more than 2 standard deviations from its 30-day mean, Magnus shorts the expensive leg and longs the cheap one. Mean reversion is statistically near-guaranteed within 4–24 hours.',
    howItWorks: [
      'Tracks ratio of BTC/ETH, SOL/AVAX, BNB/MATIC and 5 other pairs',
      'Computes rolling 60-tick mean and standard deviation of each ratio',
      'Z-score = (current ratio - mean) / std deviation',
      'When |z-score| > 2.0: enter trade (short expensive, long cheap)',
      'Exit when z-score reverts to 0.5 (reversion complete)',
    ],
    edge: 'Crypto pairs share the same macro driver (Bitcoin dominance cycles). This creates structural cointegration — the ratio MUST revert. Renaissance Technologies built their Medallion Fund on exactly this principle applied to equities.',
    params: [
      { label: 'Starting Capital', value: '$10,000' },
      { label: 'Entry Z-Score', value: '> 2.0 std deviations' },
      { label: 'Exit Z-Score', value: '< 0.5 std deviations' },
      { label: 'Window', value: '60-tick rolling' },
      { label: 'Pairs Monitored', value: '8 cointegrated pairs' },
    ],
    metrics: { sharpE: '3.5–5.0', winRate: '78%+', maxDrawdown: '6%', frequency: '5–20/day', holdTime: '4–24h', capitalMin: '$10K' },
    riskLevel: 'medium', strategyType: 'statistical',
  },
  'magnus-cascade': {
    id: 'magnus-cascade', name: 'Magnus Cascade', tagline: 'Liquidation event flash discount capture',
    description: 'When $50M+ in leveraged long positions get liquidated on a futures exchange, the forced selling temporarily pushes spot price below fair value by 0.3–1.5%. Magnus detects this discount and buys immediately, expecting reversion within 30–90 seconds.',
    howItWorks: [
      'Monitors open interest on Binance/OKX/Bybit futures every 5 seconds',
      'Detects OI drops > 3% in < 60 seconds (cascade signature)',
      'Simultaneously checks if spot price dipped below 5-minute TWAP',
      'If both conditions met: buy spot at discount',
      'Hard exit after 3 minutes regardless of outcome',
    ],
    edge: 'Liquidation cascades create mechanical price dislocations — not driven by fundamental information. The "correct" price was the TWAP from 5 minutes ago. The dip is pure forced selling creating a temporary mispricing.',
    params: [
      { label: 'Starting Capital', value: '$3,000' },
      { label: 'OI Drop Threshold', value: '> 3% in 60 seconds' },
      { label: 'Min Discount', value: '0.25% below 5m TWAP' },
      { label: 'Hard Exit', value: '3 minutes max hold' },
      { label: 'Symbols', value: '8 major perp markets' },
    ],
    metrics: { sharpE: '2.0–4.0', winRate: '72%+', maxDrawdown: '8%', frequency: '3–8 events/day', holdTime: '30s–3m' },
    riskLevel: 'high', strategyType: 'event_driven',
  },
  'magnus-calendar': {
    id: 'magnus-calendar', name: 'Magnus Calendar', tagline: 'Quarterly futures basis convergence',
    description: 'Quarterly futures (expiring Mar/Jun/Sep/Dec) trade at a premium to perpetuals due to time value. When this premium deviates from the theoretical fair value (risk-free rate × days to expiry), Magnus trades the convergence. As expiry approaches, the gap MUST go to zero.',
    howItWorks: [
      'Polls Binance quarterly futures prices every 60 seconds',
      'Computes fair basis = risk-free rate (5.5%) × days-to-expiry / 365',
      'Compares actual basis to fair basis — detects mispricing',
      'When mispricing > 0.15%: Long cheap expiry, Short expensive expiry',
      'Hold until expiry approaches (basis decay accelerates in final 7 days)',
    ],
    edge: 'At expiry, quarterly futures MUST equal spot by definition. The convergence is guaranteed — no probability involved. This is how every major crypto trading firm generates carry income from their futures book.',
    params: [
      { label: 'Starting Capital', value: '$5,000' },
      { label: 'Risk-Free Rate', value: '5.5% annualized' },
      { label: 'Min Mispricing', value: '0.15%' },
      { label: 'Max Hold', value: 'To expiry - 7 days' },
      { label: 'Symbols', value: 'BTC, ETH, BNB, SOL quarterlies' },
    ],
    metrics: { sharpE: '2.5–4.0', winRate: '85%+', maxDrawdown: '4%', frequency: '5–20/day', holdTime: '1–90 days', capitalMin: '$5K' },
    riskLevel: 'low', strategyType: 'market_neutral',
  },
  'magnus-listing': {
    id: 'magnus-listing', name: 'Magnus Listing', tagline: 'New token listing price discovery arb',
    description: 'When a token lists on Binance for the first time, it already trades on Gate.io, MEXC, or Bitget at an established price. The first 10 minutes after listing, prices can differ by 3–15% as Binance traders discover fair value. Magnus captures this gap.',
    howItWorks: [
      'Polls Binance and OKX exchange info every 60 seconds for new symbols',
      'When new symbol detected: checks if it already exists in tickStore',
      'If same token trades cheaper elsewhere: immediate paper trade',
      'Position scored by time since listing (earlier = higher score)',
      'Hard exit: 10 minutes after listing (gap largely closed by then)',
    ],
    edge: 'Binance listing announcements are public, but most retail traders take 1–5 minutes to react. The first 2–3 minutes offer the widest gaps. This is a pure information speed advantage.',
    params: [
      { label: 'Starting Capital', value: '$2,000' },
      { label: 'Min Price Diff', value: '1.0%' },
      { label: 'Opportunity Window', value: '10 minutes post-listing' },
      { label: 'Monitoring', value: 'Binance + OKX every 60s' },
    ],
    metrics: { sharpE: '3.0–5.0', winRate: '80%+', maxDrawdown: '10%', frequency: '2–5/week', holdTime: '< 10m' },
    riskLevel: 'high', strategyType: 'event_driven',
  },
}
