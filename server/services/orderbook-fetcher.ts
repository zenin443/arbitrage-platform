import { GapRecord } from './trading-intelligence'

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderBookLevel = {
  price: number
  quantity: number
  totalUsd: number
}

export type OrderBookSnapshot = {
  exchange: string
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  timestamp: number
  totalBidDepthUsd: number
  totalAskDepthUsd: number
}

export type ProfitPoint = {
  tradeSize: number
  grossProfit: number
  fees: number
  netProfit: number
  spreadAtSize: number
}

export type DepthAnalysis = {
  buyExchange: string
  sellExchange: string
  symbol: string
  spreadAtTop: number
  convergenceSize: number
  profitableSize: number
  profitCurve: ProfitPoint[]
  optimalSize: number
  optimalProfit: number
  buyBookDepthUsd: number
  sellBookDepthUsd: number
}

// ── Symbol formatters ─────────────────────────────────────────────────────────

function toNoSeparator(symbol: string): string {
  return symbol.replace('/', '').toUpperCase()
}

function toDash(symbol: string): string {
  return symbol.replace('/', '-').toUpperCase()
}

function toUnderscore(symbol: string): string {
  return symbol.replace('/', '_').toUpperCase()
}

// ── Per-exchange order book fetchers ─────────────────────────────────────────

type RawLevel = [string, string]

async function fetchBinanceOrderBook(symbol: string): Promise<OrderBookSnapshot | null> {
  try {
    const raw = toNoSeparator(symbol)
    const res = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${raw}&limit=20`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { bids: RawLevel[]; asks: RawLevel[] }
    return buildSnapshot('binance', symbol, data.bids, data.asks)
  } catch {
    return null
  }
}

async function fetchBybitOrderBook(symbol: string): Promise<OrderBookSnapshot | null> {
  try {
    const raw = toNoSeparator(symbol)
    const res = await fetch(
      `https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${raw}&limit=20`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { result: { b: RawLevel[]; a: RawLevel[] } }
    if (!data?.result) return null
    return buildSnapshot('bybit', symbol, data.result.b, data.result.a)
  } catch {
    return null
  }
}

async function fetchOkxOrderBook(symbol: string): Promise<OrderBookSnapshot | null> {
  try {
    const instId = toDash(symbol)
    const res = await fetch(
      `https://www.okx.com/api/v5/market/books?instId=${instId}&sz=20`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as {
      data: Array<{ bids: [string, string, string, string][]; asks: [string, string, string, string][] }>
    }
    if (!data?.data?.[0]) return null
    const entry = data.data[0]!
    const bids: RawLevel[] = entry.bids.map(([p, q]) => [p, q])
    const asks: RawLevel[] = entry.asks.map(([p, q]) => [p, q])
    return buildSnapshot('okx', symbol, bids, asks)
  } catch {
    return null
  }
}

