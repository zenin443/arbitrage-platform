import { tickStore } from './tickStore'
import { futuresTickStore } from './futuresTickStore'
import { SpotFuturesOpportunity } from '../adapters/futures/baseFutures'

const SPOT_MAX_AGE_MS    = 15_000  // spot ticks older than 15s are stale
const FUTURES_MAX_AGE_MS = 30_000  // futures marks older than 30s are stale
const ROUND_TRIP_FEE_PERCENT = 0.2  // 0.10% taker × 2 legs, paid once per trade

// Normalized symbols matched across spot and futures stores
const TRACKED_FUTURES_SYMBOLS = [
  // Tier 1 & 2
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ADA/USDT', 'ARB/USDT',
  // Tier 3
  'MATIC/USDT', 'NEAR/USDT', 'UNI/USDT', 'ATOM/USDT', 'FTM/USDT',
  'OP/USDT', 'SUI/USDT', 'SEI/USDT', 'INJ/USDT', 'TIA/USDT',
  // Tier 4 with perps
  'PEPE/USDT', 'WIF/USDT', 'SHIB/USDT', 'WLD/USDT', 'RENDER/USDT', 'ORDI/USDT',
]

const TRADE_SIZE = 1000        // USD notional per estimate
const PERIODS_PER_YEAR = 365 * 3  // 8h funding periods in a year
const MIN_YIELD_PERCENT = 5    // minimum combined annualized yield to include
const MAX_PRICE_DIFF_PERCENT = 5.0 // reject bad exchange data above this threshold

function annualizePercent(priceDiffPercent: number): number {
  // Annualize an 8h price-difference yield
  return priceDiffPercent * PERIODS_PER_YEAR
}

function buildId(
  symbol: string,
  spotExchange: string,
  futuresExchange: string,
  strategy: string,
): string {
  return `${symbol}:${spotExchange}:${futuresExchange}:${strategy}`
}

export function calculateSpotFuturesOpportunities(): SpotFuturesOpportunity[] {
  const opportunities: SpotFuturesOpportunity[] = []

  for (const symbol of TRACKED_FUTURES_SYMBOLS) {
    const spotTicks = tickStore.getBySymbol(symbol)
    const futuresTicks = futuresTickStore.getBySymbol(symbol)

    if (!spotTicks.length || !futuresTicks.length) continue

    for (const spotTick of spotTicks) {
      // Guard: reject stale spot ticks
      if ((spotTick.timestamp ?? 0) < Date.now() - SPOT_MAX_AGE_MS) continue
      const spotPrice = (spotTick.bid + spotTick.ask) / 2
      if (!spotPrice || isNaN(spotPrice)) continue

      for (const futuresTick of futuresTicks) {
        // Guard: reject stale futures marks
        if ((futuresTick.timestamp ?? 0) < Date.now() - FUTURES_MAX_AGE_MS) continue
        const futuresPrice = futuresTick.markPrice
        if (!futuresPrice || isNaN(futuresPrice)) continue

        const priceDiff = futuresPrice - spotPrice
        const priceDiffPercent = (priceDiff / spotPrice) * 100
        if (Math.abs(priceDiffPercent) > MAX_PRICE_DIFF_PERCENT) continue

        // Subtract round-trip taker fees from the raw basis before annualizing
        const priceDiffNet = Math.abs(priceDiffPercent) - ROUND_TRIP_FEE_PERCENT
        if (priceDiffNet <= 0) continue  // fees exceed basis — not profitable

        const fundingRate = futuresTick.fundingRate
        const fundingRateAnnualized = fundingRate * 3 * 365 * 100

        let combinedYieldAnnualized: number
        let strategy: SpotFuturesOpportunity['strategy']

        if (futuresPrice >= spotPrice) {
          // Contango: buy spot, short futures; collect positive funding if rate > 0
          strategy = 'long_spot_short_futures'
          const priceDiffAnnualized = annualizePercent(priceDiffNet)
          combinedYieldAnnualized = priceDiffAnnualized + fundingRateAnnualized
        } else {
          // Backwardation: short spot, long futures; net of funding cost
          strategy = 'short_spot_long_futures'
          const priceDiffAnnualized = annualizePercent(priceDiffNet)
          combinedYieldAnnualized = priceDiffAnnualized - fundingRateAnnualized
        }

        if (combinedYieldAnnualized <= MIN_YIELD_PERCENT) continue

        // Profit per TRADE_SIZE per 8h period
        const estimatedProfit8h = (combinedYieldAnnualized / 100 / PERIODS_PER_YEAR) * TRADE_SIZE

        let confidence: SpotFuturesOpportunity['confidence']
        if (combinedYieldAnnualized > 20) {
          confidence = 'high'
        } else if (combinedYieldAnnualized > 10) {
          confidence = 'medium'
        } else {
          confidence = 'low'
        }

        opportunities.push({
          id: buildId(symbol, spotTick.exchangeId, futuresTick.exchangeId, strategy),
          symbol,
          spotExchange: spotTick.exchangeId,
          futuresExchange: futuresTick.exchangeId,
          spotPrice: parseFloat(spotPrice.toFixed(8)),
          futuresPrice: parseFloat(futuresPrice.toFixed(8)),
          priceDiff: parseFloat(priceDiff.toFixed(8)),
          priceDiffPercent: parseFloat(priceDiffPercent.toFixed(6)),
          fundingRate,
          fundingRateAnnualized: parseFloat(fundingRateAnnualized.toFixed(4)),
          combinedYieldAnnualized: parseFloat(combinedYieldAnnualized.toFixed(4)),
          strategy,
          estimatedProfit8h: parseFloat(estimatedProfit8h.toFixed(4)),
          confidence,
          detectedAt: Date.now(),
        })
      }
    }
  }

  return opportunities.sort((a, b) => b.combinedYieldAnnualized - a.combinedYieldAnnualized)
}
