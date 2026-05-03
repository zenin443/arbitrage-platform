import { tickStore } from './tickStore'
import { dexTickStore } from './dexTickStore'
import { CexDexOpportunity } from '../adapters/dex/base'

const MIN_NET_PROFIT_PERCENT = 0.1
const MAX_PRICE_DIFF_PERCENT = 5.0  // operational ceiling — spreads above this are noise
const MAX_SPREAD_HARD_CAP    = 20.0 // data-quality guard — anything above 20% is bad data
const DEX_MAX_AGE_MS         = 60_000 // was 30_000 — gives buffer for slow DeFi Llama polls

// Per-chain gas cost estimates in USD (one-way execution cost)
const CHAIN_GAS_COSTS: Record<string, number> = {
  solana:   0.001,
  arbitrum: 0.15,
  ethereum: 8.00,
  base:     0.05,
}

function gasFeeForChain(chain: string): number {
  return CHAIN_GAS_COSTS[chain] ?? 0.50
}

function confidenceLevel(netProfitPercent: number): 'high' | 'medium' | 'low' {
  if (netProfitPercent >= 1.0) return 'high'
  if (netProfitPercent >= 0.5) return 'medium'
  return 'low'
}

/**
 * Estimate the max trade size (in USD) before hitting 1% slippage on the DEX.
 * Uses the linear price-impact model: impact% = tradeSize / liquidity * 100
 * Solving for tradeSize at 1% impact: tradeSize = liquidity / 100
 */
function maxTradeSizeBeforeSlippage(liquidityUSD: number): number {
  return parseFloat((liquidityUSD / 100).toFixed(2))
}

let idCounter = 0
function nextId(): string {
  return `cdx-${Date.now()}-${(++idCounter).toString().padStart(4, '0')}`
}

export function calculateCexDexOpportunities(): CexDexOpportunity[] {
  const opportunities: CexDexOpportunity[] = []
  // Only use DEX prices received within the last 60 seconds to avoid stale signals
  const dexPrices = dexTickStore.getFresh(DEX_MAX_AGE_MS)

  for (const dexPrice of dexPrices) {
    if (dexPrice.price <= 0) continue

    const cexTicks = tickStore.getBySymbol(dexPrice.symbol)

    for (const cexTick of cexTicks) {
      // Use mid price (average of bid/ask) as the CEX reference price
      const cexMid = parseFloat(((cexTick.bid + cexTick.ask) / 2).toFixed(8))
      if (cexMid <= 0) continue

      const rawDiffPercent = ((dexPrice.price - cexMid) / cexMid) * 100

      // Hard cap: anything above 20% is a data-quality failure, not an opportunity
      if (Math.abs(rawDiffPercent) > MAX_SPREAD_HARD_CAP) continue
      // Operational ceiling: spreads above 5% are treated as noise/bad data
      if (Math.abs(rawDiffPercent) > MAX_PRICE_DIFF_PERCENT) continue

      // Gas fee based on the DEX's chain; expressed as % of actual trade size
      const gasFeeUSD    = gasFeeForChain(dexPrice.chain)
      const maxTradeSize = maxTradeSizeBeforeSlippage(dexPrice.liquidity)
      const tradeSize    = maxTradeSize > 0 ? maxTradeSize : 1_000
      const gasFeePercent   = (gasFeeUSD / tradeSize) * 100
      const netProfitPercent = parseFloat((Math.abs(rawDiffPercent) - gasFeePercent).toFixed(8))

      if (netProfitPercent <= MIN_NET_PROFIT_PERCENT) continue

      const direction: CexDexOpportunity['direction'] =
        cexMid > dexPrice.price ? 'buy_dex_sell_cex' : 'buy_cex_sell_dex'

      opportunities.push({
        id:                nextId(),
        symbol:            dexPrice.symbol,
        cexExchange:       cexTick.exchangeId,
        dexId:             dexPrice.dexId,
        chain:             dexPrice.chain,
        cexPrice:          cexMid,
        dexPrice:          dexPrice.price,
        priceDiffPercent:  parseFloat(rawDiffPercent.toFixed(8)),
        estimatedGasFee:   gasFeeUSD,
        netProfitPercent,
        direction,
        liquidityUSD:      dexPrice.liquidity,
        maxTradeSize,
        confidence:        confidenceLevel(netProfitPercent),
        detectedAt:        Date.now(),
        note: dexPrice.dexId === 'uniswap_v3' && dexPrice.symbol === 'BTC/USDT'
          ? 'WBTC→BTC (wrapped asset)'
          : undefined,
      })
    }
  }

  return opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent)
}
