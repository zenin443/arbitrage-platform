/**
 * IP Protection: tier-based field whitelisting for all data API responses.
 *
 * Tier hierarchy: free (0) < trader (1) < pro (2) < institutional (3)
 *
 * Gap field access matrix:
 *   Free         → symbol, gap_type, delayed_spread, direction        (15s delayed)
 *   Trader       → + type, spreadPercent, buyExchange, sellExchange,
 *                    durationMs, maxTradeableUsd, detectedAt, lastSeenAt, isActive
 *   Pro          → + buyPrice, sellPrice, profitSimulation, depthAnalysis
 *   Institutional→ full raw payload
 */

export type PlanTier = 'free' | 'trader' | 'pro' | 'institutional';

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0, trader: 1, pro: 2, institutional: 3,
};

export function planRank(plan: string): number {
  return PLAN_RANK[(plan?.toLowerCase() as PlanTier) ?? 'free'] ?? 0;
}

export function atLeast(plan: string, required: PlanTier): boolean {
  return planRank(plan) >= PLAN_RANK[required];
}

// ---------------------------------------------------------------------------
// Gap transformer
// ---------------------------------------------------------------------------

export type RawGap = Record<string, unknown>;

export interface FreeGap {
  symbol: string;
  gap_type: string;
  delayed_spread: string;
  direction: string;
  /** Quote currency is metadata — exposed at all tiers (no IP risk). */
  quote_currency: string;
}

export interface TraderGap {
  symbol: string;
  type: string;
  spreadPercent: number;
  buyExchange: string;
  sellExchange: string;
  durationMs: number;
  maxTradeableUsd: number;
  detectedAt: string;
  lastSeenAt: string;
  isActive: boolean;
  quote_currency: string;
}

export interface ProGap extends TraderGap {
  buyPrice: number;
  sellPrice: number;
  profitSimulation?: Record<string, unknown>;
  depthAnalysis?: Record<string, unknown>;
}

// Coerce unknown gap field to a typed value safely
function str(v: unknown): string   { return typeof v === 'string'  ? v : String(v ?? ''); }
function num(v: unknown): number   { return typeof v === 'number'  ? v : Number(v ?? 0); }
function bool(v: unknown): boolean { return typeof v === 'boolean' ? v : Boolean(v); }

/**
 * Resolve spread percent from a raw gap — handles both upstream field naming conventions:
 *   profitable-gaps / active-gaps: spreadPercent
 *   opportunities:                 grossSpread or netSpread
 */
function resolveSpread(gap: RawGap): number {
  if (typeof gap.spreadPercent === 'number') return gap.spreadPercent;
  if (typeof gap.grossSpread   === 'number') return gap.grossSpread;
  if (typeof gap.netSpread     === 'number') return gap.netSpread;
  return num(gap.spreadPercent);
}

/**
 * Resolve gap type key — handles both upstream field naming conventions:
 *   profitable-gaps / active-gaps: type  (e.g. "cex_cex", "spot_futures")
 *   opportunities:                 strategy (e.g. "cex_cex_spot", "dex_cex_futures")
 * Only strips the trailing _spot / _futures suffix when there are 2+ parts before it
 * (e.g. "cex_cex_spot" → "cex_cex") but NOT "spot_futures" → correctly kept as-is.
 */
function resolveType(gap: RawGap): string {
  const raw = str(gap.type || gap.strategy || '');
  // Only strip if pattern is word_word_suffix (3 parts), not word_suffix (2 parts like spot_futures)
  return raw.replace(/^(.+_.+)_(?:spot|futures)$/, '$1');
}

/**
 * Strips a gap object down to the fields allowed for `plan`.
 * Caller is responsible for serving free-tier users a 15s-old snapshot.
 */
