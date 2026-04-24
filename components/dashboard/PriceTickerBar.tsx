// DISABLED: replaced by PriceSidebar — kept for reference only
// "use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { PriceTick } from "@/types";
import { useWebSocket } from "@/app/lib/useWebSocket";

type ConnectionStatus = "connecting" | "waiting" | "live" | "partial";

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  bybit: "Bybit",
  okx: "OKX",
  kucoin: "KuCoin",
};

function formatTickerPrice(value: number): string {
  if (value >= 1000) {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (value >= 1) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  return `$${value.toFixed(6)}`;
}

type Direction = "up" | "down" | "neutral";

type SymbolGroup = {
  displaySymbol: string;
  exchanges: { id: string; label: string; mid: number; direction: Direction }[];
};

const CONNECTING_WINDOW_MS = 5_000;
const PARTIAL_CONNECTION_WINDOW_MS = 10_000;
const LIVE_TICK_MAX_AGE_MS = 10_000;

export default function PriceTickerBar() {
  const prevPrices = useRef<Map<string, number>>(new Map());
  const mountedAt = useRef<number>(Date.now());
  const [now, setNow] = useState<number>(() => Date.now());

  const { ticks, connected, lastUpdate } = useWebSocket("ws://localhost:3002");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedMs = now - mountedAt.current;
  const latestTickTimestamp = lastUpdate ?? 0;
  const hasLivePrices =
    latestTickTimestamp > 0 && now - latestTickTimestamp <= LIVE_TICK_MAX_AGE_MS;

  let connectionStatus: ConnectionStatus = "waiting";
  if (!connected && elapsedMs < CONNECTING_WINDOW_MS) {
    connectionStatus = "connecting";
  } else if (hasLivePrices) {
    connectionStatus = "live";
  } else if (elapsedMs >= PARTIAL_CONNECTION_WINDOW_MS) {
    connectionStatus = "partial";
  }

  const statusConfig: Record<
    ConnectionStatus,
    { label: string; dotClass: string; textClass: string; detail: string }
  > = {
    connecting: {
      label: "Connecting...",
      dotClass: "bg-sky-400 animate-pulse",
      textClass: "text-sky-300",
      detail: "Connecting to WebSocket price feed",
    },
    waiting: {
      label: "Waiting for prices",
      dotClass: "bg-gray-500",
      textClass: "text-gray-400",
      detail: "WebSocket connected, waiting for live price data",
    },
    live: {
      label: "Live",
      dotClass: "bg-green-500",
      textClass: "text-green-400",
      detail: "Live prices streaming via WebSocket",
    },
    partial: {
      label: "Partial connection",
      dotClass: "bg-yellow-400",
      textClass: "text-yellow-300",
      detail: "Connected but no recent price data received",
    },
  };

  const status = statusConfig[connectionStatus];

  // Group ticks by symbol, compute direction vs previous tick
  const grouped = new Map<string, SymbolGroup>();

  for (const tick of ticks) {
    const mid = parseFloat(((tick.bid + tick.ask) / 2).toFixed(8));
    const key = `${tick.exchangeId}:${tick.symbol}`;
    const prev = prevPrices.current.get(key);

    const direction: Direction =
      prev === undefined
        ? "neutral"
        : mid > prev
        ? "up"
        : mid < prev
        ? "down"
        : "neutral";

    prevPrices.current.set(key, mid);

    if (!grouped.has(tick.symbol)) {
      grouped.set(tick.symbol, {
        displaySymbol: tick.symbol,
        exchanges: [],
      });
    }

    grouped.get(tick.symbol)!.exchanges.push({
      id: tick.exchangeId,
      label: EXCHANGE_LABELS[tick.exchangeId] ?? tick.exchangeId.toUpperCase(),
      mid,
      direction,
    });
  }

  const tickerItems = Array.from(grouped.values()).map((group) => (
    <span
      key={group.displaySymbol}
      className="inline-flex items-center gap-3 px-6 shrink-0"
    >
      <span className="text-gray-400 font-semibold tracking-wide">
        {group.displaySymbol}
      </span>
      {group.exchanges.map((ex) => (
        <span key={ex.id} className="inline-flex items-center gap-1">
          <span className="text-gray-600">{ex.label}:</span>
          <span
            className={clsx("tabular-nums transition-colors duration-500", {
              "text-green-400": ex.direction === "up",
              "text-red-400": ex.direction === "down",
              "text-gray-300": ex.direction === "neutral",
            })}
          >
            {formatTickerPrice(ex.mid)}
          </span>
          {ex.direction === "up" && (
            <span className="text-green-500 text-[10px]">▲</span>
          )}
          {ex.direction === "down" && (
            <span className="text-red-500 text-[10px]">▼</span>
          )}
        </span>
      ))}
      <span className="text-gray-800 mx-2 select-none">│</span>
    </span>
  ));

  return (
    <div className="overflow-hidden bg-gray-900 border-b border-gray-800 h-9 flex items-center">
      <div className="h-full shrink-0 px-4 border-r border-gray-800 flex items-center gap-2 text-xs font-mono">
        <span className={clsx("h-2 w-2 rounded-full", status.dotClass)} />
        <span className={status.textClass}>{status.label}</span>
      </div>
      {grouped.size === 0 ? (
        <div className="flex-1 px-4 text-xs font-mono text-gray-500 truncate">
          {status.detail}
        </div>
      ) : (
        <div className="overflow-hidden flex-1">
          <div className="flex h-full items-center animate-marquee whitespace-nowrap text-xs font-mono">
            {tickerItems}
            {tickerItems}
          </div>
        </div>
      )}
      {grouped.size > 0 && (
        <div className="sr-only" aria-live="polite">
          {status.label}
        </div>
      )}
      {grouped.size === 0 && (
        <div className="sr-only" aria-live="polite">
          {status.detail}
        </div>
      )}
    </div>
  );
}
