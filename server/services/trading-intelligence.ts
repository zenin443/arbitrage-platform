import { tickStore } from '../engine/tickStore'
import { calculateSpotFuturesOpportunities } from '../engine/spotFuturesCalculator'
import { calculateCexDexOpportunities } from '../engine/cexDexCalculator'
import { PriceTick } from '../adapters/cex/base'
import { getTriangularRoutes } from '../engines/triangularArbitrage'
import { getCrossChainOpportunities } from '../engines/crossChainArbitrage'
import { getCachedDepthAnalysis, DepthAnalysis } from './orderbook-fetcher'
import { scoredGap } from '../engine/signalScorer'
import { applyQualityGate } from './signalQualityGate'

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ProfitSim {
  at100: number
  at1k: number
  at5k: number
  at10k: number
  breakEvenSpread: number
  isProfitable: boolean
  maxProfitableSize: number
}

export interface GapRecord {
  id: string
  type: 'cex_cex' | 'spot_futures' | 'dex_cex' | 'triangular' | 'cross_chain'
  symbol: string
  /** Quote currency parsed from symbol e.g. "BTC/USDT" → "USDT", "ETH/USDC" → "USDC", "ETH/BTC" → "BTC" */
  quote_currency: string
  buyExchange: string
  sellExchange: string
  spreadPercent: number
  buyPrice: number
  sellPrice: number
  buyBidSize: number
  sellAskSize: number
  maxTradeableUsd: number
  detectedAt: number
  lastSeenAt: number
  durationMs: number
  isActive: boolean
  profitSimulation: ProfitSim
  depthAnalysis: DepthAnalysis | null
  /** Signal scorer output — attached by getProfitableGaps(), absent on raw history entries */
  confidence?: 'high' | 'medium' | 'low'
  isVolatile?: boolean
  isThinVolume?: boolean
}

