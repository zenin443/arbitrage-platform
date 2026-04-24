import { BaseFuturesAdapter, FundingRateData } from '../adapters/futures/baseFutures'

const TRACKED_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ADA/USDT', 'ARB/USDT',
]

const FETCH_INTERVAL_MS = 60_000

export class FundingRateTracker {
  private cache = new Map<string, FundingRateData[]>()  // keyed by symbol
  private adapters: BaseFuturesAdapter[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  registerAdapters(adapters: BaseFuturesAdapter[]): void {
    this.adapters = adapters
  }

  start(): void {
    if (this.timer) return
    void this.fetchAll()
    this.timer = setInterval(() => void this.fetchAll(), FETCH_INTERVAL_MS)
    console.log('[FundingRateTracker] Started — polling every 60s')
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    console.log('[FundingRateTracker] Stopped')
  }

  private async fetchAll(): Promise<void> {
    for (const adapter of this.adapters) {
      if (!adapter.isConnected()) continue
      for (const symbol of TRACKED_SYMBOLS) {
        try {
          const data = await adapter.fetchFundingRate(symbol)
          const existing = this.cache.get(symbol) ?? []
          // Replace entry for this exchange
          const filtered = existing.filter(d => d.exchangeId !== adapter.exchangeId)
          this.cache.set(symbol, [...filtered, data])
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn(`[FundingRateTracker] ${adapter.exchangeId}/${symbol}: ${msg}`)
        }
      }
    }
  }

  getBySymbol(symbol: string): FundingRateData[] {
    return this.cache.get(symbol) ?? []
  }

  getAll(): FundingRateData[] {
    return Array.from(this.cache.values()).flat()
  }

  getBestFundingRates(): FundingRateData[] {
    return this.getAll().sort(
      (a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate)
    )
  }
}

export const fundingRateTracker = new FundingRateTracker()
