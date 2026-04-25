import { BaseDexAdapter, DexPrice } from './base'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana,bonk,dogwifcoin,jupiter-exchange-solana,render-token,orca,raydium&vs_currencies=usd'
const POLL_INTERVAL_MS       = 30_000
const RATE_LIMIT_BACKOFF_MS  = 60_000
const CONNECTED_TIMEOUT_MS   = 120_000
const GAS_FEE_USD = 0.001

interface TokenConfig {
  cgId: string       // CoinGecko ID
  pairSymbol: string // trading pair symbol, e.g. "SOL/USDT"
}

const TRACKED_TOKENS: TokenConfig[] = [
  { cgId: 'solana',                  pairSymbol: 'SOL/USDT'    },
  { cgId: 'bonk',                    pairSymbol: 'BONK/USDT'   },
  { cgId: 'dogwifcoin',              pairSymbol: 'WIF/USDT'    },
  { cgId: 'jupiter-exchange-solana', pairSymbol: 'JUP/USDT'    },
  { cgId: 'render-token',            pairSymbol: 'RENDER/USDT' },
  { cgId: 'orca',                    pairSymbol: 'ORCA/USDT'   },
  { cgId: 'raydium',                 pairSymbol: 'RAY/USDT'    },
]

type CoinGeckoResponse = Record<string, { usd: number }>

export class JupiterAdapter extends BaseDexAdapter {
  readonly dexId = 'jupiter'
  readonly chain = 'solana'

  private active = false
  private onPrice: ((price: DexPrice) => void) | null = null
  private lastSuccessfulPoll = 0

  async connect(onPrice: (price: DexPrice) => void): Promise<void> {
    this.log('connect() called, starting polling')
    this.onPrice = onPrice
    this.active = true
    this.log(`Starting polling ${TRACKED_TOKENS.length} Solana tokens every ${POLL_INTERVAL_MS}ms`)
    this.startPolling()
  }

  private async startPolling(): Promise<void> {
    this.log('startPolling() called')
    while (this.active) {
      try {
        await this.poll()
      } catch (e) {
        this.log('Poll error: ' + e)
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
    if (!token) {
      throw new Error(`Symbol not tracked: ${symbol}`)
    }

    const data = await this.fetchCoinGecko()
    const usdPrice = data[token.cgId]?.usd
    if (usdPrice === undefined) {
      throw new Error(`No price data returned for ${symbol}`)
    }

    return this.buildDexPrice(token, usdPrice)
  }

  private async poll(): Promise<void> {
    this.log('poll() called')
    const data = await this.fetchCoinGecko()

    let count = 0
    for (const token of TRACKED_TOKENS) {
      const usdPrice = data[token.cgId]?.usd
      if (usdPrice === undefined) continue

      count++
      const price = this.buildDexPrice(token, usdPrice)
      this.onPrice?.(price)
    }

    this.lastSuccessfulPoll = Date.now()
    this.log(`Got prices for ${count} tokens`)
  }

  private async fetchCoinGecko(): Promise<CoinGeckoResponse> {
    const res = await fetch(COINGECKO_URL)

    if (res.status === 429) {
      this.log('Rate limited, waiting 60s...')
      await new Promise(r => setTimeout(r, RATE_LIMIT_BACKOFF_MS))
      const retry = await fetch(COINGECKO_URL)
      if (!retry.ok) {
        throw new Error(`CoinGecko API error after retry: ${retry.status} ${retry.statusText}`)
      }
      return (await retry.json()) as CoinGeckoResponse
    }

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as CoinGeckoResponse
  }

  private buildDexPrice(token: TokenConfig, priceUSD: number): DexPrice {
    // Solana on-chain AMM liquidity is highly variable; use a conservative estimate.
    // priceImpact is estimated linearly from an assumed $500k pool depth.
    const assumedPoolDepthUSD = 500_000
    const priceImpact1k  = parseFloat(((1_000  / assumedPoolDepthUSD) * 100).toFixed(8))
    const priceImpact10k = parseFloat(((10_000 / assumedPoolDepthUSD) * 100).toFixed(8))

    return {
      dexId:          this.dexId,
      chain:          this.chain,
      symbol:         token.pairSymbol,
      price:          parseFloat(priceUSD.toFixed(8)),
      liquidity:      assumedPoolDepthUSD,
      priceImpact1k,
      priceImpact10k,
      source:         'rest',
      timestamp:      Date.now(),
    }
  }
}

export { GAS_FEE_USD as JUPITER_GAS_FEE_USD }
