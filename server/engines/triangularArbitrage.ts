/**
 * Triangular Arbitrage Engine
 *
 * Detects intra-exchange triangular mispricings.
 * Route A: USDT → BTC → ALT → USDT
 * Route B: USDT → ALT → BTC → USDT (reverse)
 *
 * Cross-pair prices (ALT/BTC) are NOT in the WebSocket tick store,
 * so we REST-poll them serially (one exchange at a time) every 10 seconds.
 */

import { tickStore } from '../engine/tickStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TriangularRoute {
  id: string
  exchange: string
  path: string           // e.g. "USDT → BTC → ETH → USDT"
  baseSymbol: string     // e.g. "BTC/USDT"
  crossSymbol: string    // e.g. "ETH/BTC"
  altSymbol: string      // e.g. "ETH/USDT"
  profitPercent: number
  direction: 'forward' | 'reverse'
  prices: {
    step1: number
    step2: number
    step3: number
  }
  feesPercent: number
  netProfitPercent: number
  /** Net spread after compounded 3-leg fees, as a decimal (e.g. 0.0018 = 0.18%) */
  netSpread: number
  estimatedProfit1k: number
  detectedAt: number
}

interface CrossPairPrice {
  exchange: string
  symbol: string      // normalized, e.g. "ETH/BTC"
  bid: number
  ask: number
  timestamp: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_ROUTES = 50
const MAX_NET_PROFIT_PERCENT = 5.0
const MIN_NET_PROFIT_PERCENT = 0.15  // suppress signals below 0.15% net — reduces false positives

// Taker fees per exchange (spot taker rate as a decimal fraction)
const EXCHANGE_TAKER_FEES: Record<string, number> = {
  binance:  0.001,   // 0.10%
  bybit:    0.001,   // 0.10%
  okx:      0.0008,  // 0.08%
  kucoin:   0.001,   // 0.10%
  kraken:   0.0026,  // 0.26%
  coinbase: 0.006,   // 0.60%
  huobi:    0.002,   // 0.20%
  gateio:   0.002,   // 0.20%
  gate:     0.002,   // 0.20% (alias)
  mexc:     0.002,   // 0.20%
}
const DEFAULT_TAKER_FEE = 0.002  // 0.20% fallback for unknown exchanges

/**
 * Compounded 3-leg fee drag as a percentage.
 * Uses multiplicative compounding: (1 - fee)^3
 * e.g. binance: (1 - 0.001)^3 = 0.997003 → 0.2997% total drag
 */
function getRoundtripFeePercent(exchange: string): number {
  const fee = EXCHANGE_TAKER_FEES[exchange] ?? DEFAULT_TAKER_FEE
  return (1 - Math.pow(1 - fee, 3)) * 100
}

/**
 * Compounded fee multiplier for 3 legs: (1 - fee)^3
 */
function getFeeCompoundFactor(exchange: string): number {
  const fee = EXCHANGE_TAKER_FEES[exchange] ?? DEFAULT_TAKER_FEE
  return Math.pow(1 - fee, 3)
}

// Cross-pairs: BTC as intermediate (most liquid), plus USDC loops
const CROSS_PAIRS = [
  { alt: 'ETH',  intermediate: 'BTC' },
  { alt: 'SOL',  intermediate: 'BTC' },
  { alt: 'XRP',  intermediate: 'BTC' },
  { alt: 'ADA',  intermediate: 'BTC' },
  { alt: 'DOGE', intermediate: 'BTC' },
  { alt: 'AVAX', intermediate: 'BTC' },
  { alt: 'LINK', intermediate: 'BTC' },
  { alt: 'DOT',  intermediate: 'BTC' },
  { alt: 'BNB',  intermediate: 'BTC' },
  { alt: 'LTC',  intermediate: 'BTC' },
  { alt: 'BCH',  intermediate: 'BTC' },
  { alt: 'ATOM', intermediate: 'BTC' },
  // ETH as intermediate — second triangular tier
  { alt: 'SOL',  intermediate: 'ETH' },
  { alt: 'BNB',  intermediate: 'ETH' },
  { alt: 'LINK', intermediate: 'ETH' },
]

// Expanded to 5 active exchanges
const ACTIVE_EXCHANGES = ['binance', 'bybit', 'okx', 'kucoin', 'gateio']

// Exchange-specific symbol formatting
function formatSymbol(alt: string, intermediate: string, exchange: string): string {
  if (exchange === 'okx') {
    return `${alt}-${intermediate}`
  }
  return `${alt}${intermediate}` // Binance, Bybit
}

// REST endpoints
const EXCHANGE_ENDPOINTS: Record<string, (symbol: string) => string> = {
  binance: (sym) => `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${sym}`,
  bybit:   (sym) => `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym}`,
  okx:     (sym) => `https://www.okx.com/api/v5/market/ticker?instId=${sym}`,
}

// ── Cross-pair price store ─────────────────────────────────────────────────────

const crossPriceStore = new Map<string, CrossPairPrice>()

function cpKey(exchange: string, normalizedSymbol: string): string {
  return `${exchange}:${normalizedSymbol}`
}

// ── REST parsers ──────────────────────────────────────────────────────────────

async function fetchBinanceCrossPair(alt: string, intermediate: string): Promise<void> {
  const sym = formatSymbol(alt, intermediate, 'binance')
  try {
    const res = await fetch(EXCHANGE_ENDPOINTS.binance(sym), { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return
    const data = await res.json() as { bidPrice: string; askPrice: string }
    const bid = parseFloat(data.bidPrice)
    const ask = parseFloat(data.askPrice)
    if (!bid || !ask) return
    const normalized = `${alt}/${intermediate}`
    crossPriceStore.set(cpKey('binance', normalized), { exchange: 'binance', symbol: normalized, bid, ask, timestamp: Date.now() })
  } catch {
    // non-fatal
  }
}

async function fetchBybitCrossPair(alt: string, intermediate: string): Promise<void> {
  const sym = formatSymbol(alt, intermediate, 'bybit')
  try {
    const res = await fetch(EXCHANGE_ENDPOINTS.bybit(sym), { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return
    const data = await res.json() as { result: { list: Array<{ bid1Price: string; ask1Price: string }> } }
    const item = data?.result?.list?.[0]
    if (!item) return
    const bid = parseFloat(item.bid1Price)
    const ask = parseFloat(item.ask1Price)
    if (!bid || !ask) return
    const normalized = `${alt}/${intermediate}`
    crossPriceStore.set(cpKey('bybit', normalized), { exchange: 'bybit', symbol: normalized, bid, ask, timestamp: Date.now() })
  } catch {
    // non-fatal
  }
}

async function fetchOkxCrossPair(alt: string, intermediate: string): Promise<void> {
  const sym = formatSymbol(alt, intermediate, 'okx')
  try {
    const res = await fetch(EXCHANGE_ENDPOINTS.okx(sym), { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return
    const data = await res.json() as { data: Array<{ bidPx: string; askPx: string }> }
    const item = data?.data?.[0]
    if (!item) return
    const bid = parseFloat(item.bidPx)
    const ask = parseFloat(item.askPx)
    if (!bid || !ask) return
    const normalized = `${alt}/${intermediate}`
    crossPriceStore.set(cpKey('okx', normalized), { exchange: 'okx', symbol: normalized, bid, ask, timestamp: Date.now() })
  } catch {
    // non-fatal
  }
}

async function fetchCrossPairsForExchange(exchange: string): Promise<void> {
  for (const { alt, intermediate } of CROSS_PAIRS) {
    try {
      if (exchange === 'binance') await fetchBinanceCrossPair(alt, intermediate)
      else if (exchange === 'bybit') await fetchBybitCrossPair(alt, intermediate)
      else if (exchange === 'okx') await fetchOkxCrossPair(alt, intermediate)
    } catch {
      // non-fatal per pair
    }
  }
}

async function pollCrossPairs(): Promise<void> {
  for (const exchange of ACTIVE_EXCHANGES) {
    try {
      await fetchCrossPairsForExchange(exchange)
    } catch (e: any) {
      console.error(`[Triangular] ${exchange} cross-pair fetch failed:`, e.message)
    }
    await new Promise(r => setTimeout(r, 1000)) // 1s delay between exchanges
  }
}

// ── Opportunity calculation ───────────────────────────────────────────────────

function computeTriangularRoutes(): TriangularRoute[] {
  const routes: TriangularRoute[] = []
  const now = Date.now()
  const stale = now - 15_000 // ignore prices older than 15s

  const allTicks = tickStore.getAll()

  for (const exchange of ACTIVE_EXCHANGES) {
    for (const { alt, intermediate } of CROSS_PAIRS) {
      const crossKey = cpKey(exchange, `${alt}/${intermediate}`)
      const cp = crossPriceStore.get(crossKey)
      if (!cp || cp.timestamp < stale) continue

      // Find USDT pairs for this exchange
      const baseTick  = allTicks.find(t => t.exchangeId === exchange && t.symbol === `${intermediate}/USDT`)
      const altTick   = allTicks.find(t => t.exchangeId === exchange && t.symbol === `${alt}/USDT`)

      if (!baseTick || !altTick) continue
      if (baseTick.ask <= 0 || baseTick.bid <= 0) continue
      if (altTick.ask <= 0 || altTick.bid <= 0) continue

      // ── Forward: USDT → BTC → ALT → USDT
      // Step 1: buy BTC with USDT at baseTick.ask
      // Step 2: buy ALT with BTC at cp.ask
      // Step 3: sell ALT for USDT at altTick.bid
      {
        const step1 = baseTick.ask   // USDT per BTC (we pay this)
        const step2 = cp.ask          // BTC per ALT (we pay this)
        const step3 = altTick.bid     // USDT per ALT (we receive this)

        // 1 USDT → (1/step1) BTC → (1/step1/step2) ALT → (step3/(step1*step2)) USDT
        const grossReturn = step3 / (step1 * step2)
        const profitPercent = (grossReturn - 1) * 100

        // Compounded 3-leg fee: each leg reduces the working capital by (1-fee)
        const feeCompound = getFeeCompoundFactor(exchange)
        const netReturn = grossReturn * feeCompound
        const netProfitPercent = (netReturn - 1) * 100
        const feesPercent = getRoundtripFeePercent(exchange)
        const netSpread = parseFloat((netProfitPercent / 100).toFixed(6))
        const estimatedProfit1k = 1000 * (netProfitPercent / 100)

        if (netProfitPercent > MIN_NET_PROFIT_PERCENT && netProfitPercent <= MAX_NET_PROFIT_PERCENT) {
          routes.push({
            id: `tri-${exchange}-fwd-${alt}-${now}`,
            exchange,
            path: `USDT → ${intermediate} → ${alt} → USDT`,
            baseSymbol: `${intermediate}/USDT`,
            crossSymbol: `${alt}/${intermediate}`,
            altSymbol: `${alt}/USDT`,
            profitPercent: parseFloat(profitPercent.toFixed(4)),
            direction: 'forward',
            prices: { step1, step2, step3 },
            feesPercent: parseFloat(feesPercent.toFixed(4)),
            netProfitPercent: parseFloat(netProfitPercent.toFixed(4)),
            netSpread,
            estimatedProfit1k: parseFloat(estimatedProfit1k.toFixed(2)),
            detectedAt: now,
          })
        }
      }

      // ── Reverse: USDT → ALT → BTC → USDT
      {
        const step1 = altTick.ask
        const step2 = cp.bid
        const step3 = baseTick.bid

        const grossReturn = (step2 * step3) / step1
        const profitPercent = (grossReturn - 1) * 100

        // Compounded 3-leg fee: each leg reduces the working capital by (1-fee)
        const feeCompound = getFeeCompoundFactor(exchange)
        const netReturn = grossReturn * feeCompound
        const netProfitPercent = (netReturn - 1) * 100
        const feesPercent = getRoundtripFeePercent(exchange)
        const netSpread = parseFloat((netProfitPercent / 100).toFixed(6))
        const estimatedProfit1k = 1000 * (netProfitPercent / 100)

        if (netProfitPercent > MIN_NET_PROFIT_PERCENT && netProfitPercent <= MAX_NET_PROFIT_PERCENT) {
          routes.push({
            id: `tri-${exchange}-rev-${alt}-${now}`,
            exchange,
            path: `USDT → ${alt} → ${intermediate} → USDT`,
            baseSymbol: `${intermediate}/USDT`,
            crossSymbol: `${alt}/${intermediate}`,
            altSymbol: `${alt}/USDT`,
            profitPercent: parseFloat(profitPercent.toFixed(4)),
            direction: 'reverse',
            prices: { step1, step2, step3 },
            feesPercent: parseFloat(feesPercent.toFixed(4)),
            netProfitPercent: parseFloat(netProfitPercent.toFixed(4)),
            netSpread,
            estimatedProfit1k: parseFloat(estimatedProfit1k.toFixed(2)),
            detectedAt: now,
          })
        }
      }
    }
  }

  return routes.sort((a, b) => b.netProfitPercent - a.netProfitPercent).slice(0, MAX_ROUTES)
}

// ── State ─────────────────────────────────────────────────────────────────────

let latestRoutes: TriangularRoute[] = []
let isStarted = false

// ── Public API ────────────────────────────────────────────────────────────────

export function getTriangularRoutes(): TriangularRoute[] {
  return latestRoutes
}

export function getCrossPairCount(): number {
  return crossPriceStore.size
}

async function evaluate(): Promise<void> {
  try {
    await pollCrossPairs()
    latestRoutes = computeTriangularRoutes()
  } catch (error: any) {
    console.error('[Triangular] evaluate() error:', error.message)
  }
}

export function startTriangularEngine(): void {
  if (isStarted) return
  isStarted = true

  // Initial poll
  evaluate().then(() => {
    console.log(`[Triangular] Initial poll complete — ${crossPriceStore.size} cross-pairs loaded`)
  }).catch(() => { /* non-fatal */ })

  // Evaluate every 10 seconds
  setInterval(evaluate, 10_000)

  console.log('[Triangular] Engine started — polling cross-pairs every 10s (serial, 3 exchanges)')
}
