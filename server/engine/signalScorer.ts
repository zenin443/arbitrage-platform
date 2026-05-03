/**
 * Magnus Signal Scorer — The Quant Brain
 *
 * Every gap/opportunity is scored 0–100 across 6 dimensions before execution.
 * This transforms Magnus from a fire-everything bot to an intelligent executor
 * that sizes positions by confidence and skips low-probability trades.
 *
 * Score formula (weighted):
 *   spreadQuality    25% — net spread vs historical average for this type
 *   executionProb    20% — gap age + order book depth (will it fill before gap closes?)
 *   liquidityDepth   20% — maxTradeableUsd vs target trade size
 *   historicalWinPct 15% — rolling 500-trade win rate per strategy type
 *   volatilityRisk   10% — 1h ATR vs spread (are we trading noise or real alpha?)
 *   timeOfDay        10% — NY/London overlap (09:30-16:00 UTC) = peak liquidity
 *
 * Sprint 1.5 additions:
 *   - 24h volume gate: suppress any signal where coin 24h volume < $500K
 *     (fails-open when volume data is unavailable).
 *   - Price spike filter: track timestamped price history (last 10 ticks per
 *     coin, ~5 min at 30s intervals).  If price moved >5% in the last 5 min,
 *     mark signal as "volatile" (confidence = "low", action forced to "skip"
 *     unless score is otherwise very high).
 *   - Confidence tag added to SignalScore output:
 *       "high"   — volume OK, price stable, spread > 0.3%
 *       "medium" — volume OK, slight volatility OR spread 0.1–0.3%
 *       "low"    — thin volume OR high volatility (shown with warning)
 *
 * Output:
 *   score: 0–100
 *   kellyMultiplier: 0.0–1.0 (fraction of full Kelly bet to use)
 *   action: 'execute' | 'reduce' | 'skip'
 *   confidence: 'high' | 'medium' | 'low'
 *   reasons: string[] (human-readable explanation for UI)
 */

import { GapRecord } from '../services/trading-intelligence'
import { getVolume } from './volumeRegistry'

// ── Thresholds ────────────────────────────────────────────────────────────────

const EXECUTE_THRESHOLD = 65   // score >= 65 → execute at full Kelly
const REDUCE_THRESHOLD  = 40   // score 40–64 → execute at half Kelly
                                // score < 40  → skip

// Reference spreads by type (historical averages — tuned from market data)
const AVG_SPREAD_BY_TYPE: Record<string, number> = {
  cex_cex:     0.12,   // typical: 0.10–0.20%
  dex_cex:     0.35,   // typical: 0.20–0.60%
  spot_futures: 0.40,  // typical: 0.25–0.70%
  triangular:  0.18,   // typical: 0.10–0.30%
  cross_chain: 0.80,   // typical: 0.50–1.50%
  pairs:       0.25,   // z-score based, converted
  stablecoin:  0.04,   // very tight, high volume
  calendar:    0.20,   // basis spread
  twap_dev:    0.30,   // TWAP deviation
  new_listing: 3.50,   // price discovery — very wide
  liquidation: 0.60,   // flash discount
  wrapped:     0.08,   // should be near-zero
  orderbook:   0.15,   // predictive — not a real spread
}

// Minimum net spread to score > 0 execution probability
const MIN_EXECUTABLE_SPREAD: Record<string, number> = {
  cex_cex:     0.08,
  dex_cex:     0.20,
  spot_futures: 0.20,
  triangular:  0.12,
  cross_chain: 0.40,
  stablecoin:  0.02,
  calendar:    0.10,
  pairs:       0.15,
  twap_dev:    0.20,
  new_listing: 1.00,
  liquidation: 0.30,
  wrapped:     0.05,
  orderbook:   0.10,
}

// NY/London overlap: 09:30–16:00 UTC (peak liquidity hours)
const PEAK_HOURS_UTC_START  = 9.5   // 09:30
const PEAK_HOURS_UTC_END    = 16.0  // 16:00
const ASIAN_HOURS_UTC_START = 0.0   // 00:00
const ASIAN_HOURS_UTC_END   = 6.0   // 06:00 (decent but lower)

