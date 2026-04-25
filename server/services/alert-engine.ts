import fs from 'fs'
import path from 'path'
import { tickStore } from '../engine/tickStore'
import { calculateAllSpreads } from '../engine/spreadCalculator'
import { rankOpportunities } from '../engine/opportunityScorer'
import { calculateSpotFuturesOpportunities } from '../engine/spotFuturesCalculator'
import { calculateCexDexOpportunities } from '../engine/cexDexCalculator'
import { getNewListings } from '../scanners/new-listing-scanner'
import { wsServer } from '../feed/wsServer'
import { getTriangularRoutes } from '../engines/triangularArbitrage'
import { getCrossChainOpportunities } from '../engines/crossChainArbitrage'

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AlertConfig {
  minSpreadPercent: number
  alertFrequency: 'realtime' | '1min' | '5min' | '15min'
  enabledTypes: {
    cexCex: boolean
    spotFutures: boolean
    dexCex: boolean
    newListings: boolean
    triangular: boolean
    crossChain: boolean
  }
  trackedCoins: string[]
  quietHours: {
    enabled: boolean
    start: string
    end: string
    timezone: string
  }
}

export interface Alert {
  id: string
  type: 'cex_cex' | 'spot_futures' | 'dex_cex' | 'new_listing' | 'triangular' | 'cross_chain'
  symbol: string
  spreadPercent: number
  direction: string
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  netProfit: number | null
  confidence: string | null
  createdAt: number
  expiresAt: number | null
}

export interface AlertStats {
  totalToday: number
  totalAllTime: number
  lastAlertTime: number | null
  isRunning: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, '../data/alert-config.json')
const MAX_ALERTS = 500
const DEDUP_WINDOW_MS = 5 * 60 * 1000
const EVAL_INTERVAL_MS = 2000

const DEFAULT_CONFIG: AlertConfig = {
  minSpreadPercent: 0.05,
  alertFrequency: 'realtime',
  enabledTypes: {
    cexCex: true,
    spotFutures: true,
    dexCex: false,
    newListings: true,
    triangular: false,
    crossChain: false,
  },
  trackedCoins: [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP',
    'ADA', 'AVAX', 'LINK', 'DOT', 'DOGE',
    'MATIC', 'NEAR', 'UNI', 'ATOM', 'FTM',
    'APE', 'SAND', 'MANA', 'LDO', 'ARB',
    'OP', 'SUI', 'SEI', 'INJ', 'TIA',
  ],
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
}

// ── State ─────────────────────────────────────────────────────────────────────

let alerts: Alert[] = []
let totalAllTime = 0
let lastAlertTime: number | null = null
let lastBatchTime = 0
let isRunning = false
let startupSkips = 3  // skip first 3 cycles (~6s) to let price data stabilise

/** Dedup map: composite key → last alert timestamp */
const dedupMap = new Map<string, number>()

// ── Config I/O ────────────────────────────────────────────────────────────────

export function getAlertConfig(): AlertConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2))
      return { ...DEFAULT_CONFIG }
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AlertConfig>
    return { ...DEFAULT_CONFIG, ...parsed, enabledTypes: { ...DEFAULT_CONFIG.enabledTypes, ...parsed.enabledTypes }, quietHours: { ...DEFAULT_CONFIG.quietHours, ...parsed.quietHours } }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function updateAlertConfig(partial: Partial<AlertConfig>): AlertConfig {
  const current = getAlertConfig()
  const updated: AlertConfig = {
    ...current,
    ...partial,
    enabledTypes: { ...current.enabledTypes, ...(partial.enabledTypes ?? {}) },
    quietHours: { ...current.quietHours, ...(partial.quietHours ?? {}) },
  }
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2))
  } catch (err) {
    console.error('[AlertEngine] Failed to write config:', err)
  }
  return updated
}

// ── Alert accessors ───────────────────────────────────────────────────────────