async function fetchKucoinOrderBook(symbol: string): Promise<OrderBookSnapshot | null> {
  try {
    const sym = toDash(symbol)
    const res = await fetch(
      `https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${sym}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { data: { bids: RawLevel[]; asks: RawLevel[] } }
    if (!data?.data) return null
    return buildSnapshot('kucoin', symbol, data.data.bids, data.data.asks)
  } catch {
    return null
  }
}

async function fetchGateioOrderBook(symbol: string): Promise<OrderBookSnapshot | null> {
  try {
    const pair = toUnderscore(symbol)
    const res = await fetch(
      `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${pair}&limit=20`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { bids: RawLevel[]; asks: RawLevel[] }
    return buildSnapshot('gateio', symbol, data.bids, data.asks)
  } catch {
    return null
  }
}

async function fetchCoinbaseOrderBook(symbol: string): Promise<OrderBookSnapshot | null> {
  try {
    // Coinbase uses USD not USDT, and BTC-USD format
    const productId = symbol.replace('/USDT', '-USD').replace('/USDC', '-USDC').toUpperCase()
    const res = await fetch(
      `https://api.exchange.coinbase.com/products/${productId}/book?level=2`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { bids: [string, string, string][]; asks: [string, string, string][] }
    const bids: RawLevel[] = (data.bids ?? []).slice(0, 20).map(([p, q]) => [p, q])
    const asks: RawLevel[] = (data.asks ?? []).slice(0, 20).map(([p, q]) => [p, q])
    return buildSnapshot('coinbase', symbol, bids, asks)
  } catch {
    return null
  }
}

// ── Snapshot builder ──────────────────────────────────────────────────────────

function buildSnapshot(
  exchange: string,
  symbol: string,
  rawBids: RawLevel[],
  rawAsks: RawLevel[]
): OrderBookSnapshot {
  const bids: OrderBookLevel[] = []
  let bidDepth = 0
  for (const [p, q] of rawBids) {
    const price = parseFloat(p)
    const quantity = parseFloat(q)
    if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) continue
    const totalUsd = parseFloat((price * quantity).toFixed(8))
    bidDepth += totalUsd
    bids.push({ price, quantity, totalUsd })
  }
  // Bids: descending (highest first — already from API)
  bids.sort((a, b) => b.price - a.price)

  const asks: OrderBookLevel[] = []
  let askDepth = 0
  for (const [p, q] of rawAsks) {
    const price = parseFloat(p)
    const quantity = parseFloat(q)
    if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) continue
    const totalUsd = parseFloat((price * quantity).toFixed(8))
    askDepth += totalUsd
    asks.push({ price, quantity, totalUsd })
  }
  // Asks: ascending (lowest first)
  asks.sort((a, b) => a.price - b.price)

  return {
    exchange,
    symbol,
    bids,
    asks,
    timestamp: Date.now(),
    totalBidDepthUsd: parseFloat(bidDepth.toFixed(2)),
    totalAskDepthUsd: parseFloat(askDepth.toFixed(2)),
  }
}

// ── Exchange dispatch ─────────────────────────────────────────────────────────

const SUPPORTED_EXCHANGES = new Set([
  'binance', 'bybit', 'okx', 'kucoin', 'gateio', 'coinbase'
])

