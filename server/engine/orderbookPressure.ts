/**
 * Orderbook Pressure Engine — "Depth Signal"
 *
 * Strategy: Predictive arbitrage based on order book imbalance.
 * When the bid depth on Exchange A is significantly larger than the ask depth,
 * buy pressure will push price UP on A — creating a temporary gap with Exchange B.
 * We position AHEAD of the gap opening.
 *
 * Institutional context: This is a microstructure signal. HFT firms at Citadel
 * and Jane Street monitor book imbalance in real-time to predict short-term
 * price movements. We run a simplified version using existing bid/ask sizes.
 *
 * Signal: Imbalance ratio = (bidSize - askSize) / (bidSize + askSize)
 *         > +0.4 → Strong buy pressure → price will rise
 *         < -0.4 → Strong sell pressure → price will fall
 *         Compare across exchanges to predict cross-exchange gap
 *
 * Data: Uses existing PriceTick.bidSize / askSize from tickStore
 * Signal window: 30–120 seconds (microstructure is transient)
 */

import { tickStore } from './tickStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderbookPressureSignal {
  id: string
  symbol: string
  pressureExchange: string      // exchange with strong imbalance
  counterExchange: string       // exchange we'd sell/buy against
  pressurePrice: number
  counterPrice: number
  imbalanceRatio: number        // -1 to +1
  predictedDirection: 'up' | 'down'
  predictedGapPercent: number   // estimated gap that will open
  netProfitPercent: number
  estimatedProfit1k: number
  confidence: 'high' | 'medium' | 'low'
  signalScore: number
  detectedAt: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRACKED_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT',
  'XRP/USDT', 'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT',
  'ADA/USDT', 'MATIC/USDT', 'NEAR/USDT', 'ARB/USDT',
]

const HIGH_IMBALANCE_THRESHOLD = 0.40   // |ratio| > 0.4 = strong signal
const MED_IMBALANCE_THRESHOLD  = 0.25   // |ratio| > 0.25 = medium signal
const MIN_BID_ASK_SIZE         = 0.1    // minimum meaningful depth
const ROUND_TRIP_FEE_PCT       = 0.20
const PREDICTED_GAP_FACTOR     = 0.15   // imbalance of 0.4 → predicted 0.06% gap move
const MAX_SIGNALS              = 30

// ── Signal computation ────────────────────────────────────────────────────────

function computeOrderbookPressureSignals(): OrderbookPressureSignal[] {
  const now = Date.now()
  const signals: OrderbookPressureSignal[] = []

  for (const symbol of TRACKED_SYMBOLS) {
    const ticks = tickStore.getBySymbol(symbol).filter(
      t => t.timestamp > now - 5_000 && t.bid > 0 && t.ask > 0
    )
    if (ticks.length < 2) continue

    for (let i = 0; i < ticks.length; i++) {
      const tickA = ticks[i]!
      const totalA = tickA.bidSize + tickA.askSize
      if (totalA < MIN_BID_ASK_SIZE) continue

      const imbalanceRatio = (tickA.bidSize - tickA.askSize) / totalA
      const absImbalance = Math.abs(imbalanceRatio)
      if (absImbalance < MED_IMBALANCE_THRESHOLD) continue

      // Find a counter-exchange
      for (let j = 0; j < ticks.length; j++) {
        if (i === j) continue
        const tickB = ticks[j]!

        const priceA = (tickA.bid + tickA.ask) / 2
        const priceB = (tickB.bid + tickB.ask) / 2
        if (priceA <= 0 || priceB <= 0) continue

        // Predicted direction of price A
        const predictedDirection: 'up' | 'down' = imbalanceRatio > 0 ? 'up' : 'down'

        // If A will go UP, we want to buy A now and sell B (or vice versa)
        const predictedGapPercent = parseFloat((absImbalance * PREDICTED_GAP_FACTOR * 100).toFixed(4))
        const netProfitPercent    = parseFloat((predictedGapPercent - ROUND_TRIP_FEE_PCT).toFixed(4))
        if (netProfitPercent <= 0) continue

        const estimatedProfit1k = parseFloat((1000 * (netProfitPercent / 100)).toFixed(2))

        let confidence: OrderbookPressureSignal['confidence'] = 'low'
        if (absImbalance >= HIGH_IMBALANCE_THRESHOLD) confidence = 'high'
        else if (absImbalance >= MED_IMBALANCE_THRESHOLD) confidence = 'medium'

        const signalScore = Math.min(100, Math.round(
          (absImbalance / 0.6) * 60 +
          (netProfitPercent / 0.5) * 25 +
          (confidence === 'high' ? 15 : confidence === 'medium' ? 7 : 0)
        ))

        signals.push({
          id: `ob-${tickA.exchangeId}-${tickB.exchangeId}-${symbol.replace('/', '')}-${now}`,
          symbol,
          pressureExchange: tickA.exchangeId,
          counterExchange:  tickB.exchangeId,
          pressurePrice:    parseFloat(priceA.toFixed(6)),
          counterPrice:     parseFloat(priceB.toFixed(6)),
          imbalanceRatio:   parseFloat(imbalanceRatio.toFixed(4)),
          predictedDirection,
          predictedGapPercent,
          netProfitPercent,
          estimatedProfit1k,
          confidence,
          signalScore,
          detectedAt: now,
        })
      }
    }
  }

  return signals
    .sort((a, b) => b.signalScore - a.signalScore)
    .filter((s, i, arr) => {
      // Deduplicate: keep only the best signal per symbol
      return arr.findIndex(x => x.symbol === s.symbol) === i
    })
    .slice(0, MAX_SIGNALS)
}

// ── State ─────────────────────────────────────────────────────────────────────

let latestSignals: OrderbookPressureSignal[] = []
let isStarted = false

// ── Public API ────────────────────────────────────────────────────────────────

export function getOrderbookPressureSignals(): OrderbookPressureSignal[] {
  return latestSignals
}

function evaluate(): void {
  try {
    latestSignals = computeOrderbookPressureSignals()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[OrderbookPressure] evaluate() error:', msg)
  }
}

export function startOrderbookPressureEngine(): void {
  if (isStarted) return
  isStarted = true
  evaluate()
  setInterval(evaluate, 3_000)   // every 3s — microstructure is fast-moving
  console.log(`[OrderbookPressure] Engine started — monitoring ${TRACKED_SYMBOLS.length} symbols`)
}