export function transformGap(gap: RawGap, plan: string): FreeGap | TraderGap | ProGap | RawGap {
  const rank = planRank(plan);

  // Institutional: pass through everything
  if (rank >= PLAN_RANK.institutional) return gap;

  // Derive quote currency from symbol (e.g. "BTC/USDT" → "USDT")
  const rawSymbol = str(gap.symbol);
  const quoteFromSymbol = str(gap.quote_currency) || rawSymbol.split('/')[1] || 'USDT';

  // Pro: full fields minus internal IDs
  if (rank >= PLAN_RANK.pro) {
    const g: ProGap = {
      symbol:          rawSymbol,
      type:            resolveType(gap),
      spreadPercent:   resolveSpread(gap),
      buyExchange:     str(gap.buyExchange),
      sellExchange:    str(gap.sellExchange),
      durationMs:      num(gap.durationMs),
      maxTradeableUsd: num(gap.maxTradeableUsd),
      detectedAt:      str(gap.detectedAt),
      lastSeenAt:      str(gap.lastSeenAt),
      isActive:        bool(gap.isActive),
      buyPrice:        num(gap.buyPrice),
      sellPrice:       num(gap.sellPrice),
      quote_currency:  quoteFromSymbol,
    };
    if (gap.profitSimulation) g.profitSimulation = gap.profitSimulation as Record<string, unknown>;
    if (gap.depthAnalysis)    g.depthAnalysis    = gap.depthAnalysis    as Record<string, unknown>;
    return g;
  }

  // Trader: market context, no raw prices or depth
  if (rank >= PLAN_RANK.trader) {
    const g: TraderGap = {
      symbol:          rawSymbol,
      type:            resolveType(gap),
      spreadPercent:   resolveSpread(gap),
      buyExchange:     str(gap.buyExchange),
      sellExchange:    str(gap.sellExchange),
      durationMs:      num(gap.durationMs),
      maxTradeableUsd: num(gap.maxTradeableUsd),
      detectedAt:      str(gap.detectedAt),
      lastSeenAt:      str(gap.lastSeenAt),
      isActive:        bool(gap.isActive ?? true),
      quote_currency:  quoteFromSymbol,
    };
    return g;
  }

  // Free: minimal, obfuscated, delayed (caller applies the 15s snapshot at route level)
  const rawSpread     = resolveSpread(gap);
  const delayedSpread = rawSpread.toFixed(2) + '%';
  const buyEx  = str(gap.buyExchange);
  const sellEx = str(gap.sellExchange);
  const dir    = buyEx && sellEx ? `${buyEx} → ${sellEx}` : 'unknown';

  const f: FreeGap = {
    symbol:         rawSymbol,
    gap_type:       resolveType(gap),
    delayed_spread: delayedSpread,
    direction:      dir,
    quote_currency: quoteFromSymbol,
  };
  return f;
}

export function transformGapList(gaps: RawGap[], plan: string): (FreeGap | TraderGap | ProGap | RawGap)[] {
  return gaps.map(g => transformGap(g, plan));
}

// ---------------------------------------------------------------------------
// Trading-stats transformer
// ---------------------------------------------------------------------------

const PRIVATE_STAT_KEYS = new Set([
  'botAlphaValue', 'botAlphaPnl', 'botAlphaTrades', 'botAlphaVoided',
  'botBetaValue',  'botBetaPnl',  'botBetaTrades',  'botBetaVoided',
  'magnusAlphaValue', 'magnusAlphaPnl', 'magnusAlphaTrades',
  'magnusAlphaVoided', 'magnusAlphaVoidRate',
  'orderBookCacheSize', 'memoryMB', 'memoryMaxMB', 'clients', 'exchangeStatus',
]);

export function transformTradingStats(
  stats: Record<string, unknown>,
  plan: string
): Record<string, unknown> {
  if (atLeast(plan, 'pro')) return stats;

  // Free / Trader: strip internal bot diagnostics that expose strategy mechanics
  return Object.fromEntries(
    Object.entries(stats).filter(([k]) => !PRIVATE_STAT_KEYS.has(k))
  );
}

// ---------------------------------------------------------------------------
// Upgrade gate helper
// ---------------------------------------------------------------------------

export function upgradeRequired(requiredPlan: PlanTier) {
  return Response.json(
    {
      error:    'upgrade_required',
      message:  `This endpoint requires a ${requiredPlan} plan or higher.`,
      upgrade:  '/pricing',
    },
    { status: 403 }
  );
}

