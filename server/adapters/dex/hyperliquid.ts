import WebSocket from 'ws'
import { BaseDexAdapter, DexPrice } from './base'

const HL_WS_URL   = 'wss://api.hyperliquid.xyz/ws'
const HL_REST_URL = 'https://api.hyperliquid.xyz/info'
export const HYPERLIQUID_GAS_FEE_USD = 0

const TRACKED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'AVAX', 'LINK', 'BNB']

// Hyperliquid perpetuals use "$X" pair naming convention internally; we normalise to X/USDT
function toPairSymbol(coin: string): string {
  return `${coin}/USDT`
}

interface AllMidsData {
  mids: Record<string, string>
}

interface HlWsMessage {
  channel: string
  data: AllMidsData
}

interface HlRestResponse {
  [coin: string]: string
}

export class HyperliquidAdapter extends BaseDexAdapter {
  readonly dexId = 'hyperliquid'
  readonly chain = 'arbitrum'

  private ws: WebSocket | null = null
  private connected = false
  private reconnectDelay = 1_000
  private readonly maxReconnectDelay = 30_000
  private onPriceCallback: ((price: DexPrice) => void) | null = null
  private destroyed = false
  private firstMessageLogged = false
  private consecutiveFailures = 0
  private readonly maxConsecutiveFailures = 5
  private readonly cooldownAfterMaxFailures = 5 * 60_000

  async connect(onPrice: (price: DexPrice) => void): Promise<void> {
    this.log('connect() called, opening WebSocket')
    this.onPriceCallback = onPrice
    this.openSocket().catch(err => this.error(`Initial connect failed: ${String(err)}`))
  }

  disconnect(): void {
    this.destroyed = true
    this.connected = false
    if (this.ws) {
      this.ws.terminate()
      this.ws = null
    }
    this.log('Disconnected')
  }

  isConnected(): boolean {
    return this.connected
  }

  async fetchPrice(symbol: string): Promise<DexPrice> {
    const coin = symbol.split('/')[0]
    if (!TRACKED_SYMBOLS.includes(coin)) {
      throw new Error(`Symbol not tracked: ${symbol}`)
    }

    const res = await fetch(HL_REST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' }),
    })

    if (!res.ok) {
      throw new Error(`Hyperliquid REST error: ${res.status} ${res.statusText}`)
    }

    const mids = (await res.json()) as HlRestResponse
    const priceStr = mids[coin]
    if (priceStr === undefined) {
      throw new Error(`No price for ${coin} in Hyperliquid allMids`)
    }

    return this.buildDexPrice(coin, parseFloat(priceStr))
  }

  private async openSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.log(`Connecting WebSocket to ${HL_WS_URL}`)
      const ws = new WebSocket(HL_WS_URL)
      this.ws = ws

      ws.once('open', () => {
        this.log('WebSocket opened')
        this.connected = true
        this.reconnectDelay = 1_000
        this.consecutiveFailures = 0
        this.log('WebSocket connected — subscribing to allMids')

        ws.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'allMids' },
        }))

        resolve()
      })

      ws.on('message', (data: WebSocket.RawData) => {
        if (!this.firstMessageLogged) {
          this.log('Message received')
          this.firstMessageLogged = true
        }
        this.handleMessage(data.toString())
      })

      ws.on('close', () => {
        this.connected = false
        if (!this.destroyed) {
          this.log(`WebSocket closed — reconnecting in ${this.reconnectDelay}ms`)
          setTimeout(() => {
            this.reconnect()
          }, this.reconnectDelay)
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
        }
      })

      ws.once('error', (err: Error) => {
        this.error(`WebSocket error: ${err.message}`)
        if (!this.connected) {
          reject(err)
        }
      })
    })
  }

  private reconnect(): void {
    if (this.destroyed) return

    this.consecutiveFailures++

    if (this.consecutiveFailures > this.maxConsecutiveFailures) {
      this.log(`${this.maxConsecutiveFailures} consecutive failures — cooling down for 5 minutes`)
      this.consecutiveFailures = 0
      this.reconnectDelay = 1_000
      setTimeout(() => {
        if (!this.destroyed) {
          this.openSocket().catch(err => this.error(`Reconnect failed: ${String(err)}`))
        }
      }, this.cooldownAfterMaxFailures)
      return
    }

    this.log(`Reconnecting attempt ${this.consecutiveFailures}/${this.maxConsecutiveFailures}...`)
    this.openSocket().catch(err => {
      this.error(`Reconnect failed: ${String(err)}`)
    })
  }

  private handleMessage(raw: string): void {
    let msg: unknown
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    const typed = msg as Partial<HlWsMessage>
    if (typed.channel !== 'allMids' || !typed.data?.mids) return

    const mids = typed.data.mids
    for (const coin of TRACKED_SYMBOLS) {
      const priceStr = mids[coin]
      if (priceStr === undefined) continue

      const price = parseFloat(priceStr)
      if (isNaN(price) || price <= 0) continue

      this.onPriceCallback?.(this.buildDexPrice(coin, price))
    }
  }

  private buildDexPrice(coin: string, priceUSD: number): DexPrice {
    // Hyperliquid is a perp DEX with deep order books; use conservative estimates.
    const assumedLiquidityUSD = 2_000_000
    const priceImpact1k  = parseFloat(((1_000  / assumedLiquidityUSD) * 100).toFixed(8))
    const priceImpact10k = parseFloat(((10_000 / assumedLiquidityUSD) * 100).toFixed(8))

    return {
      dexId:          this.dexId,
      chain:          this.chain,
      symbol:         toPairSymbol(coin),
      price:          parseFloat(priceUSD.toFixed(8)),
      liquidity:      assumedLiquidityUSD,
      priceImpact1k,
      priceImpact10k,
      source:         'ws',
      timestamp:      Date.now(),
    }
  }
}
