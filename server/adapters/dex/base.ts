export interface DexPrice {
  dexId: string           // e.g. "jupiter", "uniswap_v3"
  chain: string           // e.g. "solana", "ethereum", "arbitrum"
  symbol: string          // e.g. "SOL/USDT"
  price: number           // current price in USD
  liquidity: number       // available liquidity in USD
  priceImpact1k: number   // price impact for $1000 trade in %
  priceImpact10k: number  // price impact for $10000 trade in %
  source: 'rest' | 'ws'
  timestamp: number
}

export interface CexDexOpportunity {
  id: string
  symbol: string
  cexExchange: string
  dexId: string
  chain: string
  cexPrice: number
  dexPrice: number
  priceDiffPercent: number
  estimatedGasFee: number    // in USD
  netProfitPercent: number   // after gas
  direction: 'buy_cex_sell_dex' | 'buy_dex_sell_cex'
  liquidityUSD: number
  maxTradeSize: number       // max trade size before 1% slippage
  confidence: 'high' | 'medium' | 'low'
  detectedAt: number
  note?: string
}

export abstract class BaseDexAdapter {
  abstract dexId: string
  abstract chain: string
  abstract connect(onPrice: (price: DexPrice) => void): Promise<void>
  abstract disconnect(): void
  abstract fetchPrice(symbol: string): Promise<DexPrice>
  abstract isConnected(): boolean

  log(msg: string): void {
    console.log(`[${this.dexId.toUpperCase()}] ${msg}`)
  }

  error(msg: string): void {
    console.error(`[${this.dexId.toUpperCase()}] ERROR: ${msg}`)
  }
}
