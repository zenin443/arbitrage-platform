import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

const SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
  'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'DOGE/USDT', 'MATIC/USDT',
  'NEAR/USDT', 'UNI/USDT', 'ATOM/USDT', 'FTM/USDT', 'APE/USDT',
  'SAND/USDT', 'MANA/USDT', 'LDO/USDT', 'ARB/USDT', 'OP/USDT',
  'SUI/USDT', 'INJ/USDT', 'PEPE/USDT', 'WIF/USDT', 'SHIB/USDT',
  'ORDI/USDT', 'WLD/USDT', 'RENDER/USDT',
]

function toBitMartSymbol(sym: string): string {
  return sym.replace('/', '_')
}

type BitMartData = {
  symbol?: string; best_bid?: string; best_ask?: string
  best_bid_size?: string; best_ask_size?: string
}
type BitMartResponse = { code?: number; data?: BitMartData }

export class BitMartAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.bitmart
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
    const bmSym = toBitMartSymbol(symbol)
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/spot/quotation/v3/ticker?symbol=${bmSym}`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const body = await res.json() as BitMartResponse
      if (body.code !== 1000 || !body.data) return
      const data = body.data
      const bid = parseFloat(data.best_bid ?? '0')
      const ask = parseFloat(data.best_ask ?? '0')
      if (!bid || !ask || isNaN(bid) || isNaN(ask)) return
      const tick: PriceTick = {
        exchangeId: this.config.id,
        symbol,
        bid: parseFloat(bid.toFixed(8)),
        ask: parseFloat(ask.toFixed(8)),
        bidSize: parseFloat(parseFloat(data.best_bid_size ?? '0').toFixed(8)),
        askSize: parseFloat(parseFloat(data.best_ask_size ?? '0').toFixed(8)),
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
