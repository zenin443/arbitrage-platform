import { DexPrice } from '../adapters/dex/base'

export class DexTickStore {
  private store = new Map<string, DexPrice>()

  private key(dexId: string, symbol: string): string {
    return `${dexId}:${symbol}`
  }

  upsert(price: DexPrice): void {
    this.store.set(this.key(price.dexId, price.symbol), {
      ...price,
      timestamp: Date.now(),
    })
  }

  getAll(): DexPrice[] {
    return Array.from(this.store.values())
  }

  /**
   * Returns only entries whose stored timestamp is within maxAgeMs of now.
   * Use this in calculators to avoid acting on stale DEX prices.
   */
  getFresh(maxAgeMs: number): DexPrice[] {
    const cutoff = Date.now() - maxAgeMs
    return Array.from(this.store.values()).filter(p => p.timestamp >= cutoff)
  }

  getBySymbol(symbol: string): DexPrice[] {
    return this.getAll().filter(p => p.symbol === symbol)
  }

  getByChain(chain: string): DexPrice[] {
    return this.getAll().filter(p => p.chain === chain)
  }

  getByDex(dexId: string): DexPrice[] {
    return this.getAll().filter(p => p.dexId === dexId)
  }

  getPrice(dexId: string, symbol: string): DexPrice | undefined {
    return this.store.get(this.key(dexId, symbol))
  }

  getStats(): { total: number; byDex: Record<string, number>; byChain: Record<string, number> } {
    const byDex: Record<string, number> = {}
    const byChain: Record<string, number> = {}

    for (const price of this.store.values()) {
      byDex[price.dexId]     = (byDex[price.dexId]     ?? 0) + 1
      byChain[price.chain]   = (byChain[price.chain]   ?? 0) + 1
    }

    return { total: this.store.size, byDex, byChain }
  }
}

export const dexTickStore = new DexTickStore()
