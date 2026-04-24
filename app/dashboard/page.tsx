"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  BarChart2Icon,
  ZapIcon,
  LayersIcon,
  SettingsIcon,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import LiveStats from "@/components/dashboard/LiveStats";
import PriceSidebar from "@/components/dashboard/PriceSidebar";
import OpportunityTable from "@/components/dashboard/OpportunityTable";

/** Tracked symbols across all exchanges */
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

interface StatsResponse {
  total: number;
  byExchange: Record<string, number>;
  bySymbol: Record<string, number>;
}

async function fetchExchangeStats(): Promise<StatsResponse | null> {
  try {
    const res = await fetch("http://localhost:3001/stats", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as StatsResponse;
  } catch {
    return null;
  }
}

function formatExchangeSubtitle(byExchange: Record<string, number>): string {
  const names = Object.keys(byExchange).map(
    (id) => id.charAt(0).toUpperCase() + id.slice(1)
  );
  if (names.length === 0) return "No exchanges connected";
  if (names.length <= 4) return names.join(" · ");
  return names.slice(0, 3).join(" · ") + ` · +${names.length - 3} more`;
}

export default function DashboardPage() {
  const [market, setMarket] = useState<"USDT" | "USDC">("USDT");
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchExchangeStats().then(setStats);
  }, []);

  const activeExchangeCount = stats ? Object.keys(stats.byExchange).length : 0;
  const exchangeSubtitle = stats
    ? formatExchangeSubtitle(stats.byExchange)
    : "Fetching exchange data…";

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-gray-100">
      {/* Top navigation bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-950 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-bold tracking-widest uppercase font-mono text-gray-100">
            Arbitrage Terminal
          </span>
          <span className="text-gray-800 select-none mx-1">|</span>
          <span className="text-xs text-gray-600 font-mono">v0.1.0</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500 font-semibold">LIVE</span>
          </div>
          <span className="text-gray-700">{now}</span>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-colors"
            title="Settings"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-mono">Settings</span>
          </Link>
        </div>
      </header>

      {/* Market toggle bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-950">
        <span className="text-xs text-gray-500 font-mono mr-2">MARKET</span>
        <button
          onClick={() => setMarket("USDT")}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            market === "USDT"
              ? "border-blue-500 text-blue-400 bg-blue-500/10"
              : "border-gray-700 text-gray-500 hover:border-gray-500"
          }`}
        >
          USDT
        </button>
        <button
          onClick={() => setMarket("USDC")}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            market === "USDC"
              ? "border-blue-500 text-blue-400 bg-blue-500/10"
              : "border-gray-700 text-gray-500 hover:border-gray-500"
          }`}
        >
          USDC
        </button>
      </div>

      {/* Body: sidebar + main content */}
      <div className="flex flex-1 min-h-0">
        {/* Collapsible price sidebar */}
        <PriceSidebar market={market} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5 min-w-0">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatsCard
              title="Active Exchanges"
              value={activeExchangeCount}
              subtitle={exchangeSubtitle}
              icon={<ActivityIcon className="h-4 w-4" />}
            />
            <StatsCard
              title="Symbols Tracked"
              value={SYMBOLS.length}
              subtitle={SYMBOLS.map((s) => s.replace("USDT", "")).join(" · ")}
              icon={<LayersIcon className="h-4 w-4" />}
            />
            {/* Dynamic stats fetched client-side */}
            <LiveStats />
          </div>

          {/* Opportunity table */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2Icon className="h-3.5 w-3.5 text-gray-600" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                Live Signals
              </h2>
              <span className="text-gray-800 text-xs font-mono">
                · polled every 2s · net spread after all fees
              </span>
            </div>
            <OpportunityTable />
          </section>

          {/* Footer note */}
          <p className="text-[10px] text-gray-800 font-mono text-right pb-2">
            All spreads shown are net of taker fees + withdrawal fees · Notional
            trade size $1,000 USDT
          </p>
        </main>
      </div>
    </div>
  );
}
