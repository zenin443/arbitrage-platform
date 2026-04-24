import { FuturesTick } from '../adapters/futures/baseFutures'

export class FuturesTickStore {
  private store = new Map<string, FuturesTick>()

  private key(exchangeId: string, symbol: string): string {
    return `${exchangeId}:${symbol}`
  }

  upsert(tick: FuturesTick): void {
    this.store.set(this.key(tick.exchangeId, tick.symbol), {
      ...tick,
      timestamp: Date.now(),
    })
  }

  getAll(): FuturesTick[] {
    return Array.from(this.store.values())
  }

  getBySymbol(symbol: string): FuturesTick[] {
    return this.getAll().filter(t => t.symbol === symbol)
  }

  getTick(exchangeId: string, symbol: string): FuturesTick | undefined {
    return this.store.get(this.key(exchangeId, symbol))
  }

  getStats(): { total: number; byExchange: Record<string, number>; bySymbol: Record<string, number> } {
    const byExchange: Record<string, number> = {}
    const bySymbol: Record<string, number> = {}
    for (const tick of this.store.values()) {
      byExchange[tick.exchangeId] = (byExchange[tick.exchangeId] ?? 0) + 1
      bySymbol[tick.symbol] = (bySymbol[tick.symbol] ?? 0) + 1
    }
    return { total: this.store.size, byExchange, bySymbol }
  }
}

export const futuresTickStore = new FuturesTickStore()
