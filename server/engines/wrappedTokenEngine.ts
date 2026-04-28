/**
 * Wrapped Token Parity Engine — "Wrapper Parity"
 *
 * Strategy: Wrapped tokens (WBTC, wETH) should always equal their underlying.
 * 1 WBTC = 1 BTC. 1 wETH = 1 ETH.
 * When the ratio breaks, you can:
 *   - Buy the cheaper one, sell the expensive one
 *   - Or: Wrap/unwrap (paper sim: record the arb as CEX vs DEX price)
 *
 * When this works: High gas periods cause DEX WBTC price to discount vs CEX BTC.
 * Also: Sudden liquidity gaps in WBTC pools on Uniswap create 0.1–0.5% deviations.
 *
 * Edge: Near-zero inventory risk — both legs are the same underlying asset.
 * The ratio MUST revert to 1.000 (by definition of the wrapped contract).
 *
 * Data: Compare tickStore BTC/USDT (CEX) vs DEX WBTC/USDT prices
 *       Compare tickStore ETH/USDT (CEX) vs DEX wETH/USDT prices
 */

import { tickStore } from '../engine/tickStore'
import { dexTickStore } from '../engine/dexTickStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WrappedTokenSignal {
  id: string
  underlyingSymbol: string       // e.g. "BTC/USDT" (CEX)
  wrappedSymbol: string          // e.g. "WBTC/USDT" (DEX)
  cexExchange: string
  dexExchange: string
  cexPrice: number               // BTC price on CEX
  dexPrice: number               // WBTC price on DEX
  parityRatio: number            // dexPrice / cexPrice (should be 1.000)
  deviationPercent: number       // (ratio - 1) × 100
  direction: 'buy_dex_sell_cex' | 'buy_cex_sell_dex'
  netProfitPercent: number
  estimatedProfit1k: number
  dexLiquidityUsd: number
  confidence: 'high' | 'medium' | 'low'
  signalScore: number
  detectedAt: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

interface WrappedPair {
  cexSymbol: string          // CEX ticker
  dexSymbol: string          // DEX ticker (wrapped)
  cexExchanges: string[]
}

const WRAPPED_PAIRS: WrappedPair[] = [
  {
    cexSymbol:   'BTC/USDT',
    dexSymbol:   'WBTC/USDT',
    cexExchanges: ['binance', 'okx', 'coinbase', 'bybit'],
  },
  {
    cexSymbol:   'ETH/USDT',
    dexSymbol:   'WETH/USDT',
    cexExchanges: ['binance', 'okx', 'coinbase', 'bybit'],
  },
]

const MIN_DEVIATION_PCT  = 0.05    // 0.05% minimum (wrapped tokens trade tight)
const HIGH_DEVIATION_PCT = 0.20    // high confidence
const MAX_DEVIATION_PCT  = 2.0     // above = bridge issue or bad data
const DEX_TAKER_FEE_PCT  = 0.30   // Uniswap v3 typical 0.30% fee tier
const CEX_TAKER_FEE_PCT  = 0.10   // 0.10% taker
const ROUND_TRIP_FEE_PCT = DEX_TAKER_FEE_PCT + CEX_TAKER_FEE_PCT  // 0.40% total

// ── Signal computation ────────────────────────────────────────────────────────

function computeWrappedTokenSignals(): WrappedTokenSignal[] {
  const now = Date.now()
  const signals: WrappedTokenSignal[] = []

  for (const pair of WRAPPED_PAIRS) {
    // Get DEX price (wrapped token)
    const dexPrices = dexTickStore.getAll().filter(
      p => p.symbol === pair.dexSymbol && p.timestamp > now - 30_000 && p.price > 0
    )

    for (const dexPrice of dexPrices) {
      // Get CEX price (underlying)
      for (const cexEx of pair.cexExchanges) {
        const cexTick = tickStore.getTick(cexEx, pair.cexSymbol)
        if (!cexTick || cexTick.timestamp < now - 10_000) continue

        const cexPrice = (cexTick.bid + cexTick.ask) / 2
        if (cexPrice <= 0 || dexPrice.price <= 0) continue

        const parityRatio     = dexPrice.price / cexPrice
        const deviationPercent = (parityRatio - 1) * 100
        const absDeviation    = Math.abs(deviationPercent)

        if (absDeviation < MIN_DEVIATION_PCT) continue
        if (absDeviation > MAX_DEVIATION_PCT) continue

        // Direction: buy where cheaper, sell where expensive
        const direction: WrappedTokenSignal['direction'] =
          parityRatio < 1   // DEX is cheaper
            ? 'buy_dex_sell_cex'
            : 'buy_cex_sell_dex'

        const netProfitPercent = parseFloat((absDeviation - ROUND_TRIP_FEE_PCT).toFixed(4))
        if (netProfitPercent <= 0) continue

        const estimatedProfit1k = parseFloat((1000 * (netProfitPercent / 100)).toFixed(2))
        const dexLiquidityUsd   = dexPrice.liquidity ?? 0

        let confidence: WrappedTokenSignal['confidence'] = 'low'
        if (absDeviation >= HIGH_DEVIATION_PCT && dexLiquidityUsd > 50_000) confidence = 'high'
        else if (absDeviation >= MIN_DEVIATION_PCT * 2) confidence = 'medium'

        const signalScore = Math.min(100, Math.round(
          (Math.min(absDeviation, 1) / 1) * 50 +
          (Math.min(dexLiquidityUsd, 100_000) / 100_000) * 30 +
          (confidence === 'high' ? 20 : confidence === 'medium' ? 10 : 0)
        ))

        signals.push({
          id: `wrapped-${cexEx}-${dexPrice.dexId}-${pair.dexSymbol.replace('/', '')}-${now}`,
          underlyingSymbol: pair.cexSymbol,
          wrappedSymbol:    pair.dexSymbol,
          cexExchange: cexEx,
          dexExchange: dexPrice.dexId,
          cexPrice:    parseFloat(cexPrice.toFixed(4)),
          dexPrice:    parseFloat(dexPrice.price.toFixed(4)),
          parityRatio: parseFloat(parityRatio.toFixed(6)),
          deviationPercent: parseFloat(deviationPercent.toFixed(4)),
          direction,
          netProfitPercent,
          estimatedProfit1k,
          dexLiquidityUsd,
          confidence,
          signalScore,
          detectedAt: now,
        })
      }
    }
  }

  return signals
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, 20)
}

// ── State ─────────────────────────────────────────────────────────────────────

let latestSignals: WrappedTokenSignal[] = []
let isStarted = false

// ── Public API ────────────────────────────────────────────────────────────────

export function getWrappedTokenSignals(): WrappedTokenSignal[] {
  return latestSignals
}

function evaluate(): void {
  try {
    latestSignals = computeWrappedTokenSignals()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[WrappedToken] evaluate() error:', msg)
  }
}

export function startWrappedTokenEngine(): void {
  if (isStarted) return
  isStarted = true
  evaluate()
  setInterval(evaluate, 10_000)   // every 10s — DEX prices update slowly
  console.log('[WrappedToken] Engine started — monitoring WBTC/BTC and wETH/ETH parity')
}
