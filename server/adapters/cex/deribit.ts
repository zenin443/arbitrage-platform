import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'
import { SYMBOLS } from '../../config/symbols'

// Deribit: perpetual futures used as spot price proxy.
// Not all coins have USDT-settled perps on Deribit; unsupported instruments are silently skipped.
const SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT':   'BTC_USDC-PERPETUAL',
  'ETH/USDT':   'ETH_USDC-PERPETUAL',
  'SOL/USDT':   'SOL_USDC-PERPETUAL',
  'XRP/USDT':   'XRP_USDC-PERPETUAL',
  'ADA/USDT':   'ADA_USDC-PERPETUAL',
  'AVAX/USDT':  'AVAX_USDC-PERPETUAL',
  'LINK/USDT':  'LINK_USDC-PERPETUAL',
  'DOT/USDT':   'DOT_USDC-PERPETUAL',
  'DOGE/USDT':  'DOGE_USDC-PERPETUAL',
  'NEAR/USDT':  'NEAR_USDC-PERPETUAL',
  'MATIC/USDT': 'MATIC_USDC-PERPETUAL',
  'INJ/USDT':   'INJ_USDC-PERPETUAL',
  'BNB/USDT':   'BNB_USDC-PERPETUAL',
  'TRX/USDT':   'TRX_USDC-PERPETUAL',
  'UNI/USDT':   'UNI_USDC-PERPETUAL',
  'ARB/USDT':   'ARB_USDC-PERPETUAL',
  'OP/USDT':    'OP_USDC-PERPETUAL',
  'SUI/USDT':   'SUI_USDC-PERPETUAL',
  'APT/USDT':   'APT_USDC-PERPETUAL',
  'ATOM/USDT':  'ATOM_USDC-PERPETUAL',
  'LTC/USDT':   'LTC_USDC-PERPETUAL',
  'PEPE/USDT':  'PEPE_USDC-PERPETUAL',
  'WIF/USDT':   'WIF_USDC-PERPETUAL',
  'WLD/USDT':   'WLD_USDC-PERPETUAL',
  'SHIB/USDT':  'SHIB_USDC-PERPETUAL',
  'ORDI/USDT':  'ORDI_USDC-PERPETUAL',
  'RENDER/USDT':'RENDER_USDC-PERPETUAL',
  'TIA/USDT':   'TIA_USDC-PERPETUAL',
  'SEI/USDT':   'SEI_USDC-PERPETUAL',
  'FTM/USDT':   'FTM_USDC-PERPETUAL',
}

const DERIBIT_SYMBOLS = Object.keys(SYMBOL_MAP)
const BATCH_SIZE = 15 // Deribit is a derivatives exchange; be conservative with rate limits

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
        const batch = DERIBIT_SYMBOLS.slice(this.pollCursor, this.pollCursor + BATCH_SIZE)
        await Promise.allSettled(batch.map(sym => this.fetchAndEmit(sym)))
        this.pollCursor = (this.pollCursor + BATCH_SIZE) % DERIBIT_SYMBOLS.length
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
