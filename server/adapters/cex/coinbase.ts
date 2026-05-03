import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'
import { SYMBOLS } from '../../config/symbols'

// Coinbase Exchange uses USD pairs only (BTC-USD, ETH-USD, etc.).
// It contributes to USDT-quoted pairs (Coinbase USD ≈ USDT for arb purposes)
// and USDC-quoted pairs (Coinbase USD = USDC on Coinbase).
//
// IMPORTANT: Coinbase must NOT emit ticks for BTC-quoted or ETH-quoted cross-pairs
// (e.g. ETH/BTC, SOL/BTC). Coinbase has no native ETH-BTC product — it would query
// ETH-USD and emit ~$3000 for a pair whose price should be ~0.03 BTC, completely
// corrupting the gap detector for those symbols.
//
// Rule: only subscribe to symbols whose quote is USDT, USDC, or a USD-equivalent.
const USD_COMPATIBLE_QUOTES = new Set(['USDT', 'USDC', 'USDB', 'USD'])

function isUsdCompatible(sym: string): boolean {
  const quote = sym.split('/')[1] ?? ''
  return USD_COMPATIBLE_QUOTES.has(quote)
}

// Coinbase-specific overrides for symbols with non-standard ticker names
const CB_OVERRIDE: Record<string, string> = {
  'RENDER/USDT': 'RNDR-USD',
  'RENDER/USDC': 'RNDR-USD',
}

function toCoinbaseProduct(sym: string): string {
  if (CB_OVERRIDE[sym]) return CB_OVERRIDE[sym]
  // Map BASE/USDT and BASE/USDC → BASE-USD (Coinbase quotes everything in USD/USDC)
  return `${sym.split('/')[0]}-USD`
}

// Only include USD-compatible symbols in the Coinbase polling loop.
// BTC cross-pairs (ETH/BTC, SOL/BTC, ...) and ETH cross-pairs are excluded.
const CB_SYMBOLS = SYMBOLS.filter(isUsdCompatible)
const SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  CB_SYMBOLS.map(s => [s, toCoinbaseProduct(s)])
)

const BATCH_SIZE = 25 // poll 25 symbols per 5s cycle

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
    const batch = CB_SYMBOLS.slice(this.pollCursor, this.pollCursor + BATCH_SIZE)
    await Promise.allSettled(batch.map(sym => this.fetchAndEmit(sym)))
    this.pollCursor = (this.pollCursor + BATCH_SIZE) % CB_SYMBOLS.length
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
