"use client";

import { useState, useRef, useCallback } from "react";
import { clsx } from "clsx";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useWebSocket } from "@/app/lib/useWebSocket";

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  bybit: "Bybit",
  okx: "OKX",
  kucoin: "KuCoin",
};

// All tracked symbols — big caps + placeholders for mid/meme
const ALL_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "MATICUSDT",
  "LINKUSDT",
  "UNIUSDT",
  "SHIBUSDT",
  "PEPEUSDT",
  "WIFUSDT",
];

function formatPrice(value: number): string {
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

function displaySymbol(raw: string): string {
  return raw.split("/")[0].replace(/USDT$/, "");
}

type Direction = "up" | "down" | "neutral";

interface ExchangePrice {
  id: string;
  label: string;
  mid: number;
  direction: Direction;
}

interface SymbolData {
  symbol: string;
  cheapestPrice: number;
  cheapestExchange: string;
  spread: number;
  exchanges: ExchangePrice[];
  direction: Direction;
}

interface Props {
  market: "USDT" | "USDC";
}

export default function PriceSidebar({ market }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const prevPrices = useRef<Map<string, number>>(new Map());

  const { ticks } = useWebSocket("ws://localhost:3002");

  // Group ticks by symbol, track direction vs previous value
  const grouped = new Map<string, Map<string, ExchangePrice>>();

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
      grouped.set(tick.symbol, new Map());
    }

    grouped.get(tick.symbol)!.set(tick.exchangeId, {
      id: tick.exchangeId,
      label: EXCHANGE_LABELS[tick.exchangeId] ?? tick.exchangeId.toUpperCase(),
      mid,
      direction,
    });
  }

  // Build ordered symbol list — only symbols that have live price data
  const feedSymbols = new Set(grouped.keys());
  const orderedSymbols = [
    ...ALL_SYMBOLS.filter((s) => feedSymbols.has(s)),
    ...[...feedSymbols].filter((s) => !ALL_SYMBOLS.includes(s)),
  ];

  // Compute derived data per symbol
  const symbolDataList: SymbolData[] = orderedSymbols.map((symbol) => {
    const exchangeMap = grouped.get(symbol);
    const exchanges: ExchangePrice[] = exchangeMap
      ? Array.from(exchangeMap.values())
      : [];

    if (exchanges.length === 0) {
      return {
        symbol,
        cheapestPrice: 0,
        cheapestExchange: "—",
        spread: 0,
        exchanges: [],
        direction: "neutral",
      };
    }

    const prices = exchanges.map((e) => e.mid);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const cheapest = exchanges.find((e) => e.mid === minPrice)!;
    const spread =
      minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

    // Overall direction: use cheapest exchange direction
    const direction = cheapest.direction;

    return {
      symbol,
      cheapestPrice: minPrice,
      cheapestExchange: cheapest.label,
      spread,
      exchanges,
      direction,
    };
  });

  const filtered = symbolDataList.filter((d) =>
    d.symbol.endsWith("/" + market)
  );

  const handleCoinClick = useCallback((symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  }, []);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={clsx(
          "relative flex-shrink-0 h-screen bg-[#161B22] border-r border-[#21262D] flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          "hidden md:flex", // hidden on mobile, flex on md+
          isOpen ? "w-[220px]" : "w-10"
        )}
        aria-label="Price sidebar"
      >
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center justify-center h-9 w-full border-b border-[#21262D] text-[#388BFD] hover:text-[#388BFD] hover:bg-[#1C2128] transition-colors flex-shrink-0"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Coin list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#21262D] [&::-webkit-scrollbar-track]:bg-transparent">
          {filtered.map((data) => {
            const isExpanded = expandedSymbol === data.symbol;
            const hasData = data.exchanges.length > 0;

            return (
              <div
                key={data.symbol}
                className={clsx(
                  "border-b border-[#21262D]/60 transition-colors",
                  isExpanded && "border-l-2 border-l-[#388BFD] bg-[#388BFD]/5"
                )}
              >
                {/* Coin row */}
                <button
                  onClick={() => hasData && handleCoinClick(data.symbol)}
                  disabled={!hasData}
                  className={clsx(
                    "w-full flex items-center px-2 py-0.5 text-left transition-colors",
                      hasData
                        ? "hover:bg-[#1C2128] cursor-pointer"
                      : "cursor-default opacity-40"
                  )}
                >
                  {isOpen ? (
                    <>
                      <span className="text-[#E6EDF3] font-mono font-semibold text-[11px] flex-1 truncate">
                        {displaySymbol(data.symbol)}
                      </span>
                      <span
                        className={clsx(
                          "font-mono text-[11px] tabular-nums ml-1",
                          data.direction === "up"
                            ? "text-[#3FB950]"
                            : data.direction === "down"
                            ? "text-[#F85149]"
                            : "text-[#E6EDF3]"
                        )}
                      >
                        {hasData ? formatPrice(data.cheapestPrice) : "—"}
                      </span>
                      <span className="text-[#484F58] text-[10px] font-mono bg-[#1C2128] px-1 rounded ml-1">
                        {market}
                      </span>
                      {data.direction === "up" && (
                        <span className="text-[#3FB950] text-[9px] ml-0.5">
                          ▲
                        </span>
                      )}
                      {data.direction === "down" && (
                        <span className="text-[#F85149] text-[9px] ml-0.5">
                          ▼
                        </span>
                      )}
                    </>
                  ) : (
                      <span className="text-[#8B949E] font-mono text-[9px] font-semibold tracking-wide w-full text-center leading-none">
                      {displaySymbol(data.symbol).slice(0, 3)}
                    </span>
                  )}
                </button>

                {/* Expanded exchange breakdown */}
                {isOpen && isExpanded && hasData && (
                  <div className="pb-1.5 px-2 space-y-0.5 bg-[#0D1117]">
                    {/* Spread badge */}
                    <div className="flex justify-end mb-1">
                      <span className="text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/20 text-[10px] font-mono px-1.5 rounded py-0.5">
                        {data.spread.toFixed(3)}% gross spread
                      </span>
                    </div>

                    {/* Per-exchange rows */}
                    {(() => {
                      const prices = data.exchanges.map((e) => e.mid);
                      const minPrice = Math.min(...prices);
                      const maxPrice = Math.max(...prices);

                      return data.exchanges
                        .slice()
                        .sort((a, b) => a.mid - b.mid)
                        .map((ex) => {
                          const isCheapest = ex.mid === minPrice;
                          const isMostExpensive =
                            ex.mid === maxPrice && maxPrice !== minPrice;

                          return (
                            <div
                              key={ex.id}
                              className={clsx(
                                "flex items-center justify-between rounded px-1.5 py-0.5",
                                isCheapest && "bg-[#3FB950]/15",
                                isMostExpensive && "bg-[#F85149]/10"
                              )}
                            >
                              <span
                                className={clsx(
                                  "font-mono text-xs truncate",
                                  isCheapest
                                    ? "text-[#3FB950]"
                                    : isMostExpensive
                                    ? "text-[#F85149]"
                                    : "text-[#8B949E]"
                                )}
                              >
                                {ex.label}
                              </span>
                              <span className="font-mono text-[10px] text-[#484F58] mx-1">
                                {data.symbol}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <span className="font-mono text-xs tabular-nums text-[#E6EDF3]">
                                  {formatPrice(ex.mid)}
                                </span>
                                {ex.direction === "up" && (
                                  <span className="text-[#3FB950] text-[8px]">
                                    ▲
                                  </span>
                                )}
                                {ex.direction === "down" && (
                                  <span className="text-[#F85149] text-[8px]">
                                    ▼
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Collapsed label */}
        {!isOpen && (
          <div className="flex-shrink-0 py-2 flex items-center justify-center">
            <span className="text-[#484F58] text-[9px] font-mono uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
              Prices
            </span>
          </div>
        )}
      </aside>

      {/* Mobile toggle button — visible only on small screens */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="md:hidden fixed bottom-4 left-4 z-50 flex items-center justify-center h-9 w-9 rounded-full bg-[#1C2128] border border-[#21262D] text-[#388BFD] hover:text-[#388BFD] shadow-lg"
        aria-label="Toggle price sidebar"
      >
        {isOpen ? (
          <ChevronLeftIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
      </button>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <aside className="w-[220px] h-full bg-[#161B22] border-r border-[#21262D] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262D]">
              <span className="text-xs font-mono text-[#8B949E] uppercase tracking-wider">
                Live Prices
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#388BFD] hover:text-[#388BFD]"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            {filtered.map((data) => {
              const isExpanded = expandedSymbol === data.symbol;
              const hasData = data.exchanges.length > 0;
              return (
                <div
                  key={data.symbol}
                  className={clsx(
                  "border-b border-[#21262D]/60",
                  isExpanded && "border-l-2 border-l-[#388BFD] bg-[#388BFD]/5"
                  )}
                >
                  <button
                    onClick={() => hasData && handleCoinClick(data.symbol)}
                    disabled={!hasData}
                    className={clsx(
                      "w-full flex items-center px-3 py-2 text-left",
                      hasData ? "hover:bg-[#1C2128]" : "opacity-40"
                    )}
                  >
                    <span className="text-[#E6EDF3] font-mono text-sm font-semibold flex-1">
                      {displaySymbol(data.symbol)}
                    </span>
                    <span
                        className={clsx(
                          "font-mono text-sm tabular-nums",
                          data.direction === "up"
                            ? "text-[#3FB950]"
                            : data.direction === "down"
                            ? "text-[#F85149]"
                            : "text-[#E6EDF3]"
                        )}
                    >
                      {hasData ? formatPrice(data.cheapestPrice) : "—"}
                    </span>
                    <span className="text-[#484F58] text-[10px] font-mono bg-[#1C2128] px-1 rounded ml-1">
                      {market}
                    </span>
                  </button>
                  {isExpanded && hasData && (
                    <div className="pb-2 px-3 space-y-1">
                      <div className="flex justify-end">
                        <span className="text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/20 text-[10px] font-mono px-1.5 rounded py-0.5">
                          {data.spread.toFixed(3)}% gross spread
                        </span>
                      </div>
                      {(() => {
                        const prices = data.exchanges.map((e) => e.mid);
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        return data.exchanges
                          .slice()
                          .sort((a, b) => a.mid - b.mid)
                          .map((ex) => {
                            const isCheapest = ex.mid === minPrice;
                            const isMostExpensive =
                              ex.mid === maxPrice && maxPrice !== minPrice;
                            return (
                              <div
                                key={ex.id}
                                className={clsx(
                                  "flex items-center justify-between rounded px-2 py-1",
                                  isCheapest && "bg-[#3FB950]/15",
                                  isMostExpensive && "bg-[#F85149]/10"
                                )}
                              >
                                <span
                                  className={clsx(
                                    "font-mono text-xs",
                                    isCheapest
                                      ? "text-[#3FB950]"
                                      : isMostExpensive
                                      ? "text-[#F85149]"
                                      : "text-[#8B949E]"
                                  )}
                                >
                                  {ex.label}
                                </span>
                                <span className="font-mono text-xs text-[#484F58] mx-1">
                                  {data.symbol}
                                </span>
                                <span className="font-mono text-xs tabular-nums text-[#E6EDF3]">
                                  {formatPrice(ex.mid)}
                                </span>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}
