import WebSocket from 'ws'
import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

// Bitfinex uses "t" prefix + no separator: tBTCUSD
const SYMBOL_MAP: Record<string, string> = {
  'tBTCUSD':  'BTC/USDT',  'tETHUSD':  'ETH/USDT',  'tSOLUSD':  'SOL/USDT',
  'tXRPUSD':  'XRP/USDT',  'tADAUSD':  'ADA/USDT',  'tAVAXUSD': 'AVAX/USDT',
  'tLINKUSD': 'LINK/USDT', 'tDOTUSD':  'DOT/USDT',  'tDOGEUSD': 'DOGE/USDT',
  'tMATICUSD':'MATIC/USDT','tNEARUSD': 'NEAR/USDT', 'tUNIUSD':  'UNI/USDT',
  'tATOMUSD': 'ATOM/USDT', 'tFTMUSD':  'FTM/USDT',  'tSANDUSD': 'SAND/USDT',
  'tMANAUSD': 'MANA/USDT', 'tARBUSD':  'ARB/USDT',  'tOPUSD':   'OP/USDT',
  'tSUIUSD':  'SUI/USDT',  'tINJUSD':  'INJ/USDT',  'tSHIBUSD': 'SHIB/USDT',
  'tPEPEUSD': 'PEPE/USDT', 'tWLDUSD':  'WLD/USDT',  'tRNDRUSD': 'RENDER/USDT',
}

const BFX_SYMBOLS = Object.keys(SYMBOL_MAP)

type BfxMsg = unknown[]

export class BitfinexAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.bitfinex
  private ws: WebSocket | null = null
  private active = false
  private backoffMs = 2000
  private onTick: ((tick: PriceTick) => void) | null = null
  private lastTicks = new Map<string, PriceTick>()
  private channelMap = new Map<number, string>() // chanId → normalized symbol
  private statusTimer: ReturnType<typeof setInterval> | null = null
  private tickCount = 0

  async connect(onTick: (tick: PriceTick) => void): Promise<void> {
    this.onTick = onTick
    this.active = true
    this.backoffMs = 2000
    this.statusTimer = setInterval(() => {
      this.log(`connected=${this.isConnected()} ticks=${this.tickCount}`)
    }, 30_000)
    this.openSocket()
  }

  private openSocket(): void {
    this.channelMap.clear()
    this.ws = new WebSocket(this.config.wsUrl ?? 'wss://api-pub.bitfinex.com/ws/2')

    this.ws.on('open', () => {
      this.log('WebSocket connected')
      this.backoffMs = 2000
      for (const sym of BFX_SYMBOLS) {
        this.ws?.send(JSON.stringify({ event: 'subscribe', channel: 'ticker', symbol: sym }))
      }
    })

    this.ws.on('message', (raw: WebSocket.RawData) => {
      const text = raw.toString()
      try {
        const msg = JSON.parse(text) as Record<string, unknown> | BfxMsg
        this.handleMessage(msg)
      } catch { /* ignore parse errors */ }
    })

    this.ws.on('error', (err: Error) => this.error(`WS error: ${err.message}`))

    this.ws.on('close', () => {
      if (!this.active) return
      this.log(`WS closed — reconnecting in ${this.backoffMs}ms`)
      setTimeout(() => this.openSocket(), this.backoffMs)
      this.backoffMs = Math.min(this.backoffMs * 2, 30_000)
    })
  }

  private handleMessage(msg: Record<string, unknown> | BfxMsg): void {
    // Event messages (subscribe confirmations, info)
    if (!Array.isArray(msg)) {
      if (msg['event'] === 'subscribed' && msg['channel'] === 'ticker') {
        const chanId = msg['chanId'] as number
        const bfxSym = msg['symbol'] as string
        const normalized = SYMBOL_MAP[bfxSym]
        if (chanId && normalized) this.channelMap.set(chanId, normalized)
      }
      return
    }

    // Array messages: [chanId, data] or [chanId, "hb"]
    const [chanId, payload] = msg as [number, unknown]
    if (payload === 'hb') return
    const symbol = this.channelMap.get(chanId)
    if (!symbol || !Array.isArray(payload)) return

    // Ticker format: [bid, bidSize, ask, askSize, dailyChange, ...]
    const [bid, bidSize, ask, askSize] = payload as number[]
    if (!bid || !ask || isNaN(bid) || isNaN(ask)) return
    const tick: PriceTick = {
      exchangeId: this.config.id,
      symbol,
      bid: parseFloat(bid.toFixed(8)),
      ask: parseFloat(ask.toFixed(8)),
      bidSize: parseFloat((Math.abs(bidSize ?? 0)).toFixed(8)),
      askSize: parseFloat((Math.abs(askSize ?? 0)).toFixed(8)),
      timestamp: Date.now(),
      source: 'ws',
    }
    this.lastTicks.set(symbol, tick)
    this.onTick?.(tick)
    this.tickCount++
  }

  disconnect(): void {
    this.active = false
    if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null }
    this.ws?.close()
    this.ws = null
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

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
