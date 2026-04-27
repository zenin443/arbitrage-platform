process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error.message)
  console.error(error.stack)
  // Don't exit — try to keep running
})

process.on('unhandledRejection', (reason: any) => {
  console.error('[FATAL] Unhandled rejection:', reason?.message || reason)
  // Don't exit — try to keep running
})

import http from 'http'
import { WebSocketServer } from 'ws'
import { PriceTick, BaseExchangeAdapter } from './adapters/cex/base'
import { BinanceAdapter } from './adapters/cex/binance'
import { BybitAdapter } from './adapters/cex/bybit'
import { OkxAdapter } from './adapters/cex/okx'
import { KucoinAdapter } from './adapters/cex/kucoin'
import { createAllTier2Adapters } from './adapters/cex/ccxtFactory'
import { CoinbaseAdapter } from './adapters/cex/coinbase'
import { CryptoComAdapter } from './adapters/cex/cryptocom'
import { BitfinexAdapter } from './adapters/cex/bitfinex'
import { BitstampAdapter } from './adapters/cex/bitstamp'
import { UpbitAdapter } from './adapters/cex/upbit'
import { PhemexAdapter } from './adapters/cex/phemex'
import { WhiteBitAdapter } from './adapters/cex/whitebit'
import { LBankAdapter } from './adapters/cex/lbank'
import { CoinExAdapter } from './adapters/cex/coinex'
import { BitMartAdapter } from './adapters/cex/bitmart'
import { AscendExAdapter } from './adapters/cex/ascendex'
import { ProbitAdapter } from './adapters/cex/probit'
import { BtseAdapter } from './adapters/cex/btse'
import { DeribitAdapter } from './adapters/cex/deribit'
import { CoinWAdapter } from './adapters/cex/coinw'
import { tickStore } from './engine/tickStore'
import { calculateAllSpreads } from './engine/spreadCalculator'
import { rankOpportunities } from './engine/opportunityScorer'
import { wsServer } from './feed/wsServer'
import { ArbitrageOpportunity } from './engine/spreadCalculator'
import { BinanceFuturesAdapter } from './adapters/futures/binanceFutures'
import { BybitFuturesAdapter } from './adapters/futures/bybitFutures'
import { OkxFuturesAdapter } from './adapters/futures/okxFutures'
import { FuturesTick } from './adapters/futures/baseFutures'
import { futuresTickStore } from './engine/futuresTickStore'
import { calculateSpotFuturesOpportunities } from './engine/spotFuturesCalculator'
import { fundingRateTracker } from './engine/fundingRateTracker'
import { SpotFuturesOpportunity } from './adapters/futures/baseFutures'
import { JupiterAdapter } from './adapters/dex/jupiter'
import { UniswapAdapter } from './adapters/dex/uniswap'
import { HyperliquidAdapter } from './adapters/dex/hyperliquid'
import { dexTickStore } from './engine/dexTickStore'
import { calculateCexDexOpportunities } from './engine/cexDexCalculator'
import { DexPrice, CexDexOpportunity } from './adapters/dex/base'
import { startNewListingScanner, getNewListings, getNewListingStats } from './scanners/new-listing-scanner'
import { startAlertEngine, getAlertConfig, updateAlertConfig, getRecentAlerts, getAlertStats } from './services/alert-engine'
import { startTradingIntelligence, getActiveGaps, getGapHistory, getTradingStats, getProfitableGaps } from './services/trading-intelligence'
import { startOrderBookFetcher, getCachedDepthAnalysis, getOrderBookCache, registerGapProvider } from './services/orderbook-fetcher'
import { startTriangularEngine, getTriangularRoutes, getCrossPairCount } from './engines/triangularArbitrage'
import { startCrossChainEngine, getCrossChainOpportunities } from './engines/crossChainArbitrage'
import { SYMBOLS } from './config/symbols'
import {
  startPaperTraders,
  getAllBotStates,
  getBotState,
  getBotTrades,
  getBotVoidedSignals,
  getBotRebalances,
  resetBot,
  getMagnusAlphaState,
  getMagnusAlphaPerformance,
  getMagnusAlphaConfig,
  updateMagnusAlphaConfig,
  getMagnusAlphaTrades,
  getMagnusAlphaVoided,
  getMagnusAlphaRebalances,
  resetMagnusAlpha,
  getMagnusFuturesState,
  getMagnusFuturesTrades,
  getMagnusFuturesVoided,
  resetMagnusFutures,
  type MagnusAlphaConfig,
} from './services/paper-trader'

