import fs from 'fs'
import path from 'path'
import { getProfitableGaps, getTradingStats, GapRecord } from './trading-intelligence'
import { getAlertConfig } from './alert-engine'
import { tickStore } from '../engine/tickStore'
import { EXCHANGE_REGISTRY } from '../registry/exchangeRegistry'
import { getTriangularRoutes } from '../engines/triangularArbitrage'
import { getCrossChainOpportunities } from '../engines/crossChainArbitrage'
import { getStablecoinOpportunities } from '../engines/stablecoinArbitrage'
import { startRateHarvestBot, getRateHarvestState, resetRateHarvestBot } from './funding-rate-bot'
import { getPairsSignals } from '../engines/pairsTradingEngine'
import { getLiquidationSignals } from '../engines/liquidationEngine'
import { getCalendarSpreadSignals } from '../engines/calendarSpreadEngine'
import { getNewListingSignals } from '../engines/newListingEngine'
import { getTwapSignals } from '../engine/twapEngine'
import { scoreAndFilter, updateScoredSignals, feedPriceForVolatility } from '../engine/signalScorer'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ExchangeWallet {
  [asset: string]: number
}

interface BotPortfolio {
  [exchange: string]: ExchangeWallet
}

export interface SimTrade {
  id: string
  botId: string
  timestamp: number
  symbol: string
  baseAsset: string
  quoteAsset: string
  type: string
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  spreadPercent: number
  quantity: number
  tradeSizeUsd: number
  grossProfit: number
  buyFee: number
  sellFee: number
  totalFees: number
  netProfit: number
  depthLimited: boolean
  inventoryLimited: boolean
}

export interface VoidedSignal {
  id: string
  botId: string
  timestamp: number
  symbol: string
  buyExchange: string
  sellExchange: string
  spreadPercent: number
  reason: string
}

export interface RebalanceEvent {
  id: string
  botId: string
  timestamp: number
  tier: 1 | 2 | 3 | 4
  type: 'sell_rebuy' | 'usdt_transfer' | 'coin_transfer'
  asset: string
  fromExchange: string
  toExchange: string
  amount: number
  amountUsd: number
  fee: number
  feeType: 'trading' | 'network'
  chain: string | null
  transferTimeMinutes: number | null
  reason: string
  balanceBefore: { from: number; to: number }
  balanceAfter: { from: number; to: number }
}

export interface InTransitFund {
  id: string
  asset: string
  amount: number
  fromExchange: string
  toExchange: string
  startedAt: number
  estimatedArrival: number
  status: 'in_transit' | 'arrived'
}

export interface RebalanceStats {
  tier1Count: number
  tier2Count: number
  tier3Count: number
  tier1Fees: number
  tier2Fees: number
  tier3Fees: number
  totalRebalanceCost: number
  inTransitCount: number
  inTransitValueUsd: number
}

interface LiquidationCycleResults {
  totalCoinsLiquidated: number
  totalUsdtRecovered: number
  realizedPnl: number
  feesForLiquidation: number
  feesForRestock: number
  totalCycleFees: number
}

interface RestockResults {
  coinsRestocked: number
  totalInvested: number
  averagePricePerCoin: Record<string, number>
}

export interface LiquidationCycle {
  cycleNumber: number
  startedAt: number
  phase: 'trading' | 'liquidating' | 'restocking'
  liquidationResults: LiquidationCycleResults | null
  restockResults: RestockResults | null
}

export interface BotState {
  id: string
  name: string
  startingCapital: number
  portfolio: BotPortfolio
  totalPortfolioValueUsd: number
  totalPnl: number
  totalPnlPercent: number
  tradingPnl: number
  totalTrades: number
  voidedSignals: number
  voidedReasons: Record<string, number>
  winningTrades: number
  losingTrades: number
  winRate: number
  bestTrade: SimTrade | null
  worstTrade: SimTrade | null
  totalFeesPaid: number
  totalSlippageCost: number
  totalRebalanceFees: number
  rebalanceCount: number
  maxDrawdown: number
  peakValue: number
  dailyOpenValue: number
  dailyOpenDate: string
  inventoryCoins: string[]
  activeExchanges: string[]
  recentTrades: SimTrade[]
  recentVoided: VoidedSignal[]
  recentRebalances: RebalanceEvent[]
  startedAt: number
  lastTradeAt: number | null
  isRunning: boolean
  circuitBreakerActive: boolean
  circuitBreakerReason: string
  voidByCategory: {
    dex: number
    exchangeMissing: number
    noInventory: number
    noUsdt: number
    tooSmall: number
    circuitBreaker: number
  }
  rebalanceStats: RebalanceStats
  inTransitFunds: InTransitFund[]
  rescuedVoids: number
  // v0.3.5 — Liquidation cycle fields
  currentCycle: LiquidationCycle
  cycleHistory: LiquidationCycle[]
  nextCycleAt: number
  totalCycleFees: number
  realizedInventoryPnl: number
  unrealizedInventoryPnl: number
  inventoryValueUsd: number
  restockPrices: Record<string, number>
  /** Magnus Alpha: seeded target coin quantities per exchange (exchange → coin → qty) */
  targetAllocations?: Record<string, Record<string, number>>
  /** Magnus Alpha: persisted analytics + flow (optional on beta bots) */
  magnusAlphaMeta?: MagnusAlphaPersistedMeta
}

export interface MagnusAlphaConfig {
  totalCapital: number
  reservePerExchange: number
  exchanges: string[]
  inventoryCoins: string[]
  maxPositionPercent: number
  rebalanceMode: 'roi_driven'
  cycleIntervalMs: number
}

export interface RebalanceROI {
  totalRebalanceCost: number
  tradesEnabledByRebalancing: number
  profitFromEnabledTrades: number
  rebalanceROI: number
  bestRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null
  worstRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null
}

export interface TradeFlowTracker {
  exchangeFlow: Record<string, { buys: number; sells: number; netFlow: number }>
  coinFlow: Record<string, Record<string, number>>
  lastReset: number
}

export interface MagnusAlphaPersistedMeta {
  rebalanceRoi: RebalanceROI
  flowTracker: TradeFlowTracker
  pendingRebalanceAttribution: Array<{ rebalanceId: string; asset: string; exchanges: string[]; at: number }>
  reserveDipCount: number
  rebalanceOutcomes: Record<string, { tradesEnabled: number; profit: number; description: string }>
  /** per exchange → coin → consecutive sells without buy */
  sellStreak: Record<string, Record<string, number>>
  predictiveCheckAt: number
}

export interface MagnusPerformance {
  capitalUtilization: number
  reserveUtilization: number
  rebalanceROI: RebalanceROI
  avgTimeBetweenRebalances: number
  rebalanceSuccessRate: number
  tradeSuccessRate: number
  avgProfitPerTrade: number
  avgTradesPerHour: number
  profitPerHourPerCapital: number
  inventoryScore: number
  depletedPositions: number
  totalPositions: number
  healthPercent: number
  exchangesBelowReserve: number
  avgReserveLevel: number
  alphaVsBeta: {
    alphaVoidRate: number
    betaVoidRate: number
    alphaTradesPerHour: number
    betaTradesPerHour: number
    alphaPnlPerHour: number
    betaPnlPerHour: number
  } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '../data')
const SAVE_INTERVAL_MS = 60_000
const EVAL_INTERVAL_MS = 2_000
const REBALANCE_TIER1_INTERVAL_MS = 2 * 60_000
const REBALANCE_TIER2_INTERVAL_MS = 5 * 60_000
const REBALANCE_TIER3_INTERVAL_MS = 10 * 60_000
const COIN_REFRESH_INTERVAL_MS = 60 * 60_000
const SYMBOL_COOLDOWN_MS = 10_000       // reduced: 10s cooldown (was 30s)
const MAX_RECENT_TRADES = 50
const MAX_RECENT_VOIDED = 30
const MAX_RECENT_REBALANCES = 20
const DEFAULT_FEE_RATE = 0.001          // fallback only — per-exchange rates used in trades
const COIN_TRANSFER_FEE = 0.5
const MIN_SPREAD_THRESHOLD = 0.15
const CYCLE_INTERVAL_MS = 60 * 60_000
const MAX_CYCLE_HISTORY = 24
const MAGNUS_ALPHA_PREDICTIVE_MS = 2 * 60_000
const TRADE_FLOW_RESET_MS = 15 * 60_000
const REBALANCE_ATTRIBUTION_MS = 30 * 60_000
const MAGNUS_ALPHA_CONFIG_FILE = 'magnus-alpha-config.json'

// Circuit breaker thresholds
const MAX_DRAWDOWN_PAUSE_PCT  = 0.15   // pause if portfolio falls 15% from peak
const MAX_DAILY_LOSS_PCT      = 0.05   // pause if single-day loss exceeds 5%

// Slippage model: slippage% = SLIPPAGE_K * sqrt(tradeSize / estimatedBookDepth)
const SLIPPAGE_K = 0.10
// Estimated book depth by exchange tier (USD). Used when live depth unavailable.
const EXCHANGE_BOOK_DEPTH_USD: Record<string, number> = {
  binance:     5_000_000,
  okx:         3_000_000,
  bybit:       2_500_000,
  kucoin:      1_000_000,
  bitget:        800_000,
  mexc:          500_000,
  gateio:        400_000,
  htx:           400_000,
  bingx:         300_000,
  hyperliquid: 2_000_000,
  jupiter:       500_000,
}

// Thresholds
const TIER1_MAX_ACTIONS = 5
const TIER2_MAX_ACTIONS = 2
const TIER3_MAX_ACTIONS = 1
const TIER1_MIN_SURPLUS_USD = 20
const TIER1_MIN_DEFICIT_USD = 10
const TIER2_MIN_USDT_DIFF = 100

// v0.3.5: sorted by timeMinutes; fastestChain() picks fastest under $2 → Solana (1min)
const TRANSFER_CHAINS = [
  { name: 'Solana',   fee: 0.01, timeMinutes: 1  },
  { name: 'Arbitrum', fee: 0.15, timeMinutes: 2  },
  { name: 'Polygon',  fee: 0.10, timeMinutes: 3  },
  { name: 'BSC',      fee: 0.30, timeMinutes: 3  },
  { name: 'TRC20',    fee: 1.00, timeMinutes: 5  },
  { name: 'ERC20',    fee: 8.00, timeMinutes: 10 },
] as const

const ACTIVE_EXCHANGES = [
  'okx', 'gateio', 'binance', 'bitget', 'kucoin', 'mexc', 'htx',
]
const DEX_EXCHANGES = new Set(['jupiter', 'uniswap_v3', 'hyperliquid'])

// High-liquidity, high-cap coins that have active spreads AND reliable price feeds.
// Replaced meme-coin basket (APE×5, WIF, SHIB, PEPE, BONK) which caused inventory
// devaluation blowdown. These coins have tighter bid-ask spreads and trade on all 7 CEXs.
const DEFAULT_INVENTORY_COINS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP',
  'AVAX', 'LINK', 'ADA', 'DOT', 'MATIC',
  'ATOM', 'UNI', 'NEAR', 'ARB', 'OP',
]

// Equal-weight by default (1.0). High-cap coins get 1.5× for deeper liquidity.
// No single coin exceeds 1.5× (was APE at 5.0×, responsible for outsized exposure).
const COIN_WEIGHT: Record<string, number> = {
  'BTC':   1.5, 'ETH':   1.5, 'SOL':   1.5, 'BNB':   1.5, 'XRP':   1.5,
  'AVAX':  1.0, 'LINK':  1.0, 'ADA':   1.0, 'DOT':   1.0, 'MATIC': 1.0,
  'ATOM':  1.0, 'UNI':   1.0, 'NEAR':  1.0, 'ARB':   1.0, 'OP':    1.0,
}

// Hard cap on unique inventory coins. refreshInventoryCoins() enforces this.
const MAX_INVENTORY_COINS = 15

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns per-exchange taker fee rate, falling back to default. */
function getTakerFee(exchangeId: string): number {
  return EXCHANGE_REGISTRY[exchangeId]?.takerFee ?? DEFAULT_FEE_RATE
}

/** Median of a sorted array — resistant to outlier exchange prices. */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!
}

/** Estimated slippage % for a given trade size on an exchange.
 *  Uses live order book depth (USD) when available, falls back to exchange estimate. */
function estimateSlippagePct(exchangeId: string, tradeSizeUsd: number, liveBookDepthUsd?: number): number {
  const bookDepth = (liveBookDepthUsd && liveBookDepthUsd > 0)
    ? liveBookDepthUsd
    : (EXCHANGE_BOOK_DEPTH_USD[exchangeId] ?? 500_000)
  const participation = tradeSizeUsd / bookDepth
  return parseFloat((SLIPPAGE_K * Math.sqrt(participation) * 100).toFixed(6))
}

function getCurrentPrice(baseAsset: string): number {
  const ticks = tickStore.getBySymbol(`${baseAsset}/USDT`)
  if (ticks.length === 0) return 0
  const prices = ticks.map(t => (t.bid + t.ask) / 2).filter(p => p > 0)
  return median(prices)
}

function getCurrentBidPrice(baseAsset: string): number {
  const ticks = tickStore.getBySymbol(`${baseAsset}/USDT`)
  if (ticks.length === 0) return getCurrentPrice(baseAsset)
  const bids = ticks.map(t => t.bid).filter(p => p > 0)
  return bids.length > 0 ? median(bids) : getCurrentPrice(baseAsset)
}

function getCurrentAskPrice(baseAsset: string): number {
  const ticks = tickStore.getBySymbol(`${baseAsset}/USDT`)
  if (ticks.length === 0) return getCurrentPrice(baseAsset)
  const asks = ticks.map(t => t.ask).filter(p => p > 0)
  return asks.length > 0 ? median(asks) : getCurrentPrice(baseAsset)
}

function makeRebalanceStats(): RebalanceStats {
  return {
    tier1Count: 0, tier2Count: 0, tier3Count: 0,
    tier1Fees: 0,  tier2Fees: 0,  tier3Fees: 0,
    totalRebalanceCost: 0, inTransitCount: 0, inTransitValueUsd: 0,
  }
}

function cheapestChain(): typeof TRANSFER_CHAINS[number] {
  return [...TRANSFER_CHAINS].sort((a, b) => a.fee - b.fee)[0]!
}

// v0.3.5: pick fastest chain under $2. Falls back to TRC20 if none under $2 (impossible with current data).
function fastestChain(): typeof TRANSFER_CHAINS[number] {
  const affordable = [...TRANSFER_CHAINS].filter(c => c.fee < 2.0)
  if (affordable.length === 0) return TRANSFER_CHAINS.find(c => c.name === 'TRC20')!
  return affordable.sort((a, b) => a.timeMinutes - b.timeMinutes)[0]!
}

function makeFreshCycle(cycleNumber: number): LiquidationCycle {
  return { cycleNumber, startedAt: 0, phase: 'trading', liquidationResults: null, restockResults: null }
}

// ── PaperBot class ────────────────────────────────────────────────────────────

// Rescue cooldown: do not rescue same coin+exchange more than once per interval.
// Prevents the drain loop: coin depleted → rescue buys → coin depreciates → rescue again.
const RESCUE_COOLDOWN_MS = 30 * 60_000   // 30 minutes between rescues per coin+exchange
// Maximum USDT spent per rescue operation ($10, was $50). Smaller rescues = less exposure.
const RESCUE_MAX_USDT = 10

class PaperBot {
  protected botId: string
  protected botName: string
  protected startingCapital: number
  protected state: BotState
  protected tradedGaps = new Set<string>()
  protected symbolCooldown = new Map<string, number>()
  protected portfolioInitialized = false
  // rescue cooldown: key = `${exchange}:${coin}`
  protected rescueCooldown = new Map<string, number>()

  constructor(id: string, name: string, startingCapital: number) {
    this.botId = id
    this.botName = name
    this.startingCapital = startingCapital

    const saved = this.loadFromDisk()
    if (saved) {
      this.state = saved
      this.state.isRunning = true
      // backwards compat migrations
      this.state.voidByCategory ??= { dex: 0, exchangeMissing: 0, noInventory: 0, noUsdt: 0, tooSmall: 0, circuitBreaker: 0 }
      this.state.voidByCategory.circuitBreaker ??= 0
      this.state.rebalanceStats ??= makeRebalanceStats()
      this.state.inTransitFunds ??= []
      this.state.rescuedVoids ??= 0
      // v0.3.5 migration
      this.state.restockPrices ??= {}
      this.state.realizedInventoryPnl ??= 0
      this.state.unrealizedInventoryPnl ??= 0
      this.state.totalCycleFees ??= 0
      this.state.cycleHistory ??= []
      this.state.currentCycle ??= makeFreshCycle(1)
      this.state.nextCycleAt ??= Date.now() + CYCLE_INTERVAL_MS
      // v0.4.0 migration — circuit breaker + slippage tracking + daily PnL
      this.state.totalSlippageCost ??= 0
      this.state.circuitBreakerActive ??= false
      this.state.circuitBreakerReason ??= ''
      this.state.dailyOpenValue ??= this.state.totalPortfolioValueUsd
      this.state.dailyOpenDate ??= new Date().toISOString().slice(0, 10)

      // If server restarted mid-cycle, force completion on next evaluate()
      if (this.state.currentCycle.phase !== 'trading') {
        console.log(
          `[PaperBot ${id}] Detected incomplete cycle #${this.state.currentCycle.cycleNumber} ` +
          `(phase: ${this.state.currentCycle.phase}) — will complete on next tick`
        )
        this.state.nextCycleAt = Date.now()  // triggers immediately
      }

      this.portfolioInitialized = Object.keys(saved.portfolio).length > 0
      console.log(`[PaperBot ${id}] Resumed — portfolio $${saved.totalPortfolioValueUsd.toFixed(2)}`)
    } else {
      this.state = this.createInitialState()
      this.portfolioInitialized = false
    }
  }

  protected createInitialState(): BotState {
    const today = new Date().toISOString().slice(0, 10)
    return {
      id: this.botId,
      name: this.botName,
      startingCapital: this.startingCapital,
      portfolio: {},
      totalPortfolioValueUsd: this.startingCapital,
      totalPnl: 0,
      totalPnlPercent: 0,
      tradingPnl: 0,
      totalTrades: 0,
      voidedSignals: 0,
      voidedReasons: {},
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      bestTrade: null,
      worstTrade: null,
      totalFeesPaid: 0,
      totalSlippageCost: 0,
      totalRebalanceFees: 0,
      rebalanceCount: 0,
      maxDrawdown: 0,
      peakValue: this.startingCapital,
      dailyOpenValue: this.startingCapital,
      dailyOpenDate: today,
      inventoryCoins: [...DEFAULT_INVENTORY_COINS],
      activeExchanges: [...ACTIVE_EXCHANGES],
      recentTrades: [],
      recentVoided: [],
      recentRebalances: [],
      startedAt: Date.now(),
      lastTradeAt: null,
      isRunning: true,
      circuitBreakerActive: false,
      circuitBreakerReason: '',
      voidByCategory: { dex: 0, exchangeMissing: 0, noInventory: 0, noUsdt: 0, tooSmall: 0, circuitBreaker: 0 },
      rebalanceStats: makeRebalanceStats(),
      inTransitFunds: [],
      rescuedVoids: 0,
      // v0.3.5
      currentCycle: makeFreshCycle(1),
      cycleHistory: [],
      nextCycleAt: Date.now() + this.getCycleIntervalMs(),
      totalCycleFees: 0,
      realizedInventoryPnl: 0,
      unrealizedInventoryPnl: 0,
      inventoryValueUsd: 0,
      restockPrices: {},
    }
  }

  selectInventoryCoins(): string[] {
    try {
      const stats = getTradingStats()
      const qualified = stats.symbolRanking
        .filter(s => s.bestSpread >= MIN_SPREAD_THRESHOLD)
        .map(s => s.symbol.split('/')[0] ?? '')
        .filter(c => c.length > 0)

      const top15 = qualified.slice(0, 15)
      if (top15.length >= 15) return top15

      const result = [...top15]
      for (const coin of DEFAULT_INVENTORY_COINS) {
        if (!result.includes(coin) && result.length < 15) result.push(coin)
      }
      return result
    } catch {
      return [...DEFAULT_INVENTORY_COINS]
    }
  }

