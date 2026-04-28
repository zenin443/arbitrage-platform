/**
 * Magnus Rate Harvest Bot — Delta-Neutral Funding Rate Arbitrage
 *
 * Strategy: "Rate Harvest"
 * Long spot + Short perpetual = zero directional exposure.
 * Collect the 8-hour funding payment as pure income.
 *
 * Edge: When funding rate > entry cost (fees), every 8h period is guaranteed profit
 * regardless of whether BTC goes up or down.
 *
 * Position lifecycle:
 *   ENTER  → funding rate crosses MIN_ENTRY_RATE threshold
 *   HOLD   → collect payment every 8 hours
 *   EXIT   → rate drops below EXIT_RATE floor OR max hold periods reached
 */

import fs from 'fs'
import path from 'path'
import { fundingRateTracker } from '../engine/fundingRateTracker'
import { EXCHANGE_REGISTRY } from '../registry/exchangeRegistry'

// ── Constants ─────────────────────────────────────────────────────────────────

const DATA_FILE = path.join(__dirname, '../data/magnus-rate-harvest.json')
const SAVE_INTERVAL_MS      = 60_000
const EVAL_INTERVAL_MS      = 30_000    // check every 30s (funding settles every 8h)
const FUNDING_PERIOD_MS     = 8 * 60 * 60 * 1000   // 8 hours in ms

const MIN_ENTRY_RATE        = 0.05      // minimum 8h rate % to open (0.05% = 22% annualized)
const EXIT_RATE_FLOOR       = 0.01      // close position if rate drops below 0.01%
const MAX_HOLD_PERIODS      = 6         // max 48 hours per position (6 × 8h)
const MAX_POSITION_PCT      = 0.15      // max 15% of capital per position
const MAX_TOTAL_EXPOSURE    = 0.60      // max 60% of capital in open positions total
const MIN_POSITION_USD      = 100       // minimum position size
const MAX_POSITIONS         = 8         // max simultaneous open positions

// Round-trip fee: taker on spot leg + taker on perp leg
const SPOT_TAKER_FEE        = 0.001     // 0.10% — use best CEX rate
const PERP_TAKER_FEE        = 0.0005    // 0.05% — Hyperliquid/Bybit perp rate
const ROUND_TRIP_FEE        = SPOT_TAKER_FEE + PERP_TAKER_FEE

// Break-even: need to cover round-trip fees within first payment period
// At 0.15% fees, need rate > 0.15% per 8h to profit in first period
const BREAK_EVEN_RATE_PCT   = ROUND_TRIP_FEE * 100   // 0.15%

// Which exchanges support both spot + perp for delta-neutral pairing
const SUPPORTED_PAIRS: Array<{ spotExchange: string; perpExchange: string; label: string }> = [
  { spotExchange: 'binance',      perpExchange: 'binance',     label: 'Binance Spot+Perp' },
  { spotExchange: 'okx',         perpExchange: 'okx',          label: 'OKX Spot+Perp'     },
  { spotExchange: 'binance',     perpExchange: 'hyperliquid',  label: 'Binance+Hyperliquid'},
  { spotExchange: 'okx',         perpExchange: 'hyperliquid',  label: 'OKX+Hyperliquid'   },
]

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface FundingPosition {
  id: string
  symbol: string
  spotExchange: string
  perpExchange: string
  notionalUsd: number
  entryFundingRate: number       // 8h rate at entry (e.g. 0.001 = 0.1%)
  entryFundingRateAnnualized: number
  entryTime: number
  nextPaymentTime: number
  paymentCount: number
  totalFundingCollected: number
  totalFeesPaid: number
  status: 'open' | 'closed'
  closedAt?: number
  closeReason?: string
  netProfit?: number
}

export interface FundingBotTrade {
  id: string
  timestamp: number
  symbol: string
  spotExchange: string
  perpExchange: string
  action: 'open' | 'close' | 'payment'
  notionalUsd: number
  fundingRate8h: number
  fundingRateAnnualized: number
  amount: number           // profit/fee for this event
  runningTotal: number     // cumulative funding collected
  paymentCount?: number
  closeReason?: string
}

