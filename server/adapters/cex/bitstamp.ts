import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

// Bitstamp: lowercase, no separator (btcusd)
const SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT': 'btcusd', 'ETH/USDT': 'ethusd', 'SOL/USDT': 'solusd',
  'XRP/USDT': 'xrpusd', 'ADA/USDT': 'adausd', 'AVAX/USDT': 'avaxusd',
  'LINK/USDT': 'linkusd', 'DOT/USDT': 'dotusd', 'DOGE/USDT': 'dogeusd',
  'MATIC/USDT': 'maticusd', 'NEAR/USDT': 'nearusd', 'UNI/USDT': 'uniusd',
  'ATOM/USDT': 'atomusd', 'LDO/USDT': 'ldousd', 'ARB/USDT': 'arbusd',
  'OP/USDT': 'opusd', 'INJ/USDT': 'injusd', 'PEPE/USDT': 'pepeusd',
  'SHIB/USDT': 'shibusd',
}

const SYMBOLS = Object.keys(SYMBOL_MAP)

type BitstampTicker = { ask?: string; bid?: string }

export class BitstampAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.bitstamp
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
    const bsSym = SYMBOL_MAP[symbol]
    if (!bsSym) return
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/api/v2/ticker/${bsSym}/`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const data = await res.json() as BitstampTicker
      const bid = parseFloat(data.bid ?? '0')
      const ask = parseFloat(data.ask ?? '0')
      if (!bid || !ask || isNaN(bid) || isNaN(ask)) return
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