  initializePortfolio(): boolean {
    const coins = this.state.inventoryCoins
    const perExchange = this.startingCapital / ACTIVE_EXCHANGES.length
    const usdtBase = perExchange * 0.4
    const inventoryBudget = perExchange * 0.6
    const totalWeight = coins.reduce((sum, c) => sum + (COIN_WEIGHT[c] ?? 1.0), 0)

    let pricesMissing = 0
    const portfolio: BotPortfolio = {}
    const seedPrices: Record<string, number> = {}

    for (const exchange of ACTIVE_EXCHANGES) {
      let redistributed = 0
      portfolio[exchange] = { USDT: usdtBase }

      for (const coin of coins) {
        const weight = COIN_WEIGHT[coin] ?? 1.0
        const coinBudget = (weight / totalWeight) * inventoryBudget
        try {
          const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
          if (price <= 0) {
            pricesMissing++
            redistributed += coinBudget
          } else {
            portfolio[exchange][coin] = coinBudget / price
            if (!seedPrices[coin]) seedPrices[coin] = price
          }
        } catch {
          redistributed += coinBudget
        }
      }
      portfolio[exchange].USDT += redistributed
    }

    const uniqueMissing = pricesMissing / ACTIVE_EXCHANGES.length
    if (uniqueMissing > coins.length * 0.5) {
      console.log(`[PaperBot ${this.botId}] Waiting for prices (${uniqueMissing}/${coins.length} missing)`)
      return false
    }

    this.state.portfolio = portfolio
    this.state.restockPrices = seedPrices
    this.calculatePortfolioValue()
    this.portfolioInitialized = true
    console.log(`[PaperBot ${this.botId}] Portfolio seeded — $${this.state.totalPortfolioValueUsd.toFixed(2)}`)
    this.saveToDisk()
    return true
  }

  initializeIfNeeded(): void {
    if (this.portfolioInitialized) return
    const coins = this.selectInventoryCoins()
    this.state.inventoryCoins = coins
    this.initializePortfolio()
  }

  refreshInventoryCoins(): void {
    // Step 1: hard-cap enforcement — if already at MAX_INVENTORY_COINS, do nothing.
    // This was the blowup root cause: the bot accumulated 38 coins (designed for 15).
    if (this.state.inventoryCoins.length >= MAX_INVENTORY_COINS) return

    const newCoins = this.selectInventoryCoins()
    // Only add coins that are in DEFAULT_INVENTORY_COINS (curated high-cap list).
    // Prevents dynamically adding illiquid meme coins from signal data.
    const safeNew = newCoins.filter(
      c => DEFAULT_INVENTORY_COINS.includes(c) && !this.state.inventoryCoins.includes(c)
    )
    if (safeNew.length === 0) return

    // Only add as many as brings us to exactly MAX_INVENTORY_COINS, no more.
    const slots = MAX_INVENTORY_COINS - this.state.inventoryCoins.length
    const added = safeNew.slice(0, slots)

    const perExchange = this.startingCapital / ACTIVE_EXCHANGES.length
    const inventoryBudget = perExchange * 0.6
    const totalWeight = [...this.state.inventoryCoins, ...added].reduce((s, c) => s + (COIN_WEIGHT[c] ?? 1.0), 0)

    for (const coin of added) {
      this.state.inventoryCoins.push(coin)
      const weight = COIN_WEIGHT[coin] ?? 1.0
      const coinBudget = (weight / totalWeight) * inventoryBudget
      for (const exchange of ACTIVE_EXCHANGES) {
        const wallet = this.state.portfolio[exchange]
        if (!wallet) continue
        const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
        if (price > 0 && (wallet.USDT ?? 0) >= coinBudget * 2) {
          wallet[coin] = (wallet[coin] ?? 0) + coinBudget / price
          wallet.USDT -= coinBudget
          if (!this.state.restockPrices[coin]) this.state.restockPrices[coin] = price
        }
      }
    }
    console.log(`[PaperBot ${this.botId}] Inventory updated — added: ${added.join(', ')} (${this.state.inventoryCoins.length}/${MAX_INVENTORY_COINS})`)
  }

  calculatePortfolioValue(): void {
    let usdtValue = 0
    let inventoryValue = 0
    let unrealizedInvPnl = 0

    for (const wallet of Object.values(this.state.portfolio)) {
      for (const [asset, amount] of Object.entries(wallet)) {
        if (asset === 'USDT') {
          usdtValue += amount
        } else {
          // Use live price with fallback to last-known restock price so inventory
          // is never zeroed out when tick data is temporarily unavailable
          const livePrice = getCurrentPrice(asset)
          const price = livePrice > 0 ? livePrice : (this.state.restockPrices[asset] ?? 0)
          if (price > 0) {
            const coinUsd = amount * price
            inventoryValue += coinUsd
            const buyPrice = this.state.restockPrices[asset] ?? price
            unrealizedInvPnl += (price - buyPrice) * amount
          }
        }
      }
    }

    const total = usdtValue + inventoryValue
    this.state.totalPortfolioValueUsd = parseFloat(total.toFixed(8))
    this.state.inventoryValueUsd = parseFloat(inventoryValue.toFixed(8))
    this.state.totalPnl = parseFloat((total - this.startingCapital).toFixed(8))
    this.state.totalPnlPercent = (this.state.totalPnl / this.startingCapital) * 100
    this.state.unrealizedInventoryPnl = parseFloat(unrealizedInvPnl.toFixed(8))

    if (total > this.state.peakValue) this.state.peakValue = total
    const drawdown = this.state.peakValue - total
    if (drawdown > this.state.maxDrawdown) this.state.maxDrawdown = drawdown
  }

  protected recordVoid(
    gap: GapRecord,
    reason: string,
    category: keyof BotState['voidByCategory'],
  ): void {
    const voided: VoidedSignal = {
      id: `void-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      botId: this.botId,
      timestamp: Date.now(),
      symbol: gap.symbol,
      buyExchange: gap.buyExchange,
      sellExchange: gap.sellExchange,
      spreadPercent: gap.spreadPercent,
      reason,
    }
    this.state.voidedSignals++
    this.state.voidedReasons[reason] = (this.state.voidedReasons[reason] ?? 0) + 1
    this.state.voidByCategory[category]++
    this.state.recentVoided = [voided, ...this.state.recentVoided].slice(0, MAX_RECENT_VOIDED)
  }

  protected addRebalanceEvent(event: RebalanceEvent): void {
    this.state.recentRebalances = [event, ...this.state.recentRebalances].slice(0, MAX_RECENT_REBALANCES)
    this.state.totalRebalanceFees = parseFloat((this.state.totalRebalanceFees + event.fee).toFixed(8))
    this.state.rebalanceCount++
    this.state.rebalanceStats.totalRebalanceCost = parseFloat(
      (this.state.rebalanceStats.totalRebalanceCost + event.fee).toFixed(8)
    )
    if (event.tier === 1) {
      this.state.rebalanceStats.tier1Count++
      this.state.rebalanceStats.tier1Fees = parseFloat((this.state.rebalanceStats.tier1Fees + event.fee).toFixed(8))
    } else if (event.tier === 2) {
      this.state.rebalanceStats.tier2Count++
      this.state.rebalanceStats.tier2Fees = parseFloat((this.state.rebalanceStats.tier2Fees + event.fee).toFixed(8))
    } else if (event.tier === 3) {
      this.state.rebalanceStats.tier3Count++
      this.state.rebalanceStats.tier3Fees = parseFloat((this.state.rebalanceStats.tier3Fees + event.fee).toFixed(8))
    }
  }

  // ── Tier 1 Rescue: buy coin using surplus USDT on the target exchange ─────────

  protected tryTier1RescueBuyCoin(exchange: string, coin: string): boolean {
    // Cooldown gate — suppress rescue if we rescued this coin+exchange recently.
    const cooldownKey = `${exchange}:${coin}`
    const lastRescue = this.rescueCooldown.get(cooldownKey)
    if (lastRescue && Date.now() - lastRescue < RESCUE_COOLDOWN_MS) return false

    const wallet = this.state.portfolio[exchange]
    if (!wallet) return false
    const usdt = wallet.USDT ?? 0
    // Require $30+ USDT before rescue fires (was $15), so the rescue doesn't wipe the balance.
    if (usdt < 30) return false

    const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
    if (price <= 0) return false

    // Cap at $10 (was $50). Smaller rescue = less USDT exposure to declining coins.
    const buyAmount = parseFloat(Math.min(RESCUE_MAX_USDT, usdt * 0.15).toFixed(8))
    if (buyAmount < 5) return false

    const fee = parseFloat((buyAmount * getTakerFee(exchange)).toFixed(8))
    const coinBought = parseFloat(((buyAmount - fee) / price).toFixed(8))
    const now = Date.now()
    const usdtBefore = usdt
    const coinBefore = wallet[coin] ?? 0

    wallet.USDT = parseFloat((usdt - buyAmount).toFixed(8))
    wallet[coin] = parseFloat(((wallet[coin] ?? 0) + coinBought).toFixed(8))
    // Record cooldown so same coin+exchange is not rescued again for 30 minutes.
    this.rescueCooldown.set(cooldownKey, now)

    this.addRebalanceEvent({
      id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
      botId: this.botId,
      timestamp: now,
      tier: 1,
      type: 'sell_rebuy',
      asset: coin,
      fromExchange: exchange,
      toExchange: exchange,
      amount: coinBought,
      amountUsd: buyAmount,
      fee,
      feeType: 'trading',
      chain: null,
      transferTimeMinutes: null,
      reason: `Rescue: bought ${coin} on ${exchange} — inventory was depleted`,
      balanceBefore: { from: usdtBefore, to: coinBefore },
      balanceAfter: { from: wallet.USDT, to: wallet[coin] ?? 0 },
    })
    return true
  }

  // ── Tier 1 Rescue: sell surplus coin on exchange to cover USDT shortage ───────

  protected tryTier1RescueBuyUsdt(exchange: string): boolean {
    const wallet = this.state.portfolio[exchange]
    if (!wallet) return false

    for (const coin of this.state.inventoryCoins) {
      const coinBalance = wallet[coin] ?? 0
      if (coinBalance <= 0) continue
      const price = getCurrentBidPrice(coin) || getCurrentPrice(coin)
      if (price <= 0) continue
      if (coinBalance * price < 20) continue

      const sellQty = parseFloat((coinBalance * 0.3).toFixed(8))
      const sellRevenue = parseFloat((sellQty * price).toFixed(8))
      if (sellRevenue < 5) continue

      const fee = parseFloat((sellRevenue * DEFAULT_FEE_RATE).toFixed(8))
      const now = Date.now()
      const usdtBefore = wallet.USDT ?? 0
      const coinBefore = coinBalance

      wallet[coin] = parseFloat(((wallet[coin] ?? 0) - sellQty).toFixed(8))
      if ((wallet[coin] ?? 0) < 0.000001) delete wallet[coin]
      wallet.USDT = parseFloat(((wallet.USDT ?? 0) + sellRevenue - fee).toFixed(8))

      this.addRebalanceEvent({
        id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
        botId: this.botId,
        timestamp: now,
        tier: 1,
        type: 'sell_rebuy',
        asset: coin,
        fromExchange: exchange,
        toExchange: exchange,
        amount: sellQty,
        amountUsd: sellRevenue,
        fee,
        feeType: 'trading',
        chain: null,
        transferTimeMinutes: null,
        reason: `Rescue: sold ${coin} on ${exchange} — USDT was depleted`,
        balanceBefore: { from: coinBefore, to: usdtBefore },
        balanceAfter: { from: wallet[coin] ?? 0, to: wallet.USDT },
      })
      return true
    }
    return false
  }

  // ── In-transit settlement ─────────────────────────────────────────────────────

  processInTransit(): void {
    const now = Date.now()
    let settled = false

    for (const fund of this.state.inTransitFunds) {
      if (fund.status !== 'in_transit') continue
      if (now < fund.estimatedArrival) continue

      const toWallet = this.state.portfolio[fund.toExchange]
      if (!toWallet) continue

      if (fund.asset === 'USDT') {
        toWallet.USDT = parseFloat(((toWallet.USDT ?? 0) + fund.amount).toFixed(8))
      } else {
        toWallet[fund.asset] = parseFloat(((toWallet[fund.asset] ?? 0) + fund.amount).toFixed(8))
      }

      fund.status = 'arrived'
      settled = true
      const amtStr = fund.asset === 'USDT'
        ? `$${fund.amount.toFixed(2)}`
        : `${fund.amount.toFixed(6)} ${fund.asset}`
      console.log(`[Bot ${this.botId}] Transfer arrived: ${amtStr} on ${fund.toExchange}`)
    }

    if (settled) {
      const inTransit = this.state.inTransitFunds.filter(f => f.status === 'in_transit')
      const arrived  = this.state.inTransitFunds.filter(f => f.status === 'arrived').slice(-10)
      this.state.inTransitFunds = [...inTransit, ...arrived]
    }
  }

  // ── Tier 1 rebalancing — sell/rebuy (instant, every 2 min) ───────────────────

  rebalanceTier1(): void {
    if (!this.portfolioInitialized) return
    if (this.state.currentCycle.phase !== 'trading') return
    const exchanges = ACTIVE_EXCHANGES.filter(e => !!this.state.portfolio[e])
    const perExchange = this.startingCapital / ACTIVE_EXCHANGES.length
    const usdtTarget = perExchange * 0.4
    let actionsThisCycle = 0

    for (const exchange of exchanges) {
      if (actionsThisCycle >= TIER1_MAX_ACTIONS) break
      const wallet = this.state.portfolio[exchange]!
      const usdt = wallet.USDT ?? 0
      const now = Date.now()

      // a) USDT surplus + coin shortage → buy missing coins
      if (usdt > usdtTarget * 1.5) {
        const usdtSurplus = usdt - usdtTarget
        if (usdtSurplus >= TIER1_MIN_SURPLUS_USD) {
          for (const coin of this.state.inventoryCoins) {
            if (actionsThisCycle >= TIER1_MAX_ACTIONS) break
            const coinBalance = wallet[coin] ?? 0
            const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
            if (price <= 0) continue
            if (coinBalance * price > 10) continue

            const buyAmount = parseFloat(Math.min(50, usdtSurplus / 3).toFixed(8))
            if (buyAmount < TIER1_MIN_DEFICIT_USD) continue

            const fee = parseFloat((buyAmount * DEFAULT_FEE_RATE).toFixed(8))
            const coinBought = parseFloat(((buyAmount - fee) / price).toFixed(8))
            const usdtBefore = wallet.USDT ?? 0
            const coinBefore = coinBalance

            wallet.USDT = parseFloat(((wallet.USDT ?? 0) - buyAmount).toFixed(8))
            wallet[coin] = parseFloat(((wallet[coin] ?? 0) + coinBought).toFixed(8))

            this.addRebalanceEvent({
              id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
              botId: this.botId,
              timestamp: now,
              tier: 1,
              type: 'sell_rebuy',
              asset: coin,
              fromExchange: exchange,
              toExchange: exchange,
              amount: coinBought,
              amountUsd: buyAmount,
              fee,
              feeType: 'trading',
              chain: null,
              transferTimeMinutes: null,
              reason: `Bought ${coin} on ${exchange} — inventory was depleted`,
              balanceBefore: { from: usdtBefore, to: coinBefore },
              balanceAfter: { from: wallet.USDT, to: wallet[coin] ?? 0 },
            })
            actionsThisCycle++
          }
        }
      }

      // b) Coin surplus + USDT shortage → sell surplus coin for USDT
      if ((wallet.USDT ?? 0) < usdtTarget * 0.3 && actionsThisCycle < TIER1_MAX_ACTIONS) {
        const usdtDeficit = usdtTarget - (wallet.USDT ?? 0)
        if (usdtDeficit >= TIER1_MIN_DEFICIT_USD) {
          for (const coin of this.state.inventoryCoins) {
            if (actionsThisCycle >= TIER1_MAX_ACTIONS) break
            const coinBalance = wallet[coin] ?? 0
            if (coinBalance <= 0) continue
            const price = getCurrentBidPrice(coin) || getCurrentPrice(coin)
            if (price <= 0) continue

            const avgBalance = exchanges
              .map(e => this.state.portfolio[e]?.[coin] ?? 0)
              .reduce((a, b) => a + b, 0) / exchanges.length
            if (coinBalance <= avgBalance * 2) continue

            const sellQty = parseFloat((coinBalance - avgBalance).toFixed(8))
            const sellRevenue = parseFloat((sellQty * price).toFixed(8))
            if (sellRevenue < TIER1_MIN_SURPLUS_USD) continue

            const fee = parseFloat((sellRevenue * DEFAULT_FEE_RATE).toFixed(8))
            const coinBefore = coinBalance
            const usdtBefore = wallet.USDT ?? 0

            wallet[coin] = parseFloat(((wallet[coin] ?? 0) - sellQty).toFixed(8))
            if ((wallet[coin] ?? 0) < 0.000001) delete wallet[coin]
            wallet.USDT = parseFloat(((wallet.USDT ?? 0) + sellRevenue - fee).toFixed(8))

            this.addRebalanceEvent({
              id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
              botId: this.botId,
              timestamp: now,
              tier: 1,
              type: 'sell_rebuy',
              asset: coin,
              fromExchange: exchange,
              toExchange: exchange,
              amount: sellQty,
              amountUsd: sellRevenue,
              fee,
              feeType: 'trading',
              chain: null,
              transferTimeMinutes: null,
              reason: `Sold surplus ${coin} on ${exchange} — USDT was low`,
              balanceBefore: { from: coinBefore, to: usdtBefore },
              balanceAfter: { from: wallet[coin] ?? 0, to: wallet.USDT },
            })
            actionsThisCycle++
          }
        }
      }
    }
  }

  // ── Tier 2 rebalancing — USDT transfer via fastest chain (every 5 min) ────────

  rebalanceTier2(): void {
    if (!this.portfolioInitialized) return
    if (this.state.currentCycle.phase !== 'trading') return
    const exchanges = ACTIVE_EXCHANGES.filter(e => !!this.state.portfolio[e])
    let actionsThisCycle = 0

    while (actionsThisCycle < TIER2_MAX_ACTIONS) {
      const usdtMap = exchanges.map(e => ({ exchange: e, usdt: this.state.portfolio[e]?.USDT ?? 0 }))
      const avgUsdt = usdtMap.reduce((a, b) => a + b.usdt, 0) / usdtMap.length
      if (avgUsdt <= 0) break

      const sorted = [...usdtMap].sort((a, b) => b.usdt - a.usdt)
      const richest = sorted[0]!
      const poorest = sorted[sorted.length - 1]!

      if (richest.usdt - poorest.usdt < TIER2_MIN_USDT_DIFF) break
      if (poorest.usdt / avgUsdt >= 0.25) break
      if (richest.usdt / avgUsdt <= 1.75) break

      // v0.3.5: speed-priority — fastest chain under $2 (Solana, 1min, $0.01)
      const chain = fastestChain()
      const transferAmount = parseFloat(
        Math.min(richest.usdt * 0.4, (avgUsdt - poorest.usdt) * 0.8).toFixed(8)
      )
      if (transferAmount < 5) break

      const richWallet = this.state.portfolio[richest.exchange]!
      const poorWallet = this.state.portfolio[poorest.exchange]!
      const richBefore = richWallet.USDT
      const poorBefore = poorWallet.USDT

      richWallet.USDT = parseFloat((richBefore - transferAmount).toFixed(8))

      const netAmount = parseFloat((transferAmount - chain.fee).toFixed(8))
      const now = Date.now()
      const transitId = `transit-${now}-${Math.random().toString(36).slice(2, 8)}`

      this.state.inTransitFunds.push({
        id: transitId,
        asset: 'USDT',
        amount: netAmount,
        fromExchange: richest.exchange,
        toExchange: poorest.exchange,
        startedAt: now,
        estimatedArrival: now + chain.timeMinutes * 60_000,
        status: 'in_transit',
      })

      this.addRebalanceEvent({
        id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
        botId: this.botId,
        timestamp: now,
        tier: 2,
        type: 'usdt_transfer',
        asset: 'USDT',
        fromExchange: richest.exchange,
        toExchange: poorest.exchange,
        amount: transferAmount,
        amountUsd: transferAmount,
        fee: chain.fee,
        feeType: 'network',
        chain: chain.name,
        transferTimeMinutes: chain.timeMinutes,
        reason: `USDT imbalance: ${richest.exchange} $${richest.usdt.toFixed(0)} vs ${poorest.exchange} $${poorest.usdt.toFixed(0)}`,
        balanceBefore: { from: richBefore, to: poorBefore },
        balanceAfter: { from: richWallet.USDT, to: poorWallet.USDT },
      })

      console.log(
        `[Bot ${this.botId}] T2: $${transferAmount.toFixed(0)} USDT ` +
        `${richest.exchange}→${poorest.exchange} via ${chain.name} (${chain.timeMinutes}m, $${chain.fee})`
      )
      actionsThisCycle++
    }
  }

  // ── Tier 3 rebalancing — coin transfer (last resort, every 10 min) ────────────

  rebalanceTier3(): void {
    if (!this.portfolioInitialized) return
    if (this.state.currentCycle.phase !== 'trading') return
    const exchanges = ACTIVE_EXCHANGES.filter(e => !!this.state.portfolio[e])
    let actionsThisCycle = 0

    for (const coin of this.state.inventoryCoins) {
      if (actionsThisCycle >= TIER3_MAX_ACTIONS) break

      const coinMap = exchanges.map(e => ({ exchange: e, qty: this.state.portfolio[e]?.[coin] ?? 0 }))
      const avgQty = coinMap.reduce((a, b) => a + b.qty, 0) / coinMap.length
      if (avgQty <= 0) continue

      const depleted = coinMap.filter(c => c.qty === 0)
      if (depleted.length === 0) continue

      for (const target of depleted) {
        if (actionsThisCycle >= TIER3_MAX_ACTIONS) break

        const targetWallet = this.state.portfolio[target.exchange]!
        const price = getCurrentPrice(coin)
        if (price > 0 && (targetWallet.USDT ?? 0) >= 15) continue

        const surplus = coinMap.find(c => c.exchange !== target.exchange && c.qty > avgQty * 2)
        if (!surplus) continue

        const transferQty = parseFloat((surplus.qty * 0.4).toFixed(8))
        if (transferQty <= 0) continue

        const amountUsd = parseFloat((price > 0 ? transferQty * price : COIN_TRANSFER_FEE * 2).toFixed(8))
        if (amountUsd < 1) continue

        const fromWallet = this.state.portfolio[surplus.exchange]!
        const fromBefore = fromWallet[coin] ?? 0
        const toBefore   = targetWallet[coin] ?? 0
        const now = Date.now()

        fromWallet[coin] = parseFloat(((fromWallet[coin] ?? 0) - transferQty).toFixed(8))
        if ((fromWallet[coin] ?? 0) < 0.000001) delete fromWallet[coin]

        targetWallet.USDT = parseFloat(((targetWallet.USDT ?? 0) - COIN_TRANSFER_FEE).toFixed(8))

        const transitId = `transit-${now}-${Math.random().toString(36).slice(2, 8)}`
        this.state.inTransitFunds.push({
          id: transitId,
          asset: coin,
          amount: transferQty,
          fromExchange: surplus.exchange,
          toExchange: target.exchange,
          startedAt: now,
          estimatedArrival: now + 5 * 60_000,
          status: 'in_transit',
        })

        this.addRebalanceEvent({
          id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
          botId: this.botId,
          timestamp: now,
          tier: 3,
          type: 'coin_transfer',
          asset: coin,
          fromExchange: surplus.exchange,
          toExchange: target.exchange,
          amount: transferQty,
          amountUsd,
          fee: COIN_TRANSFER_FEE,
          feeType: 'network',
          chain: 'Arbitrum',
          transferTimeMinutes: 5,
          reason: `${coin} depleted on ${target.exchange}; ${surplus.exchange} had ${(surplus.qty / avgQty).toFixed(1)}x avg`,
          balanceBefore: { from: fromBefore, to: toBefore },
          balanceAfter: { from: fromWallet[coin] ?? 0, to: targetWallet[coin] ?? 0 },
        })

        console.log(
          `[Bot ${this.botId}] T3: ${transferQty.toFixed(4)} ${coin} ` +
          `${surplus.exchange}→${target.exchange} via Arbitrum (5m)`
        )
        actionsThisCycle++
      }
    }
  }

  // ── Hourly liquidation cycle ──────────────────────────────────────────────────

  protected getCycleIntervalMs(): number {
    return CYCLE_INTERVAL_MS
  }

  triggerCycle(): void {
    if (!this.portfolioInitialized) return

    const cycleNum = this.state.currentCycle.cycleNumber
    const cycleStartedAt = Date.now()

    this.state.currentCycle = {
      cycleNumber: cycleNum,
      startedAt: cycleStartedAt,
      phase: 'liquidating',
      liquidationResults: null,
      restockResults: null,
    }
    this.saveToDisk()

    // ── PHASE 1: LIQUIDATE — sell all coins at bid price ──────────────────────
    let totalCoinsLiquidated = 0
    let totalUsdtRecovered = 0
    let realizedPnl = 0
    let feesForLiquidation = 0

    const exchanges = ACTIVE_EXCHANGES.filter(e => !!this.state.portfolio[e])

    for (const exchange of exchanges) {
      const wallet = this.state.portfolio[exchange]!

      for (const asset of Object.keys(wallet)) {
        if (asset === 'USDT') continue
        const balance = wallet[asset] ?? 0
        if (balance <= 0.000001) continue

        const bidPrice = getCurrentBidPrice(asset) || getCurrentPrice(asset)
        if (bidPrice <= 0) {
          delete wallet[asset]
          continue
        }

        const usdtGross = parseFloat((balance * bidPrice).toFixed(8))
        const fee = parseFloat((usdtGross * DEFAULT_FEE_RATE).toFixed(8))
        const usdtNet = parseFloat((usdtGross - fee).toFixed(8))

        const buyPrice = this.state.restockPrices[asset] ?? bidPrice
        realizedPnl += (bidPrice - buyPrice) * balance

        wallet.USDT = parseFloat(((wallet.USDT ?? 0) + usdtNet).toFixed(8))
        delete wallet[asset]

        totalCoinsLiquidated++
        totalUsdtRecovered += usdtNet
        feesForLiquidation += fee
      }
    }

    realizedPnl = parseFloat(realizedPnl.toFixed(8))
    this.state.realizedInventoryPnl = parseFloat(
      (this.state.realizedInventoryPnl + realizedPnl).toFixed(8)
    )

    this.state.currentCycle.liquidationResults = {
      totalCoinsLiquidated,
      totalUsdtRecovered: parseFloat(totalUsdtRecovered.toFixed(8)),
      realizedPnl,
      feesForLiquidation: parseFloat(feesForLiquidation.toFixed(8)),
      feesForRestock: 0,
      totalCycleFees: parseFloat(feesForLiquidation.toFixed(8)),
    }

    console.log(
      `[Bot ${this.botId}] Cycle #${cycleNum} LIQUIDATION: ` +
      `Sold ${totalCoinsLiquidated} positions, ` +
      `recovered $${totalUsdtRecovered.toFixed(2)} USDT, ` +
      `realized P&L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)}`
    )

    // ── PHASE 2: REBALANCE USDT — equalize across exchanges (instant, $0.15/xfer) ─
    this.state.currentCycle.phase = 'restocking'

    const rebalChain = fastestChain()
    let rebalanceFees = 0
    const totalUsdt = exchanges.reduce((sum, e) => sum + (this.state.portfolio[e]?.USDT ?? 0), 0)
    const targetPerEx = totalUsdt / exchanges.length

    // Iterate: move from richest to poorest until balanced (cap 8 iterations)
    for (let iter = 0; iter < 8; iter++) {
      const usdtMap = exchanges
        .map(e => ({ exchange: e, usdt: this.state.portfolio[e]?.USDT ?? 0 }))
        .sort((a, b) => b.usdt - a.usdt)

      const richest = usdtMap[0]!
      const poorest = usdtMap[usdtMap.length - 1]!

      const imbalance = richest.usdt - poorest.usdt
      if (imbalance < targetPerEx * 0.2) break   // within 20%, stop

      const xferAmt = parseFloat(Math.min(
        (richest.usdt - targetPerEx) * 0.9,
        (targetPerEx - poorest.usdt) * 0.9
      ).toFixed(8))
      if (xferAmt < 5) break

      const richWallet = this.state.portfolio[richest.exchange]!
      const poorWallet = this.state.portfolio[poorest.exchange]!

      richWallet.USDT = parseFloat(((richWallet.USDT ?? 0) - xferAmt).toFixed(8))
      poorWallet.USDT = parseFloat(((poorWallet.USDT ?? 0) + xferAmt - rebalChain.fee).toFixed(8))
      rebalanceFees += rebalChain.fee
    }

    // ── PHASE 3: RESTOCK — buy fresh inventory at ask prices ─────────────────
    const coins = this.state.inventoryCoins
    const totalWeight = coins.reduce((sum, c) => sum + (COIN_WEIGHT[c] ?? 1.0), 0)
    const newRestockPrices: Record<string, number> = {}
    let coinsRestocked = 0
    let totalInvested = 0
    let feesForRestock = 0

    for (const exchange of exchanges) {
      const wallet = this.state.portfolio[exchange]!
      const inventoryBudget = parseFloat(((wallet.USDT ?? 0) * 0.6).toFixed(8))
      let spent = 0

      for (const coin of coins) {
        const weight = COIN_WEIGHT[coin] ?? 1.0
        const allocation = parseFloat(((weight / totalWeight) * inventoryBudget).toFixed(8))

        const askPrice = getCurrentAskPrice(coin) || getCurrentPrice(coin)
        if (askPrice <= 0) continue

        const totalCost = parseFloat((allocation * (1 + DEFAULT_FEE_RATE)).toFixed(8))
        if (spent + allocation > (wallet.USDT ?? 0) - 1) continue  // leave $1 buffer

        const fee = parseFloat((allocation * DEFAULT_FEE_RATE).toFixed(8))
        const coinBought = parseFloat(((allocation - fee) / askPrice).toFixed(8))
        if (coinBought <= 0) continue

        wallet[coin] = parseFloat(((wallet[coin] ?? 0) + coinBought).toFixed(8))
        spent = parseFloat((spent + totalCost).toFixed(8))
        feesForRestock += fee
        newRestockPrices[coin] = askPrice
        coinsRestocked++
      }

      wallet.USDT = parseFloat(((wallet.USDT ?? 0) - spent).toFixed(8))
      totalInvested += spent
    }

    this.state.restockPrices = newRestockPrices

    console.log(
      `[Bot ${this.botId}] Cycle #${cycleNum} RESTOCK: ` +
      `Bought ${coinsRestocked} positions, invested $${totalInvested.toFixed(2)}`
    )

    // ── PHASE 4: FINALIZE ─────────────────────────────────────────────────────
    const totalCycleFees = parseFloat(
      (feesForLiquidation + feesForRestock + rebalanceFees).toFixed(8)
    )
    this.state.totalCycleFees = parseFloat(
      (this.state.totalCycleFees + totalCycleFees).toFixed(8)
    )

    if (this.state.currentCycle.liquidationResults) {
      this.state.currentCycle.liquidationResults.feesForRestock = parseFloat(
        (feesForRestock + rebalanceFees).toFixed(8)
      )
      this.state.currentCycle.liquidationResults.totalCycleFees = totalCycleFees
    }

    this.state.currentCycle.restockResults = {
      coinsRestocked,
      totalInvested: parseFloat(totalInvested.toFixed(8)),
      averagePricePerCoin: { ...newRestockPrices },
    }

    // Archive completed cycle
    const completedCycle: LiquidationCycle = { ...this.state.currentCycle }
    this.state.cycleHistory = [completedCycle, ...this.state.cycleHistory].slice(0, MAX_CYCLE_HISTORY)

    const nextAt = Date.now() + this.getCycleIntervalMs()
    this.state.nextCycleAt = nextAt
    this.state.currentCycle = makeFreshCycle(cycleNum + 1)

    const nextTime = new Date(nextAt).toLocaleTimeString()
    console.log(
      `[Bot ${this.botId}] Cycle #${cycleNum} complete. ` +
      `Total cycle fees: $${totalCycleFees.toFixed(2)}. Next cycle at ${nextTime}`
    )

    this.calculatePortfolioValue()
    this.saveToDisk()
  }

