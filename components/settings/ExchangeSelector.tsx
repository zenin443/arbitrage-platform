"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { AlertTriangleIcon, CheckIcon } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import Badge from "@/components/ui/Badge";

type Exchange = {
  id: string;
  name: string;
  fee: number;
  color: string;
  initial: string;
  status: "active" | "coming-soon";
};

const EXCHANGES: Exchange[] = [
  // Tier 1 — WebSocket, sub-millisecond feeds
  { id: "binance",   name: "Binance",    fee: 0.10, color: "bg-yellow-500",  initial: "B",  status: "active" },
  { id: "bybit",     name: "Bybit",      fee: 0.10, color: "bg-orange-500",  initial: "B",  status: "active" },
  { id: "okx",       name: "OKX",        fee: 0.08, color: "bg-blue-500",    initial: "O",  status: "active" },
  { id: "kucoin",    name: "KuCoin",     fee: 0.10, color: "bg-green-500",   initial: "K",  status: "active" },
  // Tier 2 — CCXT REST
  { id: "gateio",    name: "Gate.io",    fee: 0.20, color: "bg-purple-500",  initial: "G",  status: "active" },
  { id: "mexc",      name: "MEXC",       fee: 0.00, color: "bg-teal-500",    initial: "M",  status: "active" },
  { id: "bitget",    name: "Bitget",     fee: 0.10, color: "bg-cyan-500",    initial: "B",  status: "active" },
  { id: "htx",       name: "HTX",        fee: 0.20, color: "bg-red-500",     initial: "H",  status: "active" },
  { id: "bingx",     name: "BingX",      fee: 0.20, color: "bg-blue-400",    initial: "B",  status: "active" },
  { id: "kraken",    name: "Kraken",     fee: 0.26, color: "bg-indigo-500",  initial: "K",  status: "active" },
  // Tier 3 — Native REST adapters
  { id: "coinbase",  name: "Coinbase",   fee: 0.60, color: "bg-blue-600",    initial: "C",  status: "active" },
  { id: "cryptocom", name: "Crypto.com", fee: 0.075, color: "bg-blue-800",   initial: "C",  status: "active" },
  { id: "bitfinex",  name: "Bitfinex",   fee: 0.20, color: "bg-green-700",   initial: "B",  status: "active" },
  { id: "bitstamp",  name: "Bitstamp",   fee: 0.50, color: "bg-orange-600",  initial: "B",  status: "active" },
  { id: "upbit",     name: "Upbit",      fee: 0.25, color: "bg-blue-400",    initial: "U",  status: "active" },
  { id: "phemex",    name: "Phemex",     fee: 0.10, color: "bg-purple-600",  initial: "P",  status: "active" },
  { id: "whitebit",  name: "WhiteBit",   fee: 0.10, color: "bg-gray-600",    initial: "W",  status: "active" },
  { id: "lbank",     name: "LBank",      fee: 0.10, color: "bg-pink-600",    initial: "L",  status: "active" },
  { id: "coinex",    name: "CoinEx",     fee: 0.20, color: "bg-yellow-600",  initial: "C",  status: "active" },
  { id: "bitmart",   name: "BitMart",    fee: 0.25, color: "bg-emerald-600", initial: "B",  status: "active" },
  { id: "ascendex",  name: "AscendEX",   fee: 0.10, color: "bg-violet-600",  initial: "A",  status: "active" },
  { id: "probit",    name: "ProBit",     fee: 0.20, color: "bg-red-600",     initial: "P",  status: "active" },
  { id: "btse",      name: "BTSE",       fee: 0.10, color: "bg-sky-600",     initial: "B",  status: "active" },
  { id: "deribit",   name: "Deribit",    fee: 0.05, color: "bg-amber-600",   initial: "D",  status: "active" },
  { id: "coinw",     name: "CoinW",      fee: 0.20, color: "bg-lime-600",    initial: "C",  status: "active" },
];

export default function ExchangeSelector() {
  const { selectedExchanges, toggleExchange } = useSettingsStore();
  const [showWarning, setShowWarning] = useState(false);

  function handleToggle(id: string) {
    const succeeded = toggleExchange(id);
    if (!succeeded) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3500);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-th-primary font-mono">
          Connected Exchanges
        </h2>
        <p className="text-xs text-th-dim mt-1 font-mono">
          Select the exchanges to scan. Opportunities are only detected between
          selected exchanges. Minimum 2 required.
        </p>
      </div>

      {showWarning && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2.5 bg-th-yellow/10 border border-th-yellow/30 rounded-lg text-xs text-th-yellow font-mono">
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          At least 2 exchanges must remain selected to detect cross-exchange
          arbitrage.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {EXCHANGES.map((ex) => {
          const isSelected = selectedExchanges.includes(ex.id);
          const isComingSoon = ex.status === "coming-soon";

          return (
            <button
              key={ex.id}
              onClick={() => !isComingSoon && handleToggle(ex.id)}
              disabled={isComingSoon}
              className={clsx(
                "flex flex-col items-start gap-3 p-3.5 rounded-lg border transition-all text-left",
                isComingSoon
                  ? "opacity-50 cursor-not-allowed border-th-border bg-th-surface"
                  : isSelected
                  ? "border-th-green bg-th-green/10 shadow-[0_0_12px_rgba(63,185,80,0.08)]"
                  : "border-th-border bg-th-surface hover:border-th-border/80 hover:bg-th-hover"
              )}
            >
              {/* Icon row */}
              <div className="flex items-center justify-between w-full">
                <div
                  className={clsx(
                    "h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold font-mono",
                    ex.color
                  )}
                >
                  {ex.initial}
                </div>
                {isSelected && !isComingSoon && (
                  <div className="h-5 w-5 rounded-full bg-th-green flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Name + fee */}
              <div>
                <p className="text-sm font-semibold text-th-primary font-mono">
                  {ex.name}
                </p>
                <p className="text-xs text-th-dim font-mono mt-0.5">
                  Taker fee: {ex.fee.toFixed(2)}%
                </p>
              </div>

              {/* Status badge */}
              {isComingSoon ? (
                <Badge variant="warning">Coming Soon</Badge>
              ) : (
                <Badge variant={isSelected ? "success" : "default"}>
                  {isSelected ? "Active" : "Inactive"}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-th-dim font-mono">
        {selectedExchanges.length} of {EXCHANGES.filter((e) => e.status === "active").length}{" "}
        active exchanges selected
      </p>
    </div>
  );
}
