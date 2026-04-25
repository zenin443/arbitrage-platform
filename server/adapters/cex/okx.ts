import WebSocket from 'ws'
import { BaseExchangeAdapter, ExchangeConfig, PriceTick, NetworkStatus } from './base'
import { EXCHANGE_REGISTRY } from '../../registry/exchangeRegistry'

const SYMBOLS = [
  // Tier 1 — Majors
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  // Tier 2 — Large caps
  'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'DOGE/USDT',
  // Tier 3 — Mid caps
  'MATIC/USDT', 'NEAR/USDT', 'UNI/USDT', 'ATOM/USDT', 'FTM/USDT',
  'APE/USDT', 'SAND/USDT', 'MANA/USDT', 'LDO/USDT', 'ARB/USDT',
  'OP/USDT', 'SUI/USDT', 'SEI/USDT', 'INJ/USDT', 'TIA/USDT',
  // Tier 4 — Small caps / memes
  'PEPE/USDT', 'WIF/USDT', 'BONK/USDT', 'FLOKI/USDT', 'SHIB/USDT',
  '1000SATS/USDT', 'ORDI/USDT', 'WLD/USDT', 'JUP/USDT', 'RENDER/USDT',
]

function toOkxId(sym: string): string {
  return sym.replace('/', '-')
}

function fromOkxId(instId: string): string {
  return instId.replace('-', '/')
}

type OkxTickerData = {
  instId?: string; bidPx?: string; bidSz?: string; askPx?: string; askSz?: string
}

type OkxTickerMsg = {
  event?: string
  arg?: { channel?: string; instId?: string }
  data?: OkxTickerData[]
}

type OkxCurrencyChain = {
  chain: string; canDep: boolean; canWd: boolean; minFee: string; minWd: string
}

type OkxOrderbookResponse = {
  code: string
  data: Array<{ bids: [string, string, string, string][]; asks: [string, string, string, string][] }>
}

export class OkxAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.okx
  private ws: WebSocket | null = null
  private active = false
  private backoffMs = 2000
  private onTick: ((tick: PriceTick) => void) | null = null
  private lastTicks = new Map<string, PriceTick>()
  private statusTimer: ReturnType<typeof setInterval> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
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
    this.ws = new WebSocket(this.config.wsUrl ?? 'wss://ws.okx.com:8443/ws/v5/public')

    this.ws.on('open', () => {
      this.log('WebSocket connected')
      this.backoffMs = 2000
      const args = SYMBOLS.map(s => ({ channel: 'tickers', instId: toOkxId(s) }))
      this.ws?.send(JSON.stringify({ op: 'subscribe', args }))
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('ping')
        }
      }, 25_000)
    })

    this.ws.on('message', (raw: WebSocket.RawData) => {
      const text = raw.toString()
      if (text === 'pong') return
      try {
        this.handleMessage(JSON.parse(text) as OkxTickerMsg)
      } catch { /* ignore parse errors */ }
    })

    this.ws.on('error', (err: Error) => this.error(`WS error: ${err.message}`))

    this.ws.on('close', () => {
      if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
      if (!this.active) return
      this.log(`WS closed — reconnecting in ${this.backoffMs}ms`)
      setTimeout(() => this.openSocket(), this.backoffMs)
      this.backoffMs = Math.min(this.backoffMs * 2, 30_000)
    })
  }

  private handleMessage(msg: OkxTickerMsg): void {
    if (msg.event) return
    if (msg.arg?.channel !== 'tickers') return
    const ticks = msg.data
    if (!ticks?.length) return
    for (const t of ticks) {
      if (!t.instId) continue
      const symbol = fromOkxId(t.instId)
      const bid = parseFloat(t.bidPx ?? '0')
      const ask = parseFloat(t.askPx ?? '0')
      if (!bid || !ask || isNaN(bid) || isNaN(ask)) continue
      const tick: PriceTick = {
        exchangeId: this.config.id,
        symbol,
        bid: parseFloat(bid.toFixed(8)),
        ask: parseFloat(ask.toFixed(8)),
        bidSize: parseFloat(parseFloat(t.bidSz ?? '0').toFixed(8)),
        askSize: parseFloat(parseFloat(t.askSz ?? '0').toFixed(8)),
        timestamp: Date.now(),
        source: 'ws',
      }
      this.lastTicks.set(symbol, tick)
      this.onTick?.(tick)
      this.tickCount++
    }
  }

  disconnect(): void {
    this.active = false
    if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null }
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
    this.ws?.close()
    this.ws = null
    this.log('disconnected')
  }

  async fetchTicker(symbol: string): Promise<PriceTick> {
    const cached = this.lastTicks.get(symbol)
    if (cached) return cached
    const instId = toOkxId(symbol)
    const res = await fetch(`${this.config.restUrl}/api/v5/market/ticker?instId=${instId}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json() as {
      data: Array<{ bidPx: string; bidSz: string; askPx: string; askSz: string; ts: string }>
    }
    const t = body.data[0]
    if (!t) throw new Error(`No ticker data for ${symbol}`)
    return {
      exchangeId: this.config.id, symbol,
      bid: parseFloat(parseFloat(t.bidPx).toFixed(8)),
      ask: parseFloat(parseFloat(t.askPx).toFixed(8)),
      bidSize: parseFloat(parseFloat(t.bidSz).toFixed(8)),
      askSize: parseFloat(parseFloat(t.askSz).toFixed(8)),
      timestamp: parseInt(t.ts, 10), source: 'rest',
    }
  }

  async fetchNetworkStatus(coin: string): Promise<NetworkStatus[]> {
    try {
      const res = await fetch(`${this.config.restUrl}/api/v5/asset/currencies?ccy=${coin}`)
      if (!res.ok) return []
      const body = await res.json() as { data: Array<{ ccy: string; chain: string; chains: OkxCurrencyChain[] }> }
      return body.data.flatMap(item =>
        (item.chains ?? []).map(c => ({
          network: c.chain,
          depositEnabled: c.canDep,
          withdrawEnabled: c.canWd,
          withdrawFee: parseFloat(parseFloat(c.minFee).toFixed(8)),
          minWithdraw: parseFloat(parseFloat(c.minWd).toFixed(8)),
          estimatedTime: 30,
        }))
      )
    } catch (err: unknown) {
      this.error(`fetchNetworkStatus: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  async fetchOrderbookDepth(
    symbol: string, limit = 20
  ): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    try {
      const instId = toOkxId(symbol)
      const res = await fetch(
        `${this.config.restUrl}/api/v5/market/books?instId=${instId}&sz=${limit}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as OkxOrderbookResponse
      const ob = data.data[0]
      if (!ob) return { bids: [], asks: [] }
      return {
        bids: ob.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
        asks: ob.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
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
