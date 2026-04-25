import https from 'https'
import http from 'http'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface NewListing {
  id: string
  exchange: string
  symbol: string
  baseAsset: string
  quoteAsset: string
  detectedAt: number
  priceAtDetection: number | null
  currentPrice: number | null
  priceChange1m: number | null
  priceChange5m: number | null
  priceChange10m: number | null
  volume24h: number | null
  alsoOnExchanges: string[]
  status: 'new' | 'tracking' | 'completed'
}

export interface ScannerStats {
  exchangeSymbolCounts: Record<string, number>
  lastScanTime: number
  totalScans: number
  isBaselineComplete: boolean
  activityLog: Array<{ time: number; message: string; type: 'baseline' | 'new_listing' | 'error' }>
}

// ─── HTTP fetch helper ────────────────────────────────────────────────────────

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(url, { headers: { 'User-Agent': 'ArbitrageBot/1.0' } }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')) })
  })
}

// ─── Exchange symbol fetchers ─────────────────────────────────────────────────

async function fetchBinanceSymbols(): Promise<string[]> {
  const data = await fetchJson('https://api.binance.com/api/v3/exchangeInfo') as {
    symbols: Array<{ symbol: string; status: string; quoteAsset: string }>
  }
  return data.symbols
    .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
    .map(s => s.symbol)
}

async function fetchBybitSymbols(): Promise<string[]> {
  const data = await fetchJson('https://api.bybit.com/v5/market/instruments-info?category=spot&limit=1000') as {
    result: { list: Array<{ symbol: string }> }
  }
  return data.result.list
    .map(s => s.symbol)
    .filter(s => s.endsWith('USDT'))
}

async function fetchOkxSymbols(): Promise<string[]> {
  const data = await fetchJson('https://www.okx.com/api/v5/public/instruments?instType=SPOT') as {
    data: Array<{ instId: string }>
  }
  return data.data
    .map(s => s.instId)
    .filter(s => s.endsWith('-USDT'))
}

async function fetchMexcSymbols(): Promise<string[]> {
  const data = await fetchJson('https://api.mexc.com/api/v3/exchangeInfo') as {
    symbols: Array<{ symbol: string; status: string; quoteAsset: string }>
  }
  return data.symbols
    .filter(s => s.status === 'ENABLED' && s.quoteAsset === 'USDT')
    .map(s => s.symbol)
}

async function fetchGateioSymbols(): Promise<string[]> {
  const data = await fetchJson('https://api.gateio.ws/api/v4/spot/currency_pairs') as Array<{
    id: string; quote: string; trade_status: string
  }>
  return data
    .filter(s => s.quote === 'USDT' && s.trade_status === 'tradable')
    .map(s => s.id)
}

// ─── Price ticker fetchers ────────────────────────────────────────────────────

async function fetchBinanceTicker(symbol: string): Promise<{ price: number; volume: number } | null> {
  try {
    const data = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`) as {
      lastPrice: string; volume: string
    }
    return { price: parseFloat(data.lastPrice), volume: parseFloat(data.volume) }
  } catch { return null }
}

async function fetchBybitTicker(symbol: string): Promise<{ price: number; volume: number } | null> {
  try {
    const data = await fetchJson(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`) as {
      result: { list: Array<{ lastPrice: string; volume24h: string }> }
    }
    const t = data.result.list[0]
    if (!t) return null
    return { price: parseFloat(t.lastPrice), volume: parseFloat(t.volume24h) }
  } catch { return null }
}

async function fetchOkxTicker(instId: string): Promise<{ price: number; volume: number } | null> {
  try {
    const data = await fetchJson(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`) as {
      data: Array<{ last: string; vol24h: string }>
    }
    const t = data.data[0]
    if (!t) return null
    return { price: parseFloat(t.last), volume: parseFloat(t.vol24h) }
  } catch { return null }
}

async function fetchMexcTicker(symbol: string): Promise<{ price: number; volume: number } | null> {
  try {
    const data = await fetchJson(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`) as {
      lastPrice: string; volume: string
    }
    return { price: parseFloat(data.lastPrice), volume: parseFloat(data.volume) }
  } catch { return null }
}

