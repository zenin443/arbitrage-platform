// ── Master Symbol List ────────────────────────────────────────────────────────
// Single source of truth for all tracked symbols across every exchange adapter.
// Adapters import SYMBOLS and silently skip any symbol their exchange doesn't list.
// SYMBOL_TIERS drives subscription gating on the frontend (1=free, 2=basic, 3/4=pro).

// Tier 1 — Top 10 by market cap (free tier)
const TIER1: string[] = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
  'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT',
]

// Tier 2 — Top 11-30 (basic tier)
const TIER2: string[] = [
  'TRX/USDT', 'MATIC/USDT', 'UNI/USDT', 'NEAR/USDT', 'LTC/USDT',
  'BCH/USDT', 'APT/USDT', 'FIL/USDT', 'ATOM/USDT', 'ARB/USDT',
  'OP/USDT', 'IMX/USDT', 'INJ/USDT', 'SUI/USDT', 'SEI/USDT',
  'STX/USDT', 'RENDER/USDT', 'FTM/USDT', 'ALGO/USDT', 'HBAR/USDT',
]

// Tier 3 — Top 31-60 (pro tier)
const TIER3: string[] = [
  'VET/USDT', 'AAVE/USDT', 'GRT/USDT', 'SAND/USDT', 'MANA/USDT',
  'AXS/USDT', 'THETA/USDT', 'EOS/USDT', 'IOTA/USDT', 'XTZ/USDT',
  'FLOW/USDT', 'CRV/USDT', 'EGLD/USDT', 'KAVA/USDT', 'ROSE/USDT',
  'ZIL/USDT', 'ONE/USDT', 'ENJ/USDT', 'CHZ/USDT', 'LRC/USDT',
  'COMP/USDT', 'SNX/USDT', 'BAL/USDT', 'SUSHI/USDT', 'YFI/USDT',
  'DYDX/USDT', 'GMX/USDT', 'MKR/USDT', 'RPL/USDT', 'SSV/USDT',
]

// Tier 4 — Trending + memes + mid-caps (pro tier)
const TIER4: string[] = [
  'PEPE/USDT', 'SHIB/USDT', 'WIF/USDT', 'BONK/USDT', 'FLOKI/USDT',
  'ORDI/USDT', 'TIA/USDT', 'WLD/USDT', 'JUP/USDT', 'PYTH/USDT',
  'W/USDT', 'STRK/USDT', 'MEME/USDT', 'BLUR/USDT', 'ACE/USDT',
  'PIXEL/USDT', 'PORTAL/USDT', 'DYM/USDT', 'ALT/USDT', 'ONDO/USDT',
  'PENDLE/USDT', 'ENA/USDT', 'ETHFI/USDT', 'BOME/USDT', 'SLERF/USDT',
  'MEW/USDT', 'POPCAT/USDT', 'TURBO/USDT', 'NEIRO/USDT', 'APE/USDT',
]

/** Complete ordered symbol list — all 90 USDT pairs */
export const SYMBOLS: string[] = [...TIER1, ...TIER2, ...TIER3, ...TIER4]

/** Tier mapping for subscription gating. 1=free, 2=basic, 3=pro, 4=pro */
export const SYMBOL_TIERS: Record<string, number> = {
  ...Object.fromEntries(TIER1.map(s => [s, 1])),
  ...Object.fromEntries(TIER2.map(s => [s, 2])),
  ...Object.fromEntries(TIER3.map(s => [s, 3])),
  ...Object.fromEntries(TIER4.map(s => [s, 4])),
}

/** Returns all symbols belonging to a given tier */
export function getSymbolsByTier(tier: 1 | 2 | 3 | 4): string[] {
  return SYMBOLS.filter(s => SYMBOL_TIERS[s] === tier)
}

/** Returns all symbols up to and including the given tier (cumulative) */
export function getSymbolsUpToTier(maxTier: 1 | 2 | 3 | 4): string[] {
  return SYMBOLS.filter(s => SYMBOL_TIERS[s] <= maxTier)
}