// ---------------------------------------------------------------------------
// Client-side response normalizer
// ---------------------------------------------------------------------------
// Call normalizeApiGapList() on the browser after fetching /api/profitable-gaps
// or /api/opportunities.  Never call on the server — it is a presentation helper
// that coerces both tier shapes into a single, rendering-safe type.
//
// Field mapping by response tier:
//
// | NormalizedGap field | Free (4-field payload)       | Trader+ payload      | Pro+ payload         |
// |---------------------|------------------------------|----------------------|----------------------|
// | symbol              | symbol                       | symbol               | symbol               |
// | type                | gap_type  (e.g. "cex_cex")   | type                 | type                 |
// | spreadPercent       | parsed from delayed_spread   | spreadPercent        | spreadPercent        |
// | buyExchange         | parsed from direction[0]     | buyExchange          | buyExchange          |
// | sellExchange        | parsed from direction[1]     | sellExchange         | sellExchange         |
// | buyPrice            | 0  (unavailable)             | 0  (unavailable)     | buyPrice             |
// | sellPrice           | 0  (unavailable)             | 0  (unavailable)     | sellPrice            |
// | durationMs          | 0  (unavailable)             | durationMs           | durationMs           |
// | maxTradeableUsd     | 0  (unavailable)             | maxTradeableUsd      | maxTradeableUsd      |
// | detectedAt          | 0  (unavailable)             | detectedAt           | detectedAt           |
// | profitSimulation    | null                         | null                 | profitSimulation obj |
// | depthAnalysis       | null                         | null                 | depthAnalysis obj    |
// | netSpread           | 0  (unavailable)             | spreadPercent - 0.2  | spreadPercent - 0.2  |
// | _isFreeTier         | true                         | false                | false                |
// | _delayedSpread      | "0.25%" (original string)    | ""                   | ""                   |
// | _direction          | "binance → bybit" (original) | ""                   | ""                   |

/**
 * Detects whether a raw API item is the 4-field free-tier payload.
 * Free-tier items contain `delayed_spread` and `gap_type`; trader+ items contain
 * `spreadPercent` and `buyExchange`.
 */
export function isFreeTierItem(raw: Record<string, unknown>): boolean {
  return 'delayed_spread' in raw && !('spreadPercent' in raw);
}

/** Parse "0.25%" → 0.25 */
function parseSpreadStr(s: string): number {
  return parseFloat(String(s).replace('%', '')) || 0;
}

/** Parse "binance → bybit" → { buy: "binance", sell: "bybit" } */
function parseDirection(dir: string): { buy: string; sell: string } {
  const parts = String(dir).split(/\s*→\s*/);
  return { buy: parts[0]?.trim() || 'unknown', sell: parts[1]?.trim() || 'unknown' };
}

export interface NormalizedGap {
  id: string;
  symbol: string;
  /** Gap type key e.g. "cex_cex", "spot_futures". From gap_type for free tier, type for trader+. */
  type: string;
  /** Always a valid number. Parsed from delayed_spread for free tier. */
  spreadPercent: number;
  /** Parsed from direction[0] for free tier, buyExchange for trader+. */
  buyExchange: string;
  /** Parsed from direction[1] for free tier, sellExchange for trader+. */
  sellExchange: string;
  /** 0 when unavailable (free/trader tier). */
  buyPrice: number;
  /** 0 when unavailable (free/trader tier). */
  sellPrice: number;
  /** 0 when unavailable (free tier). */
  durationMs: number;
  /** 0 when unavailable (free tier). */
  maxTradeableUsd: number;
  /** 0 when unavailable (free tier). */
  detectedAt: number;
  isActive: boolean;
  profitSimulation: Record<string, unknown> | null;
  depthAnalysis: Record<string, unknown> | null;
  /** net spread after fees; 0 when unavailable (free tier). */
  netSpread: number;
  /** Quote currency e.g. "USDT", "USDC", "BTC". Parsed from symbol when not present in payload. */
  quoteCurrency: string;
  /** Transfer route status: 'open' = confirmed working, 'blocked' = suspended, 'unknown' = no data */
  routeStatus: 'open' | 'blocked' | 'unknown';
  /** true when item came from the 4-field free-tier payload. */
  _isFreeTier: boolean;
  /** Original delayed_spread string e.g. "0.25%". Empty for trader+. */
  _delayedSpread: string;
  /** Original direction string e.g. "binance → bybit". Empty for trader+. */
  _direction: string;
}