export interface FundingBotState {
  id: string
  name: string
  startingCapital: number
  availableCapital: number
  totalPortfolioValueUsd: number
  totalPnl: number
  totalPnlPercent: number
  totalFundingCollected: number
  totalFeesPaid: number
  openPositions: FundingPosition[]
  recentTrades: FundingBotTrade[]
  totalPositionsOpened: number
  totalPositionsClosed: number
  winningPositions: number
  losingPositions: number
  winRate: number
  maxDrawdown: number
  peakValue: number
  dailyOpenValue: number
  dailyOpenDate: string
  startedAt: number
  lastActivityAt: number | null
  isRunning: boolean
  circuitBreakerActive: boolean
}

// ── State ─────────────────────────────────────────────────────────────────────

function makeInitialState(capital: number): FundingBotState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: 'magnus-rate-harvest',
    name: 'Magnus Rate Harvest',
    startingCapital: capital,
    availableCapital: capital,
    totalPortfolioValueUsd: capital,
    totalPnl: 0,
    totalPnlPercent: 0,
    totalFundingCollected: 0,
    totalFeesPaid: 0,
    openPositions: [],
    recentTrades: [],
    totalPositionsOpened: 0,
    totalPositionsClosed: 0,
    winningPositions: 0,
    losingPositions: 0,
    winRate: 0,
    maxDrawdown: 0,
    peakValue: capital,
    dailyOpenValue: capital,
    dailyOpenDate: today,
    startedAt: Date.now(),
    lastActivityAt: null,
    isRunning: true,
    circuitBreakerActive: false,
  }
}

// ── Bot ───────────────────────────────────────────────────────────────────────

class FundingRateBot {
  private state: FundingBotState
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private evalTimer: ReturnType<typeof setInterval> | null = null

  constructor(startingCapital: number) {
    const saved = this.load()
    if (saved) {
      this.state = saved
      this.state.isRunning = true
      this.state.circuitBreakerActive ??= false
      this.state.dailyOpenValue ??= this.state.totalPortfolioValueUsd
      this.state.dailyOpenDate  ??= new Date().toISOString().slice(0, 10)
      console.log(`[RateHarvest] Resumed — portfolio $${this.state.totalPortfolioValueUsd.toFixed(2)}, ${this.state.openPositions.length} open positions`)
    } else {
      this.state = makeInitialState(startingCapital)
      console.log(`[RateHarvest] Started fresh — capital $${startingCapital}`)
    }
  }

  start(): void {
    this.evalTimer = setInterval(() => this.evaluate(), EVAL_INTERVAL_MS)
    this.saveTimer = setInterval(() => this.save(), SAVE_INTERVAL_MS)
    void this.evaluate()
    console.log('[RateHarvest] Bot running — checking every 30s')
  }

  stop(): void {
    if (this.evalTimer) { clearInterval(this.evalTimer); this.evalTimer = null }
    if (this.saveTimer) { clearInterval(this.saveTimer); this.saveTimer = null }
  }

  getState(): FundingBotState {
    this.recalcPortfolio()
    return { ...this.state, openPositions: [...this.state.openPositions] }
  }

  reset(newCapital?: number): FundingBotState {
    const capital = newCapital ?? this.state.startingCapital
    this.state = makeInitialState(capital)
    this.save()
    return this.getState()
  }

  // ── Core evaluate loop ────────────────────────────────────────────────────

  private evaluate(): void {
    try {
      this.refreshDailyReset()
      this.checkCircuitBreaker()
      this.settlePayments()
      this.closeExpiredPositions()
      if (!this.state.circuitBreakerActive) {
        this.openNewPositions()
      }
      this.recalcPortfolio()
    } catch (err) {
      console.error('[RateHarvest] Evaluate error:', err)
    }
  }

