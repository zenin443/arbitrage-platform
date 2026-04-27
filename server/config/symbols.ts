// ── Master Symbol List ────────────────────────────────────────────────────────
// Single source of truth for all tracked symbols across every exchange adapter.
// Adapters import SYMBOLS and silently skip any symbol their exchange doesn't list.
// SYMBOL_TIERS drives subscription gating on the frontend (1=free, 2=basic, 3/4=pro).

// ── USDT pairs ────────────────────────────────────────────────────────────────

// Tier 1 — Top 10 by market cap (free tier)
const TIER1_USDT: string[] = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT',
]

// Tier 2 — Top 11-30 (basic tier)
const TIER2_USDT: string[] = [
  'TRX/USDT', 'MATIC/USDT', 'UNI/USDT', 'NEAR/USDT', 'LTC/USDT',
  'BCH/USDT', 'APT/USDT', 'FIL/USDT', 'ATOM/USDT', 'ARB/USDT',
  'OP/USDT', 'IMX/USDT', 'INJ/USDT', 'SUI/USDT', 'SEI/USDT',
  'STX/USDT', 'RENDER/USDT', 'FTM/USDT', 'ALGO/USDT', 'HBAR/USDT',
]

// Tier 3 — Top 31-60 (pro tier)
const TIER3_USDT: string[] = [
  'VET/USDT', 'AAVE/USDT', 'GRT/USDT', 'SAND/USDT', 'MANA/USDT',
  'AXS/USDT', 'THETA/USDT', 'EOS/USDT', 'IOTA/USDT', 'XTZ/USDT',
  'FLOW/USDT', 'CRV/USDT', 'EGLD/USDT', 'KAVA/USDT', 'ROSE/USDT',
  'ZIL/USDT', 'ONE/USDT', 'ENJ/USDT', 'CHZ/USDT', 'LRC/USDT',
  'COMP/USDT', 'SNX/USDT', 'BAL/USDT', 'SUSHI/USDT', 'YFI/USDT',
  'DYDX/USDT', 'GMX/USDT', 'MKR/USDT', 'RPL/USDT', 'SSV/USDT',
]

// Tier 4 — Trending + memes + mid-caps (pro tier)
const TIER4_USDT: string[] = [
  'PEPE/USDT', 'SHIB/USDT', 'WIF/USDT', 'BONK/USDT', 'FLOKI/USDT',
  'ORDI/USDT', 'TIA/USDT', 'WLD/USDT', 'JUP/USDT', 'PYTH/USDT',
  'W/USDT', 'STRK/USDT', 'MEME/USDT', 'BLUR/USDT', 'ACE/USDT',
  'PIXEL/USDT', 'PORTAL/USDT', 'DYM/USDT', 'ALT/USDT', 'ONDO/USDT',
  'PENDLE/USDT', 'ENA/USDT', 'ETHFI/USDT', 'BOME/USDT', 'SLERF/USDT',
  'MEW/USDT', 'POPCAT/USDT', 'TURBO/USDT', 'NEIRO/USDT', 'APE/USDT',
]

// ── USDC pairs (new — stablecoin arb + Coinbase signals) ──────────────────────
// Tier 1: Major coins on USDC — Coinbase, Kraken, and some Binance/OKX pairs
const TIER1_USDC: string[] = [
  'BTC/USDC', 'ETH/USDC', 'SOL/USDC', 'XRP/USDC',
  'DOGE/USDC', 'AVAX/USDC', 'LINK/USDC', 'ADA/USDC',
]

// Tier 2: Mid-cap USDC pairs available on multiple exchanges
const TIER2_USDC: string[] = [
  'UNI/USDC', 'AAVE/USDC', 'MATIC/USDC', 'ATOM/USDC',
  'NEAR/USDC', 'ARB/USDC', 'OP/USDC', 'LTC/USDC',
]

// ── Stablecoin pairs (new — direct stablecoin arbitrage) ──────────────────────
const STABLECOIN_PAIRS: string[] = [
  'USDC/USDT',   // foundation of stablecoin arb — most liquid pair
]