const WS_PORT = 3002
const HTTP_PORT = 3001
const RECALC_INTERVAL_MS = 500

/** All tracked symbols — imported from shared config (90 USDT pairs across 4 tiers) */
export const TRACKED_SYMBOLS = SYMBOLS

// ── State ─────────────────────────────────────────────────────────────────────

let latestOpportunities: ArbitrageOpportunity[] = []
let latestSpotFuturesOpportunities: SpotFuturesOpportunity[] = []
let latestCexDexOpportunities: CexDexOpportunity[] = []

// ── Exchange health tracking ──────────────────────────────────────────────────

const exchangeHealth: Record<string, {
  lastTickAt: number
  status: 'connected' | 'stale' | 'disconnected'
  tickCount: number
  reconnectCount: number
}> = {}

const adapterMap = new Map<string, BaseExchangeAdapter>()
const reconnecting = new Set<string>()

function connectExchange(exchangeId: string): void {
  const adapter = adapterMap.get(exchangeId)
  if (!adapter) {
    console.warn(`[Reconnect] No adapter found for ${exchangeId}`)
    return
  }
  adapter.disconnect()
  adapter.connect(onTick).then(() => {
    exchangeHealth[exchangeId] = {
      lastTickAt: Date.now(),
      status: 'connected',
      tickCount: 0,
      reconnectCount: exchangeHealth[exchangeId]?.reconnectCount ?? 0,
    }
    reconnecting.delete(exchangeId)
  }).catch(err => {
    console.error(`[Reconnect] ${exchangeId} failed:`, err)
    reconnecting.delete(exchangeId)
    reconnectExchange(exchangeId, 1)
  })
}

function reconnectExchange(exchangeId: string, attempt = 0): void {
  if (reconnecting.has(exchangeId)) return
  const baseDelay = 1000
  const maxDelay = 30000
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  const jitter = Math.random() * 1000

  console.log(`[Reconnect] ${exchangeId} — attempt ${attempt + 1}, retry in ${Math.round(delay + jitter)}ms`)

  exchangeHealth[exchangeId] = {
    ...exchangeHealth[exchangeId],
    status: 'disconnected',
    reconnectCount: (exchangeHealth[exchangeId]?.reconnectCount ?? 0) + 1,
  }
  reconnecting.add(exchangeId)

  setTimeout(() => {
    try {
      connectExchange(exchangeId)
    } catch (err) {
      console.error(`[Reconnect] ${exchangeId} failed:`, err)
      reconnecting.delete(exchangeId)
      reconnectExchange(exchangeId, attempt + 1)
    }
  }, delay + jitter)
}

// ── Tick handlers ──────────────────────────────────────────────────────────────

function onTick(tick: PriceTick): void {
  tickStore.upsert(tick)
  const h = exchangeHealth[tick.exchangeId]
  exchangeHealth[tick.exchangeId] = {
    lastTickAt: Date.now(),
    status: 'connected',
    tickCount: (h?.tickCount ?? 0) + 1,
    reconnectCount: h?.reconnectCount ?? 0,
  }
}

function onFuturesTick(tick: FuturesTick): void {
  futuresTickStore.upsert(tick)
}

function onDexPrice(price: DexPrice): void {
  dexTickStore.upsert(price)
}