  // ── Daily PnL reset ───────────────────────────────────────────────────────

  private refreshDailyReset(): void {
    const today = new Date().toISOString().slice(0, 10)
    if (this.state.dailyOpenDate !== today) {
      this.state.dailyOpenDate  = today
      this.state.dailyOpenValue = this.state.totalPortfolioValueUsd
      this.state.circuitBreakerActive = false
    }
  }

  // ── Circuit breaker ───────────────────────────────────────────────────────

  private checkCircuitBreaker(): void {
    const drawdownPct  = this.state.peakValue > 0
      ? (this.state.peakValue - this.state.totalPortfolioValueUsd) / this.state.peakValue
      : 0
    const dailyLossPct = this.state.dailyOpenValue > 0
      ? (this.state.dailyOpenValue - this.state.totalPortfolioValueUsd) / this.state.dailyOpenValue
      : 0
    this.state.circuitBreakerActive = drawdownPct >= 0.10 || dailyLossPct >= 0.03
  }

  // ── Settle funding payments on open positions ─────────────────────────────

  private settlePayments(): void {
    const now = Date.now()
    for (const pos of this.state.openPositions) {
      if (pos.status !== 'open') continue
      if (now < pos.nextPaymentTime) continue

      // Refresh the live funding rate for this symbol/exchange
      const liveRates = fundingRateTracker.getBySymbol(pos.symbol)
      const liveRate  = liveRates.find(r => r.exchangeId === pos.perpExchange)
      const rate8h    = liveRate ? liveRate.fundingRate * 100 : pos.entryFundingRate

      // Funding payment = notional × rate (positive rate = longs pay shorts)
      // We are SHORT the perp, so we RECEIVE when rate > 0
      const payment = parseFloat((pos.notionalUsd * (rate8h / 100)).toFixed(8))
      pos.totalFundingCollected = parseFloat((pos.totalFundingCollected + payment).toFixed(8))
      pos.paymentCount++
      pos.nextPaymentTime = now + FUNDING_PERIOD_MS

      this.state.totalFundingCollected = parseFloat((this.state.totalFundingCollected + payment).toFixed(8))
      this.state.availableCapital      = parseFloat((this.state.availableCapital + payment).toFixed(8))
      this.state.lastActivityAt        = now

      // Check if rate dropped — close if below floor
      if (rate8h < EXIT_RATE_FLOOR) {
        this.closePosition(pos, 'rate_dropped', now)
        continue
      }

      // Log payment trade event
      this.recordTrade({
        id: `rh-pay-${now}-${pos.id.slice(-4)}`,
        timestamp: now,
        symbol: pos.symbol,
        spotExchange: pos.spotExchange,
        perpExchange: pos.perpExchange,
        action: 'payment',
        notionalUsd: pos.notionalUsd,
        fundingRate8h: rate8h,
        fundingRateAnnualized: rate8h * 3 * 365,
        amount: payment,
        runningTotal: pos.totalFundingCollected,
        paymentCount: pos.paymentCount,
      })

      console.log(
        `[RateHarvest] ${pos.symbol} payment #${pos.paymentCount}: ` +
        `+$${payment.toFixed(4)} (rate ${rate8h.toFixed(4)}%) | ` +
        `total collected: $${pos.totalFundingCollected.toFixed(4)}`
      )
    }
  }

  // ── Close positions that hit max hold or rate dropped ─────────────────────

  private closeExpiredPositions(): void {
    const now = Date.now()
    for (const pos of this.state.openPositions) {
      if (pos.status !== 'open') continue

      const shouldClose =
        pos.paymentCount >= MAX_HOLD_PERIODS ||
        (Date.now() - pos.entryTime) > MAX_HOLD_PERIODS * FUNDING_PERIOD_MS

      if (shouldClose) {
        this.closePosition(pos, 'max_hold_reached', now)
      }
    }
    // Remove closed positions from open list (keep last 50 in recentTrades)
    this.state.openPositions = this.state.openPositions.filter(p => p.status === 'open')
  }

