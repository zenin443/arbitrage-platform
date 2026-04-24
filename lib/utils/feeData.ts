import { BINANCE } from "@/lib/exchanges/binance";
import { BYBIT } from "@/lib/exchanges/bybit";
import { OKX } from "@/lib/exchanges/okx";
import { KUCOIN } from "@/lib/exchanges/kucoin";
import type { Exchange } from "@/types";

/**
 * Master registry of all supported exchanges.
 * Add new exchanges here to make them available across the platform.
 */
export const SUPPORTED_EXCHANGES: Exchange[] = [
  BINANCE,
  BYBIT,
  OKX,
  KUCOIN,
];

/**
 * Look up an exchange by its ID.
 */
export function getExchangeById(id: string): Exchange | undefined {
  return SUPPORTED_EXCHANGES.find((e) => e.id === id);
}

/**
 * Returns the taker fee for a given exchange ID.
 * Falls back to a conservative 0.1% if the exchange is not found.
 */
export function getTakerFee(exchangeId: string): number {
  return getExchangeById(exchangeId)?.fee ?? 0.001;
}

/**
 * Returns the withdrawal fee for a given asset on a given exchange.
 * Falls back to 0 if the exchange or asset is not found.
 */
export function getWithdrawalFee(exchangeId: string, asset: string): number {
  return getExchangeById(exchangeId)?.withdrawalFees[asset] ?? 0;
}