// ── Recalculation loop ────────────────────────────────────────────────────────

setInterval(() => {
  const spreads = calculateAllSpreads(tickStore)
  latestOpportunities = rankOpportunities(spreads)
  latestSpotFuturesOpportunities = calculateSpotFuturesOpportunities()
  latestCexDexOpportunities = calculateCexDexOpportunities()

  wsServer.broadcast('opportunities', latestOpportunities)
  wsServer.broadcast('ticks', tickStore.getAll())
  wsServer.broadcast('spot-futures', latestSpotFuturesOpportunities)
  wsServer.broadcast('cex-dex', latestCexDexOpportunities)
}, RECALC_INTERVAL_MS)

// ── Exchange stale detection ──────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now()
  Object.entries(exchangeHealth).forEach(([ex, health]) => {
    const age = now - health.lastTickAt
    const wasDisconnected = health.status === 'disconnected'
    if (age > 30000) {
      exchangeHealth[ex].status = 'disconnected'
      if (!wasDisconnected) {
        console.warn(`[Health] ${ex} disconnected — no ticks for ${Math.round(age / 1000)}s`)
        if (adapterMap.has(ex) && !reconnecting.has(ex)) {
          reconnectExchange(ex, 0)
        }
      }
    } else if (age > 15000) {
      if (exchangeHealth[ex].status !== 'stale') {
        exchangeHealth[ex].status = 'stale'
        console.warn(`[Health] ${ex} stale — no ticks for ${Math.round(age / 1000)}s`)
      }
    } else {
      exchangeHealth[ex].status = 'connected'
    }
  })
}, 10000)

