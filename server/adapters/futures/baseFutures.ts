export interface FuturesTick {
  exchangeId: string
  symbol: string          // e.g. "BTC/USDT" (perp)
  markPrice: number       // mark price
  indexPrice: number      // index price
  fundingRate: number     // current funding rate (e.g. 0.0001 = 0.01%)
  nextFundingTime: number // unix ms
  openInterest: number    // in USD
  timestamp: number
}

export interface FundingRateData {
  exchangeId: string
  symbol: string
  fundingRate: number
  fundingRateAnnualized: number  // fundingRate * 3 * 365 * 100 (as %)
  nextFundingTime: number
  predictedRate: number
  timestamp: number
}

export interface SpotFuturesOpportunity {
  id: string
  symbol: string
  spotExchange: string
  futuresExchange: string
  spotPrice: number
  futuresPrice: number
  priceDiff: number        // futures - spot
  priceDiffPercent: number // (futures - spot) / spot * 100
  fundingRate: number      // current 8h funding rate
  fundingRateAnnualized: number
  combinedYieldAnnualized: number  // price diff annualized + funding rate annualized
  strategy: 'long_spot_short_futures' | 'short_spot_long_futures'
  estimatedProfit8h: number  // profit per $1000 per 8h period
  confidence: 'high' | 'medium' | 'low'
  detectedAt: number
}

export abstract class BaseFuturesAdapter {
  abstract exchangeId: string
  abstract connect(onTick: (tick: FuturesTick) => void): Promise<void>
  abstract disconnect(): void
  abstract fetchFundingRate(symbol: string): Promise<FundingRateData>
  abstract isConnected(): boolean

  log(message: string): void {
    console.log(`[${this.exchangeId.toUpperCase()}-FUTURES] ${message}`)
  }

  error(message: string): void {
    console.error(`[${this.exchangeId.toUpperCase()}-FUTURES] ERROR: ${message}`)
  }
}