export function getRecentAlerts(limit = 100): Alert[] {
  return alerts.slice(0, Math.min(limit, alerts.length))
}

export function getAlertStats(): AlertStats {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()
  const totalToday = alerts.filter(a => a.createdAt >= todayTs).length
  return { totalToday, totalAllTime, lastAlertTime, isRunning }
}

// ── Quiet hours check ─────────────────────────────────────────────────────────

function isQuietHoursActive(config: AlertConfig): boolean {
  if (!config.quietHours.enabled) return false
  const now = new Date()
  const hh = now.getUTCHours()
  const mm = now.getUTCMinutes()
  const totalMins = hh * 60 + mm

  const [sh, sm] = config.quietHours.start.split(':').map(Number)
  const [eh, em] = config.quietHours.end.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em

  if (startMins <= endMins) {
    return totalMins >= startMins && totalMins < endMins
  }
  // wraps midnight
  return totalMins >= startMins || totalMins < endMins
}

// ── Coin extraction ───────────────────────────────────────────────────────────

function extractBase(symbol: string): string {
  return symbol.split('/')[0] ?? symbol.split('USDT')[0] ?? symbol
}

// ── Dedup ─────────────────────────────────────────────────────────────────────

function dedupKey(type: string, symbol: string, buy: string, sell: string): string {
  return `${type}-${symbol}-${buy}-${sell}`
}

function isDeduped(key: string, now: number): boolean {
  const last = dedupMap.get(key)
  if (last === undefined) return false
  return now - last < DEDUP_WINDOW_MS
}

// ── Short exchange name ───────────────────────────────────────────────────────

function shortEx(name: string): string {
  return name.slice(0, 3).toUpperCase()
}

// ── Evaluation ────────────────────────────────────────────────────────────────

