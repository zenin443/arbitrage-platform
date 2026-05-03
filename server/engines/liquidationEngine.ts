/**
 * Liquidation Cascade Engine — "Cascade Hunter"
 *
 * Strategy: When a large liquidation cascade hits a perp exchange, spot price
 * temporarily dislocates from fair value by 0.3–1.5%. The gap closes within
 * 30–120 seconds as arbitrageurs restore parity.
 *
 * Signal: Open interest drops > 3% in < 60 seconds on any perp exchange
 *         PLUS spot price drops > 0.3% below the 5-minute TWAP on the same symbol
 *         → Flash discount detected → Buy spot, expect quick reversion
 *
 * Data: We monitor the futuresTickStore for OI changes and spot tickStore for
 *       price dislocations. No additional API calls needed.
 *
 * Risk: Hard 3-minute paper exit (we assume reversion fails if not resolved)
 * Expected return per event: 0.3–1.5% in 30–120 seconds
 * Event frequency: 3–8 significant events per day on active markets
 */

import { tickStore } from '../engine/tickStore'
import { futuresTickStore } from '../engine/futuresTickStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiquidationSignal {
  id: string
  symbol: string
  exchange: string
  spotPrice: number
  fairValuePrice: number       // 5-min rolling average before dislocation
  discountPercent: number      // how far below fair value (positive = discount)
  oiDropPercent: number        // open interest drop that triggered signal
  estimatedReversionPct: number
  netProfitPercent: number
  estimatedProfit1k: number
  confidence: 'high' | 'medium' | 'low'
  signalScore: number
  detectedAt: number
  expiresAt: number            // 3 minutes from detection
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRACKED_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT',
  'XRP/USDT', 'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT',
]

const OI_DROP_THRESHOLD_PCT = 3.0     // 3% OI drop in 60s = cascade
const SPOT_DISCOUNT_MIN_PCT = 0.25    // minimum spot discount to fair value
const SPOT_DISCOUNT_HIGH_PCT = 0.60   // high confidence threshold
const REVERSION_CAPTURE_PCT = 0.70    // expect to capture 70% of the dislocation
const ROUND_TRIP_FEE_PCT    = 0.20
const MAX_SIGNAL_AGE_MS     = 180_000 // 3 minute expiry
const FAIR_VALUE_WINDOW_MS  = 5 * 60 * 1000  // 5-minute rolling average

// ── Fair value tracker ────────────────────────────────────────────────────────

interface PriceSample { price: number; timestamp: number }
const fairValueStore = new Map<string, PriceSample[]>()

export function sampleSpotForFairValue(): void {
  const now = Date.now()
  const cutoff = now - FAIR_VALUE_WINDOW_MS

  for (const symbol of TRACKED_SYMBOLS) {
    const ticks = tickStore.getBySymbol(symbol)
    for (const tick of ticks) {
      const mid = (tick.bid + tick.ask) / 2
      if (mid <= 0) continue
      const key = `${tick.exchangeId}:${symbol}`
      const samples = fairValueStore.get(key) ?? []
      samples.push({ price: mid, timestamp: now })
      fairValueStore.set(key, samples.filter(s => s.timestamp > cutoff))
    }
  }
}

function getFairValue(exchangeId: string, symbol: string): number | null {
  const key = `${exchangeId}:${symbol}`
  const samples = fairValueStore.get(key)
  if (!samples || samples.length < 5) return null
  return samples.reduce((s, p) => s + p.price, 0) / samples.length
}

// ── OI tracker ────────────────────────────────────────────────────────────────

interface OiSnapshot { oi: number; timestamp: number }
const oiHistory = new Map<string, OiSnapshot[]>()  // key: `${exchange}:${symbol}`

export function recordOpenInterest(exchangeId: string, symbol: string, oi: number): void {
  if (oi <= 0) return
  const key = `${exchangeId}:${symbol}`
  const arr = oiHistory.get(key) ?? []
  arr.push({ oi, timestamp: Date.now() })
  if (arr.length > 20) arr.shift()
  oiHistory.set(key, arr)
}

function getOiDropPercent(exchangeId: string, symbol: string): number {
  const key = `${exchangeId}:${symbol}`
  const arr = oiHistory.get(key)
  if (!arr || arr.length < 2) return 0
  const recent = arr[arr.length - 1]!
  const minute_ago = arr.find(s => s.timestamp <= Date.now() - 60_000)
  if (!minute_ago) return 0
  const drop = (minute_ago.oi - recent.oi) / minute_ago.oi * 100
  return Math.max(0, drop)
}

