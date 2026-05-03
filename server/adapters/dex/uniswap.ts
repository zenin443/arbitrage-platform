import { BaseDexAdapter, DexPrice } from './base'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,chainlink,uniswap,arbitrum,optimism,pepe,aave,lido-dao,shiba-inu,matic-network&vs_currencies=usd'
const POLL_INTERVAL_MS       = 25_000  // must stay under the 30s staleness guard
const RATE_LIMIT_BACKOFF_MS  = 60_000
const CONNECTED_TIMEOUT_MS   = 180_000
const INITIAL_DELAY_MS       = 5_000   // brief stagger to avoid simultaneous CoinGecko requests
export const UNISWAP_GAS_FEE_USD = 8.00

interface TokenMap {
  cgId: string       // CoinGecko ID
  pairSymbol: string // canonical trading pair
}

const TRACKED_TOKENS: TokenMap[] = [
  { cgId: 'ethereum',      pairSymbol: 'ETH/USDT'  },
  { cgId: 'bitcoin',       pairSymbol: 'BTC/USDT'  },
  { cgId: 'chainlink',     pairSymbol: 'LINK/USDT' },
  { cgId: 'uniswap',       pairSymbol: 'UNI/USDT'  },
  { cgId: 'arbitrum',      pairSymbol: 'ARB/USDT'  },
  { cgId: 'optimism',      pairSymbol: 'OP/USDT'   },
  { cgId: 'pepe',          pairSymbol: 'PEPE/USDT' },
  { cgId: 'aave',          pairSymbol: 'AAVE/USDT' },
  { cgId: 'lido-dao',      pairSymbol: 'LDO/USDT'  },
  { cgId: 'shiba-inu',     pairSymbol: 'SHIB/USDT' },
  { cgId: 'matic-network', pairSymbol: 'MATIC/USDT'},
]

type CoinGeckoResponse = Record<string, { usd: number }>

export class UniswapAdapter extends BaseDexAdapter {
  readonly dexId = 'uniswap_v3'
  readonly chain = 'ethereum'

  private active = false
  private onPrice: ((price: DexPrice) => void) | null = null
  private lastSuccessfulPoll = 0

  async connect(onPrice: (price: DexPrice) => void): Promise<void> {
    this.log('connect() called, starting polling')
    this.onPrice = onPrice
    this.active = true
    this.log(`Starting polling ${TRACKED_TOKENS.length} Ethereum tokens every ${POLL_INTERVAL_MS}ms`)
    this.startPolling()
  }

  private async startPolling(): Promise<void> {
    this.log('startPolling() called')
    this.log(`Waiting ${INITIAL_DELAY_MS}ms before first poll to stagger CoinGecko requests`)
    await new Promise(r => setTimeout(r, INITIAL_DELAY_MS))
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
    const tokenMap = TRACKED_TOKENS.find(t => t.pairSymbol === symbol)
    if (!tokenMap) {
      throw new Error(`Symbol not tracked: ${symbol}`)
    }

    const data = await this.fetchCoinGecko()
    const usdPrice = data[tokenMap.cgId]?.usd
    if (usdPrice === undefined) {
      throw new Error(`No price data returned for ${symbol}`)
    }

    return this.buildDexPrice(tokenMap, usdPrice)
  }

  private async poll(): Promise<void> {
    this.log('poll() called')
    const data = await this.fetchCoinGecko()

    let count = 0
    for (const tokenMap of TRACKED_TOKENS) {
      const usdPrice = data[tokenMap.cgId]?.usd
      if (usdPrice === undefined) continue

      count++
      const price = this.buildDexPrice(tokenMap, usdPrice)
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

  private buildDexPrice(tokenMap: TokenMap, priceUSD: number): DexPrice {
    // Price impact estimated proportionally against assumed pool TVL
    const assumedLiquidityUSD = 1_000_000
    const priceImpact1k   = parseFloat(((1_000  / assumedLiquidityUSD) * 100).toFixed(8))
    const priceImpact10k  = parseFloat(((10_000 / assumedLiquidityUSD) * 100).toFixed(8))

    return {
      dexId:          this.dexId,
      chain:          this.chain,
      symbol:         tokenMap.pairSymbol,
      price:          parseFloat(priceUSD.toFixed(8)),
      liquidity:      assumedLiquidityUSD,
      priceImpact1k,
      priceImpact10k,
      source:         'rest',
      timestamp:      Date.now(),
    }
  }
}
