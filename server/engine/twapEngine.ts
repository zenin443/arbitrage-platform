/**
 * TWAP Deviation Engine — "Drift Signal"
 *
 * Strategy: Predictive arbitrage based on TWAP (Time-Weighted Average Price) deviation.
 * When spot price deviates > 0.5% from its 4-hour TWAP, large algorithmic traders
 * (who execute against TWAP benchmarks) will push the price back.
 * We position AHEAD of the predicted reversion.
 *
 * Why this works: Institutional TWAP execution creates mechanical mean reversion.
 * Every large fund that trades "VWAP/TWAP" is effectively YOUR liquidity provider.
 *
 * Symbols: BTC, ETH, SOL only — needs high liquidity for TWAP to be meaningful.
 * Deviation threshold: 0.5% for high-confidence, 0.3% for medium
 * Signal window: Position held for up to 2 hours (TWAP executors complete their order)
 */

import { tickStore } from './tickStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TwapSignal {
  id: string
  symbol: string
  exchange: string
  currentPrice: number
  twap4h: number
  deviationPercent: number  // (current - TWAP) / TWAP × 100
  direction: 'price_above_twap' | 'price_below_twap'
  action: 'sell_spot_buy_when_reverts' | 'buy_spot_sell_when_reverts'
  estimatedReversionPct: number   // expected % gain from reversion
  netProfitPercent: number
  estimatedProfit1k: number
  confidence: 'high' | 'medium' | 'low'
  signalScore: number
  detectedAt: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Only high-liquidity assets where TWAP mechanics apply
const TRACKED_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT']
const TRACKED_EXCHANGES = ['binance', 'okx', 'bybit', 'coinbase']

const TWAP_WINDOW_MS       = 4 * 60 * 60 * 1000   // 4 hours
const TICK_SAMPLE_INTERVAL = 30_000                 // store a tick every 30s
const MIN_SAMPLES_FOR_TWAP = 20                     // need at least 20 samples
const MIN_DEVIATION_PCT    = 0.30                   // medium confidence threshold
const HIGH_DEVIATION_PCT   = 0.50                   // high confidence threshold
const MAX_DEVIATION_PCT    = 3.0                    // above = bad data
const ROUND_TRIP_FEE_PCT   = 0.20                   // 0.20% taker × 2
const MAX_SIGNALS          = 30

// ── Price sampling (TWAP builder) ─────────────────────────────────────────────

interface PriceSample { price: number; timestamp: number }

// twapStore[`${exchange}:${symbol}`] → rolling 4h price samples
const twapStore = new Map<string, PriceSample[]>()

let lastSampleAt = 0

export function samplePricesForTwap(): void {
  const now = Date.now()
  if (now - lastSampleAt < TICK_SAMPLE_INTERVAL) return
  lastSampleAt = now

  const cutoff = now - TWAP_WINDOW_MS

  for (const symbol of TRACKED_SYMBOLS) {
    for (const exchange of TRACKED_EXCHANGES) {
      const tick = tickStore.getTick(exchange, symbol)
      if (!tick || tick.bid <= 0) continue

      const mid = (tick.bid + tick.ask) / 2
      const key = `${exchange}:${symbol}`
      const samples = twapStore.get(key) ?? []

      // Add sample
      samples.push({ price: mid, timestamp: now })

      // Prune samples older than 4h
      const fresh = samples.filter(s => s.timestamp > cutoff)
      twapStore.set(key, fresh)
    }
  }
}

function computeTwap(key: string): number | null {
  const samples = twapStore.get(key)
  if (!samples || samples.length < MIN_SAMPLES_FOR_TWAP) return null
  const sum = samples.reduce((s, p) => s + p.price, 0)
  return sum / samples.length
}

// ── Signal computation ────────────────────────────────────────────────────────

function computeTwapSignals(): TwapSignal[] {
  const now = Date.now()
  const signals: TwapSignal[] = []

  for (const symbol of TRACKED_SYMBOLS) {
    for (const exchange of TRACKED_EXCHANGES) {
      const tick = tickStore.getTick(exchange, symbol)
      if (!tick || tick.timestamp < now - 10_000) continue

      const currentPrice = (tick.bid + tick.ask) / 2
      if (currentPrice <= 0) continue

      const key = `${exchange}:${symbol}`
      const twap = computeTwap(key)
      if (!twap) continue   // still warming up

      const deviationPercent = ((currentPrice - twap) / twap) * 100
      const absDeviation = Math.abs(deviationPercent)

      if (absDeviation < MIN_DEVIATION_PCT) continue
      if (absDeviation > MAX_DEVIATION_PCT) continue   // data quality filter

      const direction: TwapSignal['direction'] =
        deviationPercent > 0 ? 'price_above_twap' : 'price_below_twap'

      // Reversion trade: if price is above TWAP, we expect it to fall back
      const action: TwapSignal['action'] =
        direction === 'price_above_twap'
          ? 'sell_spot_buy_when_reverts'
          : 'buy_spot_sell_when_reverts'

      // Expected gain from reversion: ~70% of the deviation (partial reversion is realistic)
      const estimatedReversionPct = absDeviation * 0.70
      const netProfitPercent = parseFloat((estimatedReversionPct - ROUND_TRIP_FEE_PCT).toFixed(4))
      if (netProfitPercent <= 0) continue

      const estimatedProfit1k = parseFloat((1000 * (netProfitPercent / 100)).toFixed(2))

      let confidence: TwapSignal['confidence'] = 'low'
      if (absDeviation >= HIGH_DEVIATION_PCT && estimatedProfit1k > 3) confidence = 'high'
      else if (absDeviation >= MIN_DEVIATION_PCT) confidence = 'medium'

      const signalScore = Math.min(100, Math.round(
        (Math.min(absDeviation, 2) / 2) * 60 +   // deviation drives 60%
        (netProfitPercent / 1.0) * 25 +            // profitability 25%
        (confidence === 'high' ? 15 : confidence === 'medium' ? 8 : 0)
      ))

      signals.push({
        id: `twap-${exchange}-${symbol.replace('/', '')}-${now}`,
        symbol,
        exchange,
        currentPrice: parseFloat(currentPrice.toFixed(6)),
        twap4h: parseFloat(twap.toFixed(6)),
        deviationPercent: parseFloat(deviationPercent.toFixed(4)),
        direction,
        action,
        estimatedReversionPct: parseFloat(estimatedReversionPct.toFixed(4)),
        netProfitPercent,
        estimatedProfit1k,
        confidence,
        signalScore,
        detectedAt: now,
      })
    }
  }

  return signals
    .sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent))
    .slice(0, MAX_SIGNALS)
}

// ── State ─────────────────────────────────────────────────────────────────────

let latestSignals: TwapSignal[] = []
let isStarted = false

// ── Public API ────────────────────────────────────────────────────────────────

export function getTwapSignals(): TwapSignal[] {
  return latestSignals
}

export function getTwapSampleCount(): number {
  let total = 0
  for (const samples of twapStore.values()) total += samples.length
  return total
}

function evaluate(): void {
  try {
    samplePricesForTwap()
    latestSignals = computeTwapSignals()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[TWAP] evaluate() error:', msg)
  }
}

export function startTwapEngine(): void {
  if (isStarted) return
  isStarted = true
  evaluate()
  setInterval(evaluate, 30_000)   // sample every 30s, signal every 30s
  console.log(`[TWAP] Engine started — tracking ${TRACKED_SYMBOLS.length} symbols × ${TRACKED_EXCHANGES.length} exchanges, 4h TWAP window`)
}
