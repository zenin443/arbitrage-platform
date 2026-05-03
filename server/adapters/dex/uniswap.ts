import { BaseDexAdapter, DexPrice } from './base'

// DeFi Llama coins API — free, no API key, aggregates real on-chain prices
// from Uniswap V3, Curve, Balancer etc. Updates every ~30s from chain state.
const DEFILLAMA_PRICES_URL = 'https://coins.llama.fi/prices/current'
const DEFILLAMA_POOLS_URL  = 'https://yields.llama.fi/pools'

const POLL_INTERVAL_MS      = 10_000  // was 15_000 — tighter freshness within 60s window
const RATE_LIMIT_BACKOFF_MS = 30_000
const CONNECTED_TIMEOUT_MS  = 90_000  // was 60_000
const INITIAL_DELAY_MS      = 3_000

export const UNISWAP_GAS_FEE_USD = 8.00

interface TokenConfig {
  address: string   // ERC-20 address on Ethereum mainnet
  symbol: string    // canonical trading pair
  poolId?: string   // Uniswap V3 pool id for TVL lookup (optional)
}

// Ethereum mainnet token addresses
const TRACKED_TOKENS: TokenConfig[] = [
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'ETH/USDT'  },
  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'BTC/USDT'  },
  { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK/USDT' },
  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI/USDT'  },
  { address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', symbol: 'PEPE/USDT' },
  { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE/USDT' },
  { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', symbol: 'LDO/USDT'  },
  { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB/USDT' },
  { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', symbol: 'POL/USDT'  },
  { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV/USDT'  },
  { address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', symbol: 'COMP/USDT' },
]

// Pool TVL cache — refreshed every 5 mins from DeFi Llama pools endpoint
const tvlCache: Map<string, number> = new Map()
let tvlLastFetched = 0
const TVL_CACHE_TTL = 5 * 60 * 1000

interface DefiLlamaPriceResponse {
  coins: Record<string, {
    price: number
    symbol: string
    timestamp: number
    confidence: number
  }>
}

interface DefiLlamaPool {
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  underlyingTokens?: string[]
}

export class UniswapAdapter extends BaseDexAdapter {
  readonly dexId = 'uniswap_v3'
  readonly chain = 'ethereum'

  private active = false
  private onPrice: ((price: DexPrice) => void) | null = null
  private lastSuccessfulPoll = 0

  async connect(onPrice: (price: DexPrice) => void): Promise<void> {
    this.log('connect() — using DeFi Llama on-chain price feed')
    this.onPrice = onPrice
    this.active  = true
    this.startPolling()
  }

  private async startPolling(): Promise<void> {
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
    const token = TRACKED_TOKENS.find(t => t.symbol === symbol)
    if (!token) throw new Error(`Symbol not tracked: ${symbol}`)
    const prices = await this.fetchDefiLlamaPrices()
    const key    = `ethereum:${token.address.toLowerCase()}`
    const entry  = prices.coins[key]
    if (!entry) throw new Error(`No on-chain price for ${symbol}`)
    const tvl = tvlCache.get(token.symbol) ?? 1_000_000
    return this.buildDexPrice(token, entry.price, tvl)
  }

  private async poll(): Promise<void> {
    // Refresh pool TVL cache if stale
    if (Date.now() - tvlLastFetched > TVL_CACHE_TTL) {
      await this.refreshTvlCache().catch(e => this.log('TVL cache refresh failed: ' + e))
    }

    const prices = await this.fetchDefiLlamaPrices()
    let count = 0

    for (const token of TRACKED_TOKENS) {
      const key   = `ethereum:${token.address.toLowerCase()}`
      const entry = prices.coins[key]
      if (!entry) continue

      // Reject prices with low confidence (data quality flag from DeFi Llama)
      if (entry.confidence < 0.8) {
        this.log(`Low confidence (${entry.confidence}) for ${token.symbol} — skipping`)
        continue
      }

      const tvl   = tvlCache.get(token.symbol) ?? 1_000_000
      const price = this.buildDexPrice(token, entry.price, tvl)
      this.onPrice?.(price)
      count++
    }

    this.lastSuccessfulPoll = Date.now()
    this.log(`Emitted ${count} on-chain prices (DeFi Llama)`)
  }

  private async fetchDefiLlamaPrices(): Promise<DefiLlamaPriceResponse> {
    const keys = TRACKED_TOKENS
      .map(t => `ethereum:${t.address.toLowerCase()}`)
      .join(',')

    const res = await fetch(`${DEFILLAMA_PRICES_URL}/${keys}`, {
      headers: { 'User-Agent': 'arbitrance-price-server/1.0' },
    })

    if (res.status === 429) {
      this.log('Rate limited — backing off 30s')
      await new Promise(r => setTimeout(r, RATE_LIMIT_BACKOFF_MS))
      const retry = await fetch(`${DEFILLAMA_PRICES_URL}/${keys}`)
      if (!retry.ok) throw new Error(`DeFi Llama error after retry: ${retry.status}`)
      return (await retry.json()) as DefiLlamaPriceResponse
    }

    if (!res.ok) throw new Error(`DeFi Llama error: ${res.status} ${res.statusText}`)
    return (await res.json()) as DefiLlamaPriceResponse
  }

  // Fetch real pool TVL from DeFi Llama yields endpoint — Uniswap V3 Ethereum pools
  private async refreshTvlCache(): Promise<void> {
    const res = await fetch(DEFILLAMA_POOLS_URL, {
      headers: { 'User-Agent': 'arbitrance-price-server/1.0' },
    })
    if (!res.ok) return

    const data = (await res.json()) as { data: DefiLlamaPool[] }
    const uniPools = data.data.filter(
      p => p.chain === 'Ethereum' && p.project === 'uniswap-v3' && p.tvlUsd > 0
    )

    // Map pool symbol (e.g. "WETH-USDC", "WBTC-USDT") to token pair + TVL
    for (const token of TRACKED_TOKENS) {
      const base = token.symbol.split('/')[0]
      // Uniswap pools use WETH not ETH, WBTC not BTC
      const poolBase = base === 'ETH' ? 'WETH' : base === 'BTC' ? 'WBTC' : base

      // Find highest TVL pool containing this token paired with USDC/USDT/WETH
      const matching = uniPools
        .filter(p => p.symbol.includes(poolBase))
        .sort((a, b) => b.tvlUsd - a.tvlUsd)

      if (matching.length > 0) {
        tvlCache.set(token.symbol, matching[0].tvlUsd)
      }
    }

    tvlLastFetched = Date.now()
    this.log(`TVL cache refreshed — ${tvlCache.size} entries`)
  }

  private buildDexPrice(token: TokenConfig, priceUSD: number, liquidityUSD: number): DexPrice {
    // Real price impact using AMM constant-product formula approximation:
    // impact ≈ tradeSize / (2 * poolLiquidity) * 100
    const priceImpact1k  = parseFloat(((1_000  / (2 * liquidityUSD)) * 100).toFixed(8))
    const priceImpact10k = parseFloat(((10_000 / (2 * liquidityUSD)) * 100).toFixed(8))

    return {
      dexId:         this.dexId,
      chain:         this.chain,
      symbol:        token.symbol,
      price:         parseFloat(priceUSD.toFixed(8)),
      liquidity:     liquidityUSD,
      priceImpact1k,
      priceImpact10k,
      source:        'rest',
      timestamp:     Date.now(),
    }
  }
}
