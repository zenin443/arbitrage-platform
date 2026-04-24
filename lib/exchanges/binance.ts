import WebSocket from "ws";
import type { Exchange, PriceTick } from "@/types";

export const BINANCE: Exchange = {
  id: "binance",
  name: "Binance",
  fee: 0.001,
  withdrawalFees: {
    USDT: 1.0,
    BTC: 0.0005,
    ETH: 0.005,
    BNB: 0.0005,
    SOL: 0.01,
    XRP: 0.25,
  },
};

const WS_URL = "wss://stream.binance.com:9443/ws";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;

/** Raw bookTicker message from Binance WebSocket */
interface BinanceBookTickerMsg {
  u?: number;   // order book update id
  s?: string;   // symbol
  b?: string;   // best bid price
  B?: string;   // best bid qty
  a?: string;   // best ask price
  A?: string;   // best ask qty
}

/**
 * Connects to the Binance public WebSocket and subscribes to best bid/ask
 * (bookTicker) for the configured symbols. Reconnects automatically with
 * exponential backoff on any disconnection.
 *
 * Server-side only — do not call from client components.
 *
 * @returns A cleanup function that permanently closes the connection.
 */
export function connectBinance(onTick: (tick: PriceTick) => void): () => void {
  let ws: WebSocket | null = null;
  let destroyed = false;
  let retryDelay = INITIAL_RETRY_DELAY_MS;

  function connect(): void {
    if (destroyed) return;

    console.log("[Binance] Connecting to", WS_URL);
    ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      console.log("[Binance] Connected — subscribing to bookTicker streams");
      retryDelay = INITIAL_RETRY_DELAY_MS;

      ws!.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: SYMBOLS.map((s) => `${s.toLowerCase()}@bookTicker`),
          id: 1,
        })
      );
    });

    ws.on("message", (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString()) as BinanceBookTickerMsg;

        // Subscription confirmation carries only "result" and "id" — skip it
        if (!msg.s || !msg.b || !msg.a) return;

        const bid = parseFloat(msg.b);
        const ask = parseFloat(msg.a);

        if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) return;

        onTick({
          exchangeId: "binance",
          symbol: msg.s,
          bid,
          ask,
          bidSize: parseFloat(msg.B ?? "0") || 0,
          askSize: parseFloat(msg.A ?? "0") || 0,
          timestamp: Date.now(),
          source: "ws",
        });
      } catch (err) {
        console.error("[Binance] Message parse error:", err);
      }
    });

    ws.on("error", (err: Error) => {
      console.error("[Binance] WebSocket error:", err.message);
    });

    ws.on("close", (code: number, reason: Buffer) => {
      if (destroyed) return;
      console.warn(
        `[Binance] Disconnected (code=${code}, reason=${reason.toString() || "none"}). ` +
          `Reconnecting in ${retryDelay}ms…`
      );
      setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
        connect();
      }, retryDelay);
    });
  }

  connect();

  return () => {
    destroyed = true;
    if (ws) {
      ws.removeAllListeners();
      ws.close();
      ws = null;
    }
    console.log("[Binance] Connection destroyed");
  };
}