export interface TradingStats {
  totalGapsDetected: number
  totalGapsLast1h: number
  totalGapsLast24h: number
  profitableGapsCount: number
  profitableGapsPercent: number
  avgSpreadPercent: number
  avgGapDurationMs: number
  bestSpreadSeen: GapRecord | null
  totalSimulatedProfit1h: number
  totalSimulatedProfit24h: number
  totalSimulatedProfit1h_10k: number
  totalSimulatedProfit24h_10k: number
  exchangePairRanking: Array<{
    buyExchange: string
    sellExchange: string
    gapCount: number
    avgSpread: number
    totalSimProfit: number
  }>
  symbolRanking: Array<{
    symbol: string
    gapCount: number
    avgSpread: number
    bestSpread: number
  }>
  hourlyDistribution: number[]
  durationBuckets: {
    under5s: number
    under30s: number
    under1m: number
    under5m: number
    over5m: number
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_GAP_HISTORY = 2_000
const EVAL_INTERVAL_MS = 2000
const DEFAULT_TAKER_FEE = 0.001    // fallback only
const MAX_PROFITABLE_CAP = 50_000
const MAX_REASONABLE_SPREAD = 5.0

/** Per-exchange taker fee lookup — mirrors exchangeRegistry for intel calculations */
const INTEL_TAKER_FEES: Record<string, number> = {
  binance:     0.001,
  okx:         0.001,
  bybit:       0.001,
  kucoin:      0.001,
  bitget:      0.001,
  mexc:        0.001,
  gateio:      0.002,
  htx:         0.002,
  bingx:       0.001,
  coinbase:    0.006,
  hyperliquid: 0.0005,
  jupiter:     0.0,
}

function getRoundtripFee(buy: string, sell: string): number {
  return (INTEL_TAKER_FEES[buy] ?? DEFAULT_TAKER_FEE) + (INTEL_TAKER_FEES[sell] ?? DEFAULT_TAKER_FEE)
}

function getBreakEvenSpread(buy: string, sell: string): number {
  return getRoundtripFee(buy, sell) * 100  // convert to %
}

// ── State ─────────────────────────────────────────────────────────────────────

let gapHistory: GapRecord[] = []
const activeGaps = new Map<string, GapRecord>()
let isRunning = false
let lastGapDebugAt = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

function gapKey(type: string, symbol: string, buy: string, sell: string): string {
  return `${type}-${symbol}-${buy}-${sell}`
}

/** Extract quote currency from a symbol string e.g. "BTC/USDT" → "USDT" */
function quoteOf(symbol: string): string {
  return symbol.split('/')[1] ?? 'USDT'
}

function computeProfitSim(
  spreadPercent: number,
  maxTradeableUsd: number,
  buyExchange = 'binance',
  sellExchange = 'binance',
): ProfitSim {
  const SIZES = [100, 1_000, 5_000, 10_000]
  const cap = Math.min(maxTradeableUsd, MAX_PROFITABLE_CAP)
  const roundtripFee = getRoundtripFee(buyExchange, sellExchange)
  const breakEven = getBreakEvenSpread(buyExchange, sellExchange)

  function netAt(size: number): number {
    const effective = Math.min(size, cap)
    if (effective <= 0) return 0
    const gross = effective * (spreadPercent / 100)
    const fees = effective * roundtripFee
    return gross - fees
  }

  return {
    at100: parseFloat(netAt(SIZES[0]!).toFixed(4)),
    at1k: parseFloat(netAt(SIZES[1]!).toFixed(4)),
    at5k: parseFloat(netAt(SIZES[2]!).toFixed(4)),
    at10k: parseFloat(netAt(SIZES[3]!).toFixed(4)),
    breakEvenSpread: parseFloat(breakEven.toFixed(4)),
    isProfitable: spreadPercent > breakEven,
    maxProfitableSize: cap,
  }
}

function enrichProfitSim(base: ProfitSim, depth: DepthAnalysis): ProfitSim {
  const at1kPoint = depth.profitCurve.find(p => p.tradeSize === 1_000)
  const at10kPoint = depth.profitCurve.find(p => p.tradeSize === 10_000)
  const at100Point = depth.profitCurve.find(p => p.tradeSize === 100)
  const at5kPoint = depth.profitCurve.find(p => p.tradeSize === 5_000)
  return {
    at100: at100Point !== undefined ? parseFloat(at100Point.netProfit.toFixed(4)) : base.at100,
    at1k: at1kPoint !== undefined ? parseFloat(at1kPoint.netProfit.toFixed(4)) : base.at1k,
    at5k: at5kPoint !== undefined ? parseFloat(at5kPoint.netProfit.toFixed(4)) : base.at5k,
    at10k: at10kPoint !== undefined ? parseFloat(at10kPoint.netProfit.toFixed(4)) : base.at10k,
    breakEvenSpread: base.breakEvenSpread,
    isProfitable: depth.profitCurve.some(p => p.netProfit > 0),
    maxProfitableSize: depth.profitableSize,
  }
}

// ── CEX-CEX gap detection ─────────────────────────────────────────────────────

function evaluateCexCex(now: number): void {
  const allTicks = tickStore.getAll()

  // Group by symbol
  const bySymbol = new Map<string, PriceTick[]>()
  for (const tick of allTicks) {
    const arr = bySymbol.get(tick.symbol) ?? []
    arr.push(tick)
    bySymbol.set(tick.symbol, arr)
  }

  const seenKeys = new Set<string>()

  // Diagnostic logging (throttled): log tick coverage once every 30s for non-USDT pairs
  // so we can verify USDC and BTC data flow without flooding the console.
  const debugNow = now
  const shouldDebug = (debugNow - lastGapDebugAt) >= 30_000

  for (const [symbol, ticks] of bySymbol) {
    if (shouldDebug) {
      const quote = symbol.split('/')[1] ?? ''
      if (quote !== 'USDT') {
        console.log('[GAP-DEBUG]', {
          symbol,
          exchanges_with_ticks: ticks.map(t => t.exchangeId),
          tick_count: ticks.length,
        })
      }
    }

    if (ticks.length < 2) continue

    for (let i = 0; i < ticks.length; i++) {
      for (let j = i + 1; j < ticks.length; j++) {
        const a = ticks[i]!
        const b = ticks[j]!

        for (const [buy, sell] of [[a, b], [b, a]] as [PriceTick, PriceTick][]) {
          if (buy.exchangeId === sell.exchangeId) continue
          if (buy.ask <= 0 || sell.bid <= 0) continue

          const spread = ((sell.bid - buy.ask) / buy.ask) * 100
          if (spread <= 0) continue
          if (spread > MAX_REASONABLE_SPREAD) continue

          const key = gapKey('cex_cex', symbol, buy.exchangeId, sell.exchangeId)
          seenKeys.add(key)

          const buySize = buy.askSize ?? 0
          const sellSize = sell.bidSize ?? 0
          const maxTradeableUsd = Math.min(
            buySize * buy.ask,
            sellSize * sell.bid
          )

          const profitSim = computeProfitSim(spread, maxTradeableUsd, buy.exchangeId, sell.exchangeId)

          const depth = getCachedDepthAnalysis(symbol, buy.exchangeId, sell.exchangeId)
          const effectiveSize = depth ? depth.profitableSize : maxTradeableUsd
          const effectiveProfitSim = depth
            ? enrichProfitSim(profitSim, depth)
            : profitSim

          const existing = activeGaps.get(key)
          if (existing) {
            existing.lastSeenAt = now
            existing.durationMs = now - existing.detectedAt
            existing.spreadPercent = parseFloat(spread.toFixed(4))
            existing.buyPrice = buy.ask
            existing.sellPrice = sell.bid
            existing.buyBidSize = buySize
            existing.sellAskSize = sellSize
            existing.maxTradeableUsd = depth ? effectiveSize : maxTradeableUsd
            existing.profitSimulation = effectiveProfitSim
            existing.depthAnalysis = depth
            existing.isActive = true
          } else {
            const record: GapRecord = {
              id: `${key}-${now}`,
              type: 'cex_cex',
              symbol,
              quote_currency: quoteOf(symbol),
              buyExchange: buy.exchangeId,
              sellExchange: sell.exchangeId,
              spreadPercent: parseFloat(spread.toFixed(4)),
              buyPrice: buy.ask,
              sellPrice: sell.bid,
              buyBidSize: buySize,
              sellAskSize: sellSize,
              maxTradeableUsd: depth ? effectiveSize : maxTradeableUsd,
              detectedAt: now,
              lastSeenAt: now,
              durationMs: 0,
              isActive: true,
              profitSimulation: effectiveProfitSim,
              depthAnalysis: depth,
            }
            activeGaps.set(key, record)
            gapHistory = [record, ...gapHistory].slice(0, MAX_GAP_HISTORY)
          }
        }
      }
    }
  }

  // Mark gaps that disappeared as inactive
  for (const [key, record] of activeGaps) {
    if (record.type === 'cex_cex' && !seenKeys.has(key)) {
      record.isActive = false
      activeGaps.delete(key)
    }
  }

  if (shouldDebug) lastGapDebugAt = debugNow
}

// ── Spot-futures gap detection ────────────────────────────────────────────────

function evaluateSpotFutures(now: number): void {
  try {
    const opps = calculateSpotFuturesOpportunities()
    const seenKeys = new Set<string>()

    for (const opp of opps) {
      const spreadPercent = Math.abs(opp.priceDiffPercent ?? 0)
      if (spreadPercent <= 0) continue
      if (spreadPercent > MAX_REASONABLE_SPREAD) continue

      const key = gapKey('spot_futures', opp.symbol, opp.spotExchange, opp.futuresExchange)
      seenKeys.add(key)

      const maxTradeableUsd = 10_000
      const profitSim = computeProfitSim(spreadPercent, maxTradeableUsd, opp.spotExchange, opp.futuresExchange)

      const existing = activeGaps.get(key)
      if (existing) {
        existing.lastSeenAt = now
        existing.durationMs = now - existing.detectedAt
        existing.spreadPercent = parseFloat(spreadPercent.toFixed(4))
        existing.buyPrice = opp.spotPrice
        existing.sellPrice = opp.futuresPrice
        existing.profitSimulation = profitSim
        existing.isActive = true
      } else {
        const record: GapRecord = {
          id: `${key}-${now}`,
          type: 'spot_futures',
          symbol: opp.symbol,
          quote_currency: quoteOf(opp.symbol),
          buyExchange: opp.spotExchange,
          sellExchange: opp.futuresExchange,
          spreadPercent: parseFloat(spreadPercent.toFixed(4)),
          buyPrice: opp.spotPrice,
          sellPrice: opp.futuresPrice,
          buyBidSize: 0,
          sellAskSize: 0,
          maxTradeableUsd,
          detectedAt: now,
          lastSeenAt: now,
          durationMs: 0,
          isActive: true,
          profitSimulation: profitSim,
          depthAnalysis: null,
        }
        activeGaps.set(key, record)
        gapHistory = [record, ...gapHistory].slice(0, MAX_GAP_HISTORY)
      }
    }

    for (const [key, record] of activeGaps) {
      if (record.type === 'spot_futures' && !seenKeys.has(key)) {
        record.isActive = false
        activeGaps.delete(key)
      }
    }
  } catch {
    // non-fatal
  }
}

// ── CEX-DEX gap detection ─────────────────────────────────────────────────────

function evaluateCexDex(now: number): void {
  try {
    const opps = calculateCexDexOpportunities()
    const seenKeys = new Set<string>()

    for (const opp of opps) {
      const spreadPercent = Math.abs(opp.priceDiffPercent ?? 0)
      if (spreadPercent <= 0) continue
      if (spreadPercent > MAX_REASONABLE_SPREAD) continue

      const buyEx = opp.direction === 'buy_cex_sell_dex' ? opp.cexExchange : opp.dexId
      const sellEx = opp.direction === 'buy_cex_sell_dex' ? opp.dexId : opp.cexExchange
      const buyPrice = opp.direction === 'buy_cex_sell_dex' ? opp.cexPrice : opp.dexPrice
      const sellPrice = opp.direction === 'buy_cex_sell_dex' ? opp.dexPrice : opp.cexPrice

      const key = gapKey('dex_cex', opp.symbol, buyEx, sellEx)
      seenKeys.add(key)

      const maxTradeableUsd = opp.maxTradeSize ?? 5_000
      const profitSim = computeProfitSim(spreadPercent, maxTradeableUsd, buyEx, sellEx)

      const existing = activeGaps.get(key)
      if (existing) {
        existing.lastSeenAt = now
        existing.durationMs = now - existing.detectedAt
        existing.spreadPercent = parseFloat(spreadPercent.toFixed(4))
        existing.buyPrice = buyPrice
        existing.sellPrice = sellPrice
        existing.maxTradeableUsd = maxTradeableUsd
        existing.profitSimulation = profitSim
        existing.isActive = true
      } else {
        const record: GapRecord = {
          id: `${key}-${now}`,
          type: 'dex_cex',
          symbol: opp.symbol,
          quote_currency: quoteOf(opp.symbol),
          buyExchange: buyEx,
          sellExchange: sellEx,
          spreadPercent: parseFloat(spreadPercent.toFixed(4)),
          buyPrice,
          sellPrice,
          buyBidSize: 0,
          sellAskSize: 0,
          maxTradeableUsd,
          detectedAt: now,
          lastSeenAt: now,
          durationMs: 0,
          isActive: true,
          profitSimulation: profitSim,
          depthAnalysis: null,
        }
        activeGaps.set(key, record)
        gapHistory = [record, ...gapHistory].slice(0, MAX_GAP_HISTORY)
      }
    }

    for (const [key, record] of activeGaps) {
      if (record.type === 'dex_cex' && !seenKeys.has(key)) {
        record.isActive = false
        activeGaps.delete(key)
      }
    }
  } catch {
    // non-fatal
  }
}

// ── Triangular gap tracking ───────────────────────────────────────────────────

function evaluateTriangular(now: number): void {
  try {
    const routes = getTriangularRoutes()
    const seenKeys = new Set<string>()

    for (const route of routes) {
      if (route.netProfitPercent <= 0) continue
      if (route.netProfitPercent > MAX_REASONABLE_SPREAD) continue

      const key = gapKey('triangular', route.crossSymbol, route.exchange, route.direction)
      seenKeys.add(key)

      const profitSim = computeProfitSim(route.netProfitPercent, 10_000)

      const existing = activeGaps.get(key)
      if (existing) {
        existing.lastSeenAt = now
        existing.durationMs = now - existing.detectedAt
        existing.spreadPercent = parseFloat(route.netProfitPercent.toFixed(4))
        existing.profitSimulation = profitSim
        existing.isActive = true
      } else {
        const record: GapRecord = {
          id: `${key}-${now}`,
          type: 'triangular',
          symbol: route.crossSymbol,
          quote_currency: quoteOf(route.crossSymbol),
          buyExchange: route.exchange,
          sellExchange: route.exchange,
          spreadPercent: parseFloat(route.netProfitPercent.toFixed(4)),
          buyPrice: route.prices.step1,
          sellPrice: route.prices.step3,
          buyBidSize: 0,
          sellAskSize: 0,
          maxTradeableUsd: 10_000,
          detectedAt: now,
          lastSeenAt: now,
          durationMs: 0,
          isActive: true,
          profitSimulation: profitSim,
          depthAnalysis: null,
        }
        activeGaps.set(key, record)
        gapHistory = [record, ...gapHistory].slice(0, MAX_GAP_HISTORY)
      }
    }

    for (const [key, record] of activeGaps) {
      if (record.type === 'triangular' && !seenKeys.has(key)) {
        record.isActive = false
        activeGaps.delete(key)
      }
    }
  } catch {
    // non-fatal
  }
}

// ── Cross-chain gap tracking ───────────────────────────────────────────────────

function evaluateCrossChain(now: number): void {
  try {
    const opps = getCrossChainOpportunities()
    const seenKeys = new Set<string>()

    for (const opp of opps) {
      if (opp.netProfitPercent <= 0) continue
      if (opp.netProfitPercent > MAX_REASONABLE_SPREAD) continue

      const key = gapKey('cross_chain', opp.symbol, opp.buyChain, opp.sellChain)
      seenKeys.add(key)

      const profitSim = computeProfitSim(opp.netProfitPercent, opp.liquidityUsd || 5_000)

      const existing = activeGaps.get(key)
      if (existing) {
        existing.lastSeenAt = now
        existing.durationMs = now - existing.detectedAt
        existing.spreadPercent = parseFloat(opp.netProfitPercent.toFixed(4))
        existing.buyPrice = opp.buyPrice
        existing.sellPrice = opp.sellPrice
        existing.maxTradeableUsd = opp.liquidityUsd || 5_000
        existing.profitSimulation = profitSim
        existing.isActive = true
      } else {
        const record: GapRecord = {
          id: `${key}-${now}`,
          type: 'cross_chain',
          symbol: opp.symbol,
          quote_currency: quoteOf(opp.symbol),
          buyExchange: opp.buyDex,
          sellExchange: opp.sellDex,
          spreadPercent: parseFloat(opp.netProfitPercent.toFixed(4)),
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          buyBidSize: 0,
          sellAskSize: 0,
          maxTradeableUsd: opp.liquidityUsd || 5_000,
          detectedAt: now,
          lastSeenAt: now,
          durationMs: 0,
          isActive: true,
          profitSimulation: profitSim,
          depthAnalysis: null,
        }
        activeGaps.set(key, record)
        gapHistory = [record, ...gapHistory].slice(0, MAX_GAP_HISTORY)
      }
    }

    for (const [key, record] of activeGaps) {
      if (record.type === 'cross_chain' && !seenKeys.has(key)) {
        record.isActive = false
        activeGaps.delete(key)
      }
    }
  } catch {
    // non-fatal
  }
}

// ── Evaluate cycle ────────────────────────────────────────────────────────────

function evaluate(): void {
  const now = Date.now()
  evaluateCexCex(now)
  evaluateSpotFutures(now)
  evaluateCexDex(now)
  evaluateTriangular(now)
  evaluateCrossChain(now)
}

// ── Stats computation ─────────────────────────────────────────────────────────

export function computeStats(): TradingStats {
  const now = Date.now()
  const h1 = now - 60 * 60 * 1000
  const h24 = now - 24 * 60 * 60 * 1000

  const gaps1h = gapHistory.filter(g => g.detectedAt >= h1)
  const gaps24h = gapHistory.filter(g => g.detectedAt >= h24)

  const profitable = gaps1h.filter(g => g.profitSimulation.isProfitable)

  const avgSpread = gapHistory.length > 0
    ? gapHistory.reduce((s, g) => s + g.spreadPercent, 0) / gapHistory.length
    : 0

  const avgDuration = gapHistory.length > 0
    ? gapHistory.reduce((s, g) => s + g.durationMs, 0) / gapHistory.length
    : 0

  const bestSpread = gapHistory.length > 0
    ? gapHistory.reduce((best, g) => g.spreadPercent > (best?.spreadPercent ?? 0) ? g : best, null as GapRecord | null)
    : null

  const simProfit1h = gaps1h
    .filter(g => g.profitSimulation.isProfitable)
    .reduce((s, g) => s + g.profitSimulation.at1k, 0)

  const simProfit24h = gaps24h
    .filter(g => g.profitSimulation.isProfitable)
    .reduce((s, g) => s + g.profitSimulation.at1k, 0)

  const simProfit1h_10k = gaps1h
    .filter(g => g.profitSimulation.isProfitable)
    .reduce((s, g) => s + g.profitSimulation.at10k, 0)

  const simProfit24h_10k = gaps24h
    .filter(g => g.profitSimulation.isProfitable)
    .reduce((s, g) => s + g.profitSimulation.at10k, 0)

  // Exchange pair ranking
  const pairMap = new Map<string, { buyExchange: string; sellExchange: string; count: number; totalSpread: number; totalProfit: number }>()
  for (const g of gapHistory) {
    const k = `${g.buyExchange}→${g.sellExchange}`
    const existing = pairMap.get(k)
    if (existing) {
      existing.count++
      existing.totalSpread += g.spreadPercent
      existing.totalProfit += g.profitSimulation.at1k
    } else {
      pairMap.set(k, { buyExchange: g.buyExchange, sellExchange: g.sellExchange, count: 1, totalSpread: g.spreadPercent, totalProfit: g.profitSimulation.at1k })
    }
  }

  const exchangePairRanking = Array.from(pairMap.values())
    .map(p => ({
      buyExchange: p.buyExchange,
      sellExchange: p.sellExchange,
      gapCount: p.count,
      avgSpread: parseFloat((p.totalSpread / p.count).toFixed(4)),
      totalSimProfit: parseFloat(p.totalProfit.toFixed(2)),
    }))
    .sort((a, b) => b.totalSimProfit - a.totalSimProfit)
    .slice(0, 10)

  // Symbol ranking
  const symMap = new Map<string, { count: number; totalSpread: number; bestSpread: number }>()
  for (const g of gapHistory) {
    const existing = symMap.get(g.symbol)
    if (existing) {
      existing.count++
      existing.totalSpread += g.spreadPercent
      existing.bestSpread = Math.max(existing.bestSpread, g.spreadPercent)
    } else {
      symMap.set(g.symbol, { count: 1, totalSpread: g.spreadPercent, bestSpread: g.spreadPercent })
    }
  }

  const symbolRanking = Array.from(symMap.entries())
    .map(([symbol, s]) => ({
      symbol,
      gapCount: s.count,
      avgSpread: parseFloat((s.totalSpread / s.count).toFixed(4)),
      bestSpread: parseFloat(s.bestSpread.toFixed(4)),
    }))
    .sort((a, b) => b.gapCount - a.gapCount)
    .slice(0, 10)

  // Hourly distribution (UTC)
  const hourlyDistribution = new Array(24).fill(0) as number[]
  for (const g of gaps24h) {
    const h = new Date(g.detectedAt).getUTCHours()
    hourlyDistribution[h] = (hourlyDistribution[h] ?? 0) + 1
  }

  // Duration buckets
  const durationBuckets = { under5s: 0, under30s: 0, under1m: 0, under5m: 0, over5m: 0 }
  for (const g of gapHistory) {
    const ms = g.durationMs
    if (ms < 5_000) durationBuckets.under5s++
    else if (ms < 30_000) durationBuckets.under30s++
    else if (ms < 60_000) durationBuckets.under1m++
    else if (ms < 300_000) durationBuckets.under5m++
    else durationBuckets.over5m++
  }

  const profitableGapsPercent = gaps1h.length > 0
    ? parseFloat(((profitable.length / gaps1h.length) * 100).toFixed(1))
    : 0

  return {
    totalGapsDetected: gapHistory.length,
    totalGapsLast1h: gaps1h.length,
    totalGapsLast24h: gaps24h.length,
    profitableGapsCount: profitable.length,
    profitableGapsPercent,
    avgSpreadPercent: parseFloat(avgSpread.toFixed(4)),
    avgGapDurationMs: Math.round(avgDuration),
    bestSpreadSeen: bestSpread,
    totalSimulatedProfit1h: parseFloat(simProfit1h.toFixed(2)),
    totalSimulatedProfit24h: parseFloat(simProfit24h.toFixed(2)),
    totalSimulatedProfit1h_10k: parseFloat(simProfit1h_10k.toFixed(2)),
    totalSimulatedProfit24h_10k: parseFloat(simProfit24h_10k.toFixed(2)),
    exchangePairRanking,
    symbolRanking,
    hourlyDistribution,
    durationBuckets,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getActiveGaps(): GapRecord[] {
  return Array.from(activeGaps.values()).sort((a, b) => b.spreadPercent - a.spreadPercent)
}

export function getGapHistory(limit = 100): GapRecord[] {
  return gapHistory.slice(0, Math.min(limit, gapHistory.length))
}

export function getTradingStats(): TradingStats {
  return computeStats()
}

/**
 * Returns ALL active price gaps sorted by profitability then spread.
 * Includes sub-break-even gaps so every quote currency (USDT, USDC, BTC)
 * shows live data in the UI. Check gap.profitSimulation.isProfitable for
 * true profitability after fees.
 *
 * Phase C: each gap is passed through the signal scorer so that
 * confidence / isVolatile / isThinVolume are populated for the UI.
 * Signals are NOT filtered here — low-confidence signals remain visible;
 * filtering is left to the client.
 */
export function getProfitableGaps(): GapRecord[] {
  const sorted = Array.from(activeGaps.values())
    .filter(g => g.spreadPercent > 0)
    .sort((a, b) => {
      // Profitable gaps always rank above non-profitable ones
      if (a.profitSimulation.isProfitable !== b.profitSimulation.isProfitable) {
        return a.profitSimulation.isProfitable ? -1 : 1
      }
      // Within same bucket: sort by simulated $1k profit (desc), then by raw spread
      const profitDiff = b.profitSimulation.at1k - a.profitSimulation.at1k
      if (profitDiff !== 0) return profitDiff
      return b.spreadPercent - a.spreadPercent
    })

  const gated = applyQualityGate(sorted)

  return gated.map(gap => {
    try {
      const scored = scoredGap(gap, 1000)
      return {
        ...gap,
        confidence:   scored.signalScore.confidence,
        isVolatile:   scored.signalScore.isVolatile,
        isThinVolume: scored.signalScore.isThinVolume,
      }
    } catch {
      return gap
    }
  })
}

export function startTradingIntelligence(): void {
  if (isRunning) return
  isRunning = true
  setInterval(evaluate, EVAL_INTERVAL_MS)
  console.log('[TradingIntelligence] Started — evaluating every 2s')
}
