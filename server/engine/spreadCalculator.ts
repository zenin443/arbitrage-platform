import { PriceTick } from '../adapters/cex/base'
import { EXCHANGE_REGISTRY } from '../registry/exchangeRegistry'
import { TickStore } from './tickStore'

export interface ArbitrageOpportunity {
  id: string
  symbol: string
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  grossSpread: number
  netSpread: number
  estimatedProfit: number    // based on $1000 trade
  liquidityScore: number     // 0–100
  confidence: 'high' | 'medium' | 'low'
  bestNetwork: string
  withdrawFee: number
  transferTimeMinutes: number
  detectedAt: number
  strategy: 'cex_cex_spot' | 'spot_futures' | 'funding_rate' | 'cex_dex' | 'dex_dex'
}

const TRADE_SIZE_USD = 1000
const MIN_NET_SPREAD_PCT = 0.05

/** Minutes per network for transfer time estimates */
const NETWORK_TRANSFER_TIMES: Record<string, number> = {
  BTC:   60,
  ERC20: 15,
  TRC20: 5,
  BEP20: 5,
  SOL:   1,
  XRP:   1,
  ARB:   2,
  OP:    2,
  DOGE:  10,
  ADA:   5,
  AVAX:  2,
  ATOM:  1,
  NEAR:  1,
  APT:   1,
  BASE:  2,
}

function estimateTransferTime(network: string): number {
  return NETWORK_TRANSFER_TIMES[network] ?? 30
}

/**
 * Finds the common network between two exchanges for a given coin
 * that has the lowest withdrawal fee on the buy exchange.
 */
function findBestNetwork(
  buyExchangeId: string,
  sellExchangeId: string,
  coin: string
): { network: string; fee: number; timeMinutes: number } | null {
  const buyExchange = EXCHANGE_REGISTRY[buyExchangeId]
  const sellExchange = EXCHANGE_REGISTRY[sellExchangeId]
  if (!buyExchange || !sellExchange) return null

  const buyCoinFees = buyExchange.withdrawalFees[coin]
  if (!buyCoinFees) return null

  const buyNetworks = Object.keys(buyCoinFees)
  const sellNetworks = sellExchange.supportedNetworks

  const common = buyNetworks.filter(n => sellNetworks.includes(n))
  if (common.length === 0) return null

  let bestNetwork = ''
  let bestFee = Infinity
  for (const network of common) {
    const fee = buyCoinFees[network] ?? Infinity
    if (fee < bestFee) {
      bestFee = fee
      bestNetwork = network
    }
  }

  return {
    network: bestNetwork,
    fee: bestFee,
    timeMinutes: estimateTransferTime(bestNetwork),
  }
}

/** Extracts base coin from a symbol like "BTC/USDT" → "BTC" */
function baseCoin(symbol: string): string {
  return symbol.split('/')[0] ?? symbol
}

/** Scores liquidity 0–100 based on available volume at best bid/ask */
function liquidityScore(buyTick: PriceTick, sellTick: PriceTick): number {
  const cap = 100_000
  const buyDepth = Math.min((buyTick.askSize ?? 0) * buyTick.ask, cap) / cap
  const sellDepth = Math.min((sellTick.bidSize ?? 0) * sellTick.bid, cap) / cap
  return Math.round((buyDepth + sellDepth) * 50)
}

