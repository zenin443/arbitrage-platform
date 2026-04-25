import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

// Deribit: perpetual futures used as spot price proxy
const SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT':  'BTC-PERPETUAL',
  'ETH/USDT':  'ETH-PERPETUAL',
  'SOL/USDT':  'SOL-PERPETUAL',
  'XRP/USDT':  'XRP-PERPETUAL',
  'ADA/USDT':  'ADA-PERPETUAL',
  'AVAX/USDT': 'AVAX-PERPETUAL',
  'LINK/USDT': 'LINK-PERPETUAL',
  'DOT/USDT':  'DOT-PERPETUAL',
  'DOGE/USDT': 'DOGE-PERPETUAL',
  'NEAR/USDT': 'NEAR-PERPETUAL',
  'MATIC/USDT':'MATIC-PERPETUAL',
  'INJ/USDT':  'INJ-PERPETUAL',
}

const SYMBOLS = Object.keys(SYMBOL_MAP)

type DeribitResult = {
  best_bid_price?: number; best_ask_price?: number
  best_bid_amount?: number; best_ask_amount?: number
}
type DeribitResponse = { result?: DeribitResult }

export class DeribitAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.deribit
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
        await Promise.allSettled(SYMBOLS.map(sym => this.fetchAndEmit(sym)))
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

  private async fetchAndEmit(symbol: string): Promise<void> {
    const instrument = SYMBOL_MAP[symbol]
    if (!instrument) return
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/api/v2/public/ticker?instrument_name=${instrument}`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const body = await res.json() as DeribitResponse
      const r = body.result
      if (!r) return
      const bid = r.best_bid_price ?? 0
      const ask = r.best_ask_price ?? 0
      if (!bid || !ask || isNaN(bid) || isNaN(ask)) return
      const tick: PriceTick = {
        exchangeId: this.config.id,
        symbol,
        bid: parseFloat(bid.toFixed(8)),
        ask: parseFloat(ask.toFixed(8)),
        bidSize: parseFloat((r.best_bid_amount ?? 0).toFixed(8)),
        askSize: parseFloat((r.best_ask_amount ?? 0).toFixed(8)),
        timestamp: Date.now(),
        source: 'rest',
      }
      this.lastTicks.set(symbol, tick)
      this.onTick?.(tick)
      this.tickCount++
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
    await this.fetchAndEmit(symbol)
    const tick = this.lastTicks.get(symbol)
    if (!tick) throw new Error(`${this.config.id}: no data for ${symbol}`)
    return tick
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
