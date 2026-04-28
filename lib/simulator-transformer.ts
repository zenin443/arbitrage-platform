/**
 * IP Protection: tier-based field whitelisting for /api/simulators responses.
 *
 * Simulator field access matrix:
 *   Anonymous / Free → aggregate identity fields + maximally-redacted recent trades
 *                      (id, timestamp, symbol, type only — no prices, exchanges, profit)
 *   Trader / Pro / Institutional → full bot state pass-through
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TIER FILTERING POLICY — READ BEFORE MODIFYING
 * ─────────────────────────────────────────────────────────────────────────────
 * This transformer is for CUSTOMER-FACING endpoints ONLY (/api/simulators).
 *
 * role: admin does NOT bypass this transformer by design.
 * Admin operators MUST use /api/admin/magnus/* routes for raw data inspection.
 * The customer endpoint exists to serve the customer view — admins seeing the
 * free-tier response via /api/simulators is intentional: it lets the team QA
 * exactly what a free user experiences.
 *
 * DO NOT add role detection or admin bypass logic to this file.
 * DO NOT weaken the anonymous/free strip logic under any circumstances.
 *
 * If you need to add a new paid tier, add it to the PlanTier union in
 * lib/response-transformer.ts and add it to the pass-through condition below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PlanTier } from './response-transformer';

export interface SimulatorBotPublic {
  id: string;
  name: string;
  startingCapital: number;
  totalPortfolioValueUsd: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  winRate: number;
  activeExchangeCount: number; // count only, not the list of names
}

export interface SimulatorTradeRedacted {
  id: string;
  timestamp: number;
  symbol: string;
  type: string; // 'cex_cex' | 'dex_cex' (gap_type only)
  // NO exchanges, NO prices, NO spread, NO profit
}

export interface SimulatorBotFull extends SimulatorBotPublic {
  activeExchanges: string[];
  portfolio: Record<string, number>;
  inventoryCoins: any[];
  recentTrades: any[];
  recentVoided: any[];
  bestTrade: any;
  worstTrade: any;
  totalFeesPaid: number;
  totalRebalanceFees: number;
  rebalanceCount: number;
  maxDrawdown: number;
  peakValue: number;
  voidedSignals: number;
  voidedReasons: any;
  tradingPnl: number;
  winningTrades: number;
  losingTrades: number;
}

export function transformSimulatorResponse(
  raw: Record<string, any>,
  plan: PlanTier | 'anonymous'
): Record<string, SimulatorBotPublic | SimulatorBotFull> {
  const out: Record<string, any> = {};
  for (const [botKey, botData] of Object.entries(raw)) {
    out[botKey] = transformBot(botData, plan);
  }
  return out;
}

function transformBot(bot: any, plan: PlanTier | 'anonymous'): SimulatorBotPublic | SimulatorBotFull {
  const publicBot: SimulatorBotPublic = {
    id: bot.id,
    name: bot.name,
    startingCapital: bot.startingCapital,
    totalPortfolioValueUsd: bot.totalPortfolioValueUsd,
    totalPnl: bot.totalPnl,
    totalPnlPercent: bot.totalPnlPercent,
    totalTrades: bot.totalTrades,
    winRate: bot.winRate,
    activeExchangeCount: Array.isArray(bot.activeExchanges) ? bot.activeExchanges.length : 0,
  };

  if (plan === 'anonymous' || plan === 'free') {
    return {
      ...publicBot,
      recentTrades: (bot.recentTrades || []).slice(0, 10).map((t: any) => ({
        id: t.id,
        timestamp: t.timestamp,
        symbol: t.symbol,
        type: t.type,
      })),
    } as any;
  }

  // Trader / Pro / Institutional: full pass-through
  return bot as SimulatorBotFull;
}
