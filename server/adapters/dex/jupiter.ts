import { BaseDexAdapter, DexPrice } from './base'

// Jupiter Price API v6 — real-time Solana DEX aggregated prices
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2?ids='
const POLL_INTERVAL_MS       = 5_000    // 5-second refresh (was 30s CoinGecko)
const RATE_LIMIT_BACKOFF_MS  = 15_000
const CONNECTED_TIMEOUT_MS   = 30_000
const GAS_FEE_USD = 0.001              // Solana tx fee ~$0.001

interface TokenConfig {
  mintAddress: string  // Solana mint address for Jupiter API
  pairSymbol:  string  // normalized trading pair e.g. "SOL/USDT"
  poolDepthUsd: number // realistic pool depth for slippage estimate
}

// Real Solana mint addresses + realistic pool depths per token
const TRACKED_TOKENS: TokenConfig[] = [
  { mintAddress: 'So11111111111111111111111111111111111111112',  pairSymbol: 'SOL/USDT',    poolDepthUsd: 50_000_000 },
  { mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', pairSymbol: 'USDC/USDT',  poolDepthUsd: 80_000_000 },
  { mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  pairSymbol: 'BONK/USDT',  poolDepthUsd: 2_500_000  },
  { mintAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  pairSymbol: 'WIF/USDT',   poolDepthUsd: 3_000_000  },
  { mintAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   pairSymbol: 'JUP/USDT',   poolDepthUsd: 5_000_000  },
  { mintAddress: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',   pairSymbol: 'RENDER/USDT', poolDepthUsd: 1_500_000  },
  { mintAddress: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',   pairSymbol: 'ORCA/USDT',   poolDepthUsd: 2_000_000  },
  { mintAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',  pairSymbol: 'RAY/USDT',    poolDepthUsd: 3_000_000  },
  { mintAddress: 'HZ1JovNiVvGrGs1X3Ldv5Bs1GQjMNqxriGfEhiFvz19j',  pairSymbol: 'PYTH/USDT',   poolDepthUsd: 2_000_000  },
  { mintAddress: 'jtojtomepa8bdph4dBQXdMb8NfqFBW3k6E9EjQhEMQo',   pairSymbol: 'JTO/USDT',    poolDepthUsd: 1_500_000  },
  { mintAddress: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',   pairSymbol: 'MEW/USDT',    poolDepthUsd: 800_000    },
  { mintAddress: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',  pairSymbol: 'ETH/USDT',    poolDepthUsd: 10_000_000 },
]

interface JupiterPriceResponse {
  data: Record<string, { id: string; mintSymbol: string; vsToken: string; vsTokenSymbol: string; price: number } | null>
  timeTaken: number
}

export class JupiterAdapter extends BaseDexAdapter {
  readonly dexId = 'jupiter'
  readonly chain = 'solana'

  private active = false
  private onPrice: ((price: DexPrice) => void) | null = null
  private lastSuccessfulPoll = 0

  async connect(onPrice: (price: DexPrice) => void): Promise<void> {
    this.log('connect() called — starting Jupiter Price API polling')
    this.onPrice = onPrice
    this.active = true
    this.startPolling()
  }

  private async startPolling(): Promise<void> {
    let consecutiveFailures = 0
    while (this.active) {
      try {
        await this.poll()
        consecutiveFailures = 0
      } catch (e) {
        consecutiveFailures++
        this.log(`Poll error (${consecutiveFailures} consecutive): ${String(e)}`)
        if (consecutiveFailures >= 3) {
          this.log('3 consecutive failures — backing off 60s')
          await new Promise(r => setTimeout(r, 60_000))
          consecutiveFailures = 0
        }
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    }
  }

  disconnect(): void {
    this.active = false
    this.log('Disconnected')
  }

  isConnected(): boolean {
    return this.active && (Date.now() - this.lastSuccessfulPoll) < CONNECTED_TIMEOUT_MS
  }

  async fetchPrice(symbol: string): Promise<DexPrice> {
    const token = TRACKED_TOKENS.find(t => t.pairSymbol === symbol)
    if (!token) throw new Error(`Symbol not tracked: ${symbol}`)
    const data = await this.fetchJupiterPrices([token.mintAddress])
    const entry = data.data[token.mintAddress]
    if (!entry) throw new Error(`No price data for ${symbol}`)
    return this.buildDexPrice(token, entry.price)
  }

  private async poll(): Promise<void> {
    const mints = TRACKED_TOKENS.map(t => t.mintAddress)
    const data = await this.fetchJupiterPrices(mints)

    let count = 0
    for (const token of TRACKED_TOKENS) {
      const entry = data.data[token.mintAddress]
      if (!entry || !entry.price || entry.price <= 0) continue
      count++
      this.onPrice?.(this.buildDexPrice(token, entry.price))
    }

    this.lastSuccessfulPoll = Date.now()
    this.log(`Got prices for ${count}/${TRACKED_TOKENS.length} tokens`)
  }

  private async fetchJupiterPrices(mints: string[]): Promise<JupiterPriceResponse> {
    const url = JUPITER_PRICE_API + mints.join(',')
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (res.status === 429) {
      this.log('Rate limited — backing off')
      await new Promise(r => setTimeout(r, RATE_LIMIT_BACKOFF_MS))
      const retry = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!retry.ok) throw new Error(`Jupiter API error after retry: ${retry.status}`)
      return (await retry.json()) as JupiterPriceResponse
    }

    if (!res.ok) throw new Error(`Jupiter API error: ${res.status} ${res.statusText}`)
    return (await res.json()) as JupiterPriceResponse
  }

  private buildDexPrice(token: TokenConfig, priceUSD: number): DexPrice {
    const poolDepth = token.poolDepthUsd
    const priceImpact1k  = parseFloat(((1_000  / poolDepth) * 100).toFixed(8))
    const priceImpact10k = parseFloat(((10_000 / poolDepth) * 100).toFixed(8))

    return {
      dexId:          this.dexId,
      chain:          this.chain,
      symbol:         token.pairSymbol,
      price:          parseFloat(priceUSD.toFixed(8)),
      liquidity:      poolDepth,
      priceImpact1k,
      priceImpact10k,
      source:         'rest',
      timestamp:      Date.now(),
    }
  }
}

export { GAS_FEE_USD as JUPITER_GAS_FEE_USD }
