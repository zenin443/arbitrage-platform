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
  { id: "binance", name: "Binance",  fee: 0.10, color: "bg-yellow-500",  initial: "B", status: "active" },
  { id: "bybit",   name: "Bybit",    fee: 0.10, color: "bg-orange-500",  initial: "B", status: "active" },
  { id: "okx",     name: "OKX",      fee: 0.08, color: "bg-blue-500",    initial: "O", status: "active" },
  { id: "kucoin",  name: "KuCoin",   fee: 0.10, color: "bg-green-500",   initial: "K", status: "active" },
  { id: "gateio",  name: "Gate.io",  fee: 0.20, color: "bg-purple-500",  initial: "G", status: "active" },
  { id: "mexc",    name: "MEXC",     fee: 0.00, color: "bg-teal-500",    initial: "M", status: "active" },
  { id: "huobi",   name: "Huobi",    fee: 0.20, color: "bg-red-500",     initial: "H", status: "coming-soon" },
  { id: "kraken",  name: "Kraken",   fee: 0.26, color: "bg-indigo-500",  initial: "K", status: "coming-soon" },
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
        <h2 className="text-sm font-semibold text-gray-200 font-mono">
          Connected Exchanges
        </h2>
        <p className="text-xs text-gray-600 mt-1 font-mono">
          Select the exchanges to scan. Opportunities are only detected between
          selected exchanges. Minimum 2 required.
        </p>
      </div>

      {showWarning && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2.5 bg-yellow-900/20 border border-yellow-800/50 rounded-lg text-xs text-yellow-400 font-mono">
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
                  ? "opacity-50 cursor-not-allowed border-gray-800 bg-gray-900"
                  : isSelected
                  ? "border-green-600 bg-green-950/30 shadow-[0_0_12px_rgba(34,197,94,0.08)]"
                  : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-900/80"
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
                  <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Name + fee */}
              <div>
                <p className="text-sm font-semibold text-gray-200 font-mono">
                  {ex.name}
                </p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">
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

      <p className="mt-5 text-xs text-gray-700 font-mono">
        {selectedExchanges.length} of {EXCHANGES.filter((e) => e.status === "active").length}{" "}
        active exchanges selected
      </p>
    </div>
  );
}
