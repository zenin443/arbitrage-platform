/**
 * Centralized exchange fee configuration.
 *
 * Last verified: 2025-04-26
 * Source: Official exchange fee schedule pages
 * Using default/base tier (no VIP discounts)
 * Fees are decimal (0.001 = 0.1%)
 *
 * These are the SOURCE-OF-TRUTH fee values for the platform.
 * The server/registry/exchangeRegistry.ts entries must match these.
 *
 * AUDIT NOTES (2025-04-26):
 * - MEXC: maker was 0.002 (wrong) → corrected to 0.0 (maker-free)
 * - BingX: both were 0.002 (wrong) → corrected to 0.001/0.001
 * - Kraken: taker was 0.002 (wrong) → corrected to 0.0026
 * - Hyperliquid, Jupiter, Uniswap V3: added (were missing entirely)
 */

export const EXCHANGE_FEES: Record<string, { maker: number; taker: number }> = {
  binance:     { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  okx:         { maker: 0.0008, taker: 0.001  }, // 0.08% / 0.10%
  gateio:      { maker: 0.002,  taker: 0.002  }, // 0.20% / 0.20%
  kucoin:      { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  bingx:       { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  mexc:        { maker: 0.0,    taker: 0.001  }, // 0.00% / 0.10% (maker-free)
  htx:         { maker: 0.002,  taker: 0.002  }, // 0.20% / 0.20%
  bitget:      { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  coinbase:    { maker: 0.004,  taker: 0.006  }, // 0.40% / 0.60%
  hyperliquid: { maker: 0.0002, taker: 0.0005 }, // 0.02% / 0.05%
  jupiter:     { maker: 0.0,    taker: 0.0    }, // DEX — fees in slippage
  uniswap_v3:  { maker: 0.0,    taker: 0.003  }, // DEX — 0.30% pool fee tier
  bitfinex:    { maker: 0.001,  taker: 0.002  }, // 0.10% / 0.20%
  kraken:      { maker: 0.0016, taker: 0.0026 }, // 0.16% / 0.26%
  // Additional exchanges active on the platform
  bybit:       { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  cryptocom:   { maker: 0.00075, taker: 0.00075 }, // 0.075% / 0.075%
  bitstamp:    { maker: 0.003,  taker: 0.005  }, // 0.30% / 0.50%
  upbit:       { maker: 0.0025, taker: 0.0025 }, // 0.25% / 0.25%
  phemex:      { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  whitebit:    { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  lbank:       { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
  coinex:      { maker: 0.002,  taker: 0.002  }, // 0.20% / 0.20%
  bitmart:     { maker: 0.0025, taker: 0.0025 }, // 0.25% / 0.25%
  ascendex:    { maker: 0.001,  taker: 0.001  }, // 0.10% / 0.10%
}

/**
 * Returns the taker fee for a given exchange ID.
 * Uses taker fees because arbitrage trades execute as market orders.
 * Falls back to a conservative 0.1% if the exchange is not found.
 */
export function getTakerFee(exchangeId: string): number {
  return EXCHANGE_FEES[exchangeId?.toLowerCase()]?.taker ?? 0.001
}

/**
 * Returns the maker fee for a given exchange ID.
 * Falls back to a conservative 0.1% if the exchange is not found.
 */
export function getMakerFee(exchangeId: string): number {
  return EXCHANGE_FEES[exchangeId?.toLowerCase()]?.maker ?? 0.001
}
