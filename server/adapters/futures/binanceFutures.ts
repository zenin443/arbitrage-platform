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

const FUTURES_REST_URL = 'https://fapi.binance.com'
const FUTURES_WS_URL = 'wss://fstream.binance.com/ws'

type BinanceMarkPriceMsg = {
  e?: string   // event type: "markPriceUpdate"
  E?: number   // event time
  s?: string   // symbol
  p?: string   // mark price
  i?: string   // index price
  r?: string   // funding rate
  T?: number   // next funding time
}

type BinanceFundingRateResponse = Array<{
  symbol: string
  fundingRate: string
  fundingTime: string
}>

export class BinanceFuturesAdapter extends BaseFuturesAdapter {
  exchangeId = 'binance'
  private ws: WebSocket | null = null
  private active = false
  private backoffMs = 2000
  private onTickCb: ((tick: FuturesTick) => void) | null = null
  private statusTimer: ReturnType<typeof setInterval> | null = null
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
    // Combined stream: /stream?streams=sym1@markPrice@1s/sym2@markPrice@1s/...
    const streams = TRACKED_FUTURES_SYMBOLS
      .map(s => `${s.toLowerCase()}@markPrice@1s`)
      .join('/')
    this.ws = new WebSocket(`${FUTURES_WS_URL}/stream?streams=${streams}`)

    this.ws.on('open', () => {
      this.log('WebSocket connected')
      this.backoffMs = 2000
    })

    this.ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { stream?: string; data?: BinanceMarkPriceMsg } | BinanceMarkPriceMsg
        // Combined stream wraps data in { stream, data }
        const msg: BinanceMarkPriceMsg = ('data' in parsed && parsed.data) ? parsed.data : parsed as BinanceMarkPriceMsg
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

  private handleMessage(msg: BinanceMarkPriceMsg): void {
    if (msg.e !== 'markPriceUpdate') return
    const rawSym = msg.s
    if (!rawSym) return
    const symbol = SYMBOL_MAP[rawSym]
    if (!symbol) return
    const markPrice = parseFloat(msg.p ?? '0')
    const indexPrice = parseFloat(msg.i ?? '0')
    const fundingRate = parseFloat(msg.r ?? '0')
    if (!markPrice || isNaN(markPrice)) return

    const tick: FuturesTick = {
      exchangeId: this.exchangeId,
      symbol,
      markPrice: parseFloat(markPrice.toFixed(8)),
      indexPrice: parseFloat(indexPrice.toFixed(8)),
      fundingRate,
      nextFundingTime: msg.T ?? 0,
      openInterest: 0, // not available in markPrice stream
      timestamp: Date.now(),
    }
    this.onTickCb?.(tick)
    this.tickCount++
  }

  disconnect(): void {
    this.active = false
    if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null }
    this.ws?.close()
    this.ws = null
    this.log('disconnected')
  }

  async fetchFundingRate(symbol: string): Promise<FundingRateData> {
    const rawSym = symbol.replace('/', '')
    const res = await fetch(
      `${FUTURES_REST_URL}/fapi/v1/fundingRate?symbol=${rawSym}&limit=1`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as BinanceFundingRateResponse
    const entry = data[0]
    if (!entry) throw new Error(`No funding rate data for ${symbol}`)
    const fundingRate = parseFloat(entry.fundingRate)
    return {
      exchangeId: this.exchangeId,
      symbol,
      fundingRate,
      fundingRateAnnualized: fundingRate * 3 * 365 * 100,
      nextFundingTime: parseInt(entry.fundingTime, 10),
      predictedRate: fundingRate,
      timestamp: Date.now(),
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