// Sprint 1.5 — volume & volatility thresholds
/** Suppress any signal where known 24h volume is below this (USD). Fail-open. */
const MIN_VOLUME_USD      = 500_000   // $500K
/** Price change over the last 5 minutes above this triggers volatile flag. */
const SPIKE_THRESHOLD_PCT = 5.0       // 5%
/** Rolling history window for spike detection (ms). */
const SPIKE_WINDOW_MS     = 5 * 60 * 1000  // 5 minutes
/** Max ticks stored per symbol for spike detection. */
const MAX_SPIKE_TICKS     = 10

// ── Rolling win rate tracker ──────────────────────────────────────────────────

interface TradeOutcome { type: string; win: boolean; timestamp: number }
const outcomeHistory: TradeOutcome[] = []
const MAX_OUTCOME_HISTORY = 1000

export function recordTradeOutcome(type: string, win: boolean): void {
  outcomeHistory.push({ type, win, timestamp: Date.now() })
  if (outcomeHistory.length > MAX_OUTCOME_HISTORY) outcomeHistory.shift()
}

function getHistoricalWinRate(type: string): number {
  const recent = outcomeHistory.filter(o => o.type === type).slice(-100)
  if (recent.length < 10) return 0.65  // default assumption: 65% win rate
  const wins = recent.filter(o => o.win).length
  return wins / recent.length
}

// ── ATR proxy (rolling volatility from recent prices) ────────────────────────

// Rolling map of recent bid prices per symbol to estimate ATR (for scoring)
const recentPrices = new Map<string, number[]>()
const MAX_PRICE_HISTORY = 60   // ~60 ticks per symbol

export function feedPriceForVolatility(symbol: string, price: number): void {
  const arr = recentPrices.get(symbol) ?? []
  arr.push(price)
  if (arr.length > MAX_PRICE_HISTORY) arr.shift()
  recentPrices.set(symbol, arr)
}

function estimateAtrPercent(symbol: string): number {
  const prices = recentPrices.get(symbol)
  if (!prices || prices.length < 5) return 0.5  // assume 0.5% volatility
  let sumRange = 0
  for (let i = 1; i < prices.length; i++) {
    sumRange += Math.abs((prices[i]! - prices[i - 1]!) / prices[i - 1]!)
  }
  return (sumRange / (prices.length - 1)) * 100
}

// ── Sprint 1.5 — Price spike detection ───────────────────────────────────────

interface PriceTick { price: number; timestamp: number }
/** Timestamped price history per symbol — last MAX_SPIKE_TICKS entries. */
const priceHistory = new Map<string, PriceTick[]>()

/**
 * Record a price observation for spike detection.  Call this alongside
 * `feedPriceForVolatility` whenever a new tick arrives.
 */
export function recordPriceTick(symbol: string, price: number): void {
  const history = priceHistory.get(symbol) ?? []
  history.push({ price, timestamp: Date.now() })
  // Keep only the last MAX_SPIKE_TICKS entries
  if (history.length > MAX_SPIKE_TICKS) history.shift()
  priceHistory.set(symbol, history)
}

/**
 * Returns true if the coin's price moved more than SPIKE_THRESHOLD_PCT
 * within the last SPIKE_WINDOW_MS.  Returns false when there is insufficient
 * history (fail-open — don't suppress signals we can't evaluate).
 */
function isVolatilePriceSpike(symbol: string): boolean {
  const history = priceHistory.get(symbol)
  if (!history || history.length < 2) return false

  const cutoff = Date.now() - SPIKE_WINDOW_MS
  // Find the oldest entry within the window
  const windowTicks = history.filter(t => t.timestamp >= cutoff)
  if (windowTicks.length < 2) return false

  const oldest  = windowTicks[0]!
  const current = windowTicks[windowTicks.length - 1]!
  const changePct = Math.abs((current.price - oldest.price) / oldest.price) * 100
  return changePct > SPIKE_THRESHOLD_PCT
}

// ── Time of day score ─────────────────────────────────────────────────────────

function getTimeOfDayScore(): number {
  const now = new Date()
  const hourUtc = now.getUTCHours() + now.getUTCMinutes() / 60
  if (hourUtc >= PEAK_HOURS_UTC_START && hourUtc <= PEAK_HOURS_UTC_END) return 1.0
  if (hourUtc >= ASIAN_HOURS_UTC_START && hourUtc <= ASIAN_HOURS_UTC_END) return 0.7
  return 0.5
}

