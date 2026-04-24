import http from 'http'
import { WebSocketServer } from 'ws'
import { PriceTick } from './adapters/cex/base'
import { BinanceAdapter } from './adapters/cex/binance'
import { BybitAdapter } from './adapters/cex/bybit'
import { OkxAdapter } from './adapters/cex/okx'
import { KucoinAdapter } from './adapters/cex/kucoin'
import { createAllTier2Adapters } from './adapters/cex/ccxtFactory'
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

const WS_PORT = 3002
const HTTP_PORT = 3001
const RECALC_INTERVAL_MS = 500

export const TRACKED_SYMBOLS = [
  // USDT pairs
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT',
  'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ADA/USDT', 'DOT/USDT',
  // USDC pairs
  'BTC/USDC', 'ETH/USDC', 'SOL/USDC', 'XRP/USDC', 'BNB/USDC',
  'DOGE/USDC', 'AVAX/USDC', 'LINK/USDC', 'ADA/USDC', 'DOT/USDC',
]

// ── State ─────────────────────────────────────────────────────────────────────

let latestOpportunities: ArbitrageOpportunity[] = []
let latestSpotFuturesOpportunities: SpotFuturesOpportunity[] = []
let latestCexDexOpportunities: CexDexOpportunity[] = []

// ── Tick handlers ──────────────────────────────────────────────────────────────

function onTick(tick: PriceTick): void {
  tickStore.upsert(tick)
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

// ── HTTP server ───────────────────────────────────────────────────────────────

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

const httpServer = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  const url = new URL(req.url ?? '/', `http://localhost:${HTTP_PORT}`)

  if (url.pathname === '/health') {
    json(res, 200, {
      status: 'ok',
      ticks: tickStore.getAll().length,
      opportunities: latestOpportunities.length,
      futuresTicks: futuresTickStore.getAll().length,
      spotFuturesOpportunities: latestSpotFuturesOpportunities.length,
      dexPrices: dexTickStore.getAll().length,
      cexDexOpportunities: latestCexDexOpportunities.length,
      clients: wsServer.connectedCount,
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

  json(res, 404, { error: 'Not found' })
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
    adapter.connect(onTick).catch(err =>
      console.error(`[PriceServer] ${adapter.config.id} connect error: ${String(err)}`)
    )
  }

  // 4. Tier 2 spot adapters (CCXT)
  const tier2 = createAllTier2Adapters()
  for (const adapter of tier2) {
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

  const totalExchanges = tier1.length + tier2.length
  console.log(`[PriceServer] Startup complete — ${totalExchanges} spot + ${futuresAdapters.length} futures + ${dexAdapters.length} DEX exchanges`)
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
