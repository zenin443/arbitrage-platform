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
 *
 * Sprint 1.4 changes:
 *   - Spread now computed from actual bid/ask (buy at ask, sell at bid)
 *     instead of the mid-price (which overstates the real achievable spread).
 *   - Fallback: if a leg has no valid bid/ask, apply a conservative 0.05%
 *     slippage assumption per leg on the mid-price.
 *   - Hard cap: spreads > 0.5% are suppressed (likely bad data / real depeg).
 *   - Volume gate: if 24h volume is known and < $1M for the pair, signal is
 *     suppressed.  When volume is unknown the check is skipped (fail-open).
 */

import { tickStore } from '../engine/tickStore'
import { getVolume } from '../engine/volumeRegistry'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StablecoinOpportunity {
  id: string
  symbol: string          // e.g. "USDC/USDT"
  buyExchange: string
  buyPrice: number        // actual ask price paid
  sellExchange: string
  sellPrice: number       // actual bid price received
  spreadPercent: number   // bid/ask-adjusted gross spread
  slippageAssumed: boolean // true when fallback mid+0.05% was used
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
const MIN_GROSS_SPREAD        = 0.02    // 0.02% — very tight (stables are ultra-liquid)
/** Spreads above this are abnormal — suppress as likely data error or real depeg. */
const MAX_GROSS_SPREAD        = 0.5     // Sprint 1.4: tightened from 2.0% → 0.5%
const MAX_AGE_MS              = 15_000  // reject ticks older than 15s for stablecoins
const MAX_OPPORTUNITIES       = 50
/** Conservative per-leg slippage assumption when bid/ask is unavailable. */
const FALLBACK_SLIPPAGE_PCT   = 0.05   // 0.05% per leg = 0.10% round-trip
/** Suppress signal if known 24h volume is below this threshold (USD). */
const MIN_VOLUME_24H_USD      = 1_000_000  // $1M

// ── Calculation ───────────────────────────────────────────────────────────────

function getRoundTripFee(buyExchange: string, sellExchange: string): number {
  const buyFee  = EXCHANGE_TAKER_FEES[buyExchange]  ?? 0.001
  const sellFee = EXCHANGE_TAKER_FEES[sellExchange] ?? 0.001
  return (buyFee + sellFee) * 100  // return as %
}

/**
 * Returns the effective buy price (ask) and sell price (bid) for a tick.
 * If the tick lacks valid bid/ask data, falls back to mid ± slippage.
 */
function getEffectivePrices(tick: { bid: number; ask: number }): {
  effectiveBuy: number   // price we pay to enter
  effectiveSell: number  // price we receive on exit
  slippageAssumed: boolean
} {
  const hasBidAsk = tick.bid > 0 && tick.ask > 0 && tick.ask >= tick.bid

  if (hasBidAsk) {
    return {
      effectiveBuy:    tick.ask,
      effectiveSell:   tick.bid,
      slippageAssumed: false,
    }
  }

  // Fallback: use mid with conservative slippage
  const mid = tick.bid > 0 ? tick.bid : tick.ask   // at least one should be nonzero
  const slipFactor = FALLBACK_SLIPPAGE_PCT / 100
  return {
    effectiveBuy:    mid * (1 + slipFactor),
    effectiveSell:   mid * (1 - slipFactor),
    slippageAssumed: true,
  }
}

function computeStablecoinOpportunities(): StablecoinOpportunity[] {
  const now    = Date.now()
  const cutoff = now - MAX_AGE_MS
  const opps: StablecoinOpportunity[] = []

  for (const symbol of STABLECOIN_SYMBOLS) {
    // Volume gate — fail-open if volume is unknown
    const knownVolume = getVolume(symbol)
    if (knownVolume !== null && knownVolume < MIN_VOLUME_24H_USD) continue

    const ticks = tickStore
      .getBySymbol(symbol)
      .filter(t => t.timestamp >= cutoff && (t.bid > 0 || t.ask > 0))

    if (ticks.length < 2) continue

    // Compare all exchange pairs
    for (let i = 0; i < ticks.length; i++) {
      for (let j = i + 1; j < ticks.length; j++) {
        const a = ticks[i]!
        const b = ticks[j]!

        const aPrices = getEffectivePrices(a)
        const bPrices = getEffectivePrices(b)

        // Determine buy/sell direction:
        //   buy (pay ask) on the exchange with the lower ask
        //   sell (receive bid) on the exchange with the higher bid
        const [buy, sell, buyPrices, sellPrices] =
          aPrices.effectiveBuy < bPrices.effectiveBuy
            ? [a, b, aPrices, bPrices]
            : [b, a, bPrices, aPrices]

        // Gross spread using actual execution prices (bid/ask-adjusted)
        const spreadPercent = parseFloat(
          (((sellPrices.effectiveSell / buyPrices.effectiveBuy) - 1) * 100).toFixed(6)
        )

        if (spreadPercent < MIN_GROSS_SPREAD) continue
        if (spreadPercent > MAX_GROSS_SPREAD) continue   // 1.4: hard cap at 0.5%

        const slippageAssumed = buyPrices.slippageAssumed || sellPrices.slippageAssumed

        const minFeePercent    = parseFloat(getRoundTripFee(buy.exchangeId, sell.exchangeId).toFixed(4))
        const netProfitPercent = parseFloat((spreadPercent - minFeePercent).toFixed(6))
        const estimatedProfit1k = parseFloat((1000 * (netProfitPercent / 100)).toFixed(4))

        // Liquidity: use minimum available depth across both legs (in USD)
        const buyDepthUsd  = buy.bidSize  * buyPrices.effectiveBuy
        const sellDepthUsd = sell.askSize * sellPrices.effectiveSell
        const liquidityScore = Math.min(1, Math.min(buyDepthUsd, sellDepthUsd) / 10_000)

        let confidence: 'high' | 'medium' | 'low'
        if (netProfitPercent > 0.05 && liquidityScore > 0.5 && !slippageAssumed) {
          confidence = 'high'
        } else if (netProfitPercent > 0 && liquidityScore > 0.2) {
          confidence = 'medium'
        } else {
          confidence = 'low'
        }

        opps.push({
          id: `stable-${buy.exchangeId}-${sell.exchangeId}-${symbol}-${now}`,
          symbol,
          buyExchange:      buy.exchangeId,
          buyPrice:         buyPrices.effectiveBuy,
          sellExchange:     sell.exchangeId,
          sellPrice:        sellPrices.effectiveSell,
          spreadPercent,
          slippageAssumed,
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
  console.log('[StablecoinArb] Engine started — scanning USDC/USDT/FDUSD/DAI gaps every 5s (bid/ask-adjusted)')
}
