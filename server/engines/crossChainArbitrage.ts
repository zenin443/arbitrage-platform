/**
 * Cross-Chain Arbitrage Engine
 *
 * Compares prices of the same token across different blockchains
 * using the existing DEX price feeds (dexTickStore).
 *
 * Profit = price difference - estimated bridge + gas costs
 */

import { dexTickStore } from '../engine/dexTickStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CrossChainOpportunity {
  id: string
  symbol: string
  buyChain: string
  buyDex: string
  buyPrice: number
  sellChain: string
  sellDex: string
  sellPrice: number
  priceDiffPercent: number
  estimatedBridgeCostUsd: number
  estimatedBridgeCostPercent: number
  netProfitPercent: number
  estimatedProfit1k: number
  liquidityUsd: number
  confidence: 'high' | 'medium' | 'low'
  detectedAt: number
}

// ── Bridge cost estimates (USD) ───────────────────────────────────────────────
// Conservative estimates for round-trip bridge + gas

const BRIDGE_COSTS_USD: Record<string, Record<string, number>> = {
  ethereum: {
    solana:    15,
    arbitrum:   5,
    polygon:    4,
    bsc:        8,
    avalanche: 10,
    optimism:   5,
  },
  solana: {
    ethereum:  15,
    arbitrum:  12,
    polygon:   10,
    bsc:       12,
    avalanche: 12,
    optimism:  12,
  },
  arbitrum: {
    ethereum:   5,
    solana:    12,
    polygon:    3,
    bsc:        6,
    avalanche:  6,
    optimism:   3,
  },
  polygon: {
    ethereum:   4,
    solana:    10,
    arbitrum:   3,
    bsc:        4,
    avalanche:  5,
    optimism:   3,
  },
  bsc: {
    ethereum:   8,
    solana:    12,
    arbitrum:   6,
    polygon:    4,
    avalanche:  6,
    optimism:   6,
  },
  avalanche: {
    ethereum:  10,
    solana:    12,
    arbitrum:   6,
    polygon:    5,
    bsc:        6,
    optimism:   6,
  },
  optimism: {
    ethereum:   5,
    solana:    12,
    arbitrum:   3,
    polygon:    3,
    bsc:        6,
    avalanche:  6,
  },
}

function getBridgeCost(fromChain: string, toChain: string): number {
  return BRIDGE_COSTS_USD[fromChain]?.[toChain] ?? 20 // default $20 if unknown
}

const MAX_OPPORTUNITIES = 100

// ── Calculation ───────────────────────────────────────────────────────────────

function computeCrossChainOpportunities(): CrossChainOpportunity[] {
  const allPrices = dexTickStore.getAll()
  if (allPrices.length < 2) return []

  const now = Date.now()
  const stale = now - 30_000 // ignore prices older than 30s

  // Group by symbol
  const bySymbol = new Map<string, typeof allPrices>()
  for (const p of allPrices) {
    if (p.timestamp > 0 && p.timestamp < stale) continue // stale
    if (p.price <= 0) continue
    const arr = bySymbol.get(p.symbol) ?? []
    arr.push(p)
    bySymbol.set(p.symbol, arr)
  }

  const opportunities: CrossChainOpportunity[] = []

  for (const [symbol, prices] of bySymbol) {
    if (prices.length < 2) continue

    // Compare every pair of chains
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const a = prices[i]!
        const b = prices[j]!

        // Skip same chain
        if (a.chain === b.chain) continue

        // Determine buy/sell direction
        const [buy, sell] = a.price < b.price ? [a, b] : [b, a]

        const priceDiffPercent = ((sell.price - buy.price) / buy.price) * 100
        if (priceDiffPercent <= 0) continue

        // Estimate bridge cost as % of $1K trade
        const bridgeCostUsd = getBridgeCost(buy.chain, sell.chain)
        const tradeSizeUsd = 1_000
        const bridgeCostPercent = (bridgeCostUsd / tradeSizeUsd) * 100

        const netProfitPercent = priceDiffPercent - bridgeCostPercent

        const liquidityUsd = Math.min(buy.liquidity ?? 0, sell.liquidity ?? 0)

        // Only report if gross diff > 0.5% (to filter pure noise)
        if (priceDiffPercent < 0.5) continue

        const estimatedProfit1k = 1000 * (netProfitPercent / 100)

        let confidence: 'high' | 'medium' | 'low' = 'low'
        if (netProfitPercent > 1.0 && liquidityUsd > 10_000) confidence = 'high'
        else if (netProfitPercent > 0.3 && liquidityUsd > 1_000) confidence = 'medium'

        opportunities.push({
          id: `xchain-${buy.chain}-${sell.chain}-${symbol}-${now}`,
          symbol,
          buyChain: buy.chain,
          buyDex: buy.dexId,
          buyPrice: buy.price,
          sellChain: sell.chain,
          sellDex: sell.dexId,
          sellPrice: sell.price,
          priceDiffPercent: parseFloat(priceDiffPercent.toFixed(4)),
          estimatedBridgeCostUsd: bridgeCostUsd,
          estimatedBridgeCostPercent: parseFloat(bridgeCostPercent.toFixed(4)),
          netProfitPercent: parseFloat(netProfitPercent.toFixed(4)),
          estimatedProfit1k: parseFloat(estimatedProfit1k.toFixed(2)),
          liquidityUsd,
          confidence,
          detectedAt: now,
        })
      }
    }
  }

  return opportunities
    .sort((a, b) => b.netProfitPercent - a.netProfitPercent)
    .slice(0, MAX_OPPORTUNITIES)
}

// ── State ─────────────────────────────────────────────────────────────────────

let latestOpportunities: CrossChainOpportunity[] = []
let isStarted = false

// ── Public API ────────────────────────────────────────────────────────────────

export function getCrossChainOpportunities(): CrossChainOpportunity[] {
  return latestOpportunities
}

function evaluate(): void {
  try {
    latestOpportunities = computeCrossChainOpportunities()
  } catch (error: any) {
    console.error('[CrossChain] evaluate() error:', error.message)
  }
}

export function startCrossChainEngine(): void {
  if (isStarted) return
  isStarted = true

  setTimeout(() => {
    console.log('[CrossChain] Engine started (delayed 30s)')
    evaluate()
    setInterval(evaluate, 10_000)
  }, 30_000)
}
