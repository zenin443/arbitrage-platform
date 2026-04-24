import WebSocket from 'ws'
import { BaseFuturesAdapter, FuturesTick, FundingRateData } from './baseFutures'

const TRACKED_FUTURES_INSTRUMENTS = [
  'BTC-USDT-SWAP', 'ETH-USDT-SWAP', 'SOL-USDT-SWAP', 'BNB-USDT-SWAP', 'XRP-USDT-SWAP',
  'DOGE-USDT-SWAP', 'AVAX-USDT-SWAP', 'LINK-USDT-SWAP', 'ADA-USDT-SWAP', 'ARB-USDT-SWAP',
]

// Maps OKX instId to normalized "BASE/QUOTE" symbol
const INSTRUMENT_MAP: Record<string, string> = {
  'BTC-USDT-SWAP': 'BTC/USDT',
  'ETH-USDT-SWAP': 'ETH/USDT',
  'SOL-USDT-SWAP': 'SOL/USDT',
  'BNB-USDT-SWAP': 'BNB/USDT',
  'XRP-USDT-SWAP': 'XRP/USDT',
  'DOGE-USDT-SWAP': 'DOGE/USDT',
  'AVAX-USDT-SWAP': 'AVAX/USDT',
  'LINK-USDT-SWAP': 'LINK/USDT',
  'ADA-USDT-SWAP': 'ADA/USDT',
  'ARB-USDT-SWAP': 'ARB/USDT',
}

// Reverse map: "BTC/USDT" -> "BTC-USDT-SWAP"
const SYMBOL_TO_INSTRUMENT: Record<string, string> = Object.fromEntries(
  Object.entries(INSTRUMENT_MAP).map(([k, v]) => [v, k])
)

const OKX_WS_URL = 'wss://ws.okx.com:8443/ws/v5/public'
const OKX_REST_URL = 'https://www.okx.com'

type OkxMarkPriceData = {
  instId?: string
  markPx?: string
  ts?: string
}

type OkxFundingRateData = {
  instId?: string
  fundingRate?: string
  fundingTime?: string
  nextFundingRate?: string
  indexPx?: string
}

type OkxMsg = {
  event?: string
  arg?: { channel?: string; instId?: string }
  data?: OkxMarkPriceData[] | OkxFundingRateData[]
}

type OkxFundingRateResponse = {
  code: string
  data: Array<{
    instId: string
    fundingRate: string
    fundingTime: string
    nextFundingRate: string
    indexPx: string
  }>
}

export class OkxFuturesAdapter extends BaseFuturesAdapter {
  exchangeId = 'okx'
  private ws: WebSocket | null = null
  private active = false
  private backoffMs = 2000
  private onTickCb: ((tick: FuturesTick) => void) | null = null
  private statusTimer: ReturnType<typeof setInterval> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private tickCount = 0

  // Cache mark prices alongside funding rates (delivered on separate channels)
  private markPriceCache = new Map<string, number>()
  private indexPriceCache = new Map<string, number>()
  private fundingRateCache = new Map<string, { rate: number; nextTime: number }>()

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
    this.ws = new WebSocket(OKX_WS_URL)

    this.ws.on('open', () => {
      this.log('WebSocket connected')
      this.backoffMs = 2000

      const markPriceArgs = TRACKED_FUTURES_INSTRUMENTS.map(instId => ({
        channel: 'mark-price', instId,
      }))
      const fundingArgs = TRACKED_FUTURES_INSTRUMENTS.map(instId => ({
        channel: 'funding-rate', instId,
      }))
      this.ws?.send(JSON.stringify({ op: 'subscribe', args: [...markPriceArgs, ...fundingArgs] }))

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
        this.handleMessage(JSON.parse(text) as OkxMsg)
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

  private handleMessage(msg: OkxMsg): void {
    if (msg.event) return
    const channel = msg.arg?.channel
    const instId = msg.arg?.instId
    if (!instId || !msg.data?.length) return
    const symbol = INSTRUMENT_MAP[instId]
    if (!symbol) return

    if (channel === 'mark-price') {
      const d = (msg.data as OkxMarkPriceData[])[0]
      const markPx = parseFloat(d?.markPx ?? '0')
      if (!markPx || isNaN(markPx)) return
      this.markPriceCache.set(instId, markPx)

      const funding = this.fundingRateCache.get(instId)
      const tick: FuturesTick = {
        exchangeId: this.exchangeId,
        symbol,
        markPrice: parseFloat(markPx.toFixed(8)),
        indexPrice: parseFloat((this.indexPriceCache.get(instId) ?? markPx).toFixed(8)),
        fundingRate: funding?.rate ?? 0,
        nextFundingTime: funding?.nextTime ?? 0,
        openInterest: 0,
        timestamp: Date.now(),
      }
      this.onTickCb?.(tick)
      this.tickCount++
    } else if (channel === 'funding-rate') {
      const d = (msg.data as OkxFundingRateData[])[0]
      const rate = parseFloat(d?.fundingRate ?? '0')
      const nextTime = parseInt(d?.fundingTime ?? '0', 10)
      const indexPx = parseFloat(d?.indexPx ?? '0')
      this.fundingRateCache.set(instId, { rate, nextTime })
      if (indexPx) this.indexPriceCache.set(instId, indexPx)
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

  async fetchFundingRate(symbol: string): Promise<FundingRateData> {
    const instId = SYMBOL_TO_INSTRUMENT[symbol]
    if (!instId) throw new Error(`Unknown symbol: ${symbol}`)
    const res = await fetch(
      `${OKX_REST_URL}/api/v5/public/funding-rate?instId=${instId}`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json() as OkxFundingRateResponse
    const entry = body.data?.[0]
    if (!entry) throw new Error(`No funding rate data for ${symbol}`)
    const fundingRate = parseFloat(entry.fundingRate)
    const nextFundingRate = parseFloat(entry.nextFundingRate)
    return {
      exchangeId: this.exchangeId,
      symbol,
      fundingRate,
      fundingRateAnnualized: fundingRate * 3 * 365 * 100,
      nextFundingTime: parseInt(entry.fundingTime, 10),
      predictedRate: nextFundingRate,
      timestamp: Date.now(),
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
