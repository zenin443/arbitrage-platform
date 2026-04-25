import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

// WhiteBit bulk fetch returns all tickers at once (BTC_USDT format)
const SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'DOGE/USDT',
  'MATIC/USDT', 'NEAR/USDT', 'UNI/USDT', 'ATOM/USDT', 'FTM/USDT',
  'APE/USDT', 'SAND/USDT', 'MANA/USDT', 'LDO/USDT', 'ARB/USDT',
  'OP/USDT', 'SUI/USDT', 'INJ/USDT', 'PEPE/USDT', 'WIF/USDT',
  'BONK/USDT', 'SHIB/USDT', 'ORDI/USDT', 'WLD/USDT', 'RENDER/USDT',
]

function toWhiteBitKey(sym: string): string {
  return sym.replace('/', '_')
}

type WhiteBitEntry = { bid?: string; ask?: string; quote_volume?: string }
type WhiteBitResponse = Record<string, WhiteBitEntry>

export class WhiteBitAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.whitebit
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
      const res = await fetch(`${this.config.restUrl}/api/v4/public/ticker`, { signal: controller.signal })
      if (!res.ok) return
      const data = await res.json() as WhiteBitResponse
      for (const sym of SYMBOLS) {
        const key = toWhiteBitKey(sym)
        const entry = data[key]
        if (!entry) continue
        const bid = parseFloat(entry.bid ?? '0')
        const ask = parseFloat(entry.ask ?? '0')
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
