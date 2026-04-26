import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import type { Exchange as CcxtExchange } from 'ccxt'
import { SYMBOLS } from '../../config/symbols'

const DEFAULT_SYMBOLS = SYMBOLS

type CcxtNetworkInfo = {
  deposit?: boolean
  withdraw?: boolean
  fee?: number
  limits?: { withdraw?: { min?: number } }
}

export class CcxtAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig
  private exchange: CcxtExchange
  private symbols: string[]
  private active = false
  private tickCount = 0
  private lastSuccessTs = 0
  private backoffMs = 2000
  private onTick: ((tick: PriceTick) => void) | null = null
  private statusTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: ExchangeConfig, exchange: CcxtExchange, symbols = DEFAULT_SYMBOLS) {
    super()
    this.config = config
    this.exchange = exchange
    this.symbols = symbols
  }

  async connect(onTick: (tick: PriceTick) => void): Promise<void> {
    this.onTick = onTick
    this.active = true
    this.backoffMs = 2000

    try {
      await this.exchange.loadMarkets()
      this.log(`Markets loaded: ${Object.keys(this.exchange.markets).length} pairs`)
    } catch (e) {
      this.log('Could not load markets, will skip symbol validation')
    }

    this.log('REST polling started')
    this.statusTimer = setInterval(() => {
      this.log(`connected=${this.isConnected()} ticks=${this.tickCount}`)
    }, 30_000)
    void this.pollLoop()
  }

  disconnect(): void {
    this.active = false
    if (this.statusTimer) {
      clearInterval(this.statusTimer)
      this.statusTimer = null
    }
    this.log('disconnected')
  }

  private async pollLoop(): Promise<void> {
    while (this.active) {
      await this.doPoll()
    }
  }

  private async doPoll(): Promise<void> {
    try {
      const availableSymbols = this.symbols.filter(s =>
        !this.exchange.markets || this.exchange.markets[s]
      )
      const results = await Promise.allSettled(
        availableSymbols.map(sym => this.fetchOneTicker(sym))
      )
      let hits = 0
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          this.onTick?.(r.value)
          this.tickCount++
          hits++
        }
      }
      if (hits > 0) {
        this.lastSuccessTs = Date.now()
        this.backoffMs = 2000
      }
      await this.delay(2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        this.error('rate limited — pausing 5s')
        await this.delay(5000)
      } else {
        this.error(`poll error: ${msg} — retrying in ${this.backoffMs}ms`)
        await this.delay(this.backoffMs)
        this.backoffMs = Math.min(this.backoffMs * 2, 30_000)
      }
    }
  }

  private async fetchOneTicker(symbol: string): Promise<PriceTick | null> {
    if (this.exchange.markets && !(symbol in this.exchange.markets)) {
      return null
    }
    try {
      const t = await this.exchange.fetchTicker(symbol)
      const bid = t.bid ?? 0
      const ask = t.ask ?? 0
      if (bid === 0 && ask === 0) return null
      return {
        exchangeId: this.config.id,
        symbol,
        bid: parseFloat(bid.toFixed(8)),
        ask: parseFloat(ask.toFixed(8)),
        bidSize: parseFloat((t.bidVolume ?? 0).toFixed(8)),
        askSize: parseFloat((t.askVolume ?? 0).toFixed(8)),
        timestamp: t.timestamp ?? Date.now(),
        source: 'rest',
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Suppress "does not have market symbol" noise — symbol was already filtered
      // by loadMarkets() but can still slip through if markets failed to load
      if (!msg.toLowerCase().includes('does not have market symbol')) {
        this.error(`${symbol}: ${msg}`)
      }
      return null
    }
  }

  async fetchTicker(symbol: string): Promise<PriceTick> {
    const tick = await this.fetchOneTicker(symbol)
    if (!tick) throw new Error(`${this.config.id}: failed to fetch ${symbol}`)
    return tick
  }

  async fetchNetworkStatus(coin: string): Promise<NetworkStatus[]> {
    try {
      const currencies = await this.exchange.fetchCurrencies()
      const coinData = currencies?.[coin]
      if (!coinData) return []
      const networks = (coinData.networks ?? {}) as Record<string, CcxtNetworkInfo>
      return Object.entries(networks).map(([network, n]) => ({
        network,
        depositEnabled: n.deposit ?? false,
        withdrawEnabled: n.withdraw ?? false,
        withdrawFee: parseFloat((n.fee ?? 0).toFixed(8)),
        minWithdraw: parseFloat(((n.limits?.withdraw?.min) ?? 0).toFixed(8)),
        estimatedTime: 30,
      }))
    } catch (err: unknown) {
      this.error(`fetchNetworkStatus: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  async fetchOrderbookDepth(
    symbol: string,
    limit = 20
  ): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    try {
      const ob = await this.exchange.fetchOrderBook(symbol, limit)
      return {
        bids: ob.bids.slice(0, limit) as [number, number][],
        asks: ob.asks.slice(0, limit) as [number, number][],
      }
    } catch (err: unknown) {
      this.error(`fetchOrderbookDepth: ${err instanceof Error ? err.message : String(err)}`)
      return { bids: [], asks: [] }
    }
  }

  isConnected(): boolean {
    return this.active && Date.now() - this.lastSuccessTs < 10_000
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