async function fetchOrderBook(exchange: string, symbol: string): Promise<OrderBookSnapshot | null> {
  switch (exchange) {
    case 'binance': return fetchBinanceOrderBook(symbol)
    case 'bybit': return fetchBybitOrderBook(symbol)
    case 'okx': return fetchOkxOrderBook(symbol)
    case 'kucoin': return fetchKucoinOrderBook(symbol)
    case 'gateio': return fetchGateioOrderBook(symbol)
    case 'coinbase': return fetchCoinbaseOrderBook(symbol)
    default: return null
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10_000
const obCache = new Map<string, OrderBookSnapshot>()
const depthCache = new Map<string, DepthAnalysis>()

function cacheKey(exchange: string, symbol: string): string {
  return `${exchange}-${symbol}`
}

function depthKey(symbol: string, buyEx: string, sellEx: string): string {
  return `${symbol}|${buyEx}|${sellEx}`
}

function getCachedBook(exchange: string, symbol: string): OrderBookSnapshot | null {
  const key = cacheKey(exchange, symbol)
  const hit = obCache.get(key)
  if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) return hit
  return null
}

export function getOrderBookCache(): Map<string, OrderBookSnapshot> {
  return obCache
}

// ── Core depth analysis algorithm ─────────────────────────────────────────────

const ROUNDTRIP_FEE_PCT = 0.002  // 0.2% total (0.1% each side)
const CURVE_CHECKPOINTS = [100, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000]

export function analyzeDepth(
  buyBook: OrderBookSnapshot,
  sellBook: OrderBookSnapshot,
  feePercent = ROUNDTRIP_FEE_PCT
): DepthAnalysis {
  const asks = buyBook.asks   // we buy from ask side
  const bids = sellBook.bids  // we sell to bid side

  const topAsk = asks[0]?.price ?? 0
  const topBid = bids[0]?.price ?? 0
  const spreadAtTop = topAsk > 0
    ? parseFloat(((topBid - topAsk) / topAsk * 100).toFixed(6))
    : 0

  let convergenceSize = 0
  let profitableSize = 0
  let optimalSize = 0
  let optimalProfit = -Infinity

  const profitCurve: ProfitPoint[] = []
  const checkpointSet = new Set(CURVE_CHECKPOINTS)

  // Walk order books simultaneously
  let askIdx = 0
  let bidIdx = 0
  let askConsumedQty = 0  // how much of current ask level we've consumed (in base units)
  let bidConsumedQty = 0

  let totalBuyUsd = 0
  let totalBuyBaseQty = 0
  let totalSellUsd = 0
  let totalSellBaseQty = 0

  let reachedConvergence = false
  let reachedProfitable = false

  // We'll step in increments of USD and track the VWAP
  // Strategy: walk through order book levels, computing step by step
  function computeAtSize(targetUsd: number): {
    effectiveBuyPrice: number
    effectiveSellPrice: number
    spreadPct: number
  } | null {
    let buyUsd = 0
    let buyQty = 0
    let sellUsd = 0
    let sellQty = 0
    let ai = 0
    let bi = 0
    let buyDone = false
    let sellDone = false

    while (buyUsd < targetUsd && ai < asks.length) {
      const level = asks[ai]!
      const remaining = targetUsd - buyUsd
      const available = level.totalUsd
      if (available <= remaining) {
        buyUsd += available
        buyQty += level.quantity
        ai++
      } else {
        const fraction = remaining / available
        buyUsd += remaining
        buyQty += level.quantity * fraction
        buyDone = true
        break
      }
      if (ai >= asks.length && buyUsd < targetUsd) { buyDone = false; break }
    }
    if (!buyDone && buyUsd < targetUsd) return null  // ran out of book

    while (sellUsd < targetUsd && bi < bids.length) {
      const level = bids[bi]!
      const remaining = targetUsd - sellUsd
      const available = level.totalUsd
      if (available <= remaining) {
        sellUsd += available
        sellQty += level.quantity
        bi++
      } else {
        const fraction = remaining / available
        sellUsd += remaining
        sellQty += level.quantity * fraction
        break
      }
      if (bi >= bids.length && sellUsd < targetUsd) return null  // ran out of sell book
    }

    if (buyQty <= 0 || sellQty <= 0) return null
    const effectiveBuyPrice = buyUsd / buyQty
    const effectiveSellPrice = sellUsd / sellQty
    const spreadPct = parseFloat(
      ((effectiveSellPrice - effectiveBuyPrice) / effectiveBuyPrice * 100).toFixed(6)
    )
    return { effectiveBuyPrice, effectiveSellPrice, spreadPct }
  }

  // Walk levels to find convergence and profitable size
  // Merge both sides into a unified traversal
  let cumulativeBuyUsd = 0
  let cumulativeSellUsd = 0

  // We need to find the size where spread drops to 0 or to fee level
  // Do this by scanning at each order book boundary
  const boundaries = new Set<number>([0])
  let sumBuy = 0
  for (const level of asks) {
    sumBuy += level.totalUsd
    boundaries.add(parseFloat(sumBuy.toFixed(2)))
  }
  let sumSell = 0
  for (const level of bids) {
    sumSell += level.totalUsd
    boundaries.add(parseFloat(sumSell.toFixed(2)))
  }
  for (const cp of CURVE_CHECKPOINTS) boundaries.add(cp)

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)
  const maxDepth = Math.min(buyBook.totalAskDepthUsd, sellBook.totalBidDepthUsd)

  let prevSpread = spreadAtTop

  for (const size of sortedBoundaries) {
    if (size <= 0) continue
    if (size > maxDepth) {
      // Hit the edge — we ran out of one side
      if (!reachedConvergence) convergenceSize = maxDepth
      if (!reachedProfitable) profitableSize = maxDepth
      break
    }

    const result = computeAtSize(size)
    if (!result) break

    const { spreadPct } = result
    const grossProfit = parseFloat((size * (spreadPct / 100)).toFixed(4))
    const fees = parseFloat((size * feePercent).toFixed(4))
    const netProfit = parseFloat((grossProfit - fees).toFixed(4))

    if (!reachedConvergence && spreadPct <= 0 && prevSpread > 0) {
      // Linear interpolation to find exact zero crossing
      const ratio = prevSpread / (prevSpread - spreadPct)
      const prevSize = sortedBoundaries[sortedBoundaries.indexOf(size) - 1] ?? 0
      convergenceSize = parseFloat((prevSize + ratio * (size - prevSize)).toFixed(2))
      reachedConvergence = true
    }

    if (!reachedProfitable && netProfit <= 0 && prevSpread > 0) {
      const ratio = Math.abs(netProfit) / (Math.abs(netProfit) + Math.abs(
        (parseFloat(((size * 0.9) * ((prevSpread / 100))).toFixed(4))) - parseFloat(((size * 0.9) * feePercent).toFixed(4))
      ))
      const prevSize = sortedBoundaries[sortedBoundaries.indexOf(size) - 1] ?? 0
      profitableSize = parseFloat((prevSize + (1 - ratio) * (size - prevSize)).toFixed(2))
      reachedProfitable = true
    }

    if (netProfit > optimalProfit) {
      optimalProfit = netProfit
      optimalSize = size
    }

    if (checkpointSet.has(size)) {
      profitCurve.push({
        tradeSize: size,
        grossProfit,
        fees,
        netProfit,
        spreadAtSize: spreadPct,
      })
    }

    prevSpread = spreadPct
    cumulativeBuyUsd = size
    cumulativeSellUsd = size
  }

  // Fill in any missing checkpoints from the curve
  for (const cp of CURVE_CHECKPOINTS) {
    if (!profitCurve.find(p => p.tradeSize === cp)) {
      if (cp <= maxDepth) {
        const result = computeAtSize(cp)
        if (result) {
          const { spreadPct } = result
          const grossProfit = parseFloat((cp * (spreadPct / 100)).toFixed(4))
          const fees = parseFloat((cp * feePercent).toFixed(4))
          const netProfit = parseFloat((grossProfit - fees).toFixed(4))
          profitCurve.push({ tradeSize: cp, grossProfit, fees, netProfit, spreadAtSize: spreadPct })
        } else {
          profitCurve.push({ tradeSize: cp, grossProfit: 0, fees: 0, netProfit: 0, spreadAtSize: 0 })
        }
      } else {
        profitCurve.push({ tradeSize: cp, grossProfit: 0, fees: 0, netProfit: 0, spreadAtSize: 0 })
      }
    }
  }

  profitCurve.sort((a, b) => a.tradeSize - b.tradeSize)

  if (!reachedConvergence) convergenceSize = maxDepth
  if (!reachedProfitable) profitableSize = maxDepth
  if (optimalProfit === -Infinity) { optimalProfit = 0; optimalSize = 0 }

  return {
    buyExchange: buyBook.exchange,
    sellExchange: sellBook.exchange,
    symbol: buyBook.symbol,
    spreadAtTop,
    convergenceSize: parseFloat(convergenceSize.toFixed(2)),
    profitableSize: parseFloat(profitableSize.toFixed(2)),
    profitCurve,
    optimalSize: parseFloat(optimalSize.toFixed(2)),
    optimalProfit: parseFloat(optimalProfit.toFixed(4)),
    buyBookDepthUsd: buyBook.totalAskDepthUsd,
    sellBookDepthUsd: sellBook.totalBidDepthUsd,
  }
}