// ── Score output ──────────────────────────────────────────────────────────────

export interface SignalScore {
  score: number                  // 0–100
  kellyMultiplier: number        // 0.0–1.0
  action: 'execute' | 'reduce' | 'skip'
  /** Sprint 1.5: human-readable signal quality tag */
  confidence: 'high' | 'medium' | 'low'
  /** Sprint 1.5: true when price spiked >5% in the last 5 minutes */
  isVolatile: boolean
  /** Sprint 1.5: true when 24h volume was known and below threshold */
  isThinVolume: boolean
  breakdown: {
    spreadQuality:    number     // 0–1
    executionProb:    number     // 0–1
    liquidityDepth:   number     // 0–1
    historicalWinPct: number     // 0–1
    volatilityRisk:   number     // 0–1
    timeOfDay:        number     // 0–1
  }
  reasons: string[]
}

// ── Main scorer ───────────────────────────────────────────────────────────────

export function scoreSignal(gap: GapRecord, targetTradeSizeUsd = 1_000): SignalScore {
  const type = gap.type as string
  const reasons: string[] = []

  // ── Sprint 1.5: Pre-flight gates ─────────────────────────────────────────

  // Volume gate — look up from registry; fail-open if unknown
  const volume24h   = getVolume(gap.symbol)
  const isThinVolume = volume24h !== null && volume24h < MIN_VOLUME_USD
  if (isThinVolume) {
    reasons.push(`Thin volume: $${(volume24h! / 1000).toFixed(0)}K 24h — below $${MIN_VOLUME_USD / 1000}K threshold`)
  }

  // Price spike gate
  const isVolatile = isVolatilePriceSpike(gap.symbol)
  if (isVolatile) {
    reasons.push(`Price spike detected: >5% move in last 5 min on ${gap.symbol}`)
  }

  // 1. Spread Quality (25%)
  const avgSpread = AVG_SPREAD_BY_TYPE[type] ?? 0.20
  const minSpread = MIN_EXECUTABLE_SPREAD[type] ?? 0.10
  let spreadQuality = 0
  if (gap.spreadPercent <= minSpread) {
    spreadQuality = 0
    reasons.push(`Spread ${gap.spreadPercent.toFixed(3)}% below minimum ${minSpread}%`)
  } else {
    spreadQuality = Math.min(1, gap.spreadPercent / (avgSpread * 2))
    if (gap.spreadPercent > avgSpread * 3) {
      spreadQuality = Math.max(0.3, spreadQuality * 0.5)  // too wide = suspicious
      reasons.push(`Spread ${gap.spreadPercent.toFixed(2)}% unusually wide — possible bad data`)
    }
  }

  // 2. Execution Probability (20%)
  const ageMs = Date.now() - gap.detectedAt
  const agePenalty = Math.max(0, 1 - ageMs / 30_000)
  const depthRatio = gap.maxTradeableUsd > 0
    ? Math.min(1, gap.maxTradeableUsd / (targetTradeSizeUsd * 2))
    : 0.3
  const executionProb = (agePenalty * 0.6 + depthRatio * 0.4)
  if (ageMs > 15_000) reasons.push(`Gap is ${(ageMs / 1000).toFixed(0)}s old — execution risk elevated`)

  // 3. Liquidity Depth (20%)
  const liquidityDepth = gap.maxTradeableUsd > 0
    ? Math.min(1, gap.maxTradeableUsd / targetTradeSizeUsd)
    : 0.2
  if (liquidityDepth < 0.5) reasons.push(`Low liquidity: $${gap.maxTradeableUsd.toFixed(0)} tradeable vs $${targetTradeSizeUsd} target`)

  // 4. Historical Win Rate (15%)
  const winRate = getHistoricalWinRate(type)
  const historicalWinPct = Math.min(1, winRate / 0.80)
  if (winRate < 0.50) reasons.push(`Historical win rate for ${type}: ${(winRate * 100).toFixed(0)}% — below threshold`)

  // 5. Volatility Risk (10%)
  const atrPct = estimateAtrPercent(gap.symbol)
  const atrRatio = atrPct > 0 ? gap.spreadPercent / atrPct : 1
  let volatilityRisk = 0
  if (atrRatio > 2.0)      volatilityRisk = 1.0
  else if (atrRatio > 1.0) volatilityRisk = 0.7
  else if (atrRatio > 0.5) volatilityRisk = 0.4
  else { volatilityRisk = 0.1; reasons.push(`Spread ${gap.spreadPercent.toFixed(3)}% within normal ATR — likely noise`) }

  // Sprint 1.5: penalise volatility score when price spike detected
  if (isVolatile) volatilityRisk *= 0.2

  // 6. Time of Day (10%)
  const timeOfDay = getTimeOfDayScore()
  if (timeOfDay < 0.7) reasons.push('Off-peak hours — lower liquidity')

  // Weighted composite score
  let raw =
    spreadQuality    * 0.25 +
    executionProb    * 0.20 +
    liquidityDepth   * 0.20 +
    historicalWinPct * 0.15 +
    volatilityRisk   * 0.10 +
    timeOfDay        * 0.10

  // Sprint 1.5: halve score for thin-volume or volatile signals
  if (isThinVolume) raw *= 0.5
  if (isVolatile)   raw *= 0.5

  const score = Math.round(raw * 100)

  let action: 'execute' | 'reduce' | 'skip'
  let kellyMultiplier: number
  if (score >= EXECUTE_THRESHOLD) {
    action = 'execute'
    kellyMultiplier = parseFloat(Math.min(1.0, score / 100).toFixed(3))
    if (reasons.length === 0) reasons.push(`Score ${score}/100 — executing at ${(kellyMultiplier * 100).toFixed(0)}% Kelly`)
  } else if (score >= REDUCE_THRESHOLD) {
    action = 'reduce'
    kellyMultiplier = parseFloat((score / 200).toFixed(3))
    reasons.push(`Score ${score}/100 — reduced position at ${(kellyMultiplier * 100).toFixed(0)}% Kelly`)
  } else {
    action = 'skip'
    kellyMultiplier = 0
    reasons.push(`Score ${score}/100 — below threshold, signal voided`)
  }

  // ── Sprint 1.5: Confidence tag ──────────────────────────────────────────
  let confidence: 'high' | 'medium' | 'low'
  if (isThinVolume || isVolatile) {
    confidence = 'low'
  } else if (gap.spreadPercent > 0.3 && score >= EXECUTE_THRESHOLD) {
    confidence = 'high'
  } else if (gap.spreadPercent >= 0.1 && score >= REDUCE_THRESHOLD) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    score,
    kellyMultiplier,
    action,
    confidence,
    isVolatile,
    isThinVolume,
    breakdown: {
      spreadQuality:    parseFloat(spreadQuality.toFixed(3)),
      executionProb:    parseFloat(executionProb.toFixed(3)),
      liquidityDepth:   parseFloat(liquidityDepth.toFixed(3)),
      historicalWinPct: parseFloat(historicalWinPct.toFixed(3)),
      volatilityRisk:   parseFloat(volatilityRisk.toFixed(3)),
      timeOfDay:        parseFloat(timeOfDay.toFixed(3)),
    },
    reasons,
  }
}

// ── Scored GapRecord extension ────────────────────────────────────────────────

export interface ScoredGap extends GapRecord {
  signalScore: SignalScore
}

export function scoredGap(gap: GapRecord, targetSizeUsd?: number): ScoredGap {
  return { ...gap, signalScore: scoreSignal(gap, targetSizeUsd) }
}

// ── Batch scorer (used in evaluate loop) ─────────────────────────────────────

export function scoreAndFilter(
  gaps: GapRecord[],
  targetSizeUsd = 1_000
): ScoredGap[] {
  return gaps
    .map(g => scoredGap(g, targetSizeUsd))
    .filter(g => g.signalScore.action !== 'skip')
    .sort((a, b) => b.signalScore.score - a.signalScore.score)
}

// ── Latest scored signals cache (for dashboard API) ───────────────────────────

let latestScoredSignals: ScoredGap[] = []

export function updateScoredSignals(gaps: ScoredGap[]): void {
  latestScoredSignals = gaps.slice(0, 50)
}

export function getScoredSignals(): ScoredGap[] {
  return latestScoredSignals
}
