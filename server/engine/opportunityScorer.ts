import { ArbitrageOpportunity } from './spreadCalculator'

const MAX_OPPORTUNITIES = 50

/**
 * Scores a single opportunity on a 0–100 scale.
 *   profitScore  (0–40)  — capped at 2% net spread for max points
 *   liquidityScore (0–30) — directly proportional to the tick liquidity score
 *   speedScore   (0–20)  — higher score for faster transfer times (< 60 min)
 *   confidenceBonus (0–10) — reserved; assigned after ranking
 */
export function scoreOpportunity(opp: ArbitrageOpportunity): number {
  const profitScore = Math.min((opp.netSpread / 2.0) * 40, 40)
  const liquidityContrib = opp.liquidityScore * 0.30
  const speedScore = Math.max(0, (1 - opp.transferTimeMinutes / 60)) * 20
  return Math.round(profitScore + liquidityContrib + speedScore)
}

/**
 * Ranks a list of opportunities by score (desc), assigns confidence tiers,
 * and returns at most the top 50.
 */
export function rankOpportunities(
  opps: ArbitrageOpportunity[]
): ArbitrageOpportunity[] {
  const scored = opps
    .map(opp => ({ opp, score: scoreOpportunity(opp) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_OPPORTUNITIES)

  return scored.map(({ opp, score }) => ({
    ...opp,
    confidence:
      score >= 70 ? 'high'
      : score >= 45 ? 'medium'
      : 'low',
  }))
}
