import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'
import { SYMBOLS } from '../../config/symbols'

// CoinW bulk fetch: all tickers in one call (btc_usdt format); filter against master list

function toCoinWKey(sym: string): string {
  return sym.replace('/', '_').toLowerCase()
}

type CoinWTick = {
  last?: string; lowestAsk?: string; highestBid?: string; percentChange?: string
}
type CoinWResponse = {
  code?: number | string
  data?: Record<string, CoinWTick>
  result?: Record<string, CoinWTick>
}

export class CoinWAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.coinw
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
        await this.delay(10_000)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        this.error(`poll error: ${msg}`)
        await this.delay(backoffMs)
        backoffMs = Math.min(backoffMs * 2, 30_000)
      }
    }
  }

  private async doPoll(): Promise<void> {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/api/v1/public?command=returnTicker`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const body = await res.json() as CoinWResponse
      const tickerMap = body.data ?? body.result
      if (!tickerMap || typeof tickerMap !== 'object') return

      for (const sym of SYMBOLS) {
        const key = toCoinWKey(sym)
        const entry = tickerMap[key]
        if (!entry) continue
        const bid = parseFloat(entry.highestBid ?? entry.last ?? '0')
        const ask = parseFloat(entry.lowestAsk ?? entry.last ?? '0')
        if (!bid || !ask || isNaN(bid) || isNaN(ask)) continue
        const tick: PriceTick = {
          exchangeId: this.config.id,
          symbol: sym,
          bid: parseFloat(bid.toFixed(8)),
          ask: parseFloat(ask.toFixed(8)),
          bidSize: 0,
          askSize: 0,
          timestamp: Date.now(),
          source: 'rest',
        }
        this.lastTicks.set(sym, tick)
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
