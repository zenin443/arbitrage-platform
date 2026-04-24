import type { Exchange } from "@/types";

export const KUCOIN: Exchange = {
  id: "kucoin",
  name: "KuCoin",
  fee: 0.001,
  withdrawalFees: {
    USDT: 1.0,
    BTC: 0.0005,
    ETH: 0.004,
    SOL: 0.01,
  },
};

/**
 * Connects to the KuCoin WebSocket stream for a given symbol.
 * Returns a cleanup function to close the connection.
 *
 * NOTE: WebSocket connections must only be established server-side.
 * KuCoin requires fetching a dynamic token before connecting.
 */
export function subscribeKucoinTicker(
  symbol: string,
  onTick: (bid: number, ask: number, ts: number) => void
): () => void {
  // TODO: implement KuCoin WebSocket stream subscription
  // Requires POST /api/v1/bullet-public to get ws endpoint + token
  void symbol;
  void onTick;
  return () => {};
}
