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

const SYMBOL_MAP: Record<string, string> = {
  // Tier 1
  BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT',
  BNBUSDT: 'BNB/USDT', XRPUSDT: 'XRP/USDT',
  // Tier 2
  ADAUSDT: 'ADA/USDT', AVAXUSDT: 'AVAX/USDT', LINKUSDT: 'LINK/USDT',
  DOTUSDT: 'DOT/USDT', DOGEUSDT: 'DOGE/USDT',
  // Tier 3
  MATICUSDT: 'MATIC/USDT', NEARUSDT: 'NEAR/USDT', UNIUSDT: 'UNI/USDT',
  ATOMUSDT: 'ATOM/USDT', FTMUSDT: 'FTM/USDT', APEUSDT: 'APE/USDT',
  SANDUSDT: 'SAND/USDT', MANAUSDT: 'MANA/USDT', LDOUSDT: 'LDO/USDT',
  ARBUSDT: 'ARB/USDT', OPUSDT: 'OP/USDT', SUIUSDT: 'SUI/USDT',
  SEIUSDT: 'SEI/USDT', INJUSDT: 'INJ/USDT', TIAUSDT: 'TIA/USDT',
  // Tier 4
  PEPEUSDT: 'PEPE/USDT', WIFUSDT: 'WIF/USDT', BONKUSDT: 'BONK/USDT',
  FLOKIUSDT: 'FLOKI/USDT', SHIBUSDT: 'SHIB/USDT', '1000SATSUSDT': '1000SATS/USDT',
  ORDIUSDT: 'ORDI/USDT', WLDUSDT: 'WLD/USDT', JUPUSDT: 'JUP/USDT',
  RENDERUSDT: 'RENDER/USDT',
}

type BybitTickerData = {
  symbol?: string; bid1Price?: string; bid1Size?: string
  ask1Price?: string; ask1Size?: string
}

type BybitTickerMsg = { topic?: string; data?: BybitTickerData }

type BybitOrderbookResponse = {
  retCode: number
  result: { b: [string, string][]; a: [string, string][] }
}

export class BybitAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.bybit
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
    this.ws = new WebSocket(this.config.wsUrl ?? 'wss://stream.bybit.com/v5/public/spot')

    this.ws.on('open', () => {
      this.log('WebSocket connected')
      this.backoffMs = 2000
      const args = SYMBOLS.map(s => `tickers.${s.replace('/', '')}`)
      this.ws?.send(JSON.stringify({ op: 'subscribe', args }))
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ op: 'ping' }))
        }
      }, 20_000)
    })

    this.ws.on('message', (raw: WebSocket.RawData) => {
      try {
        this.handleMessage(JSON.parse(raw.toString()) as BybitTickerMsg)
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

  private handleMessage(msg: BybitTickerMsg): void {
    if (!msg.topic?.startsWith('tickers.')) return
    const data = msg.data
    if (!data?.symbol) return
    const symbol = SYMBOL_MAP[data.symbol]
    if (!symbol) return
    const bid = parseFloat(data.bid1Price ?? '0')
    const ask = parseFloat(data.ask1Price ?? '0')
    if (!bid || !ask || isNaN(bid) || isNaN(ask)) return
    const tick: PriceTick = {
      exchangeId: this.config.id,
      symbol,
      bid: parseFloat(bid.toFixed(8)),
      ask: parseFloat(ask.toFixed(8)),
      bidSize: parseFloat(parseFloat(data.bid1Size ?? '0').toFixed(8)),
      askSize: parseFloat(parseFloat(data.ask1Size ?? '0').toFixed(8)),
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
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
    this.ws?.close()
    this.ws = null
    this.log('disconnected')
  }

  async fetchTicker(symbol: string): Promise<PriceTick> {
    const cached = this.lastTicks.get(symbol)
    if (cached) return cached
    const raw = symbol.replace('/', '').toUpperCase()
    const res = await fetch(
      `${this.config.restUrl}/v5/market/tickers?category=spot&symbol=${raw}`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json() as {
      result: { list: Array<{ bid1Price: string; bid1Size: string; ask1Price: string; ask1Size: string }> }
    }
    const t = body.result.list[0]
    if (!t) throw new Error(`No ticker data for ${symbol}`)
    return {
      exchangeId: this.config.id, symbol,
      bid: parseFloat(parseFloat(t.bid1Price).toFixed(8)),
      ask: parseFloat(parseFloat(t.ask1Price).toFixed(8)),
      bidSize: parseFloat(parseFloat(t.bid1Size).toFixed(8)),
      askSize: parseFloat(parseFloat(t.ask1Size).toFixed(8)),
      timestamp: Date.now(), source: 'rest',
    }
  }

  async fetchNetworkStatus(coin: string): Promise<NetworkStatus[]> {
    try {
      const res = await fetch(
        `${this.config.restUrl}/v5/asset/coin/query-info?coin=${coin}`
      )
      if (!res.ok) return []
      const body = await res.json() as {
        result: {
          rows: Array<{ chains: Array<{ chain: string; chainDeposit: string; chainWithdraw: string; withdrawFee: string; minWithdrawAmount: string }> }>
        }
      }
      const row = body.result.rows[0]
      if (!row) return []
      return row.chains.map(c => ({
        network: c.chain,
        depositEnabled: c.chainDeposit === '1',
        withdrawEnabled: c.chainWithdraw === '1',
        withdrawFee: parseFloat(parseFloat(c.withdrawFee).toFixed(8)),
        minWithdraw: parseFloat(parseFloat(c.minWithdrawAmount).toFixed(8)),
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
      const res = await fetch(
        `${this.config.restUrl}/v5/market/orderbook?category=spot&symbol=${raw}&limit=${limit}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as BybitOrderbookResponse
      return {
        bids: data.result.b.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
        asks: data.result.a.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
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
