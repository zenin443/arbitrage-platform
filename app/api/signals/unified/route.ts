/**
 * Unified Signal Aggregator
 *
 * Fetches all 7 signal sources in parallel and normalises them into a single
 * consistent shape so the OpportunityTable can render every signal type.
 *
 * Free tier   → delayed 15-second snapshot, 4-field payload (symbol, gap_type,
 *               delayed_spread, direction) — identical to /api/profitable-gaps.
 * Trader+     → real-time, full unified shape with all fields.
 *
 * Normalised field mapping per source:
 *
 * Source          type            spreadPercent    buyExchange         sellExchange
 * ─────────────── ─────────────── ──────────────── ─────────────────── ───────────────────
 * profitable-gaps cex_cex         spreadPercent    buyExchange         sellExchange
 * spot-futures    spot_futures    priceDiffPercent spotExchange        futuresExchange
 * cex-dex         dex_cex         |priceDiffPct|   dexId/cexExchange   cexExchange/dexId
 * triangular      triangular      profitPercent    exchange            exchange (same)
 * cross-chain     cross_chain     priceDiffPercent buyDex              sellDex
 * signals/scored  (mixed)         spreadPercent    buyExchange         sellExchange
 * signals/pairs   pairs_trading   spreadPercent    exchange            exchange (same)
 */

import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';
import { getAuthUser } from '@/lib/auth/middleware';
import { transformGapList, atLeast, RawGap } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FREE_DELAY_MS = 15_000;

// Module-level 15-second delayed snapshot served to free-tier users
let freeSnapshot: RawGap[] = [];
let freeSnapshotAt = 0;

// ── Safe coercions ────────────────────────────────────────────────────────────

function s(v: unknown): string  { return typeof v === 'string'  ? v : String(v  ?? ''); }
function n(v: unknown): number  { return typeof v === 'number'  ? v : Number(v  ?? 0);  }
function b(v: unknown): boolean { return typeof v === 'boolean' ? v : Boolean(v);        }

function deriveQuote(symbol: string): string {
  return s(symbol).split('/')[1] || 'USDT';
}

// ── Per-source normalisers ────────────────────────────────────────────────────

/**
 * /profitable-gaps — GapRecord shape. Already has all fields; pass through
 * with type coercion, filling in any missing optional fields.
 */
function normalizeCexCex(raw: Record<string, unknown>): RawGap {
  const symbol = s(raw.symbol);
  const spreadPercent = n(raw.spreadPercent);
  return {
    id:              s(raw.id),
    symbol,
    type:            s(raw.type || 'cex_cex'),
    spreadPercent,
    netSpread:       typeof raw.netSpread === 'number' ? raw.netSpread : Math.max(0, spreadPercent - 0.2),
    buyExchange:     s(raw.buyExchange),
    sellExchange:    s(raw.sellExchange),
    buyPrice:        n(raw.buyPrice),
    sellPrice:       n(raw.sellPrice),
    maxTradeableUsd: n(raw.maxTradeableUsd),
    detectedAt:      n(raw.detectedAt),
    lastSeenAt:      s(raw.lastSeenAt),
    durationMs:      n(raw.durationMs),
    isActive:        b(raw.isActive ?? true),
    quote_currency:  s(raw.quote_currency) || deriveQuote(symbol),
  };
}

/**
 * /spot-futures — SpotFuturesOpportunity shape.
 *
 * Missing fields synthesised:
 *   netSpread       = priceDiffPercent - 0.2 (CEX taker fee fallback)
 *   maxTradeableUsd = 0 (no liquidity data from futures endpoint)
 *   durationMs      = 0 (single snapshot, no history)
 */
function deriveConfidence(spreadPercent: number, backendConfidence?: string): string | undefined {
  if (backendConfidence === 'high' || backendConfidence === 'medium' || backendConfidence === 'low')
    return backendConfidence;
  if (spreadPercent > 0.5) return 'high';
  if (spreadPercent > 0.2) return 'medium';
  return 'low';
}

