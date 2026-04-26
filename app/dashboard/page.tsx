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
    <div className="flex flex-col h-screen overflow-hidden bg-[#0D1117] text-[#E6EDF3]">
      {/* Top navigation bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#161B22] border-b border-[#21262D] shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-sm font-bold tracking-widest uppercase font-mono text-[#388BFD]">
            Arbitrage Terminal
          </span>
          <span className="text-[#484F58] select-none mx-1">|</span>
          <span className="text-xs text-[#484F58] font-mono">v0.5.4</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto">
          <div className="flex items-center gap-1 mr-1">
            <span className="animate-pulse bg-[#3FB950] rounded-full w-1.5 h-1.5" />
            <span className="text-[#3FB950] font-mono">LIVE</span>
          </div>
          <span className="text-[#484F58] text-[10px] font-mono mr-1">{now}</span>
          <Link
            href="/intelligence"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Intelligence</span>
          </Link>
          <Link
            href="/magnus"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Magnus</span>
          </Link>
          <Link
            href="/dex"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">DEX Markets</span>
          </Link>
          <Link
            href="/funding-rates"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Funding Rates</span>
          </Link>
          <Link
            href="/alerts"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Alerts</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#388BFD]/10 border border-[#388BFD]/40 text-[#388BFD] text-[10px] font-mono whitespace-nowrap"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
            title="Settings"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono">Settings</span>
          </Link>
        </div>
      </header>

      {/* Intelligence redirect banner */}
      <div className="bg-[#388BFD]/10 border border-[#388BFD]/30 rounded p-3 mx-4 mt-3 text-center">
        <span className="text-[#388BFD] text-[12px]">
          📊 For the full arbitrage intelligence experience with all 90 coins and 25 exchanges,
          visit the <a href="/intelligence" className="underline font-bold">Intelligence Dashboard →</a>
        </span>
      </div>

      {/* Market toggle bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#21262D] bg-[#0D1117]">
        <span className="text-xs text-[#484F58] font-mono mr-2">MARKET</span>
        <button
          onClick={() => setMarket("USDT")}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            market === "USDT"
              ? "bg-[#388BFD]/20 text-[#388BFD] border-[#388BFD]"
              : "text-[#484F58] border-[#21262D]"
          }`}
        >
          USDT
        </button>
        <button
          onClick={() => setMarket("USDC")}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            market === "USDC"
              ? "bg-[#388BFD]/20 text-[#388BFD] border-[#388BFD]"
              : "text-[#484F58] border-[#21262D]"
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
        <main className="flex-1 overflow-y-auto p-3 space-y-3 min-w-0">
          <div className="max-w-[1600px] mx-auto space-y-3">
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
              value={90}
              subtitle="across 4 tiers"
              icon={<LayersIcon className="h-4 w-4" />}
            />
            {/* Dynamic stats fetched client-side */}
            <LiveStats />
          </div>

          {/* Opportunity table */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2Icon className="h-3.5 w-3.5 text-[#484F58]" />
              <h2 className="text-xs font-semibold text-[#388BFD] uppercase tracking-wider font-mono">
                Live Signals
              </h2>
              <span className="text-[#484F58] text-xs font-mono">
                · polled every 2s · net spread after all fees
              </span>
            </div>
            <OpportunityTable />
          </section>

          {/* Footer note */}
          <p className="text-[10px] text-[#484F58] font-mono text-right pb-2">
            All spreads shown are net of taker fees + withdrawal fees · Notional
            trade size $1,000 USDT
          </p>
          </div>
        </main>
      </div>
    </div>
  );
}