  private closePosition(pos: FundingPosition, reason: string, now: number): void {
    // Closing fees: taker on both legs again to unwind
    const closeFees = parseFloat((pos.notionalUsd * ROUND_TRIP_FEE).toFixed(8))
    const netProfit = parseFloat((pos.totalFundingCollected - pos.totalFeesPaid - closeFees).toFixed(8))

    pos.status      = 'closed'
    pos.closedAt    = now
    pos.closeReason = reason
    pos.netProfit   = netProfit

    // Return notional + net profit to available capital (close both legs)
    this.state.availableCapital  = parseFloat((this.state.availableCapital + pos.notionalUsd - closeFees).toFixed(8))
    this.state.totalFeesPaid     = parseFloat((this.state.totalFeesPaid + closeFees).toFixed(8))
    this.state.totalPositionsClosed++
    this.state.lastActivityAt    = now

    if (netProfit > 0) this.state.winningPositions++
    else               this.state.losingPositions++
    this.state.winRate = this.state.totalPositionsClosed > 0
      ? parseFloat(((this.state.winningPositions / this.state.totalPositionsClosed) * 100).toFixed(2))
      : 0

    this.recordTrade({
      id: `rh-close-${now}-${pos.id.slice(-4)}`,
      timestamp: now,
      symbol: pos.symbol,
      spotExchange: pos.spotExchange,
      perpExchange: pos.perpExchange,
      action: 'close',
      notionalUsd: pos.notionalUsd,
      fundingRate8h: pos.entryFundingRate,
      fundingRateAnnualized: pos.entryFundingRateAnnualized,
      amount: -closeFees,
      runningTotal: pos.totalFundingCollected,
      closeReason: reason,
    })

    console.log(
      `[RateHarvest] CLOSED ${pos.symbol} — reason: ${reason} | ` +
      `net: ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(4)} | ` +
      `payments: ${pos.paymentCount} × $${(pos.totalFundingCollected / Math.max(1, pos.paymentCount)).toFixed(4)}`
    )
  }

  // ── Open new positions on high-rate opportunities ─────────────────────────