function normalizeSpotFutures(raw: Record<string, unknown>): RawGap {
  const symbol        = s(raw.symbol);
  const spreadPercent = n(raw.priceDiffPercent);
  return {
    id:              s(raw.id) || `${symbol}|spot_futures|${s(raw.spotExchange)}|${s(raw.futuresExchange)}`,
    symbol,
    type:            'spot_futures',
    spreadPercent,
    netSpread:       Math.max(0, spreadPercent - 0.2),
    buyExchange:     s(raw.spotExchange),
    sellExchange:    s(raw.futuresExchange),
    buyPrice:        n(raw.spotPrice),
    sellPrice:       n(raw.futuresPrice),
    maxTradeableUsd: 0,
    detectedAt:      n(raw.detectedAt),
    lastSeenAt:      s(raw.detectedAt),
    durationMs:      0,
    isActive:        true,
    quote_currency:  deriveQuote(symbol),
    confidence:      deriveConfidence(spreadPercent, s(raw.confidence) || undefined),
  };
}

/**
 * /cex-dex — CexDexOpportunity shape.
 *
 * buy/sell exchange mapping depends on direction:
 *   buy_dex_sell_cex → buyExchange=dexId,     sellExchange=cexExchange
 *   buy_cex_sell_dex → buyExchange=cexExchange, sellExchange=dexId
 *
 * Missing fields synthesised:
 *   durationMs = 0
 */
function normalizeCexDex(raw: Record<string, unknown>): RawGap {
  const symbol       = s(raw.symbol);
  const spreadPercent = Math.abs(n(raw.priceDiffPercent));
  const isBuyDex     = s(raw.direction) === 'buy_dex_sell_cex';
  return {
    id:              s(raw.id),
    symbol,
    type:            'dex_cex',
    spreadPercent,
    netSpread:       n(raw.netProfitPercent),
    buyExchange:     isBuyDex ? s(raw.dexId) : s(raw.cexExchange),
    sellExchange:    isBuyDex ? s(raw.cexExchange) : s(raw.dexId),
    buyPrice:        isBuyDex ? n(raw.dexPrice) : n(raw.cexPrice),
    sellPrice:       isBuyDex ? n(raw.cexPrice) : n(raw.dexPrice),
    maxTradeableUsd: n(raw.maxTradeSize),
    detectedAt:      n(raw.detectedAt),
    lastSeenAt:      s(raw.detectedAt),
    durationMs:      0,
    isActive:        true,
    quote_currency:  deriveQuote(symbol),
    confidence:      deriveConfidence(n(raw.netProfitPercent), s(raw.confidence) || undefined),
  };
}

/**
 * /triangular — TriangularRoute shape.
 *
 * All legs execute on the same exchange → buyExchange === sellExchange.
 * symbol uses altSymbol (the traded asset) as the primary display symbol.
 *
 * Field notes:
 *   TriangularRoute.netSpread is stored as decimal (netProfitPercent / 100).
 *   We use netProfitPercent directly (already in % form) for netSpread.
 *   maxTradeableUsd estimated from estimatedProfit1k * 1000.
 *
 * Missing fields synthesised:
 *   buyPrice  = prices.step1 (entry price for first leg)
 *   sellPrice = prices.step3 (exit price for final leg)
 *   durationMs = 0
 */
function normalizeTriangular(raw: Record<string, unknown>): RawGap {
  const prices = (raw.prices ?? {}) as Record<string, unknown>;
  const symbol  = s(raw.altSymbol || raw.baseSymbol);
  const spreadPercent = n(raw.profitPercent);
  const netSpread = n(raw.netProfitPercent);
  return {
    id:              s(raw.id) || `${symbol}|triangular|${s(raw.exchange)}`,
    symbol,
    type:            'triangular',
    spreadPercent,
    netSpread,
    buyExchange:     s(raw.exchange),
    sellExchange:    s(raw.exchange),
    buyPrice:        n(prices['step1']),
    sellPrice:       n(prices['step3']),
    maxTradeableUsd: n(raw.estimatedProfit1k) > 0 ? n(raw.estimatedProfit1k) * 1000 : 0,
    detectedAt:      n(raw.detectedAt),
    lastSeenAt:      s(raw.detectedAt),
    durationMs:      0,
    isActive:        true,
    quote_currency:  'USDT',
    confidence:      deriveConfidence(netSpread),
  };
}

