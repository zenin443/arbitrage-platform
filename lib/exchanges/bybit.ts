import WebSocket from "ws";
import type { Exchange, PriceTick } from "@/types";

export const BYBIT: Exchange = {
  id: "bybit",
  name: "Bybit",
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

const WS_URL = "wss://stream.bybit.com/v5/public/spot";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;
/** Bybit requires a client-side ping every 20s to keep the connection alive */
const PING_INTERVAL_MS = 20_000;

/** Local per-symbol cache used to merge snapshot + delta updates */
interface BookState {
  bid: number;
  ask: number;
}

interface BybitOrderbookData {
  s: string;          // symbol
  b: string[][];      // bids [ [price, qty], … ]
  a: string[][];      // asks [ [price, qty], … ]
  u: number;          // update id
  seq: number;
}

interface BybitMessage {
  topic?: string;
  type?: "snapshot" | "delta";
  ts?: number;
  data?: BybitOrderbookData;
  op?: string;
  ret_msg?: string;
  success?: boolean;
}

/**
 * Connects to the Bybit public WebSocket and subscribes to orderbook.1
 * (top-of-book) for the configured symbols. Handles snapshot + incremental
 * delta messages, caches per-symbol book state, and reconnects automatically
 * with exponential backoff.
 *
 * Server-side only — do not call from client components.
 *
 * @returns A cleanup function that permanently closes the connection.
 */
export function connectBybit(onTick: (tick: PriceTick) => void): () => void {
  let ws: WebSocket | null = null;
  let destroyed = false;
  let retryDelay = INITIAL_RETRY_DELAY_MS;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  // Per-symbol top-of-book cache; required to merge delta updates correctly
  const bookCache = new Map<string, BookState>();

  function clearPingTimer(): void {
    if (pingTimer !== null) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function connect(): void {
    if (destroyed) return;

    console.log("[Bybit] Connecting to", WS_URL);
    ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      console.log("[Bybit] Connected — subscribing to orderbook.1 streams");
      retryDelay = INITIAL_RETRY_DELAY_MS;

      ws!.send(
        JSON.stringify({
          req_id: "arb-platform",
          op: "subscribe",
          args: SYMBOLS.map((s) => `orderbook.1.${s}`),
        })
      );

      // Bybit drops idle connections; send periodic pings
      pingTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: "ping" }));
        }
      }, PING_INTERVAL_MS);
    });

    ws.on("message", (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString()) as BybitMessage;

        // Subscription / pong responses — ignore
        if (msg.op === "pong" || msg.op === "subscribe") return;

        const topic = msg.topic;
        if (!topic?.startsWith("orderbook.1.") || !msg.data) return;

        const d = msg.data;
        const symbol = d.s;
        const type = msg.type;

        let bid: number;
        let ask: number;

        if (type === "snapshot") {
          // Snapshot always contains full top-of-book
          if (!d.b[0] || !d.a[0]) return;
          bid = parseFloat(d.b[0][0]);
          ask = parseFloat(d.a[0][0]);
          bookCache.set(symbol, { bid, ask });
        } else {
          // Delta: either side may be empty (no change at level 1)
          const cached = bookCache.get(symbol);
          if (!cached) return; // must have seen snapshot first

          bid = d.b[0] ? parseFloat(d.b[0][0]) : cached.bid;
          ask = d.a[0] ? parseFloat(d.a[0][0]) : cached.ask;

          // A qty of "0" means the level was deleted — skip this tick
          const bidQty = d.b[0] ? parseFloat(d.b[0][1]) : 1;
          const askQty = d.a[0] ? parseFloat(d.a[0][1]) : 1;
          if (bidQty === 0 || askQty === 0) return;

          bookCache.set(symbol, { bid, ask });
        }

        if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) return;

        onTick({
          exchangeId: "bybit",
          symbol,
          bid,
          ask,
          bidSize: d.b[0] ? parseFloat(d.b[0][1] ?? "0") : 0,
          askSize: d.a[0] ? parseFloat(d.a[0][1] ?? "0") : 0,
          timestamp: msg.ts ?? Date.now(),
          source: "ws",
        });
      } catch (err) {
        console.error("[Bybit] Message parse error:", err);
      }
    });

    ws.on("error", (err: Error) => {
      console.error("[Bybit] WebSocket error:", err.message);
    });

    ws.on("close", (code: number, reason: Buffer) => {
      clearPingTimer();
      if (destroyed) return;
      console.warn(
        `[Bybit] Disconnected (code=${code}, reason=${reason.toString() || "none"}). ` +
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
    clearPingTimer();
    if (ws) {
      ws.removeAllListeners();
      ws.close();
      ws = null;
    }
    console.log("[Bybit] Connection destroyed");
  };
}
