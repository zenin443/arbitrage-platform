"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { clsx } from "clsx";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  bybit: "Bybit",
  okx: "OKX",
  kucoin: "KuCoin",
  kraken: "Kraken",
  coinbase: "Coinbase",
  gate: "Gate.io",
  htx: "HTX",
  mexc: "MEXC",
};

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
  return raw.split("/")[0].replace(/USDT$/, "").replace(/USDC$/, "");
}

type Direction = "up" | "down" | "neutral";

interface PriceTick {
  exchangeId: string;
  symbol: string;
  bid: number;
  ask: number;
}

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
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  const prevPrices = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        const incoming: PriceTick[] = Array.isArray(data)
          ? data
          : Array.isArray(data.ticks)
          ? data.ticks
          : [];
        setTicks(incoming);
      } catch {
        // keep previous data on transient errors
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, []);

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

  // Symbols that have live price data, sorted alphabetically
  const feedSymbols = [...grouped.keys()].sort();

  // Compute derived data per symbol
  const symbolDataList: SymbolData[] = feedSymbols.map((symbol) => {
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
    const spread = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

    return {
      symbol,
      cheapestPrice: minPrice,
      cheapestExchange: cheapest.label,
      spread,
      exchanges,
      direction: cheapest.direction,
    };
  });

  // Filter by selected market
  const filtered = symbolDataList.filter(
    (d) =>
      d.symbol.endsWith("/" + market) ||
      d.symbol.endsWith(market) // handle both "BTC/USDT" and "BTCUSDT"
  );

  const handleCoinClick = useCallback((symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  }, []);

  const CoinRow = ({ data, compact = false }: { data: SymbolData; compact?: boolean }) => {
    const isExpanded = expandedSymbol === data.symbol;
    const hasData = data.exchanges.length > 0;

    return (
      <div
        className={clsx(
          "border-b border-[#21262D]/60 transition-colors",
          isExpanded && "border-l-2 border-l-[#388BFD] bg-[#388BFD]/5"
        )}
      >
        <button
          onClick={() => hasData && handleCoinClick(data.symbol)}
          disabled={!hasData}
          className={clsx(
            "w-full flex items-center text-left transition-colors",
            compact ? "px-3 py-2" : "px-2 py-0.5",
            hasData
              ? "hover:bg-[#1C2128] cursor-pointer"
              : "cursor-default opacity-40"
          )}
        >
          <span
            className={clsx(
              "text-[#E6EDF3] font-mono font-semibold flex-1 truncate",
              compact ? "text-sm" : "text-[11px]"
            )}
          >
            {displaySymbol(data.symbol)}
          </span>
          <span
            className={clsx(
              "font-mono tabular-nums ml-1",
              compact ? "text-sm" : "text-[11px]",
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
          {!compact && data.direction === "up" && (
            <span className="text-[#3FB950] text-[9px] ml-0.5">▲</span>
          )}
          {!compact && data.direction === "down" && (
            <span className="text-[#F85149] text-[9px] ml-0.5">▼</span>
          )}
        </button>

        {/* Expanded exchange breakdown */}
        {isExpanded && hasData && (
          <div className={clsx("pb-1.5 space-y-0.5 bg-[#0D1117]", compact ? "px-3" : "px-2")}>
            <div className="flex justify-end mb-1">
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
                  const isMostExpensive = ex.mid === maxPrice && maxPrice !== minPrice;
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
                      <div className="flex items-center gap-0.5">
                        <span className="font-mono text-xs tabular-nums text-[#E6EDF3]">
                          {formatPrice(ex.mid)}
                        </span>
                        {ex.direction === "up" && (
                          <span className="text-[#3FB950] text-[8px]">▲</span>
                        )}
                        {ex.direction === "down" && (
                          <span className="text-[#F85149] text-[8px]">▼</span>
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
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          "relative flex-shrink-0 h-screen bg-[#161B22] border-r border-[#21262D] flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          "hidden md:flex",
          isOpen ? "w-[220px]" : "w-10"
        )}
        aria-label="Price sidebar"
      >
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center justify-center h-9 w-full border-b border-[#21262D] text-[#388BFD] hover:bg-[#1C2128] transition-colors flex-shrink-0"
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
          {isOpen ? (
            filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[#484F58] text-[10px] font-mono">
                {ticks.length === 0 ? "Loading prices…" : "No prices available"}
              </div>
            ) : (
              filtered.map((data) => <CoinRow key={data.symbol} data={data} />)
            )
          ) : (
            filtered.map((data) => (
              <button
                key={data.symbol}
                onClick={() => {
                  setIsOpen(true);
                  handleCoinClick(data.symbol);
                }}
                className="w-full flex items-center justify-center py-1 hover:bg-[#1C2128] transition-colors"
              >
                <span className="text-[#8B949E] font-mono text-[9px] font-semibold tracking-wide [writing-mode:vertical-rl] rotate-180 leading-none">
                  {displaySymbol(data.symbol).slice(0, 3)}
                </span>
              </button>
            ))
          )}
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

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="md:hidden fixed bottom-4 left-4 z-50 flex items-center justify-center h-9 w-9 rounded-full bg-[#1C2128] border border-[#21262D] text-[#388BFD] shadow-lg"
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
                className="text-[#388BFD]"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            {filtered.map((data) => (
              <CoinRow key={data.symbol} data={data} compact />
            ))}
          </aside>
          <div className="flex-1 bg-black/40" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}