/**
 * /cross-chain — CrossChainOpportunity shape.
 *
 * buyExchange/sellExchange map to the DEX identifiers (buyDex/sellDex).
 * minViableTradeUsd is passed through as an extra field for UI display.
 */
function normalizeCrossChain(raw: Record<string, unknown>): RawGap {
  const symbol = s(raw.symbol);
  return {
    id:               s(raw.id),
    symbol,
    type:             'cross_chain',
    spreadPercent:    n(raw.priceDiffPercent),
    netSpread:        n(raw.netProfitPercent),
    buyExchange:      s(raw.buyDex),
    sellExchange:     s(raw.sellDex),
    buyPrice:         n(raw.buyPrice),
    sellPrice:        n(raw.sellPrice),
    maxTradeableUsd:  n(raw.liquidityUsd),
    detectedAt:       n(raw.detectedAt),
    lastSeenAt:       s(raw.detectedAt),
    durationMs:       0,
    isActive:         true,
    quote_currency:    deriveQuote(symbol),
    confidence:        deriveConfidence(n(raw.netProfitPercent), s(raw.confidence) || undefined),
    minViableTradeUsd: n(raw.minViableTradeUsd),
  };
}

/**
 * /signals/scored — ScoredGap (extends GapRecord with signalScore sub-object).
 *
 * The gap itself is already in GapRecord shape; we surface the scorer's
 * confidence/isVolatile/isThinVolume fields to the top-level for easy access.
 */
function normalizeScoredGap(raw: Record<string, unknown>): RawGap {
  const signalScore = (raw.signalScore ?? {}) as Record<string, unknown>;
  const symbol      = s(raw.symbol);
  const spreadPercent = n(raw.spreadPercent);
  return {
    id:              s(raw.id),
    symbol,
    type:            s(raw.type),
    spreadPercent,
    netSpread:       typeof raw.netSpread === 'number'
                       ? raw.netSpread
                       : Math.max(0, spreadPercent - 0.2),
    buyExchange:     s(raw.buyExchange),
    sellExchange:    s(raw.sellExchange),
    buyPrice:        n(raw.buyPrice),
    sellPrice:       n(raw.sellPrice),
    maxTradeableUsd: n(raw.maxTradeableUsd),
    detectedAt:      n(raw.detectedAt),
    lastSeenAt:      s(raw.lastSeenAt),
    durationMs:      n(raw.durationMs),
    isActive:        b(raw.isActive ?? true),
    quote_currency:  s(raw.quote_currency) || deriveQuote(symbol),
    confidence:      s(signalScore['confidence']) || undefined,
    isVolatile:      b(signalScore['isVolatile']),
    isThinVolume:    b(signalScore['isThinVolume']),
  };
}

/**
 * /signals/pairs — PairsSignal shape.
 *
 * Both legs execute on the same exchange → buyExchange === sellExchange.
 * symbolA is the expensive (short) leg; symbolB is the cheap (long) leg.
 * We use symbolA as the primary display symbol and expose symbolB as extra data.
 *
 * Missing fields synthesised:
 *   buyPrice        = priceB  (we buy the cheap leg)
 *   sellPrice       = priceA  (we sell the expensive leg)
 *   maxTradeableUsd = estimated from estimatedProfit1k * 1000
 *   durationMs      = 0
 */