async function fetchGateioPairTicker(pair: string): Promise<{ price: number; volume: number } | null> {
  try {
    const data = await fetchJson(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`) as Array<{
      last: string; base_volume: string
    }>
    const t = data[0]
    if (!t) return null
    return { price: parseFloat(t.last), volume: parseFloat(t.base_volume) }
  } catch { return null }
}

// ─── Parse base asset from symbol ────────────────────────────────────────────

function parseBase(symbol: string, exchange: string): string {
  if (exchange === 'okx') {
    return symbol.replace(/-USDT$/, '')
  }
  return symbol.replace(/USDT$/, '')
}

// ─── Scanner class ────────────────────────────────────────────────────────────

class NewListingScanner {
  private knownSymbols: Map<string, Set<string>> = new Map([
    ['binance', new Set()],
    ['bybit', new Set()],
    ['okx', new Set()],
    ['mexc', new Set()],
    ['gateio', new Set()],
  ])

  private listings: NewListing[] = []

  private stats: ScannerStats = {
    exchangeSymbolCounts: {},
    lastScanTime: 0,
    totalScans: 0,
    isBaselineComplete: false,
    activityLog: [],
  }

  private isFirstRun = true

  private log(message: string, type: 'baseline' | 'new_listing' | 'error'): void {
    this.stats.activityLog.unshift({ time: Date.now(), message, type })
    if (this.stats.activityLog.length > 200) {
      this.stats.activityLog = this.stats.activityLog.slice(0, 200)
    }
    console.log(`[NewListingScanner] ${message}`)
  }

  private async fetchTicker(exchange: string, symbol: string): Promise<{ price: number; volume: number } | null> {
    switch (exchange) {
      case 'binance': return fetchBinanceTicker(symbol)
      case 'bybit':   return fetchBybitTicker(symbol)
      case 'okx':     return fetchOkxTicker(symbol)
      case 'mexc':    return fetchMexcTicker(symbol)
      case 'gateio':  return fetchGateioPairTicker(symbol)
      default:        return null
    }
  }

  private startPriceTracking(listing: NewListing): void {
    const startTime = Date.now()
    const TOTAL_DURATION = 30 * 60 * 1000
    const POLL_INTERVAL = 10 * 1000
    const MARK_1M  = 60 * 1000
    const MARK_5M  = 5 * 60 * 1000
    const MARK_10M = 10 * 60 * 1000

    let reached1m  = false
    let reached5m  = false
    let reached10m = false

    listing.status = 'tracking'

    const interval = setInterval(async () => {
      try {
        const elapsed = Date.now() - startTime
        const ticker = await this.fetchTicker(listing.exchange, listing.symbol)

        if (ticker) {
          if (listing.priceAtDetection === null) {
            listing.priceAtDetection = ticker.price
          }
          listing.currentPrice = ticker.price
          listing.volume24h = ticker.volume

          if (listing.priceAtDetection !== null && listing.priceAtDetection > 0) {
            const pct = ((ticker.price - listing.priceAtDetection) / listing.priceAtDetection) * 100

            if (!reached1m && elapsed >= MARK_1M) {
              reached1m = true
              listing.priceChange1m = pct
            }
            if (!reached5m && elapsed >= MARK_5M) {
              reached5m = true
              listing.priceChange5m = pct
            }
            if (!reached10m && elapsed >= MARK_10M) {
              reached10m = true
              listing.priceChange10m = pct
            }
          }
        }

        if (elapsed >= TOTAL_DURATION) {
          clearInterval(interval)
          listing.status = 'completed'
        }
      } catch (err) {
        this.log(`Price tracking error for ${listing.symbol}: ${String(err)}`, 'error')
      }
    }, POLL_INTERVAL)
  }

  async scan(): Promise<void> {
    const fetchers: Array<{ name: string; fn: () => Promise<string[]> }> = [
      { name: 'binance', fn: fetchBinanceSymbols },
      { name: 'bybit',   fn: fetchBybitSymbols },
      { name: 'okx',     fn: fetchOkxSymbols },
      { name: 'mexc',    fn: fetchMexcSymbols },
      { name: 'gateio',  fn: fetchGateioSymbols },
    ]

    const results = await Promise.allSettled(fetchers.map(f => f.fn()))

    if (this.isFirstRun) {
      for (let i = 0; i < fetchers.length; i++) {
        const result = results[i]
        const name = fetchers[i].name
        if (result.status === 'fulfilled') {
          this.knownSymbols.set(name, new Set(result.value))
          this.stats.exchangeSymbolCounts[name] = result.value.length
          this.log(`Baseline loaded: ${name} ${result.value.length} symbols`, 'baseline')
        } else {
          this.log(`Baseline error for ${name}: ${String(result.reason)}`, 'error')
        }
      }
      this.isFirstRun = false
      this.stats.isBaselineComplete = true
    } else {
      for (let i = 0; i < fetchers.length; i++) {
        const result = results[i]
        const name = fetchers[i].name
        if (result.status === 'fulfilled') {
          const current = new Set(result.value)
          const known = this.knownSymbols.get(name) ?? new Set()

          this.stats.exchangeSymbolCounts[name] = current.size

          for (const symbol of current) {
            if (!known.has(symbol)) {
              const baseAsset = parseBase(symbol, name)
              const quoteAsset = 'USDT'

              const alsoOnExchanges: string[] = []
              for (const [ex, syms] of this.knownSymbols) {
                if (ex === name) continue
                for (const s of syms) {
                  if (parseBase(s, ex) === baseAsset) {
                    alsoOnExchanges.push(ex)
                    break
                  }
                }
              }

              const listing: NewListing = {
                id: `${name}-${symbol}-${Date.now()}`,
                exchange: name,
                symbol,
                baseAsset,
                quoteAsset,
                detectedAt: Date.now(),
                priceAtDetection: null,
                currentPrice: null,
                priceChange1m: null,
                priceChange5m: null,
                priceChange10m: null,
                volume24h: null,
                alsoOnExchanges,
                status: 'new',
              }

              this.listings.unshift(listing)
              if (this.listings.length > 100) {
                this.listings = this.listings.slice(0, 100)
              }

              this.log(`NEW LISTING: ${baseAsset} on ${name} (${symbol})${alsoOnExchanges.length > 0 ? ` · also on ${alsoOnExchanges.join(', ')}` : ''}`, 'new_listing')

              this.startPriceTracking(listing)
              known.add(symbol)
            }
          }

          this.knownSymbols.set(name, known)
        } else {
          this.log(`Scan error for ${name}: ${String(result.reason)}`, 'error')
        }
      }
    }

    this.stats.lastScanTime = Date.now()
    this.stats.totalScans++
  }

  getListings(): NewListing[] {
    return this.listings
  }

  getStats(): ScannerStats {
    return this.stats
  }
}

// ─── Singleton + exports ──────────────────────────────────────────────────────

export const newListingScanner = new NewListingScanner()

export function getNewListings(): NewListing[] {
  return newListingScanner.getListings()
}

export function getNewListingStats(): ScannerStats {
  return newListingScanner.getStats()
}

export function startNewListingScanner(): void {
  console.log('[NewListingScanner] Starting — building baseline on first scan...')
  newListingScanner.scan().catch(err =>
    console.error('[NewListingScanner] Initial scan error:', err)
  )
  setInterval(() => {
    newListingScanner.scan().catch(err =>
      console.error('[NewListingScanner] Scan error:', err)
    )
  }, 60_000)
}
