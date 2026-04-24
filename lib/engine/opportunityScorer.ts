import type { ArbitrageOpportunity } from "@/types";

export interface ScoringInput {
  netSpread: number;
  liquidityScore: number;
  /** Age of the price ticks in milliseconds */
  tickAgeMs: number;
}

const MAX_TICK_AGE_MS = 5000;

const CONFIDENCE_ORDER: Record<ArbitrageOpportunity["confidence"], number> = {
  high: 2,
  medium: 1,
  low: 0,
};

/**
 * Produces a 0–100 confidence score for an arbitrage opportunity based on
 * net spread size, liquidity, and data freshness.
 */
export function scoreOpportunity(input: ScoringInput): number {
  const { netSpread, liquidityScore, tickAgeMs } = input;

  // Spread component: saturates at 2% net spread → 40 points
  const spreadScore = Math.min((netSpread / 2) * 40, 40);

  // Liquidity component: 0–100 input → 0–40 points
  const liquidityComponent = (liquidityScore / 100) * 40;

  // Freshness component: full 20 points for fresh data, decays linearly
  const freshnessScore = Math.max(
    0,
    20 * (1 - tickAgeMs / MAX_TICK_AGE_MS)
  );

  const total = spreadScore + liquidityComponent + freshnessScore;
  return parseFloat(Math.min(total, 100).toFixed(2));
}

/**
 * Filters and sorts opportunities by confidence descending.
 * Removes entries below the minimum net spread threshold.
 */
export function rankOpportunities(
  opportunities: ArbitrageOpportunity[],
  minNetSpread = 0.05
): ArbitrageOpportunity[] {
  return opportunities
    .filter((o) => o.netSpread >= minNetSpread)
    .sort(
      (a, b) =>
        CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence]
    );
}