// ── HTTP server ───────────────────────────────────────────────────────────────

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString() })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const httpServer = http.createServer(async (req, res) => {
  try {
  const url = new URL(req.url ?? '/', `http://localhost:${HTTP_PORT}`)
  const method = req.method ?? 'GET'

  // ── Alert config ──────────────────────────────────────────────────────────
  if (url.pathname === '/alert-config') {
    if (method === 'GET') {
      json(res, 200, getAlertConfig())
      return
    }
    if (method === 'POST') {
      try {
        const raw = await readBody(req)
        const partial = JSON.parse(raw)
        const updated = updateAlertConfig(partial)
        json(res, 200, updated)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
      }
      return
    }
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (url.pathname === '/alerts' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') ?? '100')
    json(res, 200, {
      alerts: getRecentAlerts(isNaN(limit) ? 100 : limit),
      stats: getAlertStats(),
    })
    return
  }

  // ── Bots / Simulators ─────────────────────────────────────────────────────
  if (url.pathname === '/simulators' && method === 'GET') {
    json(res, 200, getAllBotStates())
    return
  }

  if (url.pathname.startsWith('/simulator/')) {
    const parts = url.pathname.split('/').filter(Boolean)
    const botId = parts[1]
    const action = parts[2]

    if (botId) {
      if (!action && method === 'GET') {
        const state = getBotState(botId)
        if (!state) { json(res, 404, { error: 'Bot not found' }); return }
        json(res, 200, state)
        return
      }
      if (action === 'trades' && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') ?? '50')
        json(res, 200, getBotTrades(botId, isNaN(limit) ? 50 : limit))
        return
      }
      if (action === 'voided' && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') ?? '30')
        json(res, 200, getBotVoidedSignals(botId, isNaN(limit) ? 30 : limit))
        return
      }
      if (action === 'rebalances' && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') ?? '10')
        json(res, 200, getBotRebalances(botId, isNaN(limit) ? 10 : limit))
        return
      }
      if (action === 'reset' && method === 'POST') {
        const state = resetBot(botId)
        if (!state) { json(res, 404, { error: 'Bot not found' }); return }
        json(res, 200, state)
        return
      }
    }
  }

  // ── Magnus Alpha ─────────────────────────────────────────────────────────
  if (url.pathname === '/magnus/alpha' && method === 'GET') {
    json(res, 200, getMagnusAlphaState())
    return
  }
  if (url.pathname === '/magnus/alpha/performance' && method === 'GET') {
    json(res, 200, getMagnusAlphaPerformance())
    return
  }
  if (url.pathname === '/magnus/alpha/config' && method === 'GET') {
    json(res, 200, getMagnusAlphaConfig())
    return
  }
  if (url.pathname === '/magnus/alpha/config' && method === 'POST') {
    try {
      const raw = await readBody(req)
      const partial = raw ? (JSON.parse(raw) as object) : {}
      json(res, 200, updateMagnusAlphaConfig(partial as Partial<MagnusAlphaConfig>))
    } catch {
      json(res, 400, { error: 'Invalid JSON body' })
    }
    return
  }
  if (url.pathname === '/magnus/alpha/trades' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') ?? '50')
    json(res, 200, getMagnusAlphaTrades(isNaN(limit) ? 50 : limit))
    return
  }
  if (url.pathname === '/magnus/alpha/voided' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') ?? '30')
    json(res, 200, getMagnusAlphaVoided(isNaN(limit) ? 30 : limit))
    return
  }
  if (url.pathname === '/magnus/alpha/rebalances' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') ?? '20')
    json(res, 200, getMagnusAlphaRebalances(isNaN(limit) ? 20 : limit))
    return
  }
  if (url.pathname === '/magnus/alpha/reset' && method === 'POST') {
    json(res, 200, resetMagnusAlpha())
    return
  }
  if (url.pathname === '/magnus/beta' && method === 'GET') {
    json(res, 200, getAllBotStates())
    return
  }

  // ── Magnus Futures ─────────────────────────────────────────────────────────
  if (url.pathname === '/magnus/futures' && method === 'GET') {
    const state = getMagnusFuturesState()
    if (!state) { json(res, 503, { error: 'Magnus Futures not initialised yet' }); return }
    json(res, 200, state)
    return
  }
  if (url.pathname === '/magnus/futures/trades' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') ?? '50')
    json(res, 200, getMagnusFuturesTrades(isNaN(limit) ? 50 : limit))
    return
  }
  if (url.pathname === '/magnus/futures/voided' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') ?? '30')
    json(res, 200, getMagnusFuturesVoided(isNaN(limit) ? 30 : limit))
    return
  }
  if (url.pathname === '/magnus/futures/reset' && method === 'POST') {
    json(res, 200, resetMagnusFutures())
    return
  }

  if (method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  if (url.pathname === '/health') {
    const mem = process.memoryUsage()
    const aSt = getBotState('magnus-alpha')
    const t = aSt?.totalTrades ?? 0
    const v = aSt?.voidedSignals ?? 0
    const voidRateA = t + v > 0 ? (v / (t + v)) * 100 : 0
    json(res, 200, {
      status: 'ok',
      ticks: tickStore.getAll().length,
      opportunities: latestOpportunities.length,
      futuresTicks: futuresTickStore.getAll().length,
      spotFuturesOpportunities: latestSpotFuturesOpportunities.length,
      dexPrices: dexTickStore.getAll().length,
      cexDexOpportunities: latestCexDexOpportunities.length,
      newListings: getNewListings().length,
      alertsTotal: getAlertStats().totalAllTime,
      alertEngineRunning: true,
      activeGaps: getActiveGaps().length,
      profitableGaps: getProfitableGaps().length,
      orderBookCacheSize: getOrderBookCache().size,
      triangularRoutes: getTriangularRoutes().length,
      crossPairCount: getCrossPairCount(),
      crossChainOpportunities: getCrossChainOpportunities().length,
      botAlphaValue: getBotState('magnus-beta-1k')?.totalPortfolioValueUsd ?? 0,
      botAlphaPnl: getBotState('magnus-beta-1k')?.totalPnl ?? 0,
      botAlphaTrades: getBotState('magnus-beta-1k')?.totalTrades ?? 0,
      botAlphaVoided: getBotState('magnus-beta-1k')?.voidedSignals ?? 0,
      botBetaValue: getBotState('magnus-beta-10k')?.totalPortfolioValueUsd ?? 0,
      botBetaPnl: getBotState('magnus-beta-10k')?.totalPnl ?? 0,
      botBetaTrades: getBotState('magnus-beta-10k')?.totalTrades ?? 0,
      botBetaVoided: getBotState('magnus-beta-10k')?.voidedSignals ?? 0,
      magnusAlphaValue: aSt?.totalPortfolioValueUsd ?? 0,
      magnusAlphaPnl: aSt?.totalPnl ?? 0,
      magnusAlphaTrades: t,
      magnusAlphaVoided: v,
      magnusAlphaVoidRate: voidRateA,
      clients: wsServer.connectedCount,
      memoryMB: Math.round(mem.heapUsed / 1024 / 1024),
      memoryMaxMB: Math.round(mem.heapTotal / 1024 / 1024),
      exchangeStatus: Object.fromEntries(
        Object.entries(exchangeHealth).map(([ex, h]) => [ex, {
          status: h.status,
          lastTickAge: Math.round((Date.now() - h.lastTickAt) / 1000),
          tickCount: h.tickCount,
        }])
      ),
      connectedExchanges: Object.values(exchangeHealth).filter(h => h.status === 'connected').length,
      totalExchanges: Object.keys(exchangeHealth).length,
    })
    return
  }

  if (url.pathname === '/prices') {
    json(res, 200, tickStore.getAll())
    return
  }

  if (url.pathname === '/opportunities') {
    const minSpread = parseFloat(url.searchParams.get('minSpread') ?? '0')
    const filtered = isNaN(minSpread)
      ? latestOpportunities
      : latestOpportunities.filter(o => o.netSpread >= minSpread)
    json(res, 200, filtered)
    return
  }

  if (url.pathname === '/futures') {
    json(res, 200, futuresTickStore.getAll())
    return
  }

  if (url.pathname === '/spot-futures') {
    json(res, 200, latestSpotFuturesOpportunities)
    return
  }

  if (url.pathname === '/funding-rates') {
    json(res, 200, fundingRateTracker.getAll())
    return
  }

  if (url.pathname === '/dex-prices') {
    json(res, 200, dexTickStore.getAll())
    return
  }

  if (url.pathname === '/cex-dex') {
    json(res, 200, latestCexDexOpportunities)
    return
  }

  if (url.pathname === '/stats') {
    json(res, 200, tickStore.getStats())
    return
  }

  if (url.pathname === '/trading-stats') {
    json(res, 200, getTradingStats())
    return
  }

  if (url.pathname === '/active-gaps') {
    json(res, 200, getActiveGaps())
    return
  }

  if (url.pathname === '/gap-history') {
    const limit = parseInt(url.searchParams.get('limit') ?? '100')
    json(res, 200, getGapHistory(isNaN(limit) ? 100 : limit))
    return
  }

  if (url.pathname === '/profitable-gaps') {
    json(res, 200, getProfitableGaps())
    return
  }

  if (url.pathname === '/orderbook') {
    const symbol = url.searchParams.get('symbol')
    const buyExchange = url.searchParams.get('buyExchange')
    const sellExchange = url.searchParams.get('sellExchange')
    if (!symbol || !buyExchange || !sellExchange) {
      json(res, 400, { error: 'Missing symbol, buyExchange, or sellExchange params' })
      return
    }
    const analysis = getCachedDepthAnalysis(
      symbol,
      buyExchange,
      sellExchange
    )
    json(res, 200, analysis ?? { error: 'No depth data available yet', symbol, buyExchange, sellExchange })
    return
  }

  if (url.pathname === '/triangular') {
    json(res, 200, getTriangularRoutes())
    return
  }

  if (url.pathname === '/cross-chain') {
    json(res, 200, getCrossChainOpportunities())
    return
  }

  if (url.pathname === '/new-listings') {
    json(res, 200, {
      listings: getNewListings(),
      stats: getNewListingStats(),
    })
    return
  }

  json(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(`[HTTP Error] ${req.method} ${req.url}:`, err)
    try {
      json(res, 500, { error: 'Internal server error' })
    } catch { /* response already sent */ }
  }
})

// ── Start sequence ────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // 1. Ensure the WS server singleton (started on import) has successfully bound to its port.
  await new Promise<void>((resolve, reject) => {
    const wss = (wsServer as unknown as { wss: WebSocketServer }).wss
    if (wss.address() !== null) {
      resolve()
    } else {
      wss.once('listening', resolve)
      wss.once('error', (err: Error) => reject(new Error(`WS server failed to bind port ${WS_PORT}: ${err.message}`)))
    }
  })
  console.log(`[PriceServer] WebSocket server listening on ws://localhost:${WS_PORT}`)

  // 2. HTTP server
  await new Promise<void>(resolve => {
    httpServer.listen(HTTP_PORT, () => {
      console.log(`[PriceServer] HTTP server listening on http://localhost:${HTTP_PORT}`)
      console.log(`[PriceServer]   GET /health`)
      console.log(`[PriceServer]   GET /prices`)
      console.log(`[PriceServer]   GET /opportunities`)
      console.log(`[PriceServer]   GET /futures`)
      console.log(`[PriceServer]   GET /spot-futures`)
      console.log(`[PriceServer]   GET /funding-rates`)
      console.log(`[PriceServer]   GET /stats`)
      console.log(`[PriceServer]   GET /dex-prices`)
      console.log(`[PriceServer]   GET /cex-dex`)
      console.log(`[PriceServer]   GET /new-listings`)
      console.log(`[PriceServer]   GET /alert-config`)
      console.log(`[PriceServer]   POST /alert-config`)
      console.log(`[PriceServer]   GET /alerts`)
      console.log(`[PriceServer]   GET /trading-stats`)
      console.log(`[PriceServer]   GET /active-gaps`)
      console.log(`[PriceServer]   GET /gap-history`)
      console.log(`[PriceServer]   GET /profitable-gaps`)
      console.log(`[PriceServer]   GET /triangular`)
      console.log(`[PriceServer]   GET /cross-chain`)
      resolve()
    })
  })

  // 3. Tier 1 spot adapters
  const tier1 = [
    new BinanceAdapter(),
    new BybitAdapter(),
    new OkxAdapter(),
    new KucoinAdapter(),
  ]

  for (const adapter of tier1) {
    adapterMap.set(adapter.config.id, adapter)
    adapter.connect(onTick).catch(err =>
      console.error(`[PriceServer] ${adapter.config.id} connect error: ${String(err)}`)
    )
  }

  // 4. Tier 2 spot adapters (CCXT)
  const tier2 = createAllTier2Adapters()
  for (const adapter of tier2) {
    adapterMap.set(adapter.config.id, adapter)
    adapter.connect(onTick).catch(err =>
      console.error(`[PriceServer] ${adapter.config.id} connect error: ${String(err)}`)
    )
  }

  // 4b. Tier 3 native REST adapters (8 active exchanges)
  // DISABLED — unreliable price data, creates false arbitrage signals (50-1400% fake spreads)
  // bitstamp  — stale prices: FTM $0.046 vs real $0.70, ENJ wrong
  // ascendex  — wrong MATIC price: $0.091 vs real $0.198
  // lbank     — inflated MATIC price: $0.377 vs real $0.198
  // coinw     — low volume, unreliable data quality
  // btse      — low volume, limited coin support
  // deribit   — derivatives exchange, perpetual prices don't match spot
  // probit    — low volume, stale orderbooks
  const tier3 = [
    new CoinbaseAdapter(),
    new CryptoComAdapter(),
    new BitfinexAdapter(),
    // new BitstampAdapter(),   // DISABLED — stale prices (FTM, ENJ)
    new UpbitAdapter(),
    new PhemexAdapter(),
    new WhiteBitAdapter(),
    // new LBankAdapter(),      // DISABLED — inflated MATIC price
    new CoinExAdapter(),
    new BitMartAdapter(),
    // new AscendExAdapter(),   // DISABLED — wrong MATIC price
    // new ProbitAdapter(),     // DISABLED — low volume, stale orderbooks
    // new BtseAdapter(),       // DISABLED — low volume, limited coin support
    // new DeribitAdapter(),    // DISABLED — derivatives, perpetual ≠ spot prices
    // new CoinWAdapter(),      // DISABLED — low volume, unreliable data
  ]

  for (const adapter of tier3) {
    adapterMap.set(adapter.config.id, adapter)
    adapter.connect(onTick).catch(err =>
      console.error(`[PriceServer] ${adapter.config.id} connect error: ${String(err)}`)
    )
  }

  // 5. Futures adapters
  const futuresAdapters = [
    new BinanceFuturesAdapter(),
    new BybitFuturesAdapter(),
    new OkxFuturesAdapter(),
  ]

  for (const adapter of futuresAdapters) {
    adapter.connect(onFuturesTick).catch(err =>
      console.error(`[PriceServer] ${adapter.exchangeId}-futures connect error: ${String(err)}`)
    )
  }

  // 6. Funding rate tracker
  fundingRateTracker.registerAdapters(futuresAdapters)
  fundingRateTracker.start()

  // 7. DEX adapters
  console.log('[DEX] Starting 3 DEX adapters (non-blocking)')
  const dexAdapters = [
    new JupiterAdapter(),
    new UniswapAdapter(),
    new HyperliquidAdapter(),
  ]

  for (const adapter of dexAdapters) {
    console.log(`[DEX] Launching ${adapter.dexId}...`)
    const connectWithTimeout = Promise.race([
      adapter.connect((price) => { dexTickStore.upsert(price) }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
      ),
    ])
    connectWithTimeout
      .then(() => console.log(`[DEX] ${adapter.dexId} connected`))
      .catch((err: Error) => console.error(`[DEX] ${adapter.dexId} failed:`, err.message))
  }

  const totalExchanges = tier1.length + tier2.length + tier3.length
  console.log(`[PriceServer] Startup complete — ${totalExchanges} spot active (${tier1.length} tier1 WS + ${tier2.length} tier2 CCXT + ${tier3.length} tier3 native) + ${futuresAdapters.length} futures + ${dexAdapters.length} DEX exchanges [7 tier3 disabled: bad data]`)

  // 8. New listing scanner
  startNewListingScanner()

  // 9–12. Engines — isolated so one failure doesn't abort the rest
  try { startAlertEngine() } catch (e: any) { console.error('[Startup] Alert engine failed:', e.message) }
  try { startTradingIntelligence() } catch (e: any) { console.error('[Startup] Trading intelligence failed:', e.message) }
  try { startTriangularEngine() } catch (e: any) { console.error('[Startup] Triangular engine failed:', e.message) }
  try { startCrossChainEngine() } catch (e: any) { console.error('[Startup] Cross-chain engine failed:', e.message) }
  try {
    registerGapProvider(getProfitableGaps)
    startOrderBookFetcher()
  } catch (e: any) { console.error('[Startup] Order book fetcher failed:', e.message) }
  try { startPaperTraders() } catch (e: any) { console.error('[Startup] Paper traders failed:', e.message) }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown(): void {
  console.log('[PriceServer] Shutting down…')
  fundingRateTracker.stop()
  tickStore.destroy()
  wsServer.destroy()
  httpServer.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch(err => {
  console.error('[PriceServer] Fatal startup error:', err)
  process.exit(1)
})