export function calculateSpread(
  buyTick: PriceTick,
  sellTick: PriceTick
): ArbitrageOpportunity | null {
  if (buyTick.exchangeId === sellTick.exchangeId) return null
  if (buyTick.ask <= 0 || sellTick.bid <= 0) return null

  const grossSpread = ((sellTick.bid - buyTick.ask) / buyTick.ask) * 100
  if (grossSpread <= 0) return null

  const buyExchange = EXCHANGE_REGISTRY[buyTick.exchangeId]
  const sellExchange = EXCHANGE_REGISTRY[sellTick.exchangeId]
  if (!buyExchange || !sellExchange) return null

  const buyFee = buyExchange.takerFee * 100
  const sellFee = sellExchange.takerFee * 100

  const coin = baseCoin(buyTick.symbol)
  const networkResult = findBestNetwork(buyTick.exchangeId, sellTick.exchangeId, coin)

  let withdrawFee = 0
  let withdrawFeePercent = 0
  let bestNetwork = ''
  let transferTimeMinutes = 30

  if (networkResult) {
    withdrawFee = networkResult.fee
    withdrawFeePercent = (withdrawFee / TRADE_SIZE_USD) * 100
    bestNetwork = networkResult.network
    transferTimeMinutes = networkResult.timeMinutes
  }

  const netSpread = grossSpread - buyFee - sellFee - withdrawFeePercent
  if (Math.random() < 0.01) console.log(`[SPREAD] ${buyTick.symbol} ${buyTick.exchangeId}→${sellTick.exchangeId} gross=${grossSpread.toFixed(4)}% net=${netSpread.toFixed(4)}%`)
  if (netSpread < MIN_NET_SPREAD_PCT) return null

  const estimatedProfit = (netSpread / 100) * TRADE_SIZE_USD
  const liq = liquidityScore(buyTick, sellTick)

  return {
    id: `${buyTick.exchangeId}-${sellTick.exchangeId}-${buyTick.symbol}-${Date.now()}`,
    symbol: buyTick.symbol,
    buyExchange: buyTick.exchangeId,
    sellExchange: sellTick.exchangeId,
    buyPrice: buyTick.ask,
    sellPrice: sellTick.bid,
    grossSpread: parseFloat(grossSpread.toFixed(4)),
    netSpread: parseFloat(netSpread.toFixed(4)),
    estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
    liquidityScore: liq,
    confidence: 'low',
    bestNetwork,
    withdrawFee,
    transferTimeMinutes,
    detectedAt: Date.now(),
    strategy: 'cex_cex_spot',
  }
}

export function calculateAllSpreads(store: TickStore): ArbitrageOpportunity[] {
  const allTicks = store.getAll()

  // Group ticks by symbol
  const bySymbol = new Map<string, PriceTick[]>()
  for (const tick of allTicks) {
    const arr = bySymbol.get(tick.symbol) ?? []
    arr.push(tick)
    bySymbol.set(tick.symbol, arr)
  }

  const opportunities: ArbitrageOpportunity[] = []
  type RawSpread = { label: string; gross: number; net: number }
  const rawSpreads: RawSpread[] = []

  for (const ticks of bySymbol.values()) {
    if (ticks.length < 2) continue

    // Compare every unique pair (N × (N-1) / 2 combinations, both directions)
    for (let i = 0; i < ticks.length; i++) {
      for (let j = i + 1; j < ticks.length; j++) {
        const a = ticks[i]!
        const b = ticks[j]!

        for (const [buy, sell] of [[a, b], [b, a]] as [PriceTick, PriceTick][]) {
          if (buy.ask > 0 && sell.bid > 0) {
            const gross = ((sell.bid - buy.ask) / buy.ask) * 100
            if (gross > 0) {
              const buyEx = EXCHANGE_REGISTRY[buy.exchangeId]
              const sellEx = EXCHANGE_REGISTRY[sell.exchangeId]
              if (buyEx && sellEx) {
                const net = gross - buyEx.takerFee * 100 - sellEx.takerFee * 100
                rawSpreads.push({ label: `${buy.symbol} ${buy.exchangeId}→${sell.exchangeId}`, gross, net })
              }
            }
          }
        }

        const oppAB = calculateSpread(a, b)  // buy on A, sell on B
        if (oppAB) opportunities.push(oppAB)

        const oppBA = calculateSpread(b, a)  // buy on B, sell on A
        if (oppBA) opportunities.push(oppBA)
      }
    }
  }

  // Log top 3 raw spreads for diagnostics, including those below the threshold
  rawSpreads.sort((x, y) => y.gross - x.gross)
  for (const s of rawSpreads.slice(0, 3)) {
    console.log(`[SPREAD] ${s.label} gross=${s.gross.toFixed(3)}% net=${s.net.toFixed(3)}%`)
  }

  return opportunities
}
