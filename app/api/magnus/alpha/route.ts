import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';
import { getAuthUser } from '@/lib/auth/middleware';
import { atLeast, upgradeRequired } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

let validated = false;

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  if (!atLeast(plan, 'pro')) return upgradeRequired('pro');

  try {
    const res = await fetch(`${BACKEND_URL}/magnus/alpha`, { cache: 'no-store' });
    const magnusData = await res.json();

    const trades: Array<{ netProfit?: number; profit?: number }> =
      magnusData.recentTrades || magnusData.trades || [];

    const wins   = trades.filter(t => (t.netProfit ?? t.profit ?? 0) > 0);
    const losses = trades.filter(t => (t.netProfit ?? t.profit ?? 0) <= 0);

    const totalTrades  = magnusData.totalTrades   ?? trades.length;
    const totalWins    = magnusData.winningTrades  ?? wins.length;
    const totalLosses  = magnusData.losingTrades   ?? losses.length;
    const storedWinRate: number | undefined = magnusData.winRate;

    const qualityMetrics = {
      totalTrades,
      wins:    totalWins,
      losses:  totalLosses,
      winRate: storedWinRate != null
        ? parseFloat(storedWinRate.toString()).toFixed(1)
        : ((totalWins / Math.max(totalWins + totalLosses, 1)) * 100).toFixed(1),
      avgWinProfit: wins.length > 0
        ? (wins.reduce((s, t) => s + (t.netProfit ?? t.profit ?? 0), 0) / wins.length).toFixed(4)
        : '0',
      avgLossAmount: losses.length > 0
        ? Math.abs(
            losses.reduce((s, t) => s + (t.netProfit ?? t.profit ?? 0), 0) / losses.length
          ).toFixed(4)
        : '0',
      profitFactor: losses.length > 0
        ? (
            wins.reduce((s, t) => s + Math.abs(t.netProfit ?? t.profit ?? 0), 0) /
            Math.max(
              Math.abs(losses.reduce((s, t) => s + (t.netProfit ?? t.profit ?? 0), 0)),
              0.0001
            )
          ).toFixed(2)
        : 'Infinity',
    };

    if (!validated) {
      const recalcWins    = trades.filter(t => (t.netProfit ?? t.profit ?? 0) > 0).length;
      const recalcWinRate = ((recalcWins / Math.max(trades.length, 1)) * 100).toFixed(1);
      console.log('[Magnus Audit]', {
        storedTrades:      magnusData.totalTrades,
        calculatedTrades:  trades.length,
        storedWinRate:     magnusData.winRate,
        calculatedWinRate: recalcWinRate,
        match: String(magnusData.totalTrades) === String(trades.length),
      });
      validated = true;
    }

    return Response.json({ ...magnusData, qualityMetrics });
  } catch {
    return Response.json(null, { status: 503 });
  }
}
