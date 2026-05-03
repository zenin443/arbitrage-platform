export interface Exchange {
  id: string
  name: string
  /** Taker fee as a decimal, e.g. 0.001 for 0.1% */
  fee: number
  /** Map of asset symbol to withdrawal fee amount, e.g. { USDT: 1.0, BTC: 0.0005 } */
  withdrawalFees: Record<string, number>
}

export interface PriceTick {
  exchangeId: string
  symbol: string
  /** Best bid price (buyer willing to pay) */
  bid: number
  /** Best ask price (seller asking) */
  ask: number
  bidSize: number
  askSize: number
  timestamp: number
  source: 'ws' | 'rest'
}

export interface ArbitrageOpportunity {
  id: string
  symbol: string
  buyExchange: string
  sellExchange: string
  /** Ask price on the buy exchange */
  buyPrice: number
  /** Bid price on the sell exchange */
  sellPrice: number
  /** (sellPrice - buyPrice) / buyPrice as a percentage, before fees */
  grossSpread: number
  /** Gross spread minus all trading and withdrawal fees, as a percentage */
  netSpread: number
  /** Estimated profit in USDT for a $1000 notional trade */
  estimatedProfit: number
  /** 0–100 score based on available order book depth */
  liquidityScore: number
  confidence: 'high' | 'medium' | 'low'
  bestNetwork: string
  withdrawFee: number
  transferTimeMinutes: number
  detectedAt: number
  strategy: 'cex_cex_spot' | 'spot_futures' | 'funding_rate' | 'cex_dex' | 'dex_dex'
  /** Transfer route status: 'open' = confirmed working, 'blocked' = suspended, 'unknown' = no data */
  routeStatus?: 'open' | 'blocked' | 'unknown'
  withdrawSuspended?: boolean
  depositSuspended?: boolean
}

export interface AlertConfig {
  userId: string
  /** Minimum net spread percentage to trigger an alert */
  minNetSpread: number
  /** Minimum liquidity score (0–100) to trigger an alert */
  minLiquidity: number
  /** Exchange IDs to monitor */
  exchanges: string[]
  /** Trading pair symbols to monitor, e.g. ["BTC/USDT", "ETH/USDT"] */
  symbols: string[]
}
