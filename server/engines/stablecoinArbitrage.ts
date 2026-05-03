/**
 * Stablecoin Arbitrage Engine — "Stable Drift"
 *
 * Strategy: Exploit price deviations between stablecoin pairs across exchanges.
 * USDC should always equal USDT. When it doesn't, buy the cheaper one and sell
 * the more expensive one.
 *
 * Edge: Near-zero inventory risk. Both legs are essentially $1 assets.
 * Even 0.05% spread is pure profit after fees on high-liquidity stables.
 *
 * Pairs tracked:
 *   - USDC/USDT  (most common: depeg events, market maker liquidity gaps)
 *   - USDT/USDC  (reverse direction)
 *   - FDUSD/USDT (Binance native stablecoin vs USDT)
 */

import { tickStore } from '../engine/tickStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StablecoinOpportunity {
  id: string
  symbol: string          // e.g. "USDC/USDT"
  buyExchange: string
  buyPrice: number
  sellExchange: string
  sellPrice: number
  spreadPercent: number
  minFeePercent: number   // round-trip taker fee for these two exchanges
  netProfitPercent: number
  estimatedProfit1k: number
  liquidityScore: number  // 0-1 proxy for how much can be traded
  confidence: 'high' | 'medium' | 'low'
  detectedAt: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STABLECOIN_SYMBOLS = ['USDC/USDT', 'FDUSD/USDT', 'TUSD/USDT', 'DAI/USDT', 'USDC/FDUSD']

const EXCHANGE_TAKER_FEES: Record<string, number> = {
  binance:     0.001,
  okx:         0.001,
  bybit:       0.001,
  kucoin:      0.001,
  gateio:      0.002,
  mexc:        0.001,
  htx:         0.002,
  bitget:      0.001,
  bingx:       0.001,
  coinbase:    0.006,
  hyperliquid: 0.0005,
}

// Minimum gross spread to even consider — must exceed total round-trip fees
const MIN_GROSS_SPREAD    = 0.02    // 0.02% — very tight (stables are ultra-liquid)
const MAX_GROSS_SPREAD    = 2.0     // 2% — above this is likely bad data or depeg event
const MAX_AGE_MS          = 15_000  // reject ticks older than 15s for stablecoins
const MAX_OPPORTUNITIES   = 50

// ── Calculation ───────────────────────────────────────────────────────────────

function getRoundTripFee(buyExchange: string, sellExchange: string): number {
  const buyFee  = EXCHANGE_TAKER_FEES[buyExchange]  ?? 0.001
  const sellFee = EXCHANGE_TAKER_FEES[sellExchange] ?? 0.001
  return (buyFee + sellFee) * 100  // return as %
}

function computeStablecoinOpportunities(): StablecoinOpportunity[] {
  const now = Date.now()
  const cutoff = now - MAX_AGE_MS
  const opps: StablecoinOpportunity[] = []

  for (const symbol of STABLECOIN_SYMBOLS) {
    // Use mid-price (bid+ask)/2 for each exchange tick
    const ticks = tickStore.getBySymbol(symbol).filter(t => t.timestamp >= cutoff && t.bid > 0 && t.ask > 0)
    if (ticks.length < 2) continue

    // Compare all exchange pairs
    for (let i = 0; i < ticks.length; i++) {
      for (let j = i + 1; j < ticks.length; j++) {
        const a = ticks[i]!
        const b = ticks[j]!

        const aMid = (a.bid + a.ask) / 2
        const bMid = (b.bid + b.ask) / 2

        // Determine buy/sell direction: buy at lower ask, sell at higher bid
        const [buy, sell, buyMid, sellMid] =
          aMid < bMid ? [a, b, aMid, bMid] : [b, a, bMid, aMid]

        const spreadPercent = parseFloat((((sellMid - buyMid) / buyMid) * 100).toFixed(6))
        if (spreadPercent < MIN_GROSS_SPREAD) continue
        if (spreadPercent > MAX_GROSS_SPREAD) continue

        const minFeePercent    = parseFloat(getRoundTripFee(buy.exchangeId, sell.exchangeId).toFixed(4))
        const netProfitPercent = parseFloat((spreadPercent - minFeePercent).toFixed(6))

        const estimatedProfit1k = parseFloat((1000 * (netProfitPercent / 100)).toFixed(4))
        const liquidityScore    = Math.min(1, Math.min(buy.bidSize, sell.askSize) / 10_000)

        let confidence: 'high' | 'medium' | 'low' = 'low'
        if (netProfitPercent > 0.05 && liquidityScore > 0.5) confidence = 'high'
        else if (netProfitPercent > 0)                       confidence = 'medium'

        opps.push({
          id: `stable-${buy.exchangeId}-${sell.exchangeId}-${symbol}-${now}`,
          symbol,
          buyExchange:      buy.exchangeId,
          buyPrice:         buy.ask,      // we pay the ask when buying
          sellExchange:     sell.exchangeId,
          sellPrice:        sell.bid,     // we receive the bid when selling
          spreadPercent,
          minFeePercent,
          netProfitPercent,
          estimatedProfit1k,
          liquidityScore,
          confidence,
          detectedAt: now,
        })
      }
    }
  }

  return opps
    .sort((a, b) => b.netProfitPercent - a.netProfitPercent)
    .slice(0, MAX_OPPORTUNITIES)
}

// ── State ─────────────────────────────────────────────────────────────────────

let latestOpportunities: StablecoinOpportunity[] = []
let isStarted = false

// ── Public API ────────────────────────────────────────────────────────────────

export function getStablecoinOpportunities(): StablecoinOpportunity[] {
  return latestOpportunities
}

function evaluate(): void {
  try {
    latestOpportunities = computeStablecoinOpportunities()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[StablecoinArb] evaluate() error:', msg)
  }
}

export function startStablecoinEngine(): void {
  if (isStarted) return
  isStarted = true
  evaluate()
  setInterval(evaluate, 5_000)   // every 5s — tight spreads close fast
  console.log('[StablecoinArb] Engine started — scanning USDC/USDT/FDUSD/DAI gaps every 5s')
}
