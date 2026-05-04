import { GapRecord } from './trading-intelligence'

const MIN_TRADE_SIZE_USD = 100
const STALENESS_MS = 30_000

export function applyQualityGate(gaps: GapRecord[]): GapRecord[] {
  const now = Date.now()

  // Rule 1 + 2: isProfitable must be true (covers enrichProfitSim fix + spread > fees)
  // Rule 3: minimum viable trade size
  // Rule 5: staleness guard
  const qualified = gaps.filter(g => {
    if (!g.profitSimulation.isProfitable) return false
    if (g.maxTradeableUsd < MIN_TRADE_SIZE_USD) return false
    if (g.lastSeenAt && (now - g.lastSeenAt) > STALENESS_MS) return false
    return true
  })

  // Rule 4: Deduplication — same symbol + buyExchange → keep best netSpread route only
  const seen = new Map<string, GapRecord>()
  for (const gap of qualified) {
    const dedupeKey = `${gap.symbol}|${gap.type}|${gap.buyExchange}`
    const existing = seen.get(dedupeKey)
    const currentNet = gap.spreadPercent - (gap.profitSimulation.breakEvenSpread ?? 0.2)
    const existingNet = existing ? existing.spreadPercent - (existing.profitSimulation.breakEvenSpread ?? 0.2) : -Infinity
    if (!existing || currentNet > existingNet) {
      seen.set(dedupeKey, gap)
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.spreadPercent - a.spreadPercent)
}
