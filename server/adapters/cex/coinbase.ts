import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'
import { SYMBOLS } from '../../config/symbols'

// Coinbase Exchange uses USD pairs. Map our BTC/USDT → BTC-USD.
// Unsupported symbols return non-200 and are silently skipped.
// A few coins use alternate tickers on Coinbase.
const CB_OVERRIDE: Record<string, string> = {
  'RENDER/USDT': 'RNDR-USD',
}
function toCoinbaseProduct(sym: string): string {
  if (CB_OVERRIDE[sym]) return CB_OVERRIDE[sym]
  return `${sym.split('/')[0]}-USD`
}

const SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  SYMBOLS.map(s => [s, toCoinbaseProduct(s)])
)

const BATCH_SIZE = 25 // poll 25 symbols per 5s cycle → all 90 covered in ~18s

type CoinbaseTicker = { ask: string; bid: string }

export class CoinbaseAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.coinbase
  private active = false
  private connected = false
  private onTick: ((tick: PriceTick) => void) | null = null
  private lastTicks = new Map<string, PriceTick>()
  private tickCount = 0
  private statusTimer: ReturnType<typeof setInterval> | null = null
  private pollCursor = 0

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
    const batch = SYMBOLS.slice(this.pollCursor, this.pollCursor + BATCH_SIZE)
    await Promise.allSettled(batch.map(sym => this.fetchAndEmit(sym)))
    this.pollCursor = (this.pollCursor + BATCH_SIZE) % SYMBOLS.length
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
