import { tickStore } from './tickStore'
import { futuresTickStore } from './futuresTickStore'
import { SpotFuturesOpportunity } from '../adapters/futures/baseFutures'

// Normalized symbols matched across spot and futures stores
const TRACKED_FUTURES_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ADA/USDT', 'ARB/USDT',
]

const TRADE_SIZE = 1000        // USD notional per estimate
const PERIODS_PER_YEAR = 365 * 3  // 8h funding periods in a year
const MIN_YIELD_PERCENT = 5    // minimum combined annualized yield to include

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
      // Use mid-price for spot
      const spotPrice = (spotTick.bid + spotTick.ask) / 2
      if (!spotPrice || isNaN(spotPrice)) continue

      for (const futuresTick of futuresTicks) {
        const futuresPrice = futuresTick.markPrice
        if (!futuresPrice || isNaN(futuresPrice)) continue

        const priceDiff = futuresPrice - spotPrice
        const priceDiffPercent = (priceDiff / spotPrice) * 100
        const fundingRate = futuresTick.fundingRate
        const fundingRateAnnualized = fundingRate * 3 * 365 * 100

        let combinedYieldAnnualized: number
        let strategy: SpotFuturesOpportunity['strategy']

        if (futuresPrice >= spotPrice) {
          // Contango: buy spot, short futures; collect positive funding if rate > 0
          strategy = 'long_spot_short_futures'
          const priceDiffAnnualized = annualizePercent(Math.abs(priceDiffPercent))
          combinedYieldAnnualized = priceDiffAnnualized + fundingRateAnnualized
        } else {
          // Backwardation: short spot, long futures; net of funding cost
          strategy = 'short_spot_long_futures'
          const priceDiffAnnualized = annualizePercent(Math.abs(priceDiffPercent))
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
