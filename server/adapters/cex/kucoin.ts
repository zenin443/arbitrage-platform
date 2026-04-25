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

function toKucoinSymbol(sym: string): string {
  return sym.replace('/', '-')
}

function fromKucoinTopic(topic: string): string {
  const instId = topic.split(':')[1] ?? ''
  return instId.replace('-', '/')
}

type KucoinBulletResponse = {
  code: string
  data: {
    token: string
    instanceServers: Array<{ endpoint: string; pingInterval: number; protocol: string }>
  }
}

type KucoinTickerData = {
  bestBid?: string; bestBidSize?: string; bestAsk?: string; bestAskSize?: string
}

type KucoinMsg = { type: string; topic?: string; subject?: string; data?: KucoinTickerData; id?: string }

type KucoinChainInfo = {
  chainName: string; isDepositEnabled: boolean; isWithdrawEnabled: boolean
  withdrawalMinFee: string; withdrawalMinSize: string
}

type KucoinCurrencyResponse = {
  code: string; data: { currency: string; chains: KucoinChainInfo[] }
}

type KucoinOrderbookResponse = {
  code: string; data: { bids: [string, string][]; asks: [string, string][] }
}

export class KucoinAdapter extends BaseExchangeAdapter {
  config: ExchangeConfig = EXCHANGE_REGISTRY.kucoin
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
    await this.openSocket()
  }

  private async openSocket(): Promise<void> {
    try {
      const { wsUrl, pingInterval } = await this.fetchWsToken()
      this.ws = new WebSocket(wsUrl)

      this.ws.on('open', () => {
        this.log('WebSocket connected')
        this.backoffMs = 2000
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ id: String(Date.now()), type: 'ping' }))
          }
        }, pingInterval)
      })

      this.ws.on('message', (raw: WebSocket.RawData) => {
        try {
          this.handleMessage(JSON.parse(raw.toString()) as KucoinMsg)
        } catch { /* ignore parse errors */ }
      })

      this.ws.on('error', (err: Error) => this.error(`WS error: ${err.message}`))

      this.ws.on('close', () => {
        if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
        if (!this.active) return
        this.log(`WS closed — reconnecting in ${this.backoffMs}ms`)
        setTimeout(() => { void this.openSocket() }, this.backoffMs)
        this.backoffMs = Math.min(this.backoffMs * 2, 30_000)
      })
    } catch (err: unknown) {
      this.error(`openSocket: ${err instanceof Error ? err.message : String(err)}`)
      if (this.active) {
        setTimeout(() => { void this.openSocket() }, this.backoffMs)
        this.backoffMs = Math.min(this.backoffMs * 2, 30_000)
      }
    }
  }

  private async fetchWsToken(): Promise<{ wsUrl: string; pingInterval: number }> {
    const res = await fetch(`${this.config.restUrl}/api/v1/bullet-public`, { method: 'POST' })
    if (!res.ok) throw new Error(`bullet-public HTTP ${res.status}`)
    const body = await res.json() as KucoinBulletResponse
    if (body.code !== '200000') throw new Error(`bullet-public error: ${body.code}`)
    const server = body.data.instanceServers[0]
    if (!server) throw new Error('No KuCoin WS server available')
    return {
      wsUrl: `${server.endpoint}?token=${body.data.token}`,
      pingInterval: server.pingInterval,
    }
  }

  private handleMessage(msg: KucoinMsg): void {
    if (msg.type === 'welcome') {
      const topic = `/market/ticker:${SYMBOLS.map(toKucoinSymbol).join(',')}`
      this.ws?.send(JSON.stringify({
        id: String(Date.now()), type: 'subscribe', topic, response: true,
      }))
      return
    }
    if (msg.type !== 'message' || !msg.topic?.startsWith('/market/ticker:')) return
    const data = msg.data
    if (!data) return
    const symbol = fromKucoinTopic(msg.topic)
    const bid = parseFloat(data.bestBid ?? '0')
    const ask = parseFloat(data.bestAsk ?? '0')
    if (!bid || !ask || isNaN(bid) || isNaN(ask)) return
    const tick: PriceTick = {
      exchangeId: this.config.id,
      symbol,
      bid: parseFloat(bid.toFixed(8)),
      ask: parseFloat(ask.toFixed(8)),
      bidSize: parseFloat(parseFloat(data.bestBidSize ?? '0').toFixed(8)),
      askSize: parseFloat(parseFloat(data.bestAskSize ?? '0').toFixed(8)),
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
    const kSym = toKucoinSymbol(symbol)
    const res = await fetch(`${this.config.restUrl}/api/v1/market/orderbook/level1?symbol=${kSym}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json() as {
      code: string; data: { bestBid: string; bestBidSize: string; bestAsk: string; bestAskSize: string }
    }
    if (body.code !== '200000') throw new Error(`KuCoin error: ${body.code}`)
    const d = body.data
    return {
      exchangeId: this.config.id, symbol,
      bid: parseFloat(parseFloat(d.bestBid).toFixed(8)),
      ask: parseFloat(parseFloat(d.bestAsk).toFixed(8)),
      bidSize: parseFloat(parseFloat(d.bestBidSize).toFixed(8)),
      askSize: parseFloat(parseFloat(d.bestAskSize).toFixed(8)),
      timestamp: Date.now(), source: 'rest',
    }
  }

  async fetchNetworkStatus(coin: string): Promise<NetworkStatus[]> {
    try {
      const res = await fetch(`${this.config.restUrl}/api/v2/currencies/${coin}`)
      if (!res.ok) return []
      const body = await res.json() as KucoinCurrencyResponse
      if (body.code !== '200000' || !body.data.chains) return []
      return body.data.chains.map(c => ({
        network: c.chainName,
        depositEnabled: c.isDepositEnabled,
        withdrawEnabled: c.isWithdrawEnabled,
        withdrawFee: parseFloat(parseFloat(c.withdrawalMinFee).toFixed(8)),
        minWithdraw: parseFloat(parseFloat(c.withdrawalMinSize).toFixed(8)),
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
      const kSym = toKucoinSymbol(symbol)
      const endpoint = limit <= 20
        ? `/api/v1/market/orderbook/level2_20?symbol=${kSym}`
        : `/api/v1/market/orderbook/level2_100?symbol=${kSym}`
      const res = await fetch(`${this.config.restUrl}${endpoint}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as KucoinOrderbookResponse
      return {
        bids: data.data.bids.slice(0, limit).map(([p, q]) => [parseFloat(p), parseFloat(q)]),
        asks: data.data.asks.slice(0, limit).map(([p, q]) => [parseFloat(p), parseFloat(q)]),
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
