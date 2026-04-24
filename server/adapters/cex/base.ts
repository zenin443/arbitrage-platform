export interface ExchangeConfig {
  id: string
  name: string
  tier: 1 | 2 | 3
  takerFee: number
  makerFee: number
  withdrawalFees: Record<string, Record<string, number>>
  // coin -> network -> fee: e.g. { BTC: { BTC: 0.0005 }, USDT: { TRC20: 1, ERC20: 10, BEP20: 0.8 } }
  supportedNetworks: string[]
  wsUrl?: string
  restUrl: string
  active: boolean
}

export interface PriceTick {
  exchangeId: string
  symbol: string        // e.g. "BTC/USDT"
  bid: number           // best buy price
  ask: number           // best sell price
  bidSize: number       // available volume at bid
  askSize: number       // available volume at ask
  timestamp: number     // unix ms
  source: 'ws' | 'rest'
}

export interface NetworkStatus {
  network: string
  depositEnabled: boolean
  withdrawEnabled: boolean
  withdrawFee: number
  minWithdraw: number
  estimatedTime: number  // minutes
}

export abstract class BaseExchangeAdapter {
  abstract config: ExchangeConfig
  abstract connect(onTick: (tick: PriceTick) => void): Promise<void>
  abstract disconnect(): void
  abstract fetchTicker(symbol: string): Promise<PriceTick>
  abstract fetchNetworkStatus(coin: string): Promise<NetworkStatus[]>
  abstract fetchOrderbookDepth(symbol: string, limit?: number): Promise<{ bids: [number, number][], asks: [number, number][] }>
  abstract isConnected(): boolean

  normalizeSymbol(raw: string): string {
    return raw.replace('-', '/').replace('_', '/').toUpperCase()
  }

  log(message: string) {
    console.log(`[${this.config.id.toUpperCase()}] ${message}`)
  }

  error(message: string) {
    console.error(`[${this.config.id.toUpperCase()}] ERROR: ${message}`)
  }
}
