import WebSocket from "ws";
import type { Exchange, PriceTick } from "@/types";

export const OKX: Exchange = {
  id: "okx",
  name: "OKX",
  fee: 0.001,
  withdrawalFees: {
    USDT: 1.0,
    BTC: 0.0004,
    ETH: 0.004,
    BNB: 0.0005,
    SOL: 0.01,
    XRP: 0.25,
  },
};

const WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
/**
 * OKX uses hyphenated instrument IDs (BTC-USDT).
 * We map to/from our canonical format (BTCUSDT) when emitting PriceTick.
 */
const SYMBOLS_OKX = ["BTC-USDT", "ETH-USDT", "BNB-USDT", "SOL-USDT", "XRP-USDT"];
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;
/** OKX disconnects if no ping within 30s; send every 25s to be safe */
const PING_INTERVAL_MS = 25_000;
const SUBSCRIPTION_ARGS = SYMBOLS_OKX.map((instId) => ({
  channel: "books5" as const,
  instId,
}));

/** Convert OKX instrument ID to our canonical symbol, e.g. BTC-USDT → BTCUSDT */
function okxToCanonical(instId: string): string {
  return instId.replace("-", "");
}

interface OkxBooksData {
  asks: string[][];   // [ [price, qty, liquidationOrders, orderCount], … ]
  bids: string[][];
  ts: string;
  checksum?: number;
}

interface OkxMessage {
  event?: string;
  arg?: { channel: "books5"; instId: string };
  action?: string;
  data?: OkxBooksData[];
  msg?: string;
  code?: string;
}

/**
 * Connects to the OKX public WebSocket and subscribes to books5 (5-level
 * order book snapshot) for the configured symbols. Takes best bid/ask from
 * each update. Handles OKX ping/pong keepalive and reconnects automatically
 * with exponential backoff.
 *
 * Server-side only — do not call from client components.
 *
 * @returns A cleanup function that permanently closes the connection.
 */
export function connectOKX(onTick: (tick: PriceTick) => void): () => void {
  let ws: WebSocket | null = null;
  let destroyed = false;
  let retryDelay = INITIAL_RETRY_DELAY_MS;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  function clearPingTimer(): void {
    if (pingTimer !== null) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function safeSend(payload: string): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(payload);
      return true;
    } catch (error) {
      console.error("[OKX] Failed to send WebSocket message:", error);
      return false;
    }
  }

  function connect(): void {
    if (destroyed) return;

    console.log("[OKX] Connecting to", WS_URL);
    ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      console.log("[OKX] Connected — subscribing to books5 channels");
      retryDelay = INITIAL_RETRY_DELAY_MS;

      const didSubscribe = safeSend(
        JSON.stringify({
          op: "subscribe",
          args: SUBSCRIPTION_ARGS,
        })
      );

      if (!didSubscribe) {
        ws?.close();
        return;
      }

      // OKX requires periodic pings to avoid timeout disconnection
      pingTimer = setInterval(() => {
        safeSend("ping");
      }, PING_INTERVAL_MS);
    });

    ws.on("message", (data: WebSocket.RawData) => {
      const raw = data.toString();

      // OKX heartbeat frames are plain text, not JSON payloads.
      if (raw === "pong") {
        return;
      }

      if (raw === "ping") {
        safeSend("pong");
        return;
      }

      if (!raw.startsWith("{")) {
        console.warn("[OKX] Ignoring unexpected non-JSON frame:", raw);
        return;
      }

      try {
        const msg = JSON.parse(raw) as OkxMessage;

        // Subscription confirmations and error events
        if (msg.event) {
          if (msg.event === "error") {
            console.error("[OKX] Subscription error:", msg.msg, "code:", msg.code);
          }
          return;
        }

        // books5 delivers both snapshots and incremental updates;
        // each message contains the current best 5 levels — top is index 0.
        if (msg.arg?.channel !== "books5") {
          return;
        }

        const instId = msg.arg.instId;
        if (!instId || !msg.data?.[0]) return;

        const book = msg.data[0];
        if (!book.bids[0] || !book.asks[0]) return;

        const bid = parseFloat(book.bids[0][0]);
        const ask = parseFloat(book.asks[0][0]);

        if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) return;

        onTick({
          exchangeId: "okx",
          symbol: okxToCanonical(instId),
          bid,
          ask,
          bidSize: parseFloat(book.bids[0]?.[1] ?? "0") || 0,
          askSize: parseFloat(book.asks[0]?.[1] ?? "0") || 0,
          timestamp: parseInt(book.ts, 10) || Date.now(),
          source: "ws",
        });
      } catch (err) {
        console.error("[OKX] Message parse error:", err);
      }
    });

    ws.on("error", (err: Error) => {
      console.error("[OKX] WebSocket error:", err.message);
    });

    ws.on("close", (code: number, reason: Buffer) => {
      clearPingTimer();
      if (destroyed) return;
      console.warn(
        `[OKX] Disconnected (code=${code}, reason=${reason.toString() || "none"}). ` +
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
    console.log("[OKX] Connection destroyed");
  };
}