  checkAndTriggerCycle(): void {
    if (!this.portfolioInitialized) return
    if (Date.now() >= this.state.nextCycleAt) {
      this.triggerCycle()
    }
  }

  // ── Trade evaluation ──────────────────────────────────────────────────────────

  evaluateTrade(gap: GapRecord): void {
    const now = Date.now()
    if (this.tradedGaps.has(gap.id)) return
    const lastSymbolTrade = this.symbolCooldown.get(gap.symbol)
    if (lastSymbolTrade && now - lastSymbolTrade < SYMBOL_COOLDOWN_MS) return

    // ── Q1 FIX: Minimum profitable spread guard ───────────────────────────────
    // Dynamically compute minimum from per-exchange taker fees × 1.5× safety buffer
    // to account for slippage on top of fees. Hard floor of 0.25%.
    // Without this, the bot executes on 0.06% spreads that cost 0.20% in fees → guaranteed loss.
    {
      const buyFeePct  = getTakerFee(gap.buyExchange)  * 100
      const sellFeePct = getTakerFee(gap.sellExchange) * 100
      const minSpread  = Math.max(0.25, (buyFeePct + sellFeePct) * 1.5)
      if (gap.spreadPercent < minSpread) {
        this.recordVoid(
          gap,
          `Spread below min (${gap.spreadPercent.toFixed(3)}% < ${minSpread.toFixed(3)}%)`,
          'tooSmall'
        )
        this.tradedGaps.add(gap.id)
        return
      }
    }

    // ── Circuit breaker checks ────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    if (this.state.dailyOpenDate !== today) {
      this.state.dailyOpenDate = today
      this.state.dailyOpenValue = this.state.totalPortfolioValueUsd
      this.state.circuitBreakerActive = false
      this.state.circuitBreakerReason = ''
    }

    const drawdownPct = this.state.peakValue > 0
      ? (this.state.peakValue - this.state.totalPortfolioValueUsd) / this.state.peakValue
      : 0
    const dailyLossPct = this.state.dailyOpenValue > 0
      ? (this.state.dailyOpenValue - this.state.totalPortfolioValueUsd) / this.state.dailyOpenValue
      : 0

    if (drawdownPct >= MAX_DRAWDOWN_PAUSE_PCT) {
      this.state.circuitBreakerActive = true
      this.state.circuitBreakerReason = `Drawdown ${(drawdownPct * 100).toFixed(1)}% exceeds ${MAX_DRAWDOWN_PAUSE_PCT * 100}% limit`
    } else if (dailyLossPct >= MAX_DAILY_LOSS_PCT) {
      this.state.circuitBreakerActive = true
      this.state.circuitBreakerReason = `Daily loss ${(dailyLossPct * 100).toFixed(1)}% exceeds ${MAX_DAILY_LOSS_PCT * 100}% limit`
    } else {
      this.state.circuitBreakerActive = false
      this.state.circuitBreakerReason = ''
    }

    if (this.state.circuitBreakerActive) {
      this.state.voidedSignals++
      this.state.voidByCategory.circuitBreaker++
      this.tradedGaps.add(gap.id)
      return
    }

