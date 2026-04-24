import { randomUUID } from "crypto";
import type { ArbitrageOpportunity, PriceTick } from "@/types";
import { getExchangeById } from "@/lib/utils/feeData";

/** Minimum net spread (%) required to surface an opportunity */
export const MIN_NET_SPREAD_PCT = 0.05;

/** Notional trade size used for estimated profit calculation (USDT) */
const NOTIONAL_USDT = 1000;

/**
 * Derives the base asset from a canonical symbol like BTCUSDT → BTC.
 * Handles USDT, BTC, ETH, and BNB quote currencies.
 */
function extractBaseAsset(symbol: string): string {
  for (const quote of ["USDT", "BTC", "ETH", "BNB"]) {
    if (symbol.endsWith(quote)) {
      return symbol.slice(0, symbol.length - quote.length);
    }
  }
  return symbol;
}

/**
 * Estimates a 0–100 liquidity score from the bid-ask spread of both ticks.
 * A tighter combined spread → higher liquidity → higher score.
 */
function estimateLiquidityScore(buyTick: PriceTick, sellTick: PriceTick): number {
  const buyMid = (buyTick.bid + buyTick.ask) / 2;
  const sellMid = (sellTick.bid + sellTick.ask) / 2;

  if (buyMid <= 0 || sellMid <= 0) return 50;

  const buySpreadPct = ((buyTick.ask - buyTick.bid) / buyMid) * 100;
  const sellSpreadPct = ((sellTick.ask - sellTick.bid) / sellMid) * 100;
  const avgSpreadPct = (buySpreadPct + sellSpreadPct) / 2;

  // Map: 0% spread → 100 score, 0.1% spread → 0 score (linear)
  const score = Math.max(0, Math.min(100, 100 - avgSpreadPct * 1000));
  return parseFloat(score.toFixed(2));
}

/**
 * Maps net spread to a confidence tier.
 */
function calculateConfidence(
  netSpread: number,
  liquidityScore: number
): ArbitrageOpportunity["confidence"] {
  if (netSpread >= 1.0 && liquidityScore >= 60) return "high";
  if (netSpread >= 0.5 || liquidityScore >= 40) return "medium";
  return "low";
}

/**
 * Calculates a net arbitrage spread between two price ticks.
 * Returns null when the net spread is below MIN_NET_SPREAD_PCT (0.05%).
 */
export function calculateSpread(
  buyTick: PriceTick,
  sellTick: PriceTick,
  symbol: string
): ArbitrageOpportunity | null {
  const buyPrice = buyTick.ask;
  const sellPrice = sellTick.bid;

  if (buyPrice <= 0 || sellPrice <= 0) return null;

  const grossSpread = ((sellPrice - buyPrice) / buyPrice) * 100;

  const buyExchange = getExchangeById(buyTick.exchangeId);
  const sellExchange = getExchangeById(sellTick.exchangeId);

  const buyFeePct = (buyExchange?.fee ?? 0.001) * 100;
  const sellFeePct = (sellExchange?.fee ?? 0.001) * 100;

  const baseAsset = extractBaseAsset(symbol);
  const withdrawalFeeAbs = buyExchange?.withdrawalFees[baseAsset] ?? 0;
  const withdrawalFeePct = (withdrawalFeeAbs * buyPrice) / NOTIONAL_USDT * 100;

  const netSpread = grossSpread - buyFeePct - sellFeePct - withdrawalFeePct;

  if (netSpread < MIN_NET_SPREAD_PCT) return null;

  const liquidityScore = estimateLiquidityScore(buyTick, sellTick);
  const confidence = calculateConfidence(netSpread, liquidityScore);
  const estimatedProfit = parseFloat(((netSpread / 100) * NOTIONAL_USDT).toFixed(8));

  return {
    id: randomUUID(),
    symbol,
    buyExchange: buyTick.exchangeId,
    sellExchange: sellTick.exchangeId,
    buyPrice: parseFloat(buyPrice.toFixed(8)),
    sellPrice: parseFloat(sellPrice.toFixed(8)),
    grossSpread: parseFloat(grossSpread.toFixed(8)),
    netSpread: parseFloat(netSpread.toFixed(8)),
    estimatedProfit,
    liquidityScore,
    confidence,
    bestNetwork: "",
    withdrawFee: withdrawalFeeAbs,
    transferTimeMinutes: 30,
    detectedAt: Date.now(),
    strategy: "cex_cex_spot",
  };
}
