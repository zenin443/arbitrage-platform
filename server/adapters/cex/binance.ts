import WebSocket from 'ws'
import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

const SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT', 'DOGE/USDT',
]

const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT',
  BNBUSDT: 'BNB/USDT', XRPUSDT: 'XRP/USDT', ADAUSDT: 'ADA/USDT',
  AVAXUSDT: 'AVAX/USDT', DOTUSDT: 'DOT/USDT', LINKUSDT: 'LINK/USDT',
  DOGEUSDT: 'DOGE/USDT',
}

type BinanceBookTickerMsg = {
  s?: string; b?: string; B?: string; a?: string; A?: string
  data?: BinanceBookTickerMsg
}

type BinanceNetworkEntry = {
  network: string; depositEnable: boolean; withdrawEnable: boolean
  withdrawFee: string; withdrawMin: string
}

type BinanceDepthResponse = { bids: [string, string][]; asks: [string, string][] }

export class BinanceAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.binance
  private ws: WebSocket | null = null
  private active = false
  private backoffMs = 2000
  private onTick: ((tick: PriceTick) => void) | null = null
  private lastTicks = new Map<string, PriceTick>()
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
    this.ws = new WebSocket(this.config.wsUrl ?? 'wss://stream.binance.com:9443/ws')

    this.ws.on('open', () => {
      this.log('WebSocket connected')
      this.backoffMs = 2000
      const params = SYMBOLS.map(s => `${s.replace('/', '').toLowerCase()}@bookTicker`)
      this.ws?.send(JSON.stringify({ method: 'SUBSCRIBE', params, id: 1 }))
    })

    this.ws.on('message', (raw: WebSocket.RawData) => {
      const text = raw.toString()
      try {
        this.handleMessage(JSON.parse(text) as BinanceBookTickerMsg)
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

  private handleMessage(msg: BinanceBookTickerMsg): void {
    const data = msg.data ?? msg
    const rawSym = data.s
    if (!rawSym) return
    const symbol = SYMBOL_MAP[rawSym]
    if (!symbol) return
    const bid = parseFloat(data.b ?? '0')
    const ask = parseFloat(data.a ?? '0')
    if (!bid || !ask || isNaN(bid) || isNaN(ask)) return
    const tick: PriceTick = {
      exchangeId: this.config.id,
      symbol,
      bid: parseFloat(bid.toFixed(8)),
      ask: parseFloat(ask.toFixed(8)),
      bidSize: parseFloat(parseFloat(data.B ?? '0').toFixed(8)),
      askSize: parseFloat(parseFloat(data.A ?? '0').toFixed(8)),
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
    const raw = symbol.replace('/', '').toUpperCase()
    const res = await fetch(`${this.config.restUrl}/api/v3/ticker/bookTicker?symbol=${raw}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { s: string; b: string; B: string; a: string; A: string }
    return {
      exchangeId: this.config.id, symbol,
      bid: parseFloat(parseFloat(data.b).toFixed(8)),
      ask: parseFloat(parseFloat(data.a).toFixed(8)),
      bidSize: parseFloat(parseFloat(data.B).toFixed(8)),
      askSize: parseFloat(parseFloat(data.A).toFixed(8)),
      timestamp: Date.now(), source: 'rest',
    }
  }

  async fetchNetworkStatus(coin: string): Promise<NetworkStatus[]> {
    try {
      const res = await fetch(`${this.config.restUrl}/sapi/v1/capital/config/getall`)
      if (!res.ok) return []
      const list = await res.json() as Array<{ coin: string; networkList: BinanceNetworkEntry[] }>
      const entry = list.find(c => c.coin === coin)
      if (!entry) return []
      return entry.networkList.map(n => ({
        network: n.network,
        depositEnabled: n.depositEnable,
        withdrawEnabled: n.withdrawEnable,
        withdrawFee: parseFloat(parseFloat(n.withdrawFee).toFixed(8)),
        minWithdraw: parseFloat(parseFloat(n.withdrawMin).toFixed(8)),
        estimatedTime: 30,
      }))
    } catch (err: unknown) {
      this.error(`fetchNetworkStatus: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  async fetchOrderbookDepth(
    symbol: string, limit = 20
  ): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    try {
      const raw = symbol.replace('/', '').toUpperCase()
      const res = await fetch(`${this.config.restUrl}/api/v3/depth?symbol=${raw}&limit=${limit}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as BinanceDepthResponse
      return {
        bids: data.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
        asks: data.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
      }
    } catch (err: unknown) {
      this.error(`fetchOrderbookDepth: ${err instanceof Error ? err.message : String(err)}`)
      return { bids: [], asks: [] }
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