function normalizePairsSignal(raw: Record<string, unknown>): RawGap {
  const symbolA = s(raw.symbolA);
  const symbolB = s(raw.symbolB);
  const spreadPercent = n(raw.spreadPercent);
  return {
    id:              s(raw.id),
    symbol:          symbolA,
    type:            'pairs_trading',
    spreadPercent,
    netSpread:       n(raw.netProfitPercent),
    buyExchange:     s(raw.exchange),
    sellExchange:    s(raw.exchange),
    buyPrice:        n(raw.priceB),
    sellPrice:       n(raw.priceA),
    maxTradeableUsd: n(raw.estimatedProfit1k) > 0 ? n(raw.estimatedProfit1k) * 1000 : 0,
    detectedAt:      n(raw.detectedAt),
    lastSeenAt:      s(raw.detectedAt),
    durationMs:      0,
    isActive:        true,
    quote_currency:  deriveQuote(symbolA),
    confidence:      s(raw.confidence) || undefined,
    symbolB,
    zScore:          n(raw.zScore),
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<unknown[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  const authUser = getAuthUser(req);
  const plan     = authUser?.plan ?? 'free';

  try {
    const now = Date.now();

    // Fetch all 7 sources in parallel; failed sources are skipped gracefully
    const [
      gapsResult,
      spotFuturesResult,
      cexDexResult,
      triangularResult,
      crossChainResult,
      scoredResult,
      pairsResult,
    ] = await Promise.allSettled([
      fetchJson(`${BACKEND_URL}/profitable-gaps`),
      fetchJson(`${BACKEND_URL}/spot-futures`),
      fetchJson(`${BACKEND_URL}/cex-dex`),
      fetchJson(`${BACKEND_URL}/triangular`),
      fetchJson(`${BACKEND_URL}/cross-chain`),
      fetchJson(`${BACKEND_URL}/signals/scored`),
      fetchJson(`${BACKEND_URL}/signals/pairs`),
    ]);

    // Normalise each settled result; skip failed fetches
    const combined: RawGap[] = [];

    if (gapsResult.status === 'fulfilled') {
      for (const r of gapsResult.value)
        combined.push(normalizeCexCex(r as Record<string, unknown>));
    }

    if (spotFuturesResult.status === 'fulfilled') {
      for (const r of spotFuturesResult.value) {
        const raw = r as Record<string, unknown>;
        // Only include spot-futures with a positive net spread
        if (n(raw.priceDiffPercent) > 0) {
          combined.push(normalizeSpotFutures(raw));
        }
      }
    }

    if (cexDexResult.status === 'fulfilled') {
      for (const r of cexDexResult.value)
        combined.push(normalizeCexDex(r as Record<string, unknown>));
    }

    if (triangularResult.status === 'fulfilled') {
      for (const r of triangularResult.value)
        combined.push(normalizeTriangular(r as Record<string, unknown>));
    }

    if (crossChainResult.status === 'fulfilled') {
      for (const r of crossChainResult.value)
        combined.push(normalizeCrossChain(r as Record<string, unknown>));
    }

    // Deduplicate by composite key: symbol+type+buyExchange+sellExchange
    // This is more robust than id-matching since IDs may differ across sources
    const dedupeKey = (g: RawGap) =>
      `${s(g['symbol'])}|${s(g['type'])}|${s(g['buyExchange'])}|${s(g['sellExchange'])}`;
    const existingKeys = new Set(combined.map(dedupeKey));

    // Scored signals: only add if they aren't already represented
    if (scoredResult.status === 'fulfilled') {
      for (const r of scoredResult.value) {
        const normalised = normalizeScoredGap(r as Record<string, unknown>);
        const key = dedupeKey(normalised);
        if (!existingKeys.has(key)) {
          combined.push(normalised);
          existingKeys.add(key);
        }
      }
    }

    if (pairsResult.status === 'fulfilled') {
      for (const r of pairsResult.value)
        combined.push(normalizePairsSignal(r as Record<string, unknown>));
    }

    // Rotate the free-tier delayed snapshot every FREE_DELAY_MS
    if (now - freeSnapshotAt >= FREE_DELAY_MS) {
      freeSnapshot  = combined;
      freeSnapshotAt = now;
    }

    // Free / anonymous: 4-field delayed payload via existing transformer
    if (!atLeast(plan, 'trader')) {
      const limited = transformGapList(freeSnapshot, 'free');
      return Response.json(limited, {
        headers: { 'X-Data-Tier': 'free', 'X-Data-Delayed': 'true' },
      });
    }

    // Trader+: return real-time unified shape directly.
    // We skip transformGapList here so the extra fields (netSpread, confidence,
    // isVolatile, isThinVolume, minViableTradeUsd) survive for all trader+ tiers.
    // Pro and institutional callers also benefit from the richer payload.
    return Response.json(combined, {
      headers: { 'X-Data-Tier': plan },
    });
  } catch {
    return Response.json([], { status: 503 });
  }
}
