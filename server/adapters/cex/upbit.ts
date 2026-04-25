import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

// Upbit: quote-base reversed with dash (USDT-BTC). No separate bid/ask — uses trade_price.
const SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT': 'USDT-BTC', 'ETH/USDT': 'USDT-ETH', 'SOL/USDT': 'USDT-SOL',
  'XRP/USDT': 'USDT-XRP', 'ADA/USDT': 'USDT-ADA', 'AVAX/USDT': 'USDT-AVAX',
  'LINK/USDT': 'USDT-LINK', 'DOT/USDT': 'USDT-DOT', 'DOGE/USDT': 'USDT-DOGE',
  'MATIC/USDT': 'USDT-MATIC', 'NEAR/USDT': 'USDT-NEAR', 'UNI/USDT': 'USDT-UNI',
  'ATOM/USDT': 'USDT-ATOM', 'SUI/USDT': 'USDT-SUI', 'INJ/USDT': 'USDT-INJ',
  'PEPE/USDT': 'USDT-PEPE', 'SHIB/USDT': 'USDT-SHIB',
}

const UPBIT_MARKETS = Object.values(SYMBOL_MAP)
const REVERSE_MAP = Object.fromEntries(
  Object.entries(SYMBOL_MAP).map(([norm, upbit]) => [upbit, norm])
)

type UpbitTicker = {
  market: string
  trade_price: number
  ask_price?: number
  bid_price?: number
}

export class UpbitAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.upbit
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
    const markets = UPBIT_MARKETS.join(',')
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/v1/ticker?markets=${markets}`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const list = await res.json() as UpbitTicker[]
      for (const item of list) {
        const symbol = REVERSE_MAP[item.market]
        if (!symbol) continue
        const price = item.trade_price
        const bid = item.bid_price ?? price
        const ask = item.ask_price ?? price
        if (!price || isNaN(price)) continue
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