/** Derive quote currency from a symbol string or a quote_currency field. */
function deriveQuoteCurrency(symbol: string, rawQuote?: unknown): string {
  if (typeof rawQuote === 'string' && rawQuote.length > 0) return rawQuote;
  return String(symbol).split('/')[1] || 'USDT';
}

/** Coerce one raw API item (either tier shape) into a NormalizedGap. */
export function normalizeApiGap(raw: Record<string, unknown>): NormalizedGap {
  if (isFreeTierItem(raw)) {
    const delayedSpread  = String(raw.delayed_spread ?? '0%');
    const direction      = String(raw.direction ?? '');
    const spreadPercent  = parseSpreadStr(delayedSpread);
    const { buy, sell }  = parseDirection(direction);
    const symbol         = String(raw.symbol ?? '');
    const type           = String(raw.gap_type ?? '');

    return {
      id:              `${symbol}:${type}:${buy}:${sell}`,
      symbol, type, spreadPercent,
      buyExchange:     buy,
      sellExchange:    sell,
      buyPrice:        0,
      sellPrice:       0,
      durationMs:      0,
      maxTradeableUsd: 0,
      detectedAt:      0,
      isActive:        true,
      profitSimulation: null,
      depthAnalysis:   null,
      netSpread:       0,
      quoteCurrency:   deriveQuoteCurrency(symbol, raw.quote_currency),
      routeStatus:     'unknown',
      _isFreeTier:     true,
      _delayedSpread:  delayedSpread,
      _direction:      direction,
    };
  }

  // Trader+ shape — handle both upstream field naming conventions
  const spreadPercent  = typeof raw.spreadPercent === 'number' ? raw.spreadPercent
    : typeof raw.grossSpread === 'number' ? raw.grossSpread
    : typeof raw.netSpread   === 'number' ? raw.netSpread
    : 0;
  const buyExchange    = String(raw.buyExchange    ?? '');
  const sellExchange   = String(raw.sellExchange   ?? '');
  const symbol         = String(raw.symbol         ?? '');
  const rawType        = String(raw.type ?? raw.gap_type ?? raw.strategy ?? '');
  const type           = rawType.replace(/^(.+_.+)_(?:spot|futures)$/, '$1');

  return {
    id:              String(raw.id ?? `${symbol}:${type}:${buyExchange}:${sellExchange}`),
    symbol, type, spreadPercent, buyExchange, sellExchange,
    buyPrice:        typeof raw.buyPrice        === 'number' ? raw.buyPrice        : 0,
    sellPrice:       typeof raw.sellPrice       === 'number' ? raw.sellPrice       : 0,
    durationMs:      typeof raw.durationMs      === 'number' ? raw.durationMs      : 0,
    maxTradeableUsd: typeof raw.maxTradeableUsd === 'number' ? raw.maxTradeableUsd : 0,
    detectedAt:      typeof raw.detectedAt      === 'number' ? raw.detectedAt
                   : typeof raw.detectedAt      === 'string' && raw.detectedAt !== '' ? parseInt(raw.detectedAt as string, 10) || 0
                   : 0,
    isActive:        typeof raw.isActive        === 'boolean' ? raw.isActive       : true,
    profitSimulation: raw.profitSimulation ? (raw.profitSimulation as Record<string, unknown>) : null,
    depthAnalysis:    raw.depthAnalysis    ? (raw.depthAnalysis    as Record<string, unknown>) : null,
    netSpread:        typeof raw.netSpread  === 'number' ? raw.netSpread : Math.max(0, spreadPercent - 0.2),
    quoteCurrency:    deriveQuoteCurrency(symbol, raw.quote_currency),
    routeStatus:      (raw.routeStatus === 'open' || raw.routeStatus === 'blocked') ? raw.routeStatus as 'open' | 'blocked' : 'unknown',
    _isFreeTier:      false,
    _delayedSpread:   '',
    _direction:       '',
  };
}

/** Map an entire API response array through normalizeApiGap. Safe to call with any tier. */
export function normalizeApiGapList(items: unknown[]): NormalizedGap[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => normalizeApiGap(item as Record<string, unknown>));
}