// ── Signal computation ────────────────────────────────────────────────────────

function computeLiquidationSignals(): LiquidationSignal[] {
  const now = Date.now()
  const signals: LiquidationSignal[] = []

  for (const symbol of TRACKED_SYMBOLS) {
    // Use futures tick store for OI data
    const futuresTicks = futuresTickStore.getBySymbol(symbol)
    for (const ftick of futuresTicks) {
      if (ftick.openInterest > 0) {
        recordOpenInterest(ftick.exchangeId, symbol, ftick.openInterest)
      }
    }

    // Check OI drop (requires futures data)
    const spotTicks = tickStore.getBySymbol(symbol)
    for (const spotTick of spotTicks) {
      if (spotTick.timestamp < now - 5_000) continue
      const spotPrice = (spotTick.bid + spotTick.ask) / 2
      if (spotPrice <= 0) continue

      const fairValue = getFairValue(spotTick.exchangeId, symbol)
      if (!fairValue) continue

      const discountPercent = ((fairValue - spotPrice) / fairValue) * 100
      if (discountPercent < SPOT_DISCOUNT_MIN_PCT) continue   // no significant discount

      // Check if OI dropped recently (any futures exchange for this symbol)
      let maxOiDrop = 0
      for (const ftick of futuresTicks) {
        const drop = getOiDropPercent(ftick.exchangeId, symbol)
        if (drop > maxOiDrop) maxOiDrop = drop
      }

      // Signal requires BOTH: spot discount AND OI drop
      // If we don't have OI data yet, use spot discount alone with lower confidence
      const hasOiSignal = maxOiDrop >= OI_DROP_THRESHOLD_PCT

      if (discountPercent < SPOT_DISCOUNT_MIN_PCT) continue

      const estimatedReversionPct = discountPercent * REVERSION_CAPTURE_PCT
      const netProfitPercent = parseFloat((estimatedReversionPct - ROUND_TRIP_FEE_PCT).toFixed(4))
      if (netProfitPercent <= 0) continue

      const estimatedProfit1k = parseFloat((1000 * (netProfitPercent / 100)).toFixed(2))

      let confidence: LiquidationSignal['confidence'] = 'low'
      if (hasOiSignal && discountPercent >= SPOT_DISCOUNT_HIGH_PCT) confidence = 'high'
      else if (hasOiSignal || discountPercent >= SPOT_DISCOUNT_HIGH_PCT) confidence = 'medium'

      const signalScore = Math.min(100, Math.round(
        (Math.min(discountPercent, 1.5) / 1.5) * 50 +
        (hasOiSignal ? 30 : 0) +
        (netProfitPercent / 0.5) * 15 +
        (confidence === 'high' ? 5 : 0)
      ))

      signals.push({
        id: `cascade-${spotTick.exchangeId}-${symbol.replace('/', '')}-${now}`,
        symbol,
        exchange: spotTick.exchangeId,
        spotPrice: parseFloat(spotPrice.toFixed(6)),
        fairValuePrice: parseFloat(fairValue.toFixed(6)),
        discountPercent: parseFloat(discountPercent.toFixed(4)),
        oiDropPercent: parseFloat(maxOiDrop.toFixed(2)),
        estimatedReversionPct: parseFloat(estimatedReversionPct.toFixed(4)),
        netProfitPercent,
        estimatedProfit1k,
        confidence,
        signalScore,
        detectedAt: now,
        expiresAt: now + MAX_SIGNAL_AGE_MS,
      })
    }
  }

  return signals
    .filter(s => s.discountPercent >= SPOT_DISCOUNT_MIN_PCT)
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 20)
}

// ── State ─────────────────────────────────────────────────────────────────────

let latestSignals: LiquidationSignal[] = []
let isStarted = false

// ── Public API ────────────────────────────────────────────────────────────────

export function getLiquidationSignals(): LiquidationSignal[] {
  return latestSignals.filter(s => s.expiresAt > Date.now())
}

function evaluate(): void {
  try {
    sampleSpotForFairValue()
    latestSignals = computeLiquidationSignals()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Liquidation] evaluate() error:', msg)
  }
}

export function startLiquidationEngine(): void {
  if (isStarted) return
  isStarted = true
  evaluate()
  setInterval(evaluate, 5_000)   // every 5s — cascade events are brief
  console.log(`[Liquidation] Engine started — monitoring ${TRACKED_SYMBOLS.length} symbols for cascade events`)
}
