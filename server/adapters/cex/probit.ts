import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'
import { SYMBOLS } from '../../config/symbols'

function toProbitMarket(sym: string): string {
  return sym.replace('/', '-')
}

type ProbitTick = {
  market_id?: string; best_bid?: string; best_ask?: string; last?: string
}
type ProbitResponse = { data?: ProbitTick[] }

export class ProbitAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.probit
  private active = false
  private connected = false
  private onTick: ((tick: PriceTick) => void) | null = null
  private lastTicks = new Map<string, PriceTick>()
  private tickCount = 0
  private statusTimer: ReturnType<typeof setInterval> | null = null

  async connect(onTick: (tick: PriceTick) => void): Promise<void> {
    this.onTick = onTick
    this.active = true
    this.connected = true
    this.statusTimer = setInterval(() => {
      this.log(`ticks=${this.tickCount}`)
    }, 30_000)
    void this.pollLoop()
  }

  private async pollLoop(): Promise<void> {
    let backoffMs = 2000
    while (this.active) {
      try {
        await this.doPoll()
        backoffMs = 2000
        await this.delay(5_000)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        this.error(`poll error: ${msg}`)
        await this.delay(backoffMs)
        backoffMs = Math.min(backoffMs * 2, 30_000)
      }
    }
  }

  private async doPoll(): Promise<void> {
    // ProBit supports batch ticker fetch
    const marketIds = SYMBOLS.map(toProbitMarket).join(',')
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/api/exchange/v1/ticker?market_ids=${marketIds}`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const body = await res.json() as ProbitResponse
      if (!body.data) return
      for (const item of body.data) {
        const marketId = item.market_id
        if (!marketId) continue
        const symbol = marketId.replace('-', '/')
        if (!SYMBOLS.includes(symbol)) continue
        const bid = parseFloat(item.best_bid ?? '0')
        const ask = parseFloat(item.best_ask ?? '0')
        if (!bid || !ask || isNaN(bid) || isNaN(ask)) continue
        const tick: PriceTick = {
          exchangeId: this.config.id,
          symbol,
          bid: parseFloat(bid.toFixed(8)),
          ask: parseFloat(ask.toFixed(8)),
          bidSize: 0,
          askSize: 0,
          timestamp: Date.now(),
          source: 'rest',
        }
        this.lastTicks.set(symbol, tick)
        this.onTick?.(tick)
        this.tickCount++
      }
    } finally {
      clearTimeout(t)
    }
  }

  disconnect(): void {
    this.active = false
    this.connected = false
    if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null }
    this.log('disconnected')
  }

  async fetchTicker(symbol: string): Promise<PriceTick> {
    const cached = this.lastTicks.get(symbol)
    if (cached) return cached
    throw new Error(`${this.config.id}: no cached data for ${symbol}`)
  }

  async fetchNetworkStatus(_coin: string): Promise<NetworkStatus[]> { return [] }

  async fetchOrderbookDepth(
    _symbol: string, _limit?: number
  ): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    return { bids: [], asks: [] }
  }

  isConnected(): boolean { return this.connected && this.active }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
