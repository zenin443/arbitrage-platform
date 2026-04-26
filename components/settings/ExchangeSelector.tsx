"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { AlertTriangleIcon, CheckIcon } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import Badge from "@/components/ui/Badge";

type Tier = 1 | 2 | 3;

type Exchange = {
  id: string;
  name: string;
  fee: number;
  color: string;
  initial: string;
  tier: Tier;
  status: "active" | "coming-soon" | "disabled";
};

const EXCHANGES: Exchange[] = [
  // Tier 1 — WebSocket real-time feeds
  { id: "binance",   name: "Binance",    fee: 0.10,  color: "bg-yellow-500",  initial: "B", tier: 1, status: "active" },
  { id: "bybit",     name: "Bybit",      fee: 0.10,  color: "bg-orange-500",  initial: "B", tier: 1, status: "active" },
  { id: "okx",       name: "OKX",        fee: 0.08,  color: "bg-blue-500",    initial: "O", tier: 1, status: "active" },
  { id: "kucoin",    name: "KuCoin",     fee: 0.10,  color: "bg-green-500",   initial: "K", tier: 1, status: "active" },
  { id: "bitfinex",  name: "Bitfinex",   fee: 0.20,  color: "bg-green-700",   initial: "B", tier: 1, status: "active" },
  // Tier 2 — CCXT REST (5s polling)
  { id: "gateio",    name: "Gate.io",    fee: 0.10,  color: "bg-purple-500",  initial: "G", tier: 2, status: "active" },
  { id: "mexc",      name: "MEXC",       fee: 0.10,  color: "bg-teal-500",    initial: "M", tier: 2, status: "active" },
  { id: "bitget",    name: "Bitget",     fee: 0.10,  color: "bg-cyan-500",    initial: "B", tier: 2, status: "active" },
  { id: "htx",       name: "HTX",        fee: 0.20,  color: "bg-red-500",     initial: "H", tier: 2, status: "active" },
  { id: "bingx",     name: "BingX",      fee: 0.10,  color: "bg-blue-400",    initial: "B", tier: 2, status: "active" },
  { id: "kraken",    name: "Kraken",     fee: 0.16,  color: "bg-indigo-500",  initial: "K", tier: 2, status: "active" },
  { id: "coinbase",  name: "Coinbase",   fee: 0.40,  color: "bg-blue-600",    initial: "C", tier: 2, status: "active" },
  // Tier 3 — Direct REST (5–10s polling) — 8 active, 7 disabled (bad data)
  { id: "cryptocom", name: "Crypto.com", fee: 0.075, color: "bg-blue-800",    initial: "C", tier: 3, status: "active" },
  { id: "bitstamp",  name: "Bitstamp",   fee: 0.50,  color: "bg-orange-600",  initial: "B", tier: 3, status: "disabled" },
  { id: "upbit",     name: "Upbit",      fee: 0.25,  color: "bg-blue-400",    initial: "U", tier: 3, status: "active" },
  { id: "phemex",    name: "Phemex",     fee: 0.10,  color: "bg-purple-600",  initial: "P", tier: 3, status: "active" },
  { id: "whitebit",  name: "WhiteBit",   fee: 0.10,  color: "bg-gray-600",    initial: "W", tier: 3, status: "active" },
  { id: "lbank",     name: "LBank",      fee: 0.10,  color: "bg-pink-600",    initial: "L", tier: 3, status: "disabled" },
  { id: "coinex",    name: "CoinEx",     fee: 0.20,  color: "bg-yellow-600",  initial: "C", tier: 3, status: "active" },
  { id: "bitmart",   name: "BitMart",    fee: 0.25,  color: "bg-emerald-600", initial: "B", tier: 3, status: "active" },
  { id: "ascendex",  name: "AscendEX",   fee: 0.10,  color: "bg-violet-600",  initial: "A", tier: 3, status: "disabled" },
  { id: "probit",    name: "ProBit",     fee: 0.20,  color: "bg-red-600",     initial: "P", tier: 3, status: "disabled" },
  { id: "btse",      name: "BTSE",       fee: 0.10,  color: "bg-sky-600",     initial: "B", tier: 3, status: "disabled" },
  { id: "deribit",   name: "Deribit",    fee: 0.05,  color: "bg-amber-600",   initial: "D", tier: 3, status: "disabled" },
  { id: "coinw",     name: "CoinW",      fee: 0.20,  color: "bg-lime-600",    initial: "C", tier: 3, status: "disabled" },
];

