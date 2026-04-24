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

// ── Tick handler ──────────────────────────────────────────────────────────────

function onTick(tick: PriceTick): void {
  tickStore.upsert(tick)
}

// ── Recalculation loop ────────────────────────────────────────────────────────

setInterval(() => {
  const spreads = calculateAllSpreads(tickStore)
  latestOpportunities = rankOpportunities(spreads)

  wsServer.broadcast('opportunities', latestOpportunities)
  wsServer.broadcast('ticks', tickStore.getAll())
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

  if (url.pathname === '/stats') {
    json(res, 200, tickStore.getStats())
    return
  }

  json(res, 404, { error: 'Not found' })
})

// ── Start sequence ────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // 1. Ensure the WS server singleton (started on import) has successfully bound to its port.
  //    If the port is already in use the constructor emits 'error' — we surface that here so
  //    the process exits with a clear message instead of running silently broken.
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
      console.log(`[PriceServer]   GET /stats`)
      resolve()
    })
  })

  // 3. Tier 1 adapters
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

  // 4. Tier 2 adapters (CCXT)
  const tier2 = createAllTier2Adapters()
  for (const adapter of tier2) {
    adapter.connect(onTick).catch(err =>
      console.error(`[PriceServer] ${adapter.config.id} connect error: ${String(err)}`)
    )
  }

  const totalExchanges = tier1.length + tier2.length
  console.log(`[PriceServer] Startup complete — connecting to ${totalExchanges} exchanges`)
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown(): void {
  console.log('[PriceServer] Shutting down…')
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