  private openNewPositions(): void {
    const now = Date.now()
    const openCount = this.state.openPositions.filter(p => p.status === 'open').length
    if (openCount >= MAX_POSITIONS) return

    // Calculate current exposure
    const totalExposure = this.state.openPositions
      .filter(p => p.status === 'open')
      .reduce((sum, p) => sum + p.notionalUsd, 0)
    const maxNewExposure = this.state.totalPortfolioValueUsd * MAX_TOTAL_EXPOSURE - totalExposure
    if (maxNewExposure < MIN_POSITION_USD) return

    // Get top funding rate opportunities
    const rates = fundingRateTracker.getBestFundingRates()

    // Track which symbols already have open positions
    const openSymbols = new Set(
      this.state.openPositions.filter(p => p.status === 'open').map(p => p.symbol)
    )

    for (const rate of rates) {
      if (openCount + this.state.openPositions.filter(p => p.status === 'open').length >= MAX_POSITIONS) break

      const rate8h = rate.fundingRate * 100   // convert to %
      if (rate8h < MIN_ENTRY_RATE) continue
      if (openSymbols.has(rate.symbol)) continue

      // Find a valid spot+perp pair for this exchange
      const pair = SUPPORTED_PAIRS.find(p => p.perpExchange === rate.exchangeId)
        ?? SUPPORTED_PAIRS[0]!

      // Position size: min(15% of capital, remaining exposure budget)
      const maxPerPos    = this.state.totalPortfolioValueUsd * MAX_POSITION_PCT
      const notionalUsd  = parseFloat(Math.min(maxPerPos, maxNewExposure, this.state.availableCapital * 0.9).toFixed(2))
      if (notionalUsd < MIN_POSITION_USD) continue

      // Entry fees: pay taker on both spot buy and perp short open
      const entryFees = parseFloat((notionalUsd * ROUND_TRIP_FEE).toFixed(8))

      // First payment time: next 8h boundary
      const nextPayment = now + FUNDING_PERIOD_MS

      const pos: FundingPosition = {
        id: `rh-${now}-${rate.symbol.replace('/', '')}-${Math.random().toString(36).slice(2, 5)}`,
        symbol: rate.symbol,
        spotExchange:  pair.spotExchange,
        perpExchange:  rate.exchangeId,
        notionalUsd,
        entryFundingRate: rate8h,
        entryFundingRateAnnualized: rate.fundingRateAnnualized,
        entryTime: now,
        nextPaymentTime: nextPayment,
        paymentCount: 0,
        totalFundingCollected: 0,
        totalFeesPaid: entryFees,
        status: 'open',
      }

      this.state.openPositions.push(pos)
      this.state.availableCapital = parseFloat((this.state.availableCapital - notionalUsd - entryFees).toFixed(8))
      this.state.totalFeesPaid    = parseFloat((this.state.totalFeesPaid + entryFees).toFixed(8))
      this.state.totalPositionsOpened++
      this.state.lastActivityAt   = now
      openSymbols.add(rate.symbol)

      this.recordTrade({
        id: `rh-open-${now}-${pos.id.slice(-4)}`,
        timestamp: now,
        symbol: rate.symbol,
        spotExchange: pair.spotExchange,
        perpExchange: rate.exchangeId,
        action: 'open',
        notionalUsd,
        fundingRate8h: rate8h,
        fundingRateAnnualized: rate.fundingRateAnnualized,
        amount: -entryFees,
        runningTotal: 0,
      })

      console.log(
        `[RateHarvest] OPENED ${rate.symbol} — ` +
        `$${notionalUsd.toFixed(0)} notional | ` +
        `rate ${rate8h.toFixed(4)}%/8h (${rate.fundingRateAnnualized.toFixed(1)}% ann.) | ` +
        `${pair.spotExchange}+${rate.exchangeId}`
      )
    }
  }

  // ── Portfolio value recalculation ─────────────────────────────────────────

  private recalcPortfolio(): void {
    const openNotional = this.state.openPositions
      .filter(p => p.status === 'open')
      .reduce((sum, p) => sum + p.notionalUsd + p.totalFundingCollected - p.totalFeesPaid, 0)

    const total = parseFloat((this.state.availableCapital + openNotional).toFixed(8))
    this.state.totalPortfolioValueUsd = total
    this.state.totalPnl         = parseFloat((total - this.state.startingCapital).toFixed(8))
    this.state.totalPnlPercent  = parseFloat(((this.state.totalPnl / this.state.startingCapital) * 100).toFixed(4))

    if (total > this.state.peakValue) this.state.peakValue = total
    const dd = (this.state.peakValue - total) / this.state.peakValue
    if (dd * 100 > this.state.maxDrawdown) {
      this.state.maxDrawdown = parseFloat((dd * 100).toFixed(4))
    }
  }

  // ── Trade log ─────────────────────────────────────────────────────────────

  private recordTrade(t: FundingBotTrade): void {
    this.state.recentTrades.unshift(t)
    if (this.state.recentTrades.length > 100) this.state.recentTrades.length = 100
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private load(): FundingBotState | null {
    try {
      if (!fs.existsSync(DATA_FILE)) return null
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as FundingBotState
    } catch { return null }
  }

  save(): void {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2))
    } catch (err) {
      console.error('[RateHarvest] Save failed:', err)
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

const RATE_HARVEST_CAPITAL = 100_000  // Founder testing capital ($100K)

export const rateHarvestBot = new FundingRateBot(RATE_HARVEST_CAPITAL)

export function startRateHarvestBot(): void {
  rateHarvestBot.start()
}

export function getRateHarvestState(): FundingBotState {
  return rateHarvestBot.getState()
}

export function resetRateHarvestBot(capital?: number): FundingBotState {
  return rateHarvestBot.reset(capital)
}
