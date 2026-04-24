import { tickStore } from './tickStore'
import { dexTickStore } from './dexTickStore'
import { CexDexOpportunity } from '../adapters/dex/base'
import { JUPITER_GAS_FEE_USD } from '../adapters/dex/jupiter'
import { UNISWAP_GAS_FEE_USD } from '../adapters/dex/uniswap'
import { HYPERLIQUID_GAS_FEE_USD } from '../adapters/dex/hyperliquid'

const MIN_NET_PROFIT_PERCENT = 0.1

const GAS_FEE_BY_DEX: Record<string, number> = {
  jupiter:      JUPITER_GAS_FEE_USD,
  uniswap_v3:   UNISWAP_GAS_FEE_USD,
  hyperliquid:  HYPERLIQUID_GAS_FEE_USD,
}

function gasFeeForDex(dexId: string): number {
  return GAS_FEE_BY_DEX[dexId] ?? 0
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
  const dexPrices = dexTickStore.getAll()

  for (const dexPrice of dexPrices) {
    if (dexPrice.price <= 0) continue

    const cexTicks = tickStore.getBySymbol(dexPrice.symbol)

    for (const cexTick of cexTicks) {
      // Use mid price (average of bid/ask) as the CEX reference price
      const cexMid = parseFloat(((cexTick.bid + cexTick.ask) / 2).toFixed(8))
      if (cexMid <= 0) continue

      const rawDiffPercent = ((dexPrice.price - cexMid) / cexMid) * 100

      // Gas fee as a % of a hypothetical $1000 trade
      const gasFeeUSD       = gasFeeForDex(dexPrice.dexId)
      const gasFeePercent   = (gasFeeUSD / 1_000) * 100
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
        maxTradeSize:      maxTradeSizeBeforeSlippage(dexPrice.liquidity),
        confidence:        confidenceLevel(netProfitPercent),
        detectedAt:        Date.now(),
      })
    }
  }

  return opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent)
}