// ── Public fetch-and-analyze ──────────────────────────────────────────────────

export async function fetchAndAnalyzeDepth(gap: GapRecord): Promise<DepthAnalysis | null> {
  if (!SUPPORTED_EXCHANGES.has(gap.buyExchange) || !SUPPORTED_EXCHANGES.has(gap.sellExchange)) {
    return null
  }

  const [buyBook, sellBook] = await Promise.all([
    fetchOrderBook(gap.buyExchange, gap.symbol),
    fetchOrderBook(gap.sellExchange, gap.symbol),
  ])

  if (!buyBook || !sellBook) return null
  if (buyBook.asks.length === 0 || sellBook.bids.length === 0) return null

  obCache.set(cacheKey(gap.buyExchange, gap.symbol), buyBook)
  obCache.set(cacheKey(gap.sellExchange, gap.symbol), sellBook)

  const analysis = analyzeDepth(buyBook, sellBook)
  depthCache.set(depthKey(gap.symbol, gap.buyExchange, gap.sellExchange), analysis)
  return analysis
}

export function getCachedDepthAnalysis(
  symbol: string,
  buyEx: string,
  sellEx: string
): DepthAnalysis | null {
  return depthCache.get(depthKey(symbol, buyEx, sellEx)) ?? null
}

// ── Polling loop ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000
const STAGGER_MS = 200
const TOP_N_GAPS = 10
let pollerRunning = false