// ── BTC cross-pairs (new — enables triangular arbitrage) ──────────────────────
// Tier 1: The 8 most liquid ALT/BTC pairs — triangular loops through BTC
const TIER1_BTC: string[] = [
  'ETH/BTC', 'SOL/BTC', 'XRP/BTC', 'DOGE/BTC',
  'ADA/BTC', 'AVAX/BTC', 'LINK/BTC', 'DOT/BTC',
]

// Tier 2: Extended BTC cross-pairs for deeper triangular coverage
const TIER2_BTC: string[] = [
  'BNB/BTC', 'LTC/BTC', 'BCH/BTC', 'ATOM/BTC',
  'NEAR/BTC', 'UNI/BTC', 'ARB/BTC', 'OP/BTC',
]

// ── ETH cross-pairs (new — second triangular tier) ────────────────────────────
const TIER1_ETH: string[] = [
  'SOL/ETH', 'BNB/ETH', 'LINK/ETH', 'AAVE/ETH',
]

// ── Composite export ──────────────────────────────────────────────────────────

/** All USDT pairs (original 90) */
export const USDT_SYMBOLS: string[] = [...TIER1_USDT, ...TIER2_USDT, ...TIER3_USDT, ...TIER4_USDT]

/** All USDC pairs */
export const USDC_SYMBOLS: string[] = [...TIER1_USDC, ...TIER2_USDC]

/** All BTC cross-pairs */
export const BTC_SYMBOLS: string[] = [...TIER1_BTC, ...TIER2_BTC]

/** All ETH cross-pairs */
export const ETH_SYMBOLS: string[] = [...TIER1_ETH]

/** Stablecoin direct pairs */
export const STABLE_SYMBOLS: string[] = [...STABLECOIN_PAIRS]

/** Complete ordered symbol list — all pairs across all quote currencies */
export const SYMBOLS: string[] = [
  ...USDT_SYMBOLS,
  ...USDC_SYMBOLS,
  ...BTC_SYMBOLS,
  ...ETH_SYMBOLS,
  ...STABLE_SYMBOLS,
]

/** Tier mapping for subscription gating. 1=free, 2=basic, 3=pro, 4=pro */
export const SYMBOL_TIERS: Record<string, number> = {
  // USDT
  ...Object.fromEntries(TIER1_USDT.map(s => [s, 1])),
  ...Object.fromEntries(TIER2_USDT.map(s => [s, 2])),
  ...Object.fromEntries(TIER3_USDT.map(s => [s, 3])),
  ...Object.fromEntries(TIER4_USDT.map(s => [s, 4])),
  // USDC — same tier as their USDT counterpart
  ...Object.fromEntries(TIER1_USDC.map(s => [s, 1])),
  ...Object.fromEntries(TIER2_USDC.map(s => [s, 2])),
  // BTC cross-pairs
  ...Object.fromEntries(TIER1_BTC.map(s => [s, 2])),
  ...Object.fromEntries(TIER2_BTC.map(s => [s, 3])),
  // ETH cross-pairs
  ...Object.fromEntries(TIER1_ETH.map(s => [s, 3])),
  // Stablecoin pairs — free tier (educational, low risk)
  ...Object.fromEntries(STABLE_SYMBOLS.map(s => [s, 1])),
}

/** Quote currency of a symbol e.g. "BTC/USDC" → "USDC" */
export function quoteOf(symbol: string): string {
  return symbol.split('/')[1] ?? 'USDT'
}

/** Returns all symbols belonging to a given tier */
export function getSymbolsByTier(tier: 1 | 2 | 3 | 4): string[] {
  return SYMBOLS.filter(s => SYMBOL_TIERS[s] === tier)
}

/** Returns all symbols up to and including the given tier (cumulative) */
export function getSymbolsUpToTier(maxTier: 1 | 2 | 3 | 4): string[] {
  return SYMBOLS.filter(s => SYMBOL_TIERS[s] <= maxTier)
}

/** Returns all symbols with a given quote currency */
export function getSymbolsByQuote(quote: 'USDT' | 'USDC' | 'BTC' | 'ETH'): string[] {
  return SYMBOLS.filter(s => quoteOf(s) === quote)
}
