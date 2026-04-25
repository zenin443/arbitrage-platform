import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

// Coinbase Exchange uses USD pairs. We map to /USDT for cross-exchange comparison.
const SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT': 'BTC-USD', 'ETH/USDT': 'ETH-USD', 'SOL/USDT': 'SOL-USD',
  'XRP/USDT': 'XRP-USD', 'ADA/USDT': 'ADA-USD', 'AVAX/USDT': 'AVAX-USD',
  'LINK/USDT': 'LINK-USD', 'DOT/USDT': 'DOT-USD', 'DOGE/USDT': 'DOGE-USD',
  'MATIC/USDT': 'MATIC-USD', 'NEAR/USDT': 'NEAR-USD', 'UNI/USDT': 'UNI-USD',
  'ATOM/USDT': 'ATOM-USD', 'APE/USDT': 'APE-USD', 'SAND/USDT': 'SAND-USD',
  'MANA/USDT': 'MANA-USD', 'LDO/USDT': 'LDO-USD', 'ARB/USDT': 'ARB-USD',
  'OP/USDT': 'OP-USD', 'SUI/USDT': 'SUI-USD', 'SEI/USDT': 'SEI-USD',
  'INJ/USDT': 'INJ-USD', 'PEPE/USDT': 'PEPE-USD', 'WIF/USDT': 'WIF-USD',
  'BONK/USDT': 'BONK-USD', 'SHIB/USDT': 'SHIB-USD', 'FLOKI/USDT': 'FLOKI-USD',
  'WLD/USDT': 'WLD-USD', 'RENDER/USDT': 'RENDER-USD',
}

const SYMBOLS = Object.keys(SYMBOL_MAP)

type CoinbaseTicker = { ask: string; bid: string }

export class CoinbaseAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.coinbase
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
        if (msg.includes('429')) {
          this.error('rate limited — pausing 15s')
          await this.delay(15_000)
        } else {
          this.error(`poll error: ${msg}`)
          await this.delay(backoffMs)
          backoffMs = Math.min(backoffMs * 2, 30_000)
        }
      }
    }
  }

  private async doPoll(): Promise<void> {
    await Promise.allSettled(SYMBOLS.map(sym => this.fetchAndEmit(sym)))
  }

  private async fetchAndEmit(symbol: string): Promise<void> {
    const productId = SYMBOL_MAP[symbol]
    if (!productId) return
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/products/${productId}/ticker`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const data = await res.json() as CoinbaseTicker
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