const TIER_LABELS: Record<Tier, { label: string; sub: string; badge: string }> = {
  1: { label: "Tier 1", sub: "WebSocket · real-time",       badge: "bg-[#3FB950]/15 text-[#3FB950] border-[#3FB950]/30" },
  2: { label: "Tier 2", sub: "CCXT REST · 5s polling",      badge: "bg-[#388BFD]/15 text-[#388BFD] border-[#388BFD]/30" },
  3: { label: "Tier 3", sub: "Direct REST · 5–10s polling", badge: "bg-[#8B949E]/15 text-[#8B949E] border-[#8B949E]/30" },
};

const TIERS: Tier[] = [1, 2, 3];

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

  const activeTotal = selectedExchanges.length;
  const totalActive = EXCHANGES.filter((e) => e.status === "active").length;
  const totalDisabled = EXCHANGES.filter((e) => e.status === "disabled").length;

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

      <div className="space-y-6">
        {TIERS.map((tier) => {
          const tierMeta = TIER_LABELS[tier];
          const tierExchanges = EXCHANGES.filter((e) => e.tier === tier);
          const tierSelected = tierExchanges.filter((e) => selectedExchanges.includes(e.id)).length;

          return (
            <div key={tier}>
              {/* Tier header */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={clsx(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded border",
                    tierMeta.badge
                  )}
                >
                  {tierMeta.label}
                </span>
                <span className="text-[11px] text-th-dim font-mono">{tierMeta.sub}</span>
                <span className="text-[10px] text-th-dim font-mono ml-auto">
                  {tierSelected}/{tierExchanges.length} active
                </span>
              </div>

              {/* Exchange grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {tierExchanges.map((ex) => {
                  const isSelected = selectedExchanges.includes(ex.id);
                  const isComingSoon = ex.status === "coming-soon";
                  const isDisabled = ex.status === "disabled";
                  const isBlocked = isComingSoon || isDisabled;

                  return (
                    <button
                      key={ex.id}
                      onClick={() => !isBlocked && handleToggle(ex.id)}
                      disabled={isBlocked}
                      className={clsx(
                        "flex flex-col items-start gap-2.5 p-3 rounded-lg border transition-all text-left",
                        isDisabled
                          ? "opacity-40 cursor-not-allowed border-th-border bg-th-surface"
                          : isComingSoon
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
                            "h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold font-mono",
                            isDisabled ? "bg-[#30363D]" : ex.color
                          )}
                        >
                          {ex.initial}
                        </div>
                        {isSelected && !isBlocked && (
                          <div className="h-4 w-4 rounded-full bg-th-green flex items-center justify-center">
                            <CheckIcon className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Name + fee */}
                      <div>
                        <p className="text-xs font-semibold text-th-primary font-mono leading-tight">
                          {ex.name}
                        </p>
                        <p className="text-[10px] text-th-dim font-mono mt-0.5">
                          {ex.fee.toFixed(ex.fee < 0.1 && ex.fee !== 0 ? 3 : 2)}%
                        </p>
                      </div>

                      {/* Status badge */}
                      {isDisabled ? (
                        <Badge variant="danger">Data Quality</Badge>
                      ) : isComingSoon ? (
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
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-th-dim font-mono">
        {activeTotal} of {totalActive} exchanges active
        <span className="ml-2 text-[#6E7681]">· {totalDisabled} disabled (bad data)</span>
      </p>
    </div>
  );
}
