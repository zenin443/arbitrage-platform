import WebSocket from 'ws'
import { BaseFuturesAdapter, FuturesTick, FundingRateData } from './baseFutures'

const TRACKED_FUTURES_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'ADAUSDT', 'ARBUSDT',
]

const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT',
  BNBUSDT: 'BNB/USDT', XRPUSDT: 'XRP/USDT', DOGEUSDT: 'DOGE/USDT',
  AVAXUSDT: 'AVAX/USDT', LINKUSDT: 'LINK/USDT', ADAUSDT: 'ADA/USDT',
  ARBUSDT: 'ARB/USDT',
}

const BYBIT_LINEAR_WS = 'wss://stream.bybit.com/v5/public/linear'
const BYBIT_REST_URL = 'https://api.bybit.com'

type BybitTickerData = {
  symbol?: string
  markPrice?: string
  indexPrice?: string
  fundingRate?: string
  nextFundingTime?: string
  openInterest?: string
}

type BybitMsg = {
  op?: string
  topic?: string
  data?: BybitTickerData
  ret_msg?: string
}

type BybitFundingHistoryResponse = {
  retCode: number
  result: {
    list: Array<{
      symbol: string
      fundingRate: string
      fundingRateTimestamp: string
    }>
  }
}

export class BybitFuturesAdapter extends BaseFuturesAdapter {
  exchangeId = 'bybit'
  private ws: WebSocket | null = null
  private active = false
  private backoffMs = 2000
  private onTickCb: ((tick: FuturesTick) => void) | null = null
  private statusTimer: ReturnType<typeof setInterval> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private tickCount = 0

  async connect(onTick: (tick: FuturesTick) => void): Promise<void> {
    this.onTickCb = onTick
    this.active = true
    this.backoffMs = 2000
    this.statusTimer = setInterval(() => {
      this.log(`connected=${this.isConnected()} ticks=${this.tickCount}`)
    }, 30_000)
    this.openSocket()
  }

  private openSocket(): void {
    this.ws = new WebSocket(BYBIT_LINEAR_WS)

    this.ws.on('open', () => {
      this.log('WebSocket connected')
      this.backoffMs = 2000
      const args = TRACKED_FUTURES_SYMBOLS.map(s => `tickers.${s}`)
      this.ws?.send(JSON.stringify({ op: 'subscribe', args }))
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ op: 'ping' }))
        }
      }, 20_000)
    })

    this.ws.on('message', (raw: WebSocket.RawData) => {
      try {
        this.handleMessage(JSON.parse(raw.toString()) as BybitMsg)
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

  private handleMessage(msg: BybitMsg): void {
    if (!msg.topic?.startsWith('tickers.')) return
    const data = msg.data
    if (!data?.symbol) return
    const symbol = SYMBOL_MAP[data.symbol]
    if (!symbol) return
    const markPrice = parseFloat(data.markPrice ?? '0')
    if (!markPrice || isNaN(markPrice)) return

    const tick: FuturesTick = {
      exchangeId: this.exchangeId,
      symbol,
      markPrice: parseFloat(markPrice.toFixed(8)),
      indexPrice: parseFloat(parseFloat(data.indexPrice ?? '0').toFixed(8)),
      fundingRate: parseFloat(data.fundingRate ?? '0'),
      nextFundingTime: parseInt(data.nextFundingTime ?? '0', 10),
      openInterest: parseFloat(data.openInterest ?? '0'),
      timestamp: Date.now(),
    }
    this.onTickCb?.(tick)
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

  async fetchFundingRate(symbol: string): Promise<FundingRateData> {
    const rawSym = symbol.replace('/', '')
    const res = await fetch(
      `${BYBIT_REST_URL}/v5/market/funding/history?category=linear&symbol=${rawSym}&limit=1`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json() as BybitFundingHistoryResponse
    const entry = body.result?.list?.[0]
    if (!entry) throw new Error(`No funding rate data for ${symbol}`)
    const fundingRate = parseFloat(entry.fundingRate)
    return {
      exchangeId: this.exchangeId,
      symbol,
      fundingRate,
      fundingRateAnnualized: fundingRate * 3 * 365 * 100,
      nextFundingTime: parseInt(entry.fundingRateTimestamp, 10),
      predictedRate: fundingRate,
      timestamp: Date.now(),
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
