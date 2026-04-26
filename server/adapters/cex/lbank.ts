import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'
import { SYMBOLS } from '../../config/symbols'

const BATCH_SIZE = 25

function toLbankSymbol(sym: string): string {
  return sym.replace('/', '_').toLowerCase()
}

type LbankTicker = { latest?: string; lowestAsk?: string; highestBid?: string }
type LbankEntry = { symbol?: string; ticker?: LbankTicker }
type LbankResponse = { result?: string; data?: LbankEntry[] }

export class LBankAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.lbank
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
        const batch = SYMBOLS.slice(this.pollCursor, this.pollCursor + BATCH_SIZE)
        await Promise.allSettled(batch.map(sym => this.fetchAndEmit(sym)))
        this.pollCursor = (this.pollCursor + BATCH_SIZE) % SYMBOLS.length
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
    const lbSym = toLbankSymbol(symbol)
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(
        `${this.config.restUrl}/v2/ticker/24hr.do?symbol=${lbSym}`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const body = await res.json() as LbankResponse
      if (body.result !== 'true' || !body.data?.length) return
      const entry = body.data[0]
      const ticker = entry?.ticker
      if (!ticker) return

      // LBank v2 provides lowestAsk/highestBid or falls back to latest price
      const bid = parseFloat(ticker.highestBid ?? ticker.latest ?? '0')
      const ask = parseFloat(ticker.lowestAsk ?? ticker.latest ?? '0')
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
