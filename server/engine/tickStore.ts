import { PriceTick } from '../adapters/cex/base'

export class TickStore {
  private store = new Map<string, PriceTick>()
  private pruneTimer: ReturnType<typeof setInterval>

  constructor() {
    this.pruneTimer = setInterval(() => {
      const removed = this.pruneStale(10_000)
      if (removed > 0) {
        console.log(`[TickStore] Pruned ${removed} stale tick(s)`)
      }
    }, 30_000)
  }

  private key(exchangeId: string, symbol: string): string {
    return `${exchangeId}:${symbol}`
  }

  upsert(tick: PriceTick): void {
    this.store.set(this.key(tick.exchangeId, tick.symbol), {
      ...tick,
      timestamp: Date.now(),
    })
  }

  getAll(): PriceTick[] {
    return Array.from(this.store.values())
  }

  getBySymbol(symbol: string): PriceTick[] {
    return this.getAll().filter(t => t.symbol === symbol)
  }

  getByExchange(exchangeId: string): PriceTick[] {
    return this.getAll().filter(t => t.exchangeId === exchangeId)
  }

  getTick(exchangeId: string, symbol: string): PriceTick | undefined {
    return this.store.get(this.key(exchangeId, symbol))
  }

  pruneStale(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs
    let removed = 0
    for (const [key, tick] of this.store) {
      if (tick.timestamp < cutoff) {
        this.store.delete(key)
        removed++
      }
    }
    return removed
  }

  getStats(): {
    total: number
    byExchange: Record<string, number>
    bySymbol: Record<string, number>
  } {
    const byExchange: Record<string, number> = {}
    const bySymbol: Record<string, number> = {}
    for (const tick of this.store.values()) {
      byExchange[tick.exchangeId] = (byExchange[tick.exchangeId] ?? 0) + 1
      bySymbol[tick.symbol] = (bySymbol[tick.symbol] ?? 0) + 1
    }
    return { total: this.store.size, byExchange, bySymbol }
  }

  destroy(): void {
    clearInterval(this.pruneTimer)
  }
}

export const tickStore = new TickStore()