let getTopGapsFn: (() => GapRecord[]) | null = null

export function registerGapProvider(fn: () => GapRecord[]): void {
  getTopGapsFn = fn
}

async function runPollCycle(): Promise<void> {
  if (!getTopGapsFn) return
  const topGaps = getTopGapsFn()
    .filter(g => SUPPORTED_EXCHANGES.has(g.buyExchange) && SUPPORTED_EXCHANGES.has(g.sellExchange))
    .slice(0, TOP_N_GAPS)

  for (let i = 0; i < topGaps.length; i++) {
    const gap = topGaps[i]!
    if (i > 0) await new Promise(r => setTimeout(r, STAGGER_MS))

    const buyKey = cacheKey(gap.buyExchange, gap.symbol)
    const sellKey = cacheKey(gap.sellExchange, gap.symbol)
    const buyHit = obCache.get(buyKey)
    const sellHit = obCache.get(sellKey)
    const now = Date.now()

    const needBuy = !buyHit || now - buyHit.timestamp >= CACHE_TTL_MS
    const needSell = !sellHit || now - sellHit.timestamp >= CACHE_TTL_MS

    if (!needBuy && !needSell) {
      // Both cached — re-run analysis with cached books
      const analysis = analyzeDepth(buyHit!, sellHit!)
      depthCache.set(depthKey(gap.symbol, gap.buyExchange, gap.sellExchange), analysis)
      continue
    }

    const fetches: Promise<void>[] = []
    if (needBuy) {
      fetches.push(
        fetchOrderBook(gap.buyExchange, gap.symbol).then(book => {
          if (book) obCache.set(buyKey, book)
        })
      )
    }
    if (needSell) {
      fetches.push(
        fetchOrderBook(gap.sellExchange, gap.symbol).then(book => {
          if (book) obCache.set(sellKey, book)
        })
      )
    }

    await Promise.all(fetches)

    const freshBuy = obCache.get(buyKey)
    const freshSell = obCache.get(sellKey)
    if (freshBuy && freshSell && freshBuy.asks.length > 0 && freshSell.bids.length > 0) {
      const analysis = analyzeDepth(freshBuy, freshSell)
      depthCache.set(depthKey(gap.symbol, gap.buyExchange, gap.sellExchange), analysis)
    }
  }
}

export function startOrderBookFetcher(): void {
  if (pollerRunning) return
  pollerRunning = true
  setInterval(() => {
    runPollCycle().catch(err => {
      console.error('[OrderBookFetcher] Poll cycle error:', (err as Error).message)
    })
  }, POLL_INTERVAL_MS)
  console.log('[OrderBookFetcher] Started — polling top 10 gaps every 5s')
}