function evaluate(): void {
  if (startupSkips > 0) { startupSkips--; return }

  const config = getAlertConfig()
  const now = Date.now()

  if (isQuietHoursActive(config)) return

  if (config.alertFrequency !== 'realtime') {
    const gapMs = config.alertFrequency === '1min' ? 60_000
      : config.alertFrequency === '5min' ? 300_000
      : 900_000
    if (now - lastBatchTime < gapMs) return
  }

  const newAlerts: Alert[] = []

  // ── CEX-CEX ────────────────────────────────────────────────────────────────
  if (config.enabledTypes.cexCex) {
    try {
      const spreads = calculateAllSpreads(tickStore)
      const opps = rankOpportunities(spreads)
      for (const opp of opps) {
        if (opp.netSpread < config.minSpreadPercent) continue
        const base = extractBase(opp.symbol)
        if (config.trackedCoins.length > 0 && !config.trackedCoins.includes(base)) continue
        const key = dedupKey('cex_cex', opp.symbol, opp.buyExchange, opp.sellExchange)
        if (isDeduped(key, now)) continue

        const alert: Alert = {
          id: `alert-${now}-${Math.floor(Math.random() * 9000 + 1000)}`,
          type: 'cex_cex',
          symbol: opp.symbol,
          spreadPercent: opp.netSpread,
          direction: `Buy ${opp.buyExchange} → Sell ${opp.sellExchange}`,
          buyExchange: opp.buyExchange,
          sellExchange: opp.sellExchange,
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          netProfit: opp.estimatedProfit,
          confidence: opp.confidence,
          createdAt: now,
          expiresAt: now + 5 * 60 * 1000,
        }
        newAlerts.push(alert)
        dedupMap.set(key, now)
      }
    } catch (err) {
      console.error('[AlertEngine] CEX-CEX eval error:', err)
    }
  }

  // ── Spot-Futures ───────────────────────────────────────────────────────────
  if (config.enabledTypes.spotFutures) {
    try {
      const opps = calculateSpotFuturesOpportunities()
      for (const opp of opps) {
        const spreadPct = Math.abs(opp.combinedYieldAnnualized / (365 * 3))
        if (spreadPct < config.minSpreadPercent) continue
        const base = extractBase(opp.symbol)
        if (config.trackedCoins.length > 0 && !config.trackedCoins.includes(base)) continue
        const buyEx = opp.spotExchange
        const sellEx = opp.futuresExchange
        const key = dedupKey('spot_futures', opp.symbol, buyEx, sellEx)
        if (isDeduped(key, now)) continue

        const alert: Alert = {
          id: `alert-${now}-${Math.floor(Math.random() * 9000 + 1000)}`,
          type: 'spot_futures',
          symbol: opp.symbol,
          spreadPercent: spreadPct,
          direction: `Spot ${buyEx} → Futures ${sellEx}`,
          buyExchange: buyEx,
          sellExchange: sellEx,
          buyPrice: opp.spotPrice,
          sellPrice: opp.spotPrice * (1 + spreadPct / 100),
          netProfit: opp.estimatedProfit8h,
          confidence: opp.combinedYieldAnnualized > 20 ? 'high' : opp.combinedYieldAnnualized > 10 ? 'medium' : 'low',
          createdAt: now,
          expiresAt: now + 8 * 60 * 60 * 1000,
        }
        newAlerts.push(alert)
        dedupMap.set(key, now)
      }
    } catch (err) {
      console.error('[AlertEngine] Spot-Futures eval error:', err)
    }
  }

  // ── CEX-DEX ────────────────────────────────────────────────────────────────
  if (config.enabledTypes.dexCex) {
    try {
      const opps = calculateCexDexOpportunities()
      for (const opp of opps) {
        if (opp.netProfitPercent < config.minSpreadPercent) continue
        const base = extractBase(opp.symbol)
        if (config.trackedCoins.length > 0 && !config.trackedCoins.includes(base)) continue
        const buyEx = opp.direction === 'buy_cex_sell_dex' ? opp.cexExchange : opp.dexId
        const sellEx = opp.direction === 'buy_cex_sell_dex' ? opp.dexId : opp.cexExchange
        const key = dedupKey('dex_cex', opp.symbol, buyEx, sellEx)
        if (isDeduped(key, now)) continue

        const alert: Alert = {
          id: `alert-${now}-${Math.floor(Math.random() * 9000 + 1000)}`,
          type: 'dex_cex',
          symbol: opp.symbol,
          spreadPercent: opp.netProfitPercent,
          direction: opp.direction === 'buy_cex_sell_dex'
            ? `Buy ${opp.cexExchange} → Sell ${opp.dexId}`
            : `Buy ${opp.dexId} → Sell ${opp.cexExchange}`,
          buyExchange: buyEx,
          sellExchange: sellEx,
          buyPrice: opp.direction === 'buy_cex_sell_dex' ? opp.cexPrice : opp.dexPrice,
          sellPrice: opp.direction === 'buy_cex_sell_dex' ? opp.dexPrice : opp.cexPrice,
          netProfit: null,
          confidence: opp.confidence,
          createdAt: now,
          expiresAt: now + 60 * 1000,
        }
        newAlerts.push(alert)
        dedupMap.set(key, now)
      }
    } catch (err) {
      console.error('[AlertEngine] CEX-DEX eval error:', err)
    }
  }

  // ── New Listings ───────────────────────────────────────────────────────────
  if (config.enabledTypes.newListings) {
    try {
      const listings = getNewListings()
      for (const listing of listings) {
        if (listing.status !== 'new') continue
        const base = listing.baseAsset
        if (config.trackedCoins.length > 0 && !config.trackedCoins.includes(base)) continue
        const key = dedupKey('new_listing', listing.symbol, listing.exchange, 'n/a')
        if (isDeduped(key, now)) continue

        const alert: Alert = {
          id: `alert-${now}-${Math.floor(Math.random() * 9000 + 1000)}`,
          type: 'new_listing',
          symbol: listing.symbol,
          spreadPercent: listing.priceChange1m ?? 0,
          direction: `New listing on ${listing.exchange}`,
          buyExchange: listing.exchange,
          sellExchange: listing.exchange,
          buyPrice: listing.priceAtDetection ?? 0,
          sellPrice: listing.currentPrice ?? listing.priceAtDetection ?? 0,
          netProfit: null,
          confidence: 'medium',
          createdAt: now,
          expiresAt: null,
        }
        newAlerts.push(alert)
        dedupMap.set(key, now)
      }
    } catch (err) {
      console.error('[AlertEngine] New-Listings eval error:', err)
    }
  }

  // ── Triangular ─────────────────────────────────────────────────────────────
  if (config.enabledTypes.triangular) {
    try {
      const routes = getTriangularRoutes()
      for (const route of routes) {
        if (route.netProfitPercent < config.minSpreadPercent) continue
        const key = dedupKey('triangular', route.crossSymbol, route.exchange, route.direction)
        if (isDeduped(key, now)) continue

        const alert: Alert = {
          id: `alert-${now}-${Math.floor(Math.random() * 9000 + 1000)}`,
          type: 'triangular',
          symbol: route.crossSymbol,
          spreadPercent: route.netProfitPercent,
          direction: `${route.exchange.toUpperCase()} · ${route.path}`,
          buyExchange: route.exchange,
          sellExchange: route.exchange,
          buyPrice: route.prices.step1,
          sellPrice: route.prices.step3,
          netProfit: route.estimatedProfit1k,
          confidence: route.netProfitPercent > 0.5 ? 'high' : route.netProfitPercent > 0.2 ? 'medium' : 'low',
          createdAt: now,
          expiresAt: now + 2 * 60 * 1000,
        }
        newAlerts.push(alert)
        dedupMap.set(key, now)
      }
    } catch (err) {
      console.error('[AlertEngine] Triangular eval error:', err)
    }
  }

  // ── Cross-Chain ────────────────────────────────────────────────────────────
  if (config.enabledTypes.crossChain) {
    try {
      const opps = getCrossChainOpportunities()
      for (const opp of opps) {
        if (opp.netProfitPercent < config.minSpreadPercent) continue
        const key = dedupKey('cross_chain', opp.symbol, opp.buyChain, opp.sellChain)
        if (isDeduped(key, now)) continue

        const alert: Alert = {
          id: `alert-${now}-${Math.floor(Math.random() * 9000 + 1000)}`,
          type: 'cross_chain',
          symbol: opp.symbol,
          spreadPercent: opp.netProfitPercent,
          direction: `${opp.buyChain} → ${opp.sellChain}`,
          buyExchange: opp.buyDex,
          sellExchange: opp.sellDex,
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          netProfit: opp.estimatedProfit1k,
          confidence: opp.confidence,
          createdAt: now,
          expiresAt: now + 3 * 60 * 1000,
        }
        newAlerts.push(alert)
        dedupMap.set(key, now)
      }
    } catch (err) {
      console.error('[AlertEngine] Cross-Chain eval error:', err)
    }
  }

  if (newAlerts.length === 0) return

  // Rate limit: keep top 20 by spread to avoid alert storms
  const capped = newAlerts
    .sort((a, b) => b.spreadPercent - a.spreadPercent)
    .slice(0, 20)

  // Prepend new alerts (newest first), cap at MAX_ALERTS
  alerts = [...capped, ...alerts].slice(0, MAX_ALERTS)
  totalAllTime += capped.length
  lastAlertTime = now
  lastBatchTime = now

  // Broadcast to WebSocket clients
  wsServer.broadcast('alerts', capped)

  console.log(`[AlertEngine] Fired ${capped.length} alert(s) (total: ${totalAllTime})`)
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startAlertEngine(): void {
  if (isRunning) return
  isRunning = true
  setInterval(evaluate, EVAL_INTERVAL_MS)
  console.log('[AlertEngine] Started — evaluating every 2s')
}