    // Block trading during liquidation / restock phases
    if (this.state.currentCycle.phase !== 'trading') {
      this.recordVoid(gap, 'Cycle in progress', 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    const [baseAsset, quoteAsset = 'USDT'] = gap.symbol.split('/')
    if (!baseAsset) return

    // DEX gaps allowed for cex_dex, triangular, and cross_chain gap types
    const isDexGap = gap.type === 'dex_cex' || gap.type === 'triangular' || gap.type === 'cross_chain'
    if (!isDexGap && (DEX_EXCHANGES.has(gap.buyExchange) || DEX_EXCHANGES.has(gap.sellExchange))) {
      this.recordVoid(gap, 'DEX not supported for this gap type', 'dex')
      this.tradedGaps.add(gap.id)
      return
    }

    // Triangular and cross-chain gaps use a different execution path (single-exchange or bridge)
    if (gap.type === 'triangular' || gap.type === 'cross_chain') {
      this.evaluateMultiLegGap(gap, now)
      return
    }

    if (!ACTIVE_EXCHANGES.includes(gap.buyExchange)) {
      this.recordVoid(gap, `Exchange not in portfolio (${gap.buyExchange})`, 'exchangeMissing')
      this.tradedGaps.add(gap.id)
      return
    }
    if (!ACTIVE_EXCHANGES.includes(gap.sellExchange)) {
      this.recordVoid(gap, `Exchange not in portfolio (${gap.sellExchange})`, 'exchangeMissing')
      this.tradedGaps.add(gap.id)
      return
    }

    const buyWallet  = this.state.portfolio[gap.buyExchange]
    const sellWallet = this.state.portfolio[gap.sellExchange]
    if (!buyWallet || !sellWallet) return

    let availableUsdt = buyWallet.USDT ?? 0
    if (availableUsdt < 1) {
      const rescued = this.tryTier1RescueBuyUsdt(gap.buyExchange)
      availableUsdt = buyWallet.USDT ?? 0
      if (availableUsdt < 1) {
        this.recordVoid(gap, `No USDT on ${gap.buyExchange} ($${(buyWallet.USDT ?? 0).toFixed(2)} available)`, 'noUsdt')
        this.tradedGaps.add(gap.id)
        return
      }
      if (rescued) {
        this.state.rescuedVoids++
        console.log(`[Bot ${this.botId}] Rescue: sold coin for USDT on ${gap.buyExchange}, re-evaluating ${gap.symbol}`)
      }
    }

    let availableAsset = sellWallet[baseAsset] ?? 0
    if (availableAsset <= 0) {
      const rescued = this.tryTier1RescueBuyCoin(gap.sellExchange, baseAsset)
      availableAsset = sellWallet[baseAsset] ?? 0
      if (availableAsset <= 0) {
        this.recordVoid(gap, `No ${baseAsset} on ${gap.sellExchange}`, 'noInventory')
        this.tradedGaps.add(gap.id)
        return
      }
      if (rescued) {
        this.state.rescuedVoids++
        // BUG FIX: when buyExchange === sellExchange, coin rescue spent USDT from the
        // same wallet that availableUsdt was read from. Re-read to avoid spending USDT
        // we no longer have — which would send the balance negative.
        if (gap.buyExchange === gap.sellExchange) {
          availableUsdt = buyWallet.USDT ?? 0
        }
        console.log(
          `[Bot ${this.botId}] Rescue: bought ${baseAsset} on ${gap.sellExchange}, ` +
          `re-evaluating ${gap.symbol}`
        )
      }
    }

    const maxSellUsdt = availableAsset * gap.sellPrice
    const depthLimit  = gap.depthAnalysis?.profitableSize ?? gap.maxTradeableUsd ?? 10_000
    const maxPerTrade = this.startingCapital * 0.03   // 3% Kelly-based cap (was 20%)
    let tradeSizeUsd  = Math.min(availableUsdt, maxSellUsdt, depthLimit, maxPerTrade)
    const depthLimited = depthLimit < Math.min(availableUsdt, maxSellUsdt, maxPerTrade)

    if (tradeSizeUsd < 5) {
      this.recordVoid(gap, `Trade too small ($${tradeSizeUsd.toFixed(2)})`, 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    let quantity = tradeSizeUsd / gap.buyPrice
    const inventoryLimited = quantity > availableAsset
    quantity = Math.min(quantity, availableAsset)
    tradeSizeUsd = quantity * gap.buyPrice

    if (tradeSizeUsd < 5) {
      this.recordVoid(gap, `Trade too small after inventory cap ($${tradeSizeUsd.toFixed(2)})`, 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    // ── Per-exchange taker fees (not flat rate) ───────────────────────────────
    const buyTakerFee  = getTakerFee(gap.buyExchange)
    const sellTakerFee = getTakerFee(gap.sellExchange)

    // ── Slippage model: sqrt market-impact ───────────────────────────────────
    // Use live order book depth from depth analysis when available
    const buyBookDepth  = gap.depthAnalysis?.buyBookDepthUsd
    const sellBookDepth = gap.depthAnalysis?.sellBookDepthUsd
    const buySlippagePct  = estimateSlippagePct(gap.buyExchange,  tradeSizeUsd, buyBookDepth)
    const sellSlippagePct = estimateSlippagePct(gap.sellExchange, tradeSizeUsd, sellBookDepth)
    const effectiveBuyPrice  = parseFloat((gap.buyPrice  * (1 + buySlippagePct  / 100)).toFixed(8))
    const effectiveSellPrice = parseFloat((gap.sellPrice * (1 - sellSlippagePct / 100)).toFixed(8))

    const buyCost     = parseFloat((quantity * effectiveBuyPrice).toFixed(8))
    const buyFee      = parseFloat((buyCost * buyTakerFee).toFixed(8))
    const sellRevenue = parseFloat((quantity * effectiveSellPrice).toFixed(8))
    const sellFee     = parseFloat((sellRevenue * sellTakerFee).toFixed(8))
    const slippageCost = parseFloat(
      ((gap.buyPrice - effectiveBuyPrice) * quantity + (gap.sellPrice - effectiveSellPrice) * quantity).toFixed(8)
    )

    buyWallet.USDT = parseFloat(((buyWallet.USDT ?? 0) - buyCost - buyFee).toFixed(8))
    buyWallet[baseAsset] = parseFloat(((buyWallet[baseAsset] ?? 0) + quantity).toFixed(8))

    sellWallet[baseAsset] = parseFloat(((sellWallet[baseAsset] ?? 0) - quantity).toFixed(8))
    if ((sellWallet[baseAsset] ?? 0) < 0.000001) delete sellWallet[baseAsset]
    sellWallet.USDT = parseFloat(((sellWallet.USDT ?? 0) + sellRevenue - sellFee).toFixed(8))

    const grossProfit = sellRevenue - buyCost
    const totalFees   = buyFee + sellFee
    const netProfit   = grossProfit - totalFees

    const trade: SimTrade = {
      id: `trade-${now}-${Math.random().toString(36).slice(2, 6)}`,
      botId: this.botId,
      timestamp: now,
      symbol: gap.symbol,
      baseAsset,
      quoteAsset,
      type: gap.type,
      buyExchange: gap.buyExchange,
      sellExchange: gap.sellExchange,
      buyPrice: gap.buyPrice,
      sellPrice: gap.sellPrice,
      spreadPercent: gap.spreadPercent,
      quantity,
      tradeSizeUsd,
      grossProfit,
      buyFee,
      sellFee,
      totalFees,
      netProfit,
      depthLimited,
      inventoryLimited,
    }

    this.state.totalTrades++
    this.state.totalFeesPaid    = parseFloat((this.state.totalFeesPaid    + totalFees).toFixed(8))
    this.state.totalSlippageCost = parseFloat(((this.state.totalSlippageCost ?? 0) + Math.abs(slippageCost)).toFixed(8))
    this.state.tradingPnl       = parseFloat((this.state.tradingPnl + netProfit).toFixed(8))
    this.state.lastTradeAt      = now

    if (netProfit > 0) this.state.winningTrades++
    else this.state.losingTrades++

    this.state.winRate = (this.state.winningTrades / this.state.totalTrades) * 100

    if (!this.state.bestTrade  || netProfit > this.state.bestTrade.netProfit)  this.state.bestTrade  = trade
    if (!this.state.worstTrade || netProfit < this.state.worstTrade.netProfit) this.state.worstTrade = trade

    this.state.recentTrades = [trade, ...this.state.recentTrades].slice(0, MAX_RECENT_TRADES)
    this.tradedGaps.add(gap.id)
    this.symbolCooldown.set(gap.symbol, now)

    if (this.state.totalTrades % 10 === 0) {
      this.calculatePortfolioValue()
      console.log(
        `[PaperBot ${this.botId}] ${gap.symbol} ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} | ` +
        `Portfolio: $${this.state.totalPortfolioValueUsd.toFixed(2)} | Trades: ${this.state.totalTrades}`
      )
    }
  }

  /**
   * Simulates multi-leg gaps (triangular, cross-chain) as a single synthetic trade.
   * Uses the net profit from the gap record directly — the calculators already
   * model gas, bridge fees, and round-trip costs. We apply slippage on top.
   */
  protected evaluateMultiLegGap(gap: GapRecord, now: number): void {
    // Multi-leg trades must also meet the minimum profitable spread.
    // Triangular/cross-chain calculators may produce noisy low-spread signals;
    // a 0.25% floor ensures we only execute when there is genuine profit after fees.
    if (gap.spreadPercent < 0.25) {
      this.recordVoid(gap, `Multi-leg spread below min (${gap.spreadPercent.toFixed(3)}% < 0.25%)`, 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    const [baseAsset, quoteAsset = 'USDT'] = gap.symbol.split('/')
    if (!baseAsset) return

    const tradeExchange = ACTIVE_EXCHANGES.includes(gap.buyExchange) ? gap.buyExchange : ACTIVE_EXCHANGES[0]!
    const wallet = this.state.portfolio[tradeExchange]
    if (!wallet) { this.tradedGaps.add(gap.id); return }

    const maxPerTrade = this.startingCapital * 0.03   // 3% cap on multi-leg too
    const availableUsdt = wallet.USDT ?? 0
    const tradeSizeUsd = Math.min(availableUsdt, maxPerTrade, gap.maxTradeableUsd || maxPerTrade)
    if (tradeSizeUsd < 5) {
      this.recordVoid(gap, `Multi-leg trade too small ($${tradeSizeUsd.toFixed(2)})`, 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    // Net profit rate already accounts for gas/bridge; add slippage on top
    const slippagePct = estimateSlippagePct(tradeExchange, tradeSizeUsd)
    const netProfitRate = (gap.spreadPercent / 100) - (slippagePct / 100)
    const grossProfit   = parseFloat((tradeSizeUsd * (gap.spreadPercent / 100)).toFixed(8))
    const feeRate       = getTakerFee(tradeExchange)
    const totalFees     = parseFloat((tradeSizeUsd * feeRate * 2).toFixed(8))
    const slippageCost  = parseFloat((tradeSizeUsd * slippagePct / 100).toFixed(8))
    const netProfit     = parseFloat((tradeSizeUsd * netProfitRate - totalFees).toFixed(8))

    wallet.USDT = parseFloat(((wallet.USDT ?? 0) + netProfit).toFixed(8))

    const trade: SimTrade = {
      id: `trade-${now}-${Math.random().toString(36).slice(2, 6)}`,
      botId: this.botId,
      timestamp: now,
      symbol: gap.symbol,
      baseAsset,
      quoteAsset,
      type: gap.type,
      buyExchange: gap.buyExchange,
      sellExchange: gap.sellExchange,
      buyPrice: gap.buyPrice,
      sellPrice: gap.sellPrice,
      spreadPercent: gap.spreadPercent,
      quantity: tradeSizeUsd / (gap.buyPrice || 1),
      tradeSizeUsd,
      grossProfit,
      buyFee: totalFees / 2,
      sellFee: totalFees / 2,
      totalFees,
      netProfit,
      depthLimited: false,
      inventoryLimited: false,
    }

    this.state.totalTrades++
    this.state.totalFeesPaid     = parseFloat((this.state.totalFeesPaid     + totalFees).toFixed(8))
    this.state.totalSlippageCost = parseFloat(((this.state.totalSlippageCost ?? 0) + slippageCost).toFixed(8))
    this.state.tradingPnl        = parseFloat((this.state.tradingPnl        + netProfit).toFixed(8))
    this.state.lastTradeAt       = now

    if (netProfit > 0) this.state.winningTrades++
    else               this.state.losingTrades++
    this.state.winRate = (this.state.winningTrades / this.state.totalTrades) * 100

    if (!this.state.bestTrade  || netProfit > this.state.bestTrade.netProfit)  this.state.bestTrade  = trade
    if (!this.state.worstTrade || netProfit < this.state.worstTrade.netProfit) this.state.worstTrade = trade

    this.state.recentTrades = [trade, ...this.state.recentTrades].slice(0, MAX_RECENT_TRADES)
    this.tradedGaps.add(gap.id)
    this.symbolCooldown.set(gap.symbol, now)
  }

  protected loadFromDisk(): BotState | null {
    try {
      const filePath = path.join(DATA_DIR, `${this.botId}.json`)
      if (!fs.existsSync(filePath)) return null
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BotState
    } catch {
      return null
    }
  }

  saveToDisk(): void {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      fs.writeFileSync(
        path.join(DATA_DIR, `${this.botId}.json`),
        JSON.stringify(this.state, null, 2)
      )
    } catch (err) {
      console.error(`[PaperBot ${this.botId}] Save failed:`, err)
    }
  }

  reset(): BotState {
    this.tradedGaps.clear()
    this.symbolCooldown.clear()
    this.portfolioInitialized = false
    this.state = this.createInitialState()
    const coins = this.selectInventoryCoins()
    this.state.inventoryCoins = coins
    this.initializePortfolio()
    return this.getState()
  }

  getState(): BotState {
    this.calculatePortfolioValue()
    const active = this.state.inTransitFunds.filter(f => f.status === 'in_transit')
    this.state.rebalanceStats.inTransitCount    = active.length
    this.state.rebalanceStats.inTransitValueUsd = active.reduce((sum, f) => {
      const price = f.asset === 'USDT' ? 1 : getCurrentPrice(f.asset)
      return sum + f.amount * (price > 0 ? price : 0)
    }, 0)
    return { ...this.state }
  }

  getTrades(limit = 50): SimTrade[] {
    return this.state.recentTrades.slice(0, limit)
  }

  getVoidedSignals(limit = 30): VoidedSignal[] {
    return this.state.recentVoided.slice(0, limit)
  }

  getRebalances(limit = 20): RebalanceEvent[] {
    return this.state.recentRebalances.slice(0, limit)
  }

  isPortfolioInitialized(): boolean {
    return this.portfolioInitialized
  }

  getNextCycleAt(): number {
    return this.state.nextCycleAt
  }
}

// ── Magnus Alpha — config, migration helpers ──────────────────────────────────

function freshRebalanceRoi(): RebalanceROI {
  return {
    totalRebalanceCost: 0,
    tradesEnabledByRebalancing: 0,
    profitFromEnabledTrades: 0,
    rebalanceROI: 0,
    bestRebalanceDecision: null,
    worstRebalanceDecision: null,
  }
}

function freshFlowTracker(): TradeFlowTracker {
  const exchangeFlow: Record<string, { buys: number; sells: number; netFlow: number }> = {}
  for (const e of ACTIVE_EXCHANGES) {
    exchangeFlow[e] = { buys: 0, sells: 0, netFlow: 0 }
  }
  return { exchangeFlow, coinFlow: {}, lastReset: Date.now() }
}

function defaultMagnusAlphaConfig(): MagnusAlphaConfig {
  return {
    totalCapital: 100_000,          // Founder testing capital
    reservePerExchange: 2_000,      // 2% reserve per exchange ($2K × 9 = $18K locked)
    exchanges: [...ACTIVE_EXCHANGES],
    inventoryCoins: [...DEFAULT_INVENTORY_COINS],
    maxPositionPercent: 10,
    rebalanceMode: 'roi_driven',
    cycleIntervalMs: 14_400_000,    // 4 hours (Q3 fix — prevents fee drain)
  }
}

function clampMagnusConfig(p: Partial<MagnusAlphaConfig> & MagnusAlphaConfig): MagnusAlphaConfig {
  const base = defaultMagnusAlphaConfig()
  // Capital: $1K minimum, $10M maximum (supports all user tiers including institutional)
  const totalCapital = Math.min(10_000_000, Math.max(1_000, p.totalCapital ?? base.totalCapital))
  const maxReserve = Math.min(totalCapital * 0.1, totalCapital * 0.2)
  const reservePerExchange = Math.min(maxReserve, Math.max(10, p.reservePerExchange ?? base.reservePerExchange))
  // Max position: 1%-10% (enforces Kelly sizing — no longer allows 50%)
  const maxPositionPercent = Math.min(10, Math.max(1, p.maxPositionPercent ?? base.maxPositionPercent))
  const cycleIntervalMs = Math.max(60_000, p.cycleIntervalMs ?? base.cycleIntervalMs)
  // Accept any valid non-empty exchange list (removed hardcoded === 9 check)
  const exchanges = (p.exchanges?.length ?? 0) > 0 ? p.exchanges! : base.exchanges
  const inventoryCoins = (p.inventoryCoins?.length ? p.inventoryCoins : base.inventoryCoins) as string[]
  return {
    totalCapital,
    reservePerExchange,
    exchanges,
    inventoryCoins,
    maxPositionPercent,
    rebalanceMode: 'roi_driven',
    cycleIntervalMs,
  }
}

function loadMagnusAlphaConfig(): MagnusAlphaConfig {
  try {
    const p = path.join(DATA_DIR, MAGNUS_ALPHA_CONFIG_FILE)
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as Partial<MagnusAlphaConfig>
      return clampMagnusConfig({ ...defaultMagnusAlphaConfig(), ...raw } as MagnusAlphaConfig)
    }
  } catch { /* ignore */ }
  const def = defaultMagnusAlphaConfig()
  saveMagnusAlphaConfigFile(def)
  return def
}

function saveMagnusAlphaConfigFile(cfg: MagnusAlphaConfig): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(path.join(DATA_DIR, MAGNUS_ALPHA_CONFIG_FILE), JSON.stringify(cfg, null, 2))
  } catch (e) {
    console.error('[Magnus Alpha] Config save failed:', e)
  }
}

function migrateLegacyBetaStateFiles(): void {
  const pairs: [string, string, string][] = [
    ['bot-alpha', 'magnus-beta-1k', 'Magnus Beta · $1K'],
    ['bot-beta', 'magnus-beta-10k', 'Magnus Beta · $10K'],
  ]
  for (const [oldId, newId, newName] of pairs) {
    const oldPath = path.join(DATA_DIR, `${oldId}.json`)
    const newPath = path.join(DATA_DIR, `${newId}.json`)
    if (fs.existsSync(newPath) || !fs.existsSync(oldPath)) continue
    try {
      const data = JSON.parse(fs.readFileSync(oldPath, 'utf-8')) as BotState
      data.id = newId
      data.name = newName
      fs.writeFileSync(newPath, JSON.stringify(data, null, 2))
      fs.unlinkSync(oldPath)
      console.log(`[PaperTrader] Migrated ${oldId}.json → ${newId}.json`)
    } catch { /* ignore */ }
  }
}

class MagnusAlphaBot extends PaperBot {
  protected alphaConfig: MagnusAlphaConfig

  constructor() {
    const cfg = loadMagnusAlphaConfig()
    const k = Math.max(1, Math.round(cfg.totalCapital / 1000))
    super('magnus-alpha', `Magnus Alpha · $${k}K`, cfg.totalCapital)
    this.alphaConfig = cfg
    this.state.startingCapital = cfg.totalCapital
    this.state.id = 'magnus-alpha'
    this.state.name = `Magnus Alpha · $${k}K`
    this.ensureAlphaMeta()
    if (Object.keys(this.state.portfolio).length === 0) {
      this.state.nextCycleAt = Date.now() + this.alphaConfig.cycleIntervalMs
    }
  }

  protected override getCycleIntervalMs(): number {
    return this.alphaConfig?.cycleIntervalMs ?? CYCLE_INTERVAL_MS
  }

  private ensureAlphaMeta(): void {
    if (!this.state.magnusAlphaMeta) {
      this.state.magnusAlphaMeta = {
        rebalanceRoi: freshRebalanceRoi(),
        flowTracker: freshFlowTracker(),
        pendingRebalanceAttribution: [],
        reserveDipCount: 0,
        rebalanceOutcomes: {},
        sellStreak: {},
        predictiveCheckAt: 0,
      }
    }
    const m = this.state.magnusAlphaMeta
    m.flowTracker.exchangeFlow ??= freshFlowTracker().exchangeFlow
    for (const e of ACTIVE_EXCHANGES) {
      m.flowTracker.exchangeFlow[e] ??= { buys: 0, sells: 0, netFlow: 0 }
    }
  }

  getAlphaConfig(): MagnusAlphaConfig {
    return { ...this.alphaConfig }
  }

  applyAlphaConfig(partial: Partial<MagnusAlphaConfig>): MagnusAlphaConfig {
    this.alphaConfig = clampMagnusConfig({ ...this.alphaConfig, ...partial })
    saveMagnusAlphaConfigFile(this.alphaConfig)
    this.state.startingCapital = this.alphaConfig.totalCapital
    const k = Math.max(1, Math.round(this.alphaConfig.totalCapital / 1000))
    this.state.name = `Magnus Alpha · $${k}K`
    return { ...this.alphaConfig }
  }

  getTradingCapital(): number {
    return this.alphaConfig.totalCapital - this.alphaConfig.reservePerExchange * this.alphaConfig.exchanges.length
  }

  private tradingUsdtTargetPerEx(): number {
    return (this.getTradingCapital() / this.alphaConfig.exchanges.length) * 0.4
  }

  private shouldRebalance(asset: string, toExchange: string, cost: number): boolean {
    if (this.alphaConfig.rebalanceMode !== 'roi_driven') return true
    if (cost <= 0) return true

    // Q3 FIX: Require projected ROI >= 3× (was 2×) before authorising a rebalance.
    // Also enforce a per-cycle cost cap so the rebalancer cannot drain more than
    // MAX_REBALANCE_COST_PER_CYCLE in fees in a single pass.
    const MAX_REBALANCE_COST_PER_CYCLE = 5.0   // $5 maximum per rebalance sweep
    const MIN_ROI_MULTIPLIER = 3.0             // need 3× projected payback (was 2×)

    // If this cycle has already spent too much, veto all further rebalances this pass.
    if (this.state.rebalanceStats.totalRebalanceCost > 0) {
      const lastHourCost = this.getRebalanceCostLastHour()
      if (lastHourCost >= MAX_REBALANCE_COST_PER_CYCLE) return false
    }

    const tradesPerHour = this.getTradeFrequencyForCoinOnExchange(asset, toExchange)
    const avgProfit = this.getAvgProfitForCoin(asset)

    // Warmup guard: if we have no history at all, allow (but only up to cost cap above)
    if (tradesPerHour === 0 && avgProfit === 0) return true

    const expectedProfit = tradesPerHour * avgProfit
    // Require expected profit >= MIN_ROI_MULTIPLIER × cost AND must be positive
    return expectedProfit > 0 && expectedProfit > cost * MIN_ROI_MULTIPLIER
  }

  private getRebalanceCostLastHour(): number {
    const cutoff = Date.now() - 3_600_000
    return this.state.recentRebalances
      .filter(r => r.timestamp >= cutoff)
      .reduce((s, r) => s + r.fee, 0)
  }

  getTradeFrequencyForCoinOnExchange(coin: string, exchange: string): number {
    const oneHourAgo = Date.now() - 3_600_000
    let n = 0
    for (const t of this.state.recentTrades) {
      if (t.timestamp < oneHourAgo) break
      if (t.baseAsset !== coin) continue
      if (t.buyExchange === exchange || t.sellExchange === exchange) n++
    }
    return n
  }

  getAvgProfitForCoin(coin: string): number {
    const arr = this.state.recentTrades.filter(t => t.baseAsset === coin)
    if (arr.length === 0) return 0
    return arr.reduce((s, t) => s + t.netProfit, 0) / arr.length
  }

  protected override addRebalanceEvent(event: RebalanceEvent): void {
    super.addRebalanceEvent(event)
    this.ensureAlphaMeta()
    const m = this.state.magnusAlphaMeta!
    const desc = `${event.asset} · ${event.type} · ${event.fromExchange}→${event.toExchange}`
    m.rebalanceOutcomes[event.id] = { tradesEnabled: 0, profit: 0, description: desc }
    m.pendingRebalanceAttribution.push({
      rebalanceId: event.id,
      asset: event.asset,
      exchanges: [event.fromExchange, event.toExchange].filter((v, i, a) => a.indexOf(v) === i),
      at: event.timestamp,
    })
    m.pendingRebalanceAttribution = m.pendingRebalanceAttribution.filter(
      p => Date.now() - p.at < REBALANCE_ATTRIBUTION_MS * 4
    )
    m.rebalanceRoi.totalRebalanceCost = this.state.rebalanceStats.totalRebalanceCost
  }

  private attributeTradeToRebalance(trade: SimTrade): void {
    this.ensureAlphaMeta()
    const m = this.state.magnusAlphaMeta!
    const now = trade.timestamp
    const candidates = m.pendingRebalanceAttribution.filter(
      p =>
        now - p.at <= REBALANCE_ATTRIBUTION_MS &&
        p.asset === trade.baseAsset &&
        (p.exchanges.includes(trade.buyExchange) || p.exchanges.includes(trade.sellExchange)),
    )
    if (candidates.length === 0) return
    const pick = [...candidates].sort((a, b) => b.at - a.at)[0]!
    const out = m.rebalanceOutcomes[pick.rebalanceId]
    if (!out) return
    out.tradesEnabled++
    out.profit = parseFloat((out.profit + trade.netProfit).toFixed(8))
    m.rebalanceRoi.tradesEnabledByRebalancing++
    m.rebalanceRoi.profitFromEnabledTrades = parseFloat(
      (m.rebalanceRoi.profitFromEnabledTrades + trade.netProfit).toFixed(8),
    )
    const cost = this.state.rebalanceStats.totalRebalanceCost
    m.rebalanceRoi.rebalanceROI =
      cost > 0 ? m.rebalanceRoi.profitFromEnabledTrades / cost : 0
    const desc = m.rebalanceOutcomes[pick.rebalanceId]?.description ?? pick.rebalanceId
    const cur = { description: desc, tradesEnabled: out.tradesEnabled, profit: out.profit }
    if (!m.rebalanceRoi.bestRebalanceDecision || out.profit > m.rebalanceRoi.bestRebalanceDecision.profit) {
      m.rebalanceRoi.bestRebalanceDecision = cur
    }
    if (!m.rebalanceRoi.worstRebalanceDecision || out.profit < m.rebalanceRoi.worstRebalanceDecision.profit) {
      m.rebalanceRoi.worstRebalanceDecision = cur
    }
  }

  private updateFlowAfterTrade(trade: SimTrade): void {
    this.ensureAlphaMeta()
    const ft = this.state.magnusAlphaMeta!.flowTracker
    const be = trade.buyExchange
    const se = trade.sellExchange
    ft.exchangeFlow[be] ??= { buys: 0, sells: 0, netFlow: 0 }
    ft.exchangeFlow[se] ??= { buys: 0, sells: 0, netFlow: 0 }
    ft.exchangeFlow[be].buys++
    ft.exchangeFlow[be].netFlow--
    ft.exchangeFlow[se].sells++
    ft.exchangeFlow[se].netFlow++

    ft.coinFlow[trade.baseAsset] ??= {}
    ft.coinFlow[trade.baseAsset]![be] = (ft.coinFlow[trade.baseAsset]![be] ?? 0) + trade.quantity
    ft.coinFlow[trade.baseAsset]![se] = (ft.coinFlow[trade.baseAsset]![se] ?? 0) - trade.quantity

    const st = this.state.magnusAlphaMeta!.sellStreak
    st[se] ??= {}
    st[se]![trade.baseAsset] = (st[se]![trade.baseAsset] ?? 0) + 1
    st[be] ??= {}
    st[be]![trade.baseAsset] = 0
  }

  maybeResetFlowTracker(): void {
    this.ensureAlphaMeta()
    const ft = this.state.magnusAlphaMeta!.flowTracker
    if (Date.now() - ft.lastReset >= TRADE_FLOW_RESET_MS) {
      this.state.magnusAlphaMeta!.flowTracker = freshFlowTracker()
    }
  }

  predictivePreBalance(): void {
    if (!this.portfolioInitialized || this.state.currentCycle.phase !== 'trading') return
    this.ensureAlphaMeta()
    const m = this.state.magnusAlphaMeta!
    const reserve = this.alphaConfig.reservePerExchange
    const chain = fastestChain()

    for (const ex of this.alphaConfig.exchanges) {
      const f = m.flowTracker.exchangeFlow[ex]
      if (!f || f.netFlow >= -5) continue
      let donor: string | null = null
      let best = 0
      for (const [k, v] of Object.entries(m.flowTracker.exchangeFlow)) {
        if (v.netFlow > best) {
          best = v.netFlow
          donor = k
        }
      }
      if (!donor || donor === ex) continue
      const dw = this.state.portfolio[donor]
      const tw = this.state.portfolio[ex]
      if (!dw || !tw) continue
      const send = parseFloat(Math.min(80, dw.USDT - reserve - 20, 40).toFixed(8))
      if (send < 15) continue
      if (!this.shouldRebalance('USDT', ex, chain.fee)) continue
      const now = Date.now()
      dw.USDT = parseFloat((dw.USDT - send).toFixed(8))
      const net = parseFloat((send - chain.fee).toFixed(8))
      this.state.inTransitFunds.push({
        id: `transit-${now}-${Math.random().toString(36).slice(2, 8)}`,
        asset: 'USDT',
        amount: net,
        fromExchange: donor,
        toExchange: ex,
        startedAt: now,
        estimatedArrival: now + chain.timeMinutes * 60_000,
        status: 'in_transit',
      })
      this.addRebalanceEvent({
        id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
        botId: this.botId,
        timestamp: now,
        tier: 4,
        type: 'usdt_transfer',
        asset: 'USDT',
        fromExchange: donor,
        toExchange: ex,
        amount: send,
        amountUsd: send,
        fee: chain.fee,
        feeType: 'network',
        chain: chain.name,
        transferTimeMinutes: chain.timeMinutes,
        reason: `Predictive pre-send (flow)`,
        balanceBefore: { from: dw.USDT + send, to: tw.USDT },
        balanceAfter: { from: dw.USDT, to: tw.USDT },
      })
      console.log(`[Magnus Alpha] Predictive: pre-sending USDT to ${ex} — negative flow detected`)
    }

    for (const ex of this.alphaConfig.exchanges) {
      for (const coin of this.state.inventoryCoins) {
        const streak = m.sellStreak[ex]?.[coin] ?? 0
        if (streak < 3) continue
        const w = this.state.portfolio[ex]
        if (!w) continue
        const avail = (w.USDT ?? 0) - reserve
        if (avail < 20) continue
        const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
        if (price <= 0) continue
        const buyAmt = parseFloat(Math.min(45, avail * 0.25).toFixed(8))
        if (buyAmt < 12) continue
        if (!this.shouldRebalance(coin, ex, buyAmt * DEFAULT_FEE_RATE)) continue
        const fee = parseFloat((buyAmt * DEFAULT_FEE_RATE).toFixed(8))
        const qty = parseFloat(((buyAmt - fee) / price).toFixed(8))
        const now = Date.now()
        const ub = w.USDT ?? 0
        const cb = w[coin] ?? 0
        w.USDT = parseFloat((ub - buyAmt).toFixed(8))
        w[coin] = parseFloat((cb + qty).toFixed(8))
        m.sellStreak[ex] ??= {}
        m.sellStreak[ex]![coin] = 0
        this.addRebalanceEvent({
          id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
          botId: this.botId,
          timestamp: now,
          tier: 4,
          type: 'sell_rebuy',
          asset: coin,
          fromExchange: ex,
          toExchange: ex,
          amount: qty,
          amountUsd: buyAmt,
          fee,
          feeType: 'trading',
          chain: null,
          transferTimeMinutes: null,
          reason: `Predictive pre-buy (depletion)`,
          balanceBefore: { from: ub, to: cb },
          balanceAfter: { from: w.USDT, to: w[coin] ?? 0 },
        })
        console.log(`[Magnus Alpha] Predictive: pre-buying ${coin} on ${ex} — depletion trend`)
      }
    }
  }

  override initializePortfolio(): boolean {
    const cfg = this.alphaConfig
    const exchanges = cfg.exchanges
    const coins = this.state.inventoryCoins
    const tradingCapital = cfg.totalCapital - cfg.reservePerExchange * exchanges.length
    const perExTrading = tradingCapital / exchanges.length
    const tradingUsdt = perExTrading * 0.4
    const inventoryBudget = perExTrading * 0.6
    const reserve = cfg.reservePerExchange
    const totalWeight = coins.reduce((sum, c) => sum + (COIN_WEIGHT[c] ?? 1.0), 0)

    let pricesMissing = 0
    const portfolio: BotPortfolio = {}
    const seedPrices: Record<string, number> = {}
    const targetAllocations: Record<string, Record<string, number>> = {}

    for (const exchange of exchanges) {
      let redistributed = 0
      portfolio[exchange] = { USDT: reserve + tradingUsdt }
      targetAllocations[exchange] = { USDT: reserve + tradingUsdt }

      for (const coin of coins) {
        const weight = COIN_WEIGHT[coin] ?? 1.0
        const coinBudget = (weight / totalWeight) * inventoryBudget
        try {
          const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
          if (price <= 0) {
            pricesMissing++
            redistributed += coinBudget
          } else {
            const qty = coinBudget / price
            portfolio[exchange]![coin] = qty
            targetAllocations[exchange]![coin] = qty
            if (!seedPrices[coin]) seedPrices[coin] = price
          }
        } catch {
          redistributed += coinBudget
        }
      }
      portfolio[exchange]!.USDT += redistributed
    }

    const uniqueMissing = pricesMissing / exchanges.length
    if (uniqueMissing > coins.length * 0.5) {
      console.log(`[Magnus Alpha] Waiting for prices (${uniqueMissing}/${coins.length} missing)`)
      return false
    }

    this.state.portfolio = portfolio
    this.state.restockPrices = seedPrices
    this.state.targetAllocations = targetAllocations
    this.calculatePortfolioValue()
    this.portfolioInitialized = true
    console.log(`[Magnus Alpha] Portfolio seeded — $${this.state.totalPortfolioValueUsd.toFixed(2)}`)
    this.saveToDisk()
    return true
  }

  override refreshInventoryCoins(): void {
    const newCoins = this.selectInventoryCoins()
    const added = newCoins.filter(c => !this.state.inventoryCoins.includes(c))
    if (added.length === 0) return

    const tradingCapital = this.getTradingCapital()
    const perExchange = tradingCapital / this.alphaConfig.exchanges.length
    const inventoryBudget = perExchange * 0.6
    const totalWeight = [...this.state.inventoryCoins, ...added].reduce((s, c) => s + (COIN_WEIGHT[c] ?? 1.0), 0)

    for (const coin of added) {
      this.state.inventoryCoins.push(coin)
      const weight = COIN_WEIGHT[coin] ?? 1.0
      const coinBudget = (weight / totalWeight) * inventoryBudget
      for (const exchange of this.alphaConfig.exchanges) {
        const wallet = this.state.portfolio[exchange]
        if (!wallet) continue
        const reserve = this.alphaConfig.reservePerExchange
        const avail = (wallet.USDT ?? 0) - reserve
        const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
        if (price > 0 && avail >= coinBudget * 2) {
          wallet[coin] = (wallet[coin] ?? 0) + coinBudget / price
          wallet.USDT = parseFloat((wallet.USDT - coinBudget).toFixed(8))
          if (!this.state.restockPrices[coin]) this.state.restockPrices[coin] = price
          if (!this.state.targetAllocations?.[exchange]) this.state.targetAllocations ??= {}
          this.state.targetAllocations[exchange] ??= {}
          this.state.targetAllocations[exchange]![coin] =
            (this.state.targetAllocations[exchange]![coin] ?? 0) + coinBudget / price
        }
      }
    }
    console.log(`[Magnus Alpha] Inventory updated — added: ${added.join(', ')}`)
  }

  protected override tryTier1RescueBuyCoin(exchange: string, coin: string): boolean {
    const wallet = this.state.portfolio[exchange]
    if (!wallet) return false
    const reserve = this.alphaConfig.reservePerExchange
    const minFloor = reserve * 0.5
    const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
    if (price <= 0) return false

    const tradable = (wallet.USDT ?? 0) - reserve
    let buyBudget = tradable > 5 ? Math.min(50, tradable * 0.3) : 0
    if (buyBudget < 10 && (wallet.USDT ?? 0) > minFloor + 5) {
      const maxDip = Math.min(reserve * 0.5, (wallet.USDT ?? 0) - minFloor)
      buyBudget = Math.min(50, maxDip * 0.5)
      if (buyBudget >= 10) {
        this.ensureAlphaMeta()
        this.state.magnusAlphaMeta!.reserveDipCount++
        console.log(`[Magnus Alpha] Reserve dipped on ${exchange}, triggering refill`)
        this.rebalanceTier2()
      }
    }
    if (buyBudget < 10) return false

    const buyAmount = parseFloat(buyBudget.toFixed(8))
    const fee = parseFloat((buyAmount * DEFAULT_FEE_RATE).toFixed(8))
    const coinBought = parseFloat(((buyAmount - fee) / price).toFixed(8))
    const now = Date.now()
    const usdtBefore = wallet.USDT ?? 0
    const coinBefore = wallet[coin] ?? 0

    wallet.USDT = parseFloat((usdtBefore - buyAmount).toFixed(8))
    wallet[coin] = parseFloat(((wallet[coin] ?? 0) + coinBought).toFixed(8))

    this.addRebalanceEvent({
      id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
      botId: this.botId,
      timestamp: now,
      tier: 1,
      type: 'sell_rebuy',
      asset: coin,
      fromExchange: exchange,
      toExchange: exchange,
      amount: coinBought,
      amountUsd: buyAmount,
      fee,
      feeType: 'trading',
      chain: null,
      transferTimeMinutes: null,
      reason: `Rescue (reserve-aware): bought ${coin} on ${exchange}`,
      balanceBefore: { from: usdtBefore, to: coinBefore },
      balanceAfter: { from: wallet.USDT, to: wallet[coin] ?? 0 },
    })
    return true
  }

  override rebalanceTier1(): void {
    if (!this.portfolioInitialized) return
    if (this.state.currentCycle.phase !== 'trading') return
    const exchanges = this.alphaConfig.exchanges.filter(e => !!this.state.portfolio[e])
    const reserve = this.alphaConfig.reservePerExchange
    const tu = this.tradingUsdtTargetPerEx()
    let actionsThisCycle = 0

    for (const exchange of exchanges) {
      if (actionsThisCycle >= TIER1_MAX_ACTIONS) break
      const wallet = this.state.portfolio[exchange]!
      const usdt = wallet.USDT ?? 0
      const tradable = usdt - reserve
      const now = Date.now()

      if (tradable > tu * 1.5) {
        const usdtSurplus = tradable - tu
        if (usdtSurplus >= TIER1_MIN_SURPLUS_USD) {
          for (const coin of this.state.inventoryCoins) {
            if (actionsThisCycle >= TIER1_MAX_ACTIONS) break
            const coinBalance = wallet[coin] ?? 0
            const price = getCurrentAskPrice(coin) || getCurrentPrice(coin)
            if (price <= 0) continue
            if (coinBalance * price > 10) continue

            const buyAmount = parseFloat(Math.min(50, usdtSurplus / 3).toFixed(8))
            if (buyAmount < TIER1_MIN_DEFICIT_USD) continue
            const estCost = buyAmount * DEFAULT_FEE_RATE
            if (!this.shouldRebalance(coin, exchange, estCost)) continue

            const fee = parseFloat((buyAmount * DEFAULT_FEE_RATE).toFixed(8))
            const coinBought = parseFloat(((buyAmount - fee) / price).toFixed(8))
            const usdtBefore = wallet.USDT ?? 0
            const coinBefore = coinBalance

            wallet.USDT = parseFloat(((wallet.USDT ?? 0) - buyAmount).toFixed(8))
            wallet[coin] = parseFloat(((wallet[coin] ?? 0) + coinBought).toFixed(8))

            this.addRebalanceEvent({
              id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
              botId: this.botId,
              timestamp: now,
              tier: 1,
              type: 'sell_rebuy',
              asset: coin,
              fromExchange: exchange,
              toExchange: exchange,
              amount: coinBought,
              amountUsd: buyAmount,
              fee,
              feeType: 'trading',
              chain: null,
              transferTimeMinutes: null,
              reason: `Bought ${coin} on ${exchange} — inventory was depleted`,
              balanceBefore: { from: usdtBefore, to: coinBefore },
              balanceAfter: { from: wallet.USDT, to: wallet[coin] ?? 0 },
            })
            actionsThisCycle++
          }
        }
      }

      if (tradable < tu * 0.3 && actionsThisCycle < TIER1_MAX_ACTIONS) {
        const usdtDeficit = tu - tradable
        if (usdtDeficit >= TIER1_MIN_DEFICIT_USD) {
          for (const coin of this.state.inventoryCoins) {
            if (actionsThisCycle >= TIER1_MAX_ACTIONS) break
            const coinBalance = wallet[coin] ?? 0
            if (coinBalance <= 0) continue
            const price = getCurrentBidPrice(coin) || getCurrentPrice(coin)
            if (price <= 0) continue

            const avgBalance = exchanges
              .map(e => this.state.portfolio[e]?.[coin] ?? 0)
              .reduce((a, b) => a + b, 0) / exchanges.length
            if (coinBalance <= avgBalance * 2) continue

            const sellQty = parseFloat((coinBalance - avgBalance).toFixed(8))
            const sellRevenue = parseFloat((sellQty * price).toFixed(8))
            if (sellRevenue < TIER1_MIN_SURPLUS_USD) continue
            const estCost = sellRevenue * DEFAULT_FEE_RATE
            if (!this.shouldRebalance(coin, exchange, estCost)) continue

            const fee = parseFloat((sellRevenue * DEFAULT_FEE_RATE).toFixed(8))
            const coinBefore = coinBalance
            const usdtBefore = wallet.USDT ?? 0

            wallet[coin] = parseFloat(((wallet[coin] ?? 0) - sellQty).toFixed(8))
            if ((wallet[coin] ?? 0) < 0.000001) delete wallet[coin]
            wallet.USDT = parseFloat(((wallet.USDT ?? 0) + sellRevenue - fee).toFixed(8))

            this.addRebalanceEvent({
              id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
              botId: this.botId,
              timestamp: now,
              tier: 1,
              type: 'sell_rebuy',
              asset: coin,
              fromExchange: exchange,
              toExchange: exchange,
              amount: sellQty,
              amountUsd: sellRevenue,
              fee,
              feeType: 'trading',
              chain: null,
              transferTimeMinutes: null,
              reason: `Sold surplus ${coin} on ${exchange} — USDT was low`,
              balanceBefore: { from: coinBefore, to: usdtBefore },
              balanceAfter: { from: wallet[coin] ?? 0, to: wallet.USDT },
            })
            actionsThisCycle++
          }
        }
      }
    }
  }

  override rebalanceTier2(): void {
    if (!this.portfolioInitialized) return
    if (this.state.currentCycle.phase !== 'trading') return
    const exchanges = this.alphaConfig.exchanges.filter(e => !!this.state.portfolio[e])
    const reserve = this.alphaConfig.reservePerExchange
    let actionsThisCycle = 0

    while (actionsThisCycle < TIER2_MAX_ACTIONS) {
      const usdtMap = exchanges.map(e => ({
        exchange: e,
        usdt: this.state.portfolio[e]?.USDT ?? 0,
        eff: Math.max(0, (this.state.portfolio[e]?.USDT ?? 0) - reserve),
      }))
      const avgEff = usdtMap.reduce((a, b) => a + b.eff, 0) / usdtMap.length
      if (avgEff <= 0) break

      const sorted = [...usdtMap].sort((a, b) => b.eff - a.eff)
      const richest = sorted[0]!
      const poorest = sorted[sorted.length - 1]!

      if (richest.eff - poorest.eff < TIER2_MIN_USDT_DIFF) break
      if (poorest.eff / avgEff >= 0.25) break
      if (richest.eff / avgEff <= 1.75) break

      const chain = fastestChain()
      if (!this.shouldRebalance('USDT', poorest.exchange, chain.fee)) break

      const maxSend = Math.max(0, (this.state.portfolio[richest.exchange]?.USDT ?? 0) - reserve - 5)
      const transferAmount = parseFloat(
        Math.min(maxSend, richest.eff * 0.4, (avgEff - poorest.eff) * 0.8).toFixed(8),
      )
      if (transferAmount < 5) break

      const richWallet = this.state.portfolio[richest.exchange]!
      const poorWallet = this.state.portfolio[poorest.exchange]!
      const richBefore = richWallet.USDT
      const poorBefore = poorWallet.USDT

      richWallet.USDT = parseFloat((richBefore - transferAmount).toFixed(8))

      const netAmount = parseFloat((transferAmount - chain.fee).toFixed(8))
      const now = Date.now()
      const transitId = `transit-${now}-${Math.random().toString(36).slice(2, 8)}`

      this.state.inTransitFunds.push({
        id: transitId,
        asset: 'USDT',
        amount: netAmount,
        fromExchange: richest.exchange,
        toExchange: poorest.exchange,
        startedAt: now,
        estimatedArrival: now + chain.timeMinutes * 60_000,
        status: 'in_transit',
      })

      this.addRebalanceEvent({
        id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
        botId: this.botId,
        timestamp: now,
        tier: 2,
        type: 'usdt_transfer',
        asset: 'USDT',
        fromExchange: richest.exchange,
        toExchange: poorest.exchange,
        amount: transferAmount,
        amountUsd: transferAmount,
        fee: chain.fee,
        feeType: 'network',
        chain: chain.name,
        transferTimeMinutes: chain.timeMinutes,
        reason: `USDT imbalance: ${richest.exchange} vs ${poorest.exchange}`,
        balanceBefore: { from: richBefore, to: poorBefore },
        balanceAfter: { from: richWallet.USDT, to: poorWallet.USDT },
      })
      console.log(
        `[Magnus Alpha] T2 refill: $${transferAmount.toFixed(0)} ${richest.exchange}→${poorest.exchange} via ${chain.name}`,
      )
      actionsThisCycle++
    }
  }

  override rebalanceTier3(): void {
    if (!this.portfolioInitialized) return
    if (this.state.currentCycle.phase !== 'trading') return
    const exchanges = this.alphaConfig.exchanges.filter(e => !!this.state.portfolio[e])
    const reserve = this.alphaConfig.reservePerExchange
    let actionsThisCycle = 0

    for (const coin of this.state.inventoryCoins) {
      if (actionsThisCycle >= TIER3_MAX_ACTIONS) break

      const coinMap = exchanges.map(e => ({ exchange: e, qty: this.state.portfolio[e]?.[coin] ?? 0 }))
      const avgQty = coinMap.reduce((a, b) => a + b.qty, 0) / coinMap.length
      if (avgQty <= 0) continue

      const depleted = coinMap.filter(c => c.qty === 0)
      if (depleted.length === 0) continue

      for (const target of depleted) {
        if (actionsThisCycle >= TIER3_MAX_ACTIONS) break

        const targetWallet = this.state.portfolio[target.exchange]!
        const price = getCurrentPrice(coin)
        const tradableUsdt = (targetWallet.USDT ?? 0) - reserve
        if (price > 0 && tradableUsdt >= 15) continue

        const surplus = coinMap.find(c => c.exchange !== target.exchange && c.qty > avgQty * 2)
        if (!surplus) continue

        const transferQty = parseFloat((surplus.qty * 0.4).toFixed(8))
        if (transferQty <= 0) continue

        const amountUsd = parseFloat((price > 0 ? transferQty * price : COIN_TRANSFER_FEE * 2).toFixed(8))
        if (amountUsd < 1) continue
        if (!this.shouldRebalance(coin, target.exchange, COIN_TRANSFER_FEE)) continue

        const fromWallet = this.state.portfolio[surplus.exchange]!
        const fromBefore = fromWallet[coin] ?? 0
        const toBefore = targetWallet[coin] ?? 0
        const now = Date.now()

        fromWallet[coin] = parseFloat(((fromWallet[coin] ?? 0) - transferQty).toFixed(8))
        if ((fromWallet[coin] ?? 0) < 0.000001) delete fromWallet[coin]

        const payFee = Math.min(COIN_TRANSFER_FEE, Math.max(0, (targetWallet.USDT ?? 0) - reserve))
        targetWallet.USDT = parseFloat(((targetWallet.USDT ?? 0) - payFee).toFixed(8))

        const transitId = `transit-${now}-${Math.random().toString(36).slice(2, 8)}`
        this.state.inTransitFunds.push({
          id: transitId,
          asset: coin,
          amount: transferQty,
          fromExchange: surplus.exchange,
          toExchange: target.exchange,
          startedAt: now,
          estimatedArrival: now + 5 * 60_000,
          status: 'in_transit',
        })

        this.addRebalanceEvent({
          id: `reb-${now}-${Math.random().toString(36).slice(2, 8)}`,
          botId: this.botId,
          timestamp: now,
          tier: 3,
          type: 'coin_transfer',
          asset: coin,
          fromExchange: surplus.exchange,
          toExchange: target.exchange,
          amount: transferQty,
          amountUsd,
          fee: payFee,
          feeType: 'network',
          chain: 'Arbitrum',
          transferTimeMinutes: 5,
          reason: `${coin} depleted on ${target.exchange}`,
          balanceBefore: { from: fromBefore, to: toBefore },
          balanceAfter: { from: fromWallet[coin] ?? 0, to: targetWallet[coin] ?? 0 },
        })
        actionsThisCycle++
      }
    }
  }

  override triggerCycle(): void {
    if (!this.portfolioInitialized) return

    const cycleNum = this.state.currentCycle.cycleNumber
    const cycleStartedAt = Date.now()

    this.state.currentCycle = {
      cycleNumber: cycleNum,
      startedAt: cycleStartedAt,
      phase: 'liquidating',
      liquidationResults: null,
      restockResults: null,
    }
    this.saveToDisk()

    let totalCoinsLiquidated = 0
    let totalUsdtRecovered = 0
    let realizedPnl = 0
    let feesForLiquidation = 0

    const exchanges = this.alphaConfig.exchanges.filter(e => !!this.state.portfolio[e])
    const reserve = this.alphaConfig.reservePerExchange

    for (const exchange of exchanges) {
      const wallet = this.state.portfolio[exchange]!

      for (const asset of Object.keys(wallet)) {
        if (asset === 'USDT') continue
        const balance = wallet[asset] ?? 0
        if (balance <= 0.000001) continue

        const bidPrice = getCurrentBidPrice(asset) || getCurrentPrice(asset)
        if (bidPrice <= 0) {
          delete wallet[asset]
          continue
        }

        const usdtGross = parseFloat((balance * bidPrice).toFixed(8))
        const fee = parseFloat((usdtGross * DEFAULT_FEE_RATE).toFixed(8))
        const usdtNet = parseFloat((usdtGross - fee).toFixed(8))

        const buyPrice = this.state.restockPrices[asset] ?? bidPrice
        realizedPnl += (bidPrice - buyPrice) * balance

        wallet.USDT = parseFloat(((wallet.USDT ?? 0) + usdtNet).toFixed(8))
        delete wallet[asset]

        totalCoinsLiquidated++
        totalUsdtRecovered += usdtNet
        feesForLiquidation += fee
      }
    }

    realizedPnl = parseFloat(realizedPnl.toFixed(8))
    this.state.realizedInventoryPnl = parseFloat(
      (this.state.realizedInventoryPnl + realizedPnl).toFixed(8),
    )

    this.state.currentCycle.liquidationResults = {
      totalCoinsLiquidated,
      totalUsdtRecovered: parseFloat(totalUsdtRecovered.toFixed(8)),
      realizedPnl,
      feesForLiquidation: parseFloat(feesForLiquidation.toFixed(8)),
      feesForRestock: 0,
      totalCycleFees: parseFloat(feesForLiquidation.toFixed(8)),
    }

    this.state.currentCycle.phase = 'restocking'

    const rebalChain = fastestChain()
    let rebalanceFees = 0
    let totalUsdt = exchanges.reduce((sum, e) => sum + (this.state.portfolio[e]?.USDT ?? 0), 0)
    const tradingPool = Math.max(0, totalUsdt - reserve * exchanges.length)
    const perExTradable = tradingPool / exchanges.length

    for (const exchange of exchanges) {
      const w = this.state.portfolio[exchange]!
      w.USDT = parseFloat((reserve + perExTradable).toFixed(8))
    }

    totalUsdt = exchanges.reduce((sum, e) => sum + (this.state.portfolio[e]?.USDT ?? 0), 0)
    const targetPerEx = totalUsdt / exchanges.length

    for (let iter = 0; iter < 8; iter++) {
      const usdtMap = exchanges
        .map(e => ({ exchange: e, usdt: this.state.portfolio[e]?.USDT ?? 0 }))
        .sort((a, b) => b.usdt - a.usdt)

      const richest = usdtMap[0]!
      const poorest = usdtMap[usdtMap.length - 1]!

      const imbalance = richest.usdt - poorest.usdt
      if (imbalance < targetPerEx * 0.2) break

      const xferAmt = parseFloat(
        Math.min((richest.usdt - targetPerEx) * 0.9, (targetPerEx - poorest.usdt) * 0.9).toFixed(8),
      )
      if (xferAmt < 5) break

      const maxRich = Math.max(0, (this.state.portfolio[richest.exchange]?.USDT ?? 0) - reserve - 1)
      const adj = Math.min(xferAmt, maxRich)
      if (adj < 5) break

      const richWallet = this.state.portfolio[richest.exchange]!
      const poorWallet = this.state.portfolio[poorest.exchange]!

      richWallet.USDT = parseFloat(((richWallet.USDT ?? 0) - adj).toFixed(8))
      poorWallet.USDT = parseFloat(((poorWallet.USDT ?? 0) + adj - rebalChain.fee).toFixed(8))
      rebalanceFees += rebalChain.fee
    }

    const coins = this.state.inventoryCoins
    const totalWeight = coins.reduce((sum, c) => sum + (COIN_WEIGHT[c] ?? 1.0), 0)
    const newRestockPrices: Record<string, number> = {}
    const targetAllocations: Record<string, Record<string, number>> = {}
    let coinsRestocked = 0
    let totalInvested = 0
    let feesForRestock = 0

    for (const exchange of exchanges) {
      const wallet = this.state.portfolio[exchange]!
      const tradable = Math.max(0, (wallet.USDT ?? 0) - reserve)
      const inventoryBudget = parseFloat((tradable * 0.6).toFixed(8))
      targetAllocations[exchange] = { USDT: wallet.USDT ?? 0 }
      let spent = 0

      for (const coin of coins) {
        const weight = COIN_WEIGHT[coin] ?? 1.0
        const allocation = parseFloat(((weight / totalWeight) * inventoryBudget).toFixed(8))

        const askPrice = getCurrentAskPrice(coin) || getCurrentPrice(coin)
        if (askPrice <= 0) continue

        const totalCost = parseFloat((allocation * (1 + DEFAULT_FEE_RATE)).toFixed(8))
        if (spent + allocation > tradable - 1) continue

        const fee = parseFloat((allocation * DEFAULT_FEE_RATE).toFixed(8))
        const coinBought = parseFloat(((allocation - fee) / askPrice).toFixed(8))
        if (coinBought <= 0) continue

        wallet[coin] = parseFloat(((wallet[coin] ?? 0) + coinBought).toFixed(8))
        spent = parseFloat((spent + totalCost).toFixed(8))
        feesForRestock += fee
        newRestockPrices[coin] = askPrice
        coinsRestocked++
        targetAllocations[exchange]![coin] = coinBought
      }

      wallet.USDT = parseFloat(((wallet.USDT ?? 0) - spent).toFixed(8))
      totalInvested += spent
    }

    this.state.restockPrices = newRestockPrices
    this.state.targetAllocations = targetAllocations

    const totalCycleFees = parseFloat(
      (feesForLiquidation + feesForRestock + rebalanceFees).toFixed(8),
    )
    this.state.totalCycleFees = parseFloat((this.state.totalCycleFees + totalCycleFees).toFixed(8))

    if (this.state.currentCycle.liquidationResults) {
      this.state.currentCycle.liquidationResults.feesForRestock = parseFloat(
        (feesForRestock + rebalanceFees).toFixed(8),
      )
      this.state.currentCycle.liquidationResults.totalCycleFees = totalCycleFees
    }

    this.state.currentCycle.restockResults = {
      coinsRestocked,
      totalInvested: parseFloat(totalInvested.toFixed(8)),
      averagePricePerCoin: { ...newRestockPrices },
    }

    const completedCycle: LiquidationCycle = { ...this.state.currentCycle }
    this.state.cycleHistory = [completedCycle, ...this.state.cycleHistory].slice(0, MAX_CYCLE_HISTORY)

    const nextAt = Date.now() + this.getCycleIntervalMs()
    this.state.nextCycleAt = nextAt
    this.state.currentCycle = makeFreshCycle(cycleNum + 1)

    this.calculatePortfolioValue()
    this.saveToDisk()
  }

  override evaluateTrade(gap: GapRecord): void {
    // v0.4.1 CRITICAL: Minimum profitable spread - reject trades below fee threshold
    const MIN_PROFITABLE_SPREAD = 0.25
    if (gap.spreadPercent < MIN_PROFITABLE_SPREAD) {
      this.recordVoid(gap, `Spread below min (${gap.spreadPercent.toFixed(3)}% < ${MIN_PROFITABLE_SPREAD}%)`, 'tooSmall')
      return
    }
    // v0.4.1 CRITICAL: Block spot-futures for Alpha (CEX-CEX only)
    if (gap.type === 'spot_futures') {
      this.recordVoid(gap, 'Spot-futures disabled (CEX-CEX only)', 'tooSmall')
      return
    }

    const now = Date.now()
    if (this.tradedGaps.has(gap.id)) return
    const lastSymbolTrade = this.symbolCooldown.get(gap.symbol)
    if (lastSymbolTrade && now - lastSymbolTrade < SYMBOL_COOLDOWN_MS) return

    if (this.state.currentCycle.phase !== 'trading') {
      this.recordVoid(gap, 'Cycle in progress', 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    const [baseAsset, quoteAsset = 'USDT'] = gap.symbol.split('/')
    if (!baseAsset) return

    if (DEX_EXCHANGES.has(gap.buyExchange) || DEX_EXCHANGES.has(gap.sellExchange)) {
      this.recordVoid(gap, 'DEX not supported', 'dex')
      this.tradedGaps.add(gap.id)
      return
    }

    if (!this.alphaConfig.exchanges.includes(gap.buyExchange)) {
      this.recordVoid(gap, `Exchange not in portfolio (${gap.buyExchange})`, 'exchangeMissing')
      this.tradedGaps.add(gap.id)
      return
    }
    if (!this.alphaConfig.exchanges.includes(gap.sellExchange)) {
      this.recordVoid(gap, `Exchange not in portfolio (${gap.sellExchange})`, 'exchangeMissing')
      this.tradedGaps.add(gap.id)
      return
    }

    const buyWallet = this.state.portfolio[gap.buyExchange]
    const sellWallet = this.state.portfolio[gap.sellExchange]
    if (!buyWallet || !sellWallet) return

    const reserve = this.alphaConfig.reservePerExchange
    let availableUsdt = (buyWallet.USDT ?? 0) - reserve
    if (availableUsdt < 5) {
      const rescued = this.tryTier1RescueBuyUsdt(gap.buyExchange)
      availableUsdt = (buyWallet.USDT ?? 0) - reserve
      if (availableUsdt < 5) {
        this.recordVoid(gap, 'USDT below reserve floor', 'noUsdt')
        this.tradedGaps.add(gap.id)
        return
      }
      if (rescued) {
        this.state.rescuedVoids++
        console.log(`[Magnus Alpha] Rescue: sold coin for USDT on ${gap.buyExchange}, re-evaluating ${gap.symbol}`)
      }
    }

    let availableAsset = sellWallet[baseAsset] ?? 0
    if (availableAsset <= 0) {
      const rescued = this.tryTier1RescueBuyCoin(gap.sellExchange, baseAsset)
      availableAsset = sellWallet[baseAsset] ?? 0
      if (availableAsset <= 0) {
        this.recordVoid(gap, `No ${baseAsset} on ${gap.sellExchange}`, 'noInventory')
        this.tradedGaps.add(gap.id)
        return
      }
      if (rescued) {
        this.state.rescuedVoids++
        console.log(`[Magnus Alpha] Rescue: bought ${baseAsset} on ${gap.sellExchange}, re-evaluating ${gap.symbol}`)
      }
    }

    availableUsdt = (buyWallet.USDT ?? 0) - reserve
    if (availableUsdt < 5) {
      this.recordVoid(gap, 'USDT below reserve floor', 'noUsdt')
      this.tradedGaps.add(gap.id)
      return
    }

    const maxSellUsdt = availableAsset * gap.sellPrice
    const depthLimit = gap.depthAnalysis?.profitableSize ?? gap.maxTradeableUsd ?? 10_000
    const maxPerTrade = this.getTradingCapital() * (this.alphaConfig.maxPositionPercent / 100)
    let tradeSizeUsd = Math.min(availableUsdt, maxSellUsdt, depthLimit, maxPerTrade)
    const depthLimited = depthLimit < Math.min(availableUsdt, maxSellUsdt, maxPerTrade)

    if (tradeSizeUsd < 5) {
      this.recordVoid(gap, `Trade too small ($${tradeSizeUsd.toFixed(2)})`, 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    let quantity = tradeSizeUsd / gap.buyPrice
    const inventoryLimited = quantity > availableAsset
    quantity = Math.min(quantity, availableAsset)
    tradeSizeUsd = quantity * gap.buyPrice

    if (tradeSizeUsd < 5) {
      this.recordVoid(gap, `Trade too small after inventory cap ($${tradeSizeUsd.toFixed(2)})`, 'tooSmall')
      this.tradedGaps.add(gap.id)
      return
    }

    const buyCost = parseFloat((quantity * gap.buyPrice).toFixed(8))
    const buyFee = parseFloat((buyCost * DEFAULT_FEE_RATE).toFixed(8))
    const sellRevenue = parseFloat((quantity * gap.sellPrice).toFixed(8))
    const sellFee = parseFloat((sellRevenue * DEFAULT_FEE_RATE).toFixed(8))

    buyWallet.USDT = parseFloat(((buyWallet.USDT ?? 0) - buyCost - buyFee).toFixed(8))
    buyWallet[baseAsset] = parseFloat(((buyWallet[baseAsset] ?? 0) + quantity).toFixed(8))

    sellWallet[baseAsset] = parseFloat(((sellWallet[baseAsset] ?? 0) - quantity).toFixed(8))
    if ((sellWallet[baseAsset] ?? 0) < 0.000001) delete sellWallet[baseAsset]
    sellWallet.USDT = parseFloat(((sellWallet.USDT ?? 0) + sellRevenue - sellFee).toFixed(8))

    const grossProfit = sellRevenue - buyCost
    const totalFees = buyFee + sellFee
    const netProfit = grossProfit - totalFees

    const trade: SimTrade = {
      id: `trade-${now}-${Math.random().toString(36).slice(2, 6)}`,
      botId: this.botId,
      timestamp: now,
      symbol: gap.symbol,
      baseAsset,
      quoteAsset,
      type: gap.type,
      buyExchange: gap.buyExchange,
      sellExchange: gap.sellExchange,
      buyPrice: gap.buyPrice,
      sellPrice: gap.sellPrice,
      spreadPercent: gap.spreadPercent,
      quantity,
      tradeSizeUsd,
      grossProfit,
      buyFee,
      sellFee,
      totalFees,
      netProfit,
      depthLimited,
      inventoryLimited,
    }

    this.state.totalTrades++
    this.state.totalFeesPaid = parseFloat((this.state.totalFeesPaid + totalFees).toFixed(8))
    this.state.tradingPnl = parseFloat((this.state.tradingPnl + netProfit).toFixed(8))
    this.state.lastTradeAt = now

    if (netProfit > 0) this.state.winningTrades++
    else this.state.losingTrades++

    this.state.winRate = (this.state.winningTrades / this.state.totalTrades) * 100

    if (!this.state.bestTrade || netProfit > this.state.bestTrade.netProfit) this.state.bestTrade = trade
    if (!this.state.worstTrade || netProfit < this.state.worstTrade.netProfit) this.state.worstTrade = trade

    this.state.recentTrades = [trade, ...this.state.recentTrades].slice(0, MAX_RECENT_TRADES)
    this.tradedGaps.add(gap.id)
    this.symbolCooldown.set(gap.symbol, now)

    this.attributeTradeToRebalance(trade)
    this.updateFlowAfterTrade(trade)
    this.maybeResetFlowTracker()

    if (this.state.totalTrades % 10 === 0) {
      this.calculatePortfolioValue()
      console.log(
        `[Magnus Alpha] ${gap.symbol} ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} | ` +
          `Portfolio: $${this.state.totalPortfolioValueUsd.toFixed(2)} | Trades: ${this.state.totalTrades}`,
      )
    }
  }

  override reset(): BotState {
    this.tradedGaps.clear()
    this.symbolCooldown.clear()
    this.portfolioInitialized = false
    this.state = this.createInitialState()
    this.ensureAlphaMeta()
    this.state.magnusAlphaMeta = {
      rebalanceRoi: freshRebalanceRoi(),
      flowTracker: freshFlowTracker(),
      pendingRebalanceAttribution: [],
      reserveDipCount: 0,
      rebalanceOutcomes: {},
      sellStreak: {},
      predictiveCheckAt: 0,
    }
    this.state.targetAllocations = {}
    const coins = this.selectInventoryCoins()
    this.state.inventoryCoins = coins
    this.initializePortfolio()
    return this.getState()
  }
}

// ── v0.3.3 migration — delete stale state if exchange count changed ───────────

function deleteStaleStateFiles(): void {
  for (const botId of ['magnus-beta-1k', 'magnus-beta-10k']) {
    const filePath = path.join(DATA_DIR, `${botId}.json`)
    try {
      if (!fs.existsSync(filePath)) continue
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      if ((saved.activeExchanges?.length ?? 0) < 9) {
        fs.unlinkSync(filePath)
        console.log(`[PaperTrader] v0.3.3 upgrade — re-seeding with 9 exchanges, 15 coins (deleted stale ${botId}.json)`)
      }
    } catch { /* ignore */ }
  }
}
migrateLegacyBetaStateFiles()
deleteStaleStateFiles()

// ── Bot instances ─────────────────────────────────────────────────────────────

// ── Founder testing capital — $100K per bot ───────────────────────────────────
// All 9 bots seeded at $100,000 for strategy validation. Reset state files first.
const FOUNDER_CAPITAL = 100_000

const magnusBeta1k = new PaperBot('magnus-beta-1k', 'VEGA · $100K', FOUNDER_CAPITAL)
const magnusBeta10k = new PaperBot('magnus-beta-10k', 'NEXUS · $100K', FOUNDER_CAPITAL)
const magnusAlpha = new MagnusAlphaBot()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let magnusFutures: any = null

// ── Phase-2 strategy bots ─────────────────────────────────────────────────────
const magnusPairs    = new PaperBot('magnus-pairs',    'SIGMA · $100K',    FOUNDER_CAPITAL)
const magnusCascade  = new PaperBot('magnus-cascade',  'ARES · $100K',     FOUNDER_CAPITAL)
const magnusCalendar = new PaperBot('magnus-calendar', 'TEMPUS · $100K',   FOUNDER_CAPITAL)
const magnusListing  = new PaperBot('magnus-listing',  'SCOUT · $100K',    FOUNDER_CAPITAL)

let isRunning = false

// ── Evaluate loop ─────────────────────────────────────────────────────────────

function evaluate(): void {
  try {
    magnusBeta1k.initializeIfNeeded()
    magnusBeta10k.initializeIfNeeded()
    magnusAlpha.initializeIfNeeded()
    magnusPairs.initializeIfNeeded()
    magnusCascade.initializeIfNeeded()
    magnusCalendar.initializeIfNeeded()
    magnusListing.initializeIfNeeded()

    if (
      !magnusBeta1k.isPortfolioInitialized() &&
      !magnusBeta10k.isPortfolioInitialized() &&
      !magnusAlpha.isPortfolioInitialized()
    ) {
      return
    }

    magnusBeta1k.processInTransit()
    magnusBeta10k.processInTransit()
    magnusAlpha.processInTransit()

    // v0.3.5: check hourly cycle timer
    magnusBeta1k.checkAndTriggerCycle()
    magnusBeta10k.checkAndTriggerCycle()
    magnusAlpha.checkAndTriggerCycle()

    const config = getAlertConfig()
    const minSpread = config.minSpreadPercent
    const gaps = getProfitableGaps()

    for (const gap of gaps) {
      if (!gap.profitSimulation.isProfitable) continue
      if (gap.spreadPercent < minSpread) continue
      magnusBeta1k.evaluateTrade(gap)
      magnusBeta10k.evaluateTrade(gap)
      magnusAlpha.evaluateTrade(gap)
    }

    // === Magnus Futures Bot — Spot-Futures Arbitrage ===
    if (magnusFutures) {
      const futuresGaps = gaps.filter((g: GapRecord) =>
        g.type === 'spot_futures' &&
        g.spreadPercent >= 0.25 &&
        !magnusFutures.processedGapIds.has(g.id)
      )

      for (const gap of futuresGaps) {
        magnusFutures.processedGapIds.add(gap.id)

        const lastCd = magnusFutures.symbolCooldowns.get(gap.symbol)
        if (lastCd && Date.now() - lastCd < 30_000) continue

        const buyEx: string = gap.buyExchange
        const sellEx: string = gap.sellExchange

        if (!magnusFutures.portfolio[buyEx]) {
          magnusFutures.voidedSignals++
          magnusFutures.voidByCategory.exchangeMissing++
          magnusFutures.recentVoided.unshift({
            id: `mf-v-${Date.now()}`, botId: 'magnus-futures', timestamp: Date.now(),
            symbol: gap.symbol, buyExchange: buyEx, sellExchange: sellEx,
            spreadPercent: gap.spreadPercent, reason: 'exchangeMissing',
          })
          if (magnusFutures.recentVoided.length > 30) magnusFutures.recentVoided.length = 30
          continue
        }
        if (!magnusFutures.portfolio[sellEx]) {
          magnusFutures.voidedSignals++
          magnusFutures.voidByCategory.exchangeMissing++
          magnusFutures.recentVoided.unshift({
            id: `mf-v-${Date.now()}`, botId: 'magnus-futures', timestamp: Date.now(),
            symbol: gap.symbol, buyExchange: buyEx, sellExchange: sellEx,
            spreadPercent: gap.spreadPercent, reason: 'exchangeMissing',
          })
          if (magnusFutures.recentVoided.length > 30) magnusFutures.recentVoided.length = 30
          continue
        }

        const buyUsdt: number = magnusFutures.portfolio[buyEx].USDT ?? 0
        const sellUsdt: number = magnusFutures.portfolio[sellEx].USDT ?? 0

        if (buyUsdt < 10) {
          magnusFutures.voidedSignals++
          magnusFutures.voidByCategory.noUsdt++
          magnusFutures.recentVoided.unshift({
            id: `mf-v-${Date.now()}`, botId: 'magnus-futures', timestamp: Date.now(),
            symbol: gap.symbol, buyExchange: buyEx, sellExchange: sellEx,
            spreadPercent: gap.spreadPercent, reason: 'noUsdt',
          })
          if (magnusFutures.recentVoided.length > 30) magnusFutures.recentVoided.length = 30
          continue
        }
        if (sellUsdt < 10) {
          magnusFutures.voidedSignals++
          magnusFutures.voidByCategory.noUsdt++
          magnusFutures.recentVoided.unshift({
            id: `mf-v-${Date.now()}`, botId: 'magnus-futures', timestamp: Date.now(),
            symbol: gap.symbol, buyExchange: buyEx, sellExchange: sellEx,
            spreadPercent: gap.spreadPercent, reason: 'noUsdt',
          })
          if (magnusFutures.recentVoided.length > 30) magnusFutures.recentVoided.length = 30
          continue
        }

        // Position sizing: 50% of available USDT on each side, cap $200/trade
        const maxTrade = Math.min(buyUsdt * 0.5, sellUsdt * 0.5, 200)
        if (maxTrade < 10) {
          magnusFutures.voidedSignals++
          magnusFutures.voidByCategory.tooSmall++
          continue
        }

        const spread = gap.spreadPercent / 100
        const grossProfit = parseFloat((maxTrade * spread).toFixed(8))
        const totalFees = parseFloat((maxTrade * 0.002).toFixed(8))   // 0.1% taker × 2 legs
        const netProfit = parseFloat((grossProfit - totalFees).toFixed(8))

        if (netProfit <= 0) {
          magnusFutures.voidedSignals++
          magnusFutures.voidByCategory.tooSmall++
          continue
        }

        // Execute — spot-futures market neutral model:
        // netProfit already has both legs' fees subtracted (0.2% total)
        // Only credit the sell exchange; no separate fee deduction to avoid double-counting
        magnusFutures.portfolio[sellEx].USDT = parseFloat(
          (magnusFutures.portfolio[sellEx].USDT + netProfit).toFixed(8)
        )

        // Cooldown
        magnusFutures.symbolCooldowns.set(gap.symbol, Date.now())

        // Portfolio value (USDT-only — no coin holdings)
        let newTotal = 0
        for (const wallet of Object.values(magnusFutures.portfolio as Record<string, Record<string, number>>)) {
          newTotal += (wallet as Record<string, number>).USDT ?? 0
        }
        newTotal = parseFloat(newTotal.toFixed(8))
        magnusFutures.totalPortfolioValueUsd = newTotal
        magnusFutures.totalPnlPercent = parseFloat(
          (((newTotal - magnusFutures.startingCapital) / magnusFutures.startingCapital) * 100).toFixed(8)
        )

        if (newTotal > magnusFutures.peakValue) magnusFutures.peakValue = newTotal
        const dd = ((magnusFutures.peakValue - newTotal) / magnusFutures.peakValue) * 100
        if (dd > magnusFutures.maxDrawdown) magnusFutures.maxDrawdown = parseFloat(dd.toFixed(8))

        magnusFutures.totalPnl = parseFloat((magnusFutures.totalPnl + netProfit).toFixed(8))
        magnusFutures.totalFeesPaid = parseFloat((magnusFutures.totalFeesPaid + totalFees).toFixed(8))
        magnusFutures.totalTrades++
        if (netProfit > 0) magnusFutures.winningTrades++
        else magnusFutures.losingTrades++
        magnusFutures.winRate = parseFloat(
          ((magnusFutures.winningTrades / magnusFutures.totalTrades) * 100).toFixed(2)
        )
        magnusFutures.lastTradeAt = Date.now()

        const tradeRecord = {
          id: `mf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          botId: 'magnus-futures',
          timestamp: Date.now(),
          symbol: gap.symbol,
          type: 'spot_futures',
          buyExchange: buyEx,
          sellExchange: sellEx,
          spreadPercent: gap.spreadPercent,
          tradeSizeUsd: maxTrade,
          grossProfit,
          totalFees,
          netProfit,
        }
        magnusFutures.recentTrades.unshift(tradeRecord)
        if (magnusFutures.recentTrades.length > 50) magnusFutures.recentTrades.length = 50

        if (!magnusFutures.bestTrade || netProfit > magnusFutures.bestTrade.netProfit) {
          magnusFutures.bestTrade = tradeRecord
        }
        if (!magnusFutures.worstTrade || netProfit < magnusFutures.worstTrade.netProfit) {
          magnusFutures.worstTrade = tradeRecord
        }
      }

      // Rebalance futures USDT every 100 trades
      if (magnusFutures.totalTrades % 100 === 0 && magnusFutures.totalTrades > 0) {
        const exchanges = Object.keys(magnusFutures.portfolio)
        const totalUsdt = exchanges.reduce((s, ex) => s + (magnusFutures.portfolio[ex].USDT || 0), 0)
        const perExchange = totalUsdt / exchanges.length
        exchanges.forEach(ex => {
          magnusFutures.portfolio[ex].USDT = perExchange
        })
        console.log('[Magnus Futures] Rebalanced USDT — $' + perExchange.toFixed(2) + ' per exchange')
      }
    }

    // === Triangular Arbitrage — feed routes as GapRecords to all bots ===
    const triRoutes = getTriangularRoutes()
    for (const route of triRoutes) {
      if (route.netProfitPercent <= 0) continue
      const triGap: GapRecord = {
        id: route.id,
        type: 'triangular',
        symbol: route.baseSymbol,
        quote_currency: route.baseSymbol.split('/')[1] ?? 'USDT',
        buyExchange: route.exchange,
        sellExchange: route.exchange,
        spreadPercent: route.netProfitPercent,
        buyPrice: route.prices.step1,
        sellPrice: route.prices.step3,
        buyBidSize: 0,
        sellAskSize: 0,
        maxTradeableUsd: 1_000,
        detectedAt: route.detectedAt,
        lastSeenAt: route.detectedAt,
        durationMs: 0,
        isActive: true,
        profitSimulation: {
          isProfitable: route.netProfitPercent > 0,
          at100:  route.estimatedProfit1k * 0.1,
          at1k:   route.estimatedProfit1k,
          at5k:   route.estimatedProfit1k * 5,
          at10k:  route.estimatedProfit1k * 10,
          breakEvenSpread:    route.feesPercent,
          maxProfitableSize:  1_000,
        },
        depthAnalysis: null,
      }
      magnusBeta1k.evaluateTrade(triGap)
      magnusBeta10k.evaluateTrade(triGap)
      magnusAlpha.evaluateTrade(triGap)
    }

    // === Cross-Chain Arbitrage — feed opportunities as GapRecords ===
    const crossChainOpps = getCrossChainOpportunities()
    for (const opp of crossChainOpps) {
      if (opp.netProfitPercent <= 0) continue
      const xGap: GapRecord = {
        id: opp.id,
        type: 'cross_chain',
        symbol: opp.symbol,
        quote_currency: opp.symbol.split('/')[1] ?? 'USDT',
        buyExchange: opp.buyDex,
        sellExchange: opp.sellDex,
        spreadPercent: opp.netProfitPercent,
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        buyBidSize: 0,
        sellAskSize: 0,
        maxTradeableUsd: Math.min(opp.liquidityUsd * 0.1, 5_000),
        detectedAt: opp.detectedAt,
        lastSeenAt: opp.detectedAt,
        durationMs: 0,
        isActive: true,
        profitSimulation: {
          isProfitable: opp.netProfitPercent > 0,
          at100:  opp.estimatedProfit1k * 0.1,
          at1k:   opp.estimatedProfit1k,
          at5k:   opp.estimatedProfit1k * 5,
          at10k:  opp.estimatedProfit1k * 10,
          breakEvenSpread:   opp.estimatedBridgeCostPercent,
          maxProfitableSize: Math.min(opp.liquidityUsd * 0.1, 5_000),
        },
        depthAnalysis: null,
      }
      magnusBeta1k.evaluateTrade(xGap)
      magnusBeta10k.evaluateTrade(xGap)
      magnusAlpha.evaluateTrade(xGap)
    }

    // === Stablecoin Arbitrage — "Stable Drift" ===
    const stableOpps = getStablecoinOpportunities()
    for (const opp of stableOpps) {
      // Only trade if net profitable after fees
      if (opp.netProfitPercent <= 0) continue
      const sGap: GapRecord = {
        id: opp.id,
        type: 'cex_cex',
        symbol: opp.symbol,
        quote_currency: opp.symbol.split('/')[1] ?? 'USDT',
        buyExchange: opp.buyExchange,
        sellExchange: opp.sellExchange,
        spreadPercent: opp.netProfitPercent,
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        buyBidSize: 0,
        sellAskSize: 0,
        maxTradeableUsd: 10_000,   // stables are ultra-liquid
        detectedAt: opp.detectedAt,
        lastSeenAt: opp.detectedAt,
        durationMs: 0,
        isActive: true,
        profitSimulation: {
          isProfitable: opp.netProfitPercent > 0,
          at100:  opp.estimatedProfit1k * 0.1,
          at1k:   opp.estimatedProfit1k,
          at5k:   opp.estimatedProfit1k * 5,
          at10k:  opp.estimatedProfit1k * 10,
          breakEvenSpread:   opp.minFeePercent,
          maxProfitableSize: 10_000,
        },
        depthAnalysis: null,
      }
      magnusBeta1k.evaluateTrade(sGap)
      magnusBeta10k.evaluateTrade(sGap)
      magnusAlpha.evaluateTrade(sGap)
    }

    // === Signal Scorer — run all profitable gaps through scorer, update cache ===
    const allGaps: GapRecord[] = [...gaps]
    // Feed price samples into scorer's volatility tracker
    for (const gap of gaps) {
      feedPriceForVolatility(gap.symbol, gap.buyPrice)
    }
    const scored = scoreAndFilter(allGaps, 1_000)
    updateScoredSignals(scored)

    // === Pairs Trading — PairConvergence bot ===
    const pairsSignals = getPairsSignals()
    for (const sig of pairsSignals) {
      if (sig.netProfitPercent <= 0) continue
      const pGap: GapRecord = {
        id: sig.id,
        type: 'cex_cex',
        symbol: sig.symbolA,
        quote_currency: sig.symbolA.split('/')[1] ?? 'USDT',
        buyExchange:  sig.exchange,
        sellExchange: sig.exchange,
        spreadPercent: sig.netProfitPercent,
        buyPrice:  sig.priceB,
        sellPrice: sig.priceA,
        buyBidSize: 0, sellAskSize: 0,
        maxTradeableUsd: 10_000,
        detectedAt: sig.detectedAt, lastSeenAt: sig.detectedAt, durationMs: 0, isActive: true,
        profitSimulation: {
          isProfitable: true,
          at100: sig.estimatedProfit1k * 0.1, at1k: sig.estimatedProfit1k,
          at5k: sig.estimatedProfit1k * 5, at10k: sig.estimatedProfit1k * 10,
          breakEvenSpread: 0.20, maxProfitableSize: 10_000,
        },
        depthAnalysis: null,
      }
      if (magnusPairs) magnusPairs.evaluateTrade(pGap)
    }

    // === Liquidation Cascade — CascadeHunter bot ===
    const cascadeSignals = getLiquidationSignals()
    for (const sig of cascadeSignals) {
      if (sig.netProfitPercent <= 0) continue
      const cGap: GapRecord = {
        id: sig.id,
        type: 'cex_cex',
        symbol: sig.symbol,
        quote_currency: sig.symbol.split('/')[1] ?? 'USDT',
        buyExchange: sig.exchange, sellExchange: sig.exchange,
        spreadPercent: sig.netProfitPercent,
        buyPrice: sig.spotPrice, sellPrice: sig.fairValuePrice,
        buyBidSize: 0, sellAskSize: 0,
        maxTradeableUsd: 3_000,
        detectedAt: sig.detectedAt, lastSeenAt: sig.detectedAt, durationMs: 0, isActive: true,
        profitSimulation: {
          isProfitable: true,
          at100: sig.estimatedProfit1k * 0.1, at1k: sig.estimatedProfit1k,
          at5k: sig.estimatedProfit1k * 5, at10k: sig.estimatedProfit1k * 10,
          breakEvenSpread: 0.25, maxProfitableSize: 3_000,
        },
        depthAnalysis: null,
      }
      if (magnusCascade) magnusCascade.evaluateTrade(cGap)
    }

    // === Calendar Spread — TimeSpread bot ===
    const calendarSignals = getCalendarSpreadSignals()
    for (const sig of calendarSignals) {
      if (sig.netProfitPercent <= 0) continue
      const calGap: GapRecord = {
        id: sig.id,
        type: 'spot_futures',
        symbol: sig.symbol,
        quote_currency: sig.symbol.split('/')[1] ?? 'USDT',
        buyExchange: sig.exchange, sellExchange: sig.exchange,
        spreadPercent: sig.netProfitPercent,
        buyPrice: sig.perpPrice, sellPrice: sig.quarterlyPrice,
        buyBidSize: 0, sellAskSize: 0,
        maxTradeableUsd: 5_000,
        detectedAt: sig.detectedAt, lastSeenAt: sig.detectedAt, durationMs: 0, isActive: true,
        profitSimulation: {
          isProfitable: true,
          at100: sig.estimatedProfit1k * 0.1, at1k: sig.estimatedProfit1k,
          at5k: sig.estimatedProfit1k * 5, at10k: sig.estimatedProfit1k * 10,
          breakEvenSpread: 0.15, maxProfitableSize: 5_000,
        },
        depthAnalysis: null,
      }
      if (magnusCalendar) magnusCalendar.evaluateTrade(calGap)
    }

    // === New Listing Arb — SCOUT bot ===
    const listingSignals = getNewListingSignals()
    for (const sig of listingSignals) {
      if (sig.netProfitPercent <= 0) continue
      if (sig.priceDiffPercent < 1.0) continue           // published 1% min threshold
      if (Date.now() - sig.detectedAt > 600_000) continue // 10-min hard window
      // direction: buy on cheaper exchange, sell on more expensive exchange
      const isBuyNew = sig.direction === 'buy_new_sell_existing'
      const buyExch  = isBuyNew ? sig.newExchange : sig.existingExchange
      const sellExch = isBuyNew ? sig.existingExchange : sig.newExchange
      const buyPx    = isBuyNew ? sig.priceOnNewExchange : sig.priceOnExistingExchange
      const sellPx   = isBuyNew ? sig.priceOnExistingExchange : sig.priceOnNewExchange
      const lGap: GapRecord = {
        id: sig.id,
        type: 'cex_cex',
        symbol: sig.symbol,
        quote_currency: sig.symbol.split('/')[1] ?? 'USDT',
        buyExchange: buyExch,
        sellExchange: sellExch,
        spreadPercent: sig.netProfitPercent,
        buyPrice: buyPx, sellPrice: sellPx,
        buyBidSize: 0, sellAskSize: 0,
        maxTradeableUsd: 2_000,
        detectedAt: sig.detectedAt, lastSeenAt: Date.now(), durationMs: Date.now() - sig.detectedAt, isActive: true,
        profitSimulation: {
          isProfitable: true,
          at100: sig.estimatedProfit1k * 0.1, at1k: sig.estimatedProfit1k,
          at5k: sig.estimatedProfit1k * 5, at10k: sig.estimatedProfit1k * 10,
          breakEvenSpread: 0.25, maxProfitableSize: 2_000,
        },
        depthAnalysis: null,
      }
      if (magnusListing) magnusListing.evaluateTrade(lGap)
    }

    // === TWAP Deviation — feed into all main bots ===
    const twapSignals = getTwapSignals()
    for (const sig of twapSignals) {
      if (sig.netProfitPercent <= 0) continue
      const tGap: GapRecord = {
        id: sig.id,
        type: 'cex_cex',
        symbol: sig.symbol,
        quote_currency: sig.symbol.split('/')[1] ?? 'USDT',
        buyExchange: sig.exchange, sellExchange: sig.exchange,
        spreadPercent: sig.netProfitPercent,
        buyPrice: sig.currentPrice, sellPrice: sig.twap4h,
        buyBidSize: 0, sellAskSize: 0,
        maxTradeableUsd: 5_000,
        detectedAt: sig.detectedAt, lastSeenAt: sig.detectedAt, durationMs: 0, isActive: true,
        profitSimulation: {
          isProfitable: true,
          at100: sig.estimatedProfit1k * 0.1, at1k: sig.estimatedProfit1k,
          at5k: sig.estimatedProfit1k * 5, at10k: sig.estimatedProfit1k * 10,
          breakEvenSpread: 0.25, maxProfitableSize: 5_000,
        },
        depthAnalysis: null,
      }
      magnusBeta1k.evaluateTrade(tGap)
      magnusBeta10k.evaluateTrade(tGap)
      magnusAlpha.evaluateTrade(tGap)
    }

  } catch (err) {
    console.error('[PaperBot] Evaluate error:', err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getBotState(id: string): BotState | null {
  if (id === 'magnus-beta-1k')   return magnusBeta1k.getState()
  if (id === 'magnus-beta-10k')  return magnusBeta10k.getState()
  if (id === 'magnus-alpha')     return magnusAlpha.getState()
  if (id === 'magnus-pairs')     return magnusPairs.getState()
  if (id === 'magnus-cascade')   return magnusCascade.getState()
  if (id === 'magnus-calendar')  return magnusCalendar.getState()
  if (id === 'magnus-listing')   return magnusListing.getState()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  if (id === 'magnus-futures')   return magnusFutures?.getState() ?? null
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  if (id === 'magnus-rate-harvest') return getRateHarvestState() as unknown as BotState
  return null
}

/** Minimal stub for bots not yet initialised (prevents null crashes in transformer). */
function notInitStub(id: string, name: string, capital: number): BotState {
  return {
    id, name,
    startingCapital: capital,
    portfolio: {},
    totalPortfolioValueUsd: capital,
    totalPnl: 0,
    totalPnlPercent: 0,
    tradingPnl: 0,
    totalTrades: 0,
    voidedSignals: 0,
    voidedReasons: {},
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    bestTrade: null,
    worstTrade: null,
    totalFeesPaid: 0,
    totalSlippageCost: 0,
    totalRebalanceFees: 0,
    rebalanceCount: 0,
    maxDrawdown: 0,
    peakValue: capital,
    dailyOpenValue: capital,
    dailyOpenDate: new Date().toISOString().slice(0, 10),
    inventoryCoins: [],
    activeExchanges: [],
    recentTrades: [],
    recentVoided: [],
    recentRebalances: [],
    startedAt: Date.now(),
    lastTradeAt: null,
    isRunning: false,
    circuitBreakerActive: false,
    circuitBreakerReason: '',
    voidByCategory: { dex: 0, exchangeMissing: 0, noInventory: 0, noUsdt: 0, tooSmall: 0, circuitBreaker: 0 },
    rebalanceStats: makeRebalanceStats(),
    inTransitFunds: [],
    rescuedVoids: 0,
    currentCycle: makeFreshCycle(1),
    cycleHistory: [],
    nextCycleAt: 0,
    totalCycleFees: 0,
    realizedInventoryPnl: 0,
    unrealizedInventoryPnl: 0,
    inventoryValueUsd: 0,
    restockPrices: {},
  }
}

/**
 * Returns all 9 bot states keyed by camelCase ID.
 * Shape required by lib/simulator-transformer.ts which calls Object.entries(raw).
 * DO NOT return an array — the transformer iterates over named keys.
 */
export function getAllBotStates(): Record<string, BotState> {
  const rateHarvest = getRateHarvestState()
  return {
    magnusBeta1k:      magnusBeta1k.getState(),
    magnusBeta10k:     magnusBeta10k.getState(),
    magnusAlpha:       magnusAlpha.getState(),
    // magnusFutures is a plain object initialised in startPaperTraders — may be null before startup
    magnusFutures:     (magnusFutures?.getState?.() as BotState) ?? notInitStub('magnus-futures', 'Magnus Futures', 1_000),
    // getRateHarvestState returns its own shape; cast to BotState for transformer compatibility
    magnusRateHarvest: (rateHarvest as unknown as BotState) ?? notInitStub('magnus-rate-harvest', 'Magnus Rate Harvest', 5_000),
    magnusPairs:       magnusPairs.getState(),
    magnusCascade:     magnusCascade.getState(),
    magnusCalendar:    magnusCalendar.getState(),
    magnusListing:     magnusListing.getState(),
  }
}

export function resetBot(id: string): BotState | null {
  if (id === 'magnus-rate-harvest') return resetRateHarvestBot() as unknown as BotState
  if (id === 'magnus-beta-1k')   return magnusBeta1k.reset()
  if (id === 'magnus-beta-10k')  return magnusBeta10k.reset()
  if (id === 'magnus-alpha')     return magnusAlpha.reset()
  if (id === 'magnus-pairs')     return magnusPairs.reset()
  if (id === 'magnus-cascade')   return magnusCascade.reset()
  if (id === 'magnus-calendar')  return magnusCalendar.reset()
  if (id === 'magnus-listing')   return magnusListing.reset()
  if (id === 'magnus-futures' && magnusFutures) {
    const FUTURES_EXCHANGES = ['okx', 'gateio', 'binance', 'bitget', 'kucoin', 'mexc', 'htx']
    FUTURES_EXCHANGES.forEach(ex => { magnusFutures.portfolio[ex] = { USDT: 1000 / FUTURES_EXCHANGES.length } })
    magnusFutures.totalPortfolioValueUsd = 1000
    magnusFutures.totalPnl = 0
    magnusFutures.totalPnlPercent = 0
    magnusFutures.totalTrades = 0
    magnusFutures.voidedSignals = 0
    magnusFutures.winningTrades = 0
    magnusFutures.losingTrades = 0
    magnusFutures.winRate = 0
    magnusFutures.bestTrade = null
    magnusFutures.worstTrade = null
    magnusFutures.totalFeesPaid = 0
    magnusFutures.maxDrawdown = 0
    magnusFutures.peakValue = 1000
    magnusFutures.recentTrades = []
    magnusFutures.recentVoided = []
    magnusFutures.lastTradeAt = null
    magnusFutures.startedAt = Date.now()
    magnusFutures.processedGapIds = new Set<string>()
    magnusFutures.symbolCooldowns = new Map<string, number>()
    magnusFutures.voidByCategory = { dex: 0, exchangeMissing: 0, noInventory: 0, noUsdt: 0, tooSmall: 0 }
    return magnusFutures.getState()
  }
  return null
}

export function getBotTrades(id: string, limit = 50): SimTrade[] {
  if (id === 'magnus-beta-1k')   return magnusBeta1k.getTrades(limit)
  if (id === 'magnus-beta-10k')  return magnusBeta10k.getTrades(limit)
  if (id === 'magnus-alpha')     return magnusAlpha.getTrades(limit)
  if (id === 'magnus-pairs')     return magnusPairs.getTrades(limit)
  if (id === 'magnus-cascade')   return magnusCascade.getTrades(limit)
  if (id === 'magnus-calendar')  return magnusCalendar.getTrades(limit)
  if (id === 'magnus-listing')   return magnusListing.getTrades(limit)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  if (id === 'magnus-futures')   return (magnusFutures?.recentTrades ?? []).slice(0, limit)
  if (id === 'magnus-rate-harvest') return getRateHarvestState().recentTrades.slice(0, limit) as unknown as SimTrade[]
  return []
}

export function getBotVoidedSignals(id: string, limit = 30): VoidedSignal[] {
  if (id === 'magnus-beta-1k') return magnusBeta1k.getVoidedSignals(limit)
  if (id === 'magnus-beta-10k') return magnusBeta10k.getVoidedSignals(limit)
  if (id === 'magnus-alpha') return magnusAlpha.getVoidedSignals(limit)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  if (id === 'magnus-futures') return (magnusFutures?.recentVoided ?? []).slice(0, limit)
  return []
}

export function getBotRebalances(id: string, limit = 20): RebalanceEvent[] {
  if (id === 'magnus-beta-1k') return magnusBeta1k.getRebalances(limit)
  if (id === 'magnus-beta-10k') return magnusBeta10k.getRebalances(limit)
  if (id === 'magnus-alpha') return magnusAlpha.getRebalances(limit)
  return []
}

function getMagnusAlphaPerformanceImpl(): MagnusPerformance {
  const st = magnusAlpha.getState()
  const m = st.magnusAlphaMeta
  const cfg = magnusAlpha.getAlphaConfig()
  const tradingCap = Math.max(1, cfg.totalCapital - cfg.reservePerExchange * cfg.exchanges.length)
  const hours = Math.max(0.0001, (Date.now() - st.startedAt) / 3_600_000)

  let coinValueUsd = 0
  for (const w of Object.values(st.portfolio)) {
    for (const [asset, amt] of Object.entries(w)) {
      if (asset === 'USDT') continue
      const p = getCurrentPrice(asset)
      if (p > 0) coinValueUsd += amt * p
    }
  }
  const capitalUtilization = Math.min(100, (coinValueUsd / tradingCap) * 100)

  const mroi = m?.rebalanceRoi ?? freshRebalanceRoi()
  mroi.rebalanceROI =
    mroi.totalRebalanceCost > 0
      ? mroi.profitFromEnabledTrades / mroi.totalRebalanceCost
      : 0
  mroi.totalRebalanceCost = st.rebalanceStats.totalRebalanceCost

  const rebalances = st.recentRebalances
  const rebTimestamps = rebalances.map(r => r.timestamp).sort((a, b) => a - b)
  let sumGap = 0
  for (let i = 1; i < rebTimestamps.length; i++) {
    sumGap += rebTimestamps[i]! - rebTimestamps[i - 1]!
  }
  const avgTimeBetweenRebalances = rebTimestamps.length > 1 ? sumGap / (rebTimestamps.length - 1) : 0

  const outcomes = m?.rebalanceOutcomes ?? {}
  const withTrades = Object.values(outcomes).filter(o => o.tradesEnabled >= 1).length
  const rebalanceSuccessRate =
    Object.keys(outcomes).length > 0 ? (withTrades / Object.keys(outcomes).length) * 100 : 0

  const totalPos = 9 * 15
  let depleted = 0
  const targets = st.targetAllocations ?? {}
  for (const ex of cfg.exchanges) {
    for (const coin of st.inventoryCoins) {
      const tgt = targets[ex]?.[coin]
      const q = st.portfolio[ex]?.[coin] ?? 0
      const t = getCurrentPrice(coin)
      if (t <= 0) continue
      if (tgt == null || tgt <= 0) {
        if (q <= 0) depleted++
        continue
      }
      const ratio = q / tgt
      if (ratio < 0.1) depleted++
    }
  }
  const inventoryScore = ((totalPos - depleted) / totalPos) * 100
  const healthPercent = (inventoryScore + (100 - (m?.reserveDipCount ?? 0) * 2)) / 2

  let exBelow = 0
  let sumRes = 0
  for (const ex of cfg.exchanges) {
    const u = st.portfolio[ex]?.USDT ?? 0
    if (u < cfg.reservePerExchange) exBelow++
    sumRes += u
  }
  const avgReserveLevel = sumRes / cfg.exchanges.length
  const reserveUtilization = st.rebalanceCount > 0 ? ((m?.reserveDipCount ?? 0) / st.rebalanceCount) * 100 : 0

  const beta = magnusBeta10k.getState()
  const voidRateAlpha =
    st.totalTrades + st.voidedSignals > 0
      ? (st.voidedSignals / (st.totalTrades + st.voidedSignals)) * 100
      : 0
  const voidRateBeta =
    beta.totalTrades + beta.voidedSignals > 0
      ? (beta.voidedSignals / (beta.totalTrades + beta.voidedSignals)) * 100
      : 0
  const betaHours = Math.max(0.0001, (Date.now() - beta.startedAt) / 3_600_000)

  return {
    capitalUtilization,
    reserveUtilization,
    rebalanceROI: mroi,
    avgTimeBetweenRebalances,
    rebalanceSuccessRate,
    tradeSuccessRate: st.winRate,
    avgProfitPerTrade: st.totalTrades > 0 ? st.tradingPnl / st.totalTrades : 0,
    avgTradesPerHour: st.totalTrades / hours,
    profitPerHourPerCapital: (st.tradingPnl / hours / cfg.totalCapital) * 100,
    inventoryScore,
    depletedPositions: depleted,
    totalPositions: totalPos,
    healthPercent: Math.max(0, Math.min(100, healthPercent)),
    exchangesBelowReserve: exBelow,
    avgReserveLevel,
    alphaVsBeta: {
      alphaVoidRate: voidRateAlpha,
      betaVoidRate: voidRateBeta,
      alphaTradesPerHour: st.totalTrades / hours,
      betaTradesPerHour: beta.totalTrades / betaHours,
      alphaPnlPerHour: st.tradingPnl / hours,
      betaPnlPerHour: beta.tradingPnl / betaHours,
    },
  }
}

export function getMagnusAlphaState(): BotState {
  return magnusAlpha.getState()
}

export function getMagnusAlphaPerformance(): MagnusPerformance {
  return getMagnusAlphaPerformanceImpl()
}

export function getMagnusAlphaConfig(): MagnusAlphaConfig {
  return magnusAlpha.getAlphaConfig()
}

export function updateMagnusAlphaConfig(partial: Partial<MagnusAlphaConfig>): MagnusAlphaConfig {
  return magnusAlpha.applyAlphaConfig(partial)
}

export function getMagnusAlphaTrades(limit = 50): SimTrade[] {
  return magnusAlpha.getTrades(limit)
}

export function getMagnusAlphaVoided(limit = 30): VoidedSignal[] {
  return magnusAlpha.getVoidedSignals(limit)
}

export function getMagnusAlphaRebalances(limit = 20): RebalanceEvent[] {
  return magnusAlpha.getRebalances(limit)
}

export function resetMagnusAlpha(): BotState {
  return magnusAlpha.reset()
}

export function getMagnusFuturesState(): Record<string, unknown> | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return magnusFutures?.getState() ?? null
}

export function getMagnusFuturesTrades(limit = 50): SimTrade[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (magnusFutures?.recentTrades ?? []).slice(0, limit)
}

export function getMagnusFuturesVoided(limit = 30): VoidedSignal[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (magnusFutures?.recentVoided ?? []).slice(0, limit)
}

export function resetMagnusFutures(): Record<string, unknown> | null {
  return resetBot('magnus-futures') as unknown as Record<string, unknown> | null
}

// ── Rate Harvest API exports ───────────────────────────────────────────────

export { getRateHarvestState, resetRateHarvestBot }

export function startPaperTraders(): void {
  if (isRunning) return
  isRunning = true

  // ── Magnus Futures — $1K USDT, spot-futures arbitrage, market neutral ────────
  const FUTURES_EXCHANGES = ['okx', 'gateio', 'binance', 'bitget', 'kucoin', 'mexc', 'htx']
  const futuresPortfolio: Record<string, Record<string, number>> = {}
  FUTURES_EXCHANGES.forEach(ex => { futuresPortfolio[ex] = { USDT: FOUNDER_CAPITAL / FUTURES_EXCHANGES.length } })
  magnusFutures = {
    id: 'magnus-futures',
    name: 'KRONOS · $100K',
    startingCapital: FOUNDER_CAPITAL,
    portfolio: futuresPortfolio,
    totalPortfolioValueUsd: FOUNDER_CAPITAL,
    totalPnl: 0,
    totalPnlPercent: 0,
    totalTrades: 0,
    voidedSignals: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    bestTrade: null as SimTrade | null,
    worstTrade: null as SimTrade | null,
    totalFeesPaid: 0,
    maxDrawdown: 0,
    peakValue: FOUNDER_CAPITAL,
    inventoryCoins: [] as string[],
    activeExchanges: FUTURES_EXCHANGES,
    recentTrades: [] as SimTrade[],
    recentVoided: [] as VoidedSignal[],
    startedAt: Date.now(),
    lastTradeAt: null as number | null,
    isRunning: true,
    voidByCategory: { dex: 0, exchangeMissing: 0, noInventory: 0, noUsdt: 0, tooSmall: 0 },
    processedGapIds: new Set<string>(),
    symbolCooldowns: new Map<string, number>(),
    getState() { return this },
  }
  console.log('[Magnus Futures] Started — $1000 USDT across 7 exchanges, spot-futures only')

  // ── Rate Harvest Bot — delta-neutral funding rate arbitrage ───────────────
  startRateHarvestBot()
  console.log('[Rate Harvest] Bot wired — funding rate arb, $5K paper capital')

  // ── Phase-2 strategy bots — initialize portfolios ─────────────────────────
  magnusPairs.initializeIfNeeded()
  magnusCascade.initializeIfNeeded()
  magnusCalendar.initializeIfNeeded()
  magnusListing.initializeIfNeeded()
  console.log('[Magnus Phase-2] Pairs($10K) Cascade($3K) Calendar($5K) Listing($2K) bots initialized')

  setInterval(evaluate, EVAL_INTERVAL_MS)

  setInterval(() => {
    magnusBeta1k.rebalanceTier1()
    magnusBeta10k.rebalanceTier1()
    magnusAlpha.rebalanceTier1()
  }, REBALANCE_TIER1_INTERVAL_MS)

  setInterval(() => {
    magnusBeta1k.rebalanceTier2()
    magnusBeta10k.rebalanceTier2()
    magnusAlpha.rebalanceTier2()
  }, REBALANCE_TIER2_INTERVAL_MS)

  setInterval(() => {
    magnusBeta1k.rebalanceTier3()
    magnusBeta10k.rebalanceTier3()
    magnusAlpha.rebalanceTier3()
  }, REBALANCE_TIER3_INTERVAL_MS)

  setInterval(() => {
    magnusAlpha.predictivePreBalance()
  }, MAGNUS_ALPHA_PREDICTIVE_MS)

  setInterval(() => {
    magnusBeta1k.refreshInventoryCoins()
    magnusBeta10k.refreshInventoryCoins()
    magnusAlpha.refreshInventoryCoins()
  }, COIN_REFRESH_INTERVAL_MS)

  setInterval(() => {
    magnusBeta1k.saveToDisk()
    magnusBeta10k.saveToDisk()
    magnusAlpha.saveToDisk()
  }, SAVE_INTERVAL_MS)

  const ac = magnusAlpha.getAlphaConfig()
  console.log(
    `[Magnus Alpha] Started — $${(ac.totalCapital / 1000).toFixed(0)}K capital, ` +
      `$${(ac.reservePerExchange * 9) / 1000}K reserve, 9 exchanges, 15 coins, ROI-driven rebalancing`,
  )
  console.log(
    '[PaperBot] Started — Magnus Beta ($1K + $10K) + Magnus Alpha — T1:2m · T2:5m · T3:10m · Predictive:2m',
  )
}
