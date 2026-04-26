"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  LayersIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react";
import PriceSidebar from "@/components/dashboard/PriceSidebar";
import CoinDetailPanel from "@/components/dashboard/CoinDetailPanel";
import OpportunityTable from "@/components/dashboard/OpportunityTable";
import SignalInsightPanel from "@/components/dashboard/SignalInsightPanel";
import AdZone from "@/components/ui/AdZone";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPercent, formatNumber } from "@/lib/formatters";

interface StatsResponse {
  total: number;
  byExchange: Record<string, number>;
  bySymbol: Record<string, number>;
}

interface Opportunity {
  id?: string;
  type: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  netSpread?: number;
  buyPrice: number;
  sellPrice: number;
  maxTradeableUsd: number;
  detectedAt: number;
  durationMs: number;
}

async function fetchExchangeStats(): Promise<StatsResponse | null> {
  try {
    const res = await fetch("http://localhost:3001/stats", { cache: "no-store" });
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
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Opportunity | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunityCount, setOpportunityCount] = useState<number | null>(null);
  const [bestSpread, setBestSpread] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Check backend connectivity once
  useEffect(() => {
    fetch('/api/profitable-gaps')
      .then(r => {
        if (r.ok) setConnectionStatus('connected')
        else setConnectionStatus('error')
      })
      .catch(() => setConnectionStatus('error'))
  }, []);

  // Fetch exchange stats once
  useEffect(() => {
    fetchExchangeStats().then(setStats);
  }, []);

  // Poll opportunities every 2s
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/opportunities");
        const json = await res.json();
        const opps = Array.isArray(json)
          ? json
          : (json.opportunities ?? json.data ?? []);
        if (!active) return;
        setOpportunities(opps);
        setOpportunityCount(opps.length);
        setBestSpread(
          opps.length > 0 ? Math.max(...opps.map((o: { netSpread?: number }) => o.netSpread ?? 0)) : null
        );
      } catch {
        // keep previous values
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Auto-select best signal when opportunities first load and nothing is selected
  useEffect(() => {
    if (!selectedSignal && opportunities.length > 0) {
      const best = opportunities.reduce((acc: Opportunity | null, current: Opportunity) => {
        if (!current || !current.spreadPercent || !current.symbol) return acc;
        return (!acc || current.spreadPercent > acc.spreadPercent) ? current : acc;
      }, null);
      if (best && best.spreadPercent > 0 && best.symbol) {
        setSelectedSignal(best);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunities]); // intentionally excludes selectedSignal to avoid re-selecting after user closes

  const activeExchangeCount = stats ? Object.keys(stats.byExchange).length : 0;
  const exchangeSubtitle = stats
    ? formatExchangeSubtitle(stats.byExchange)
    : "Fetching exchange data…";
  const countDisplay = opportunityCount === null ? "—" : formatNumber(opportunityCount);
  const spreadDisplay = bestSpread === null ? "—" : formatPercent(bestSpread, 4);

  const statCards = [
    {
      label: "Active Exchanges",
      value: activeExchangeCount || "—",
      subtitle: exchangeSubtitle,
      icon: <ActivityIcon className="h-3.5 w-3.5" />,
      glow: "bg-[#3FB950]/5",
      glowBorder: activeExchangeCount > 0 ? "hover:border-[#3FB950]/40" : "",
      pulse: false,
      pulseColor: "#3FB950",
      valueColor: "text-[#E6EDF3]",
    },
    {
      label: "Symbols Tracked",
      value: 90,
      subtitle: "across 4 tiers",
      icon: <LayersIcon className="h-3.5 w-3.5" />,
      glow: "bg-transparent",
      glowBorder: "",
      pulse: false,
      pulseColor: "#3FB950",
      valueColor: "text-[#E6EDF3]",
    },
    {
      label: "Opportunities",
      value: countDisplay,
      subtitle:
        opportunityCount === null
          ? "loading…"
          : opportunityCount === 1
          ? "active signal"
          : "active signals",
      icon: null,
      glow: opportunityCount !== null && opportunityCount > 0 ? "bg-[#3FB950]/5" : "bg-transparent",
      glowBorder: opportunityCount !== null && opportunityCount > 0 ? "hover:border-[#3FB950]/40" : "",
      pulse: opportunityCount !== null && opportunityCount > 0,
      pulseColor: "#3FB950",
      valueColor: opportunityCount !== null && opportunityCount > 0 ? "text-[#3FB950]" : "text-[#E6EDF3]",
    },
    {
      label: "Best Net Spread",
      value: spreadDisplay,
      subtitle: bestSpread !== null ? "highest net spread" : "No spread detected",
      icon: null,
      glow: bestSpread !== null ? "bg-[#388BFD]/5" : "bg-transparent",
      glowBorder: bestSpread !== null ? "hover:border-[#388BFD]/40" : "",
      pulse: bestSpread !== null,
      pulseColor: "#388BFD",
      valueColor: bestSpread !== null ? "text-[#388BFD]" : "text-[#E6EDF3]",
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0D1117] text-[#E6EDF3]">

      {/* ── Top navigation bar ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#161B22] border-b border-[#21262D] shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-[14px] font-medium font-sans text-[#388BFD]">
            Arbitrage Terminal
          </span>
          <span className="text-[#484F58] select-none mx-1">|</span>
          <span className="text-[12px] text-[#484F58] font-mono">v0.6.5</span>
        </div>
        <div className="flex items-center gap-1 text-xs overflow-x-auto">
          <div className="flex items-center gap-1 mr-1">
            <span className="animate-pulse bg-[#3FB950] rounded-full w-1.5 h-1.5" />
            <span className="text-[#3FB950] font-mono text-[11px]">LIVE</span>
          </div>
          {connectionStatus === 'connecting' && (
            <span className="text-[#D29922] font-mono text-[11px] mr-1">Connecting…</span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-[#F85149] font-mono text-[11px] mr-1">Backend unavailable</span>
          )}
          <span className="text-[#484F58] text-[11px] font-mono mr-1">{now}</span>
          <Link
            href="/intelligence"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[12px] font-sans">Intelligence</span>
          </Link>
          <Link
            href="/magnus"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[12px] font-sans">Magnus</span>
          </Link>
          <Link
            href="/dex"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[12px] font-sans">DEX Markets</span>
          </Link>
          <Link
            href="/funding-rates"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[12px] font-sans">Funding Rates</span>
          </Link>
          <Link
            href="/alerts"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[12px] font-sans">Alerts</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#388BFD]/10 border border-[#388BFD]/40 text-[#388BFD] text-[12px] font-sans whitespace-nowrap"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
            title="Settings"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="text-[12px] font-sans">Settings</span>
          </Link>
        </div>
      </header>

      {/* ── 4-pane body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Coin sidebar (hidden on mobile) */}
        <ErrorBoundary name="Watchlist">
          <PriceSidebar onSelectCoin={setSelectedCoin} selectedCoin={selectedCoin} />
        </ErrorBoundary>

        {/* Middle-left: Coin detail panel — always visible */}
        <div className="hidden lg:block">
          <ErrorBoundary name="Coin detail">
            <CoinDetailPanel
              symbol={selectedCoin}
              onSelectSignal={setSelectedSignal}
            />
          </ErrorBoundary>
        </div>

        {/* Center: Stats + signals area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-3 gap-2">

          {/* Ad zone (pill) — rotates exchange referral ads */}
          <div className="shrink-0">
            <AdZone zone="pill" />
            <div className="flex justify-center mt-1">
              <a
                href="/intelligence"
                className="text-[11px] text-[#388BFD]/60 hover:text-[#388BFD] transition-colors font-sans"
              >
                📊 Full Intelligence Dashboard — 90 coins · 18 exchanges · live scoring →
              </a>
            </div>
          </div>

          {/* Gradient stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`relative bg-gradient-to-br from-[#161B22] to-[#0D1117] border border-[#21262D] rounded-lg p-2.5 overflow-hidden transition-colors ${card.glowBorder}`}
              >
                {/* Glow orb */}
                <div
                  className={`absolute top-0 right-0 w-12 h-12 rounded-full blur-xl pointer-events-none ${card.glow}`}
                />

                {/* Pulse dot */}
                {card.pulse && (
                  <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                      style={{ backgroundColor: card.pulseColor }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-1.5 w-1.5"
                      style={{ backgroundColor: card.pulseColor }}
                    />
                  </span>
                )}

                <div className="flex items-start justify-between mb-0.5">
                  <span className="text-[11px] font-sans text-[#8B949E]">
                    {card.label}
                  </span>
                  {card.icon && (
                    <span className="text-[#484F58]">{card.icon}</span>
                  )}
                </div>
                <div className={`text-[20px] font-mono font-medium tabular-nums mt-0.5 ${card.valueColor}`}>
                  {card.value}
                </div>
                <div className="text-[11px] text-[#484F58] font-sans truncate mt-0.5">
                  {card.subtitle}
                </div>
              </div>
            ))}
          </div>

          {/* Horizontal ad zone — between stat cards and opportunity table */}
          <AdZone zone="horizontal" className="shrink-0" />

          {/* Live signals label */}
          <div className="flex justify-between items-center shrink-0">
            <span className="text-[11px] text-[#8B949E] font-sans">
              Live signals · polled every 2s · net spread after all fees
            </span>
            <span className="text-[11px] text-[#484F58] font-sans hidden lg:block">
              click any row to open signal panel →
            </span>
          </div>

          {/* Opportunity table — fills remaining height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ErrorBoundary name="Opportunities">
              {opportunities.length === 0 && opportunityCount !== null ? (
                <EmptyState
                  title="No active signals"
                  subtitle="Signals appear when arbitrage gaps are detected"
                />
              ) : (
                <OpportunityTable
                  onSelectSignal={setSelectedSignal}
                  selectedSignalId={
                    selectedSignal
                      ? (selectedSignal.id ?? `${selectedSignal.symbol}:${selectedSignal.buyExchange}:${selectedSignal.sellExchange}`)
                      : null
                  }
                />
              )}
            </ErrorBoundary>
          </div>

          {/* Footer note */}
          <p className="text-[11px] text-[#484F58] font-sans text-right shrink-0 pb-1 hidden lg:block">
            All spreads shown are net of taker fees + withdrawal fees · Notional trade size $1,000 USDT
          </p>
        </div>

        {/* Right: Signal insight panel — always visible */}
        <ErrorBoundary name="Signal insight">
          <SignalInsightPanel
            signal={selectedSignal}
            onClose={() => setSelectedSignal(null)}
            totalSignals={opportunities.length}
            bestSpread={opportunities.length > 0 ? Math.max(...opportunities.map((g) => g.spreadPercent ?? 0)).toFixed(3) : '0'}
            topCoin={opportunities.length > 0 ? (opportunities[0].symbol?.split('/')[0] ?? '—') : '—'}
          />
        </ErrorBoundary>

      </div>
    </div>
  );
}
