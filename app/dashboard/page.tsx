"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityIcon } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import StatCard from "@/components/ui/StatCard";
import PriceSidebar from "@/components/dashboard/PriceSidebar";
import CoinDetailPanel from "@/components/dashboard/CoinDetailPanel";
import OpportunityTable from "@/components/dashboard/OpportunityTable";
import SignalInsightPanel from "@/components/dashboard/SignalInsightPanel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { formatPercent, formatNumber } from "@/lib/formatters";
import { NormalizedGap } from "@/lib/response-transformer";
import { useSettingsStore } from "@/store/useSettingsStore";

interface HealthSummary {
  exchanges: number;
  symbols: number;
}

type Opportunity = NormalizedGap;

async function fetchHealthSummary(): Promise<HealthSummary | null> {
  try {
    const res = await fetch("/api/health-summary", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthSummary;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Opportunity | null>(null);
  const [selectedSignalIsGhost, setSelectedSignalIsGhost] = useState(false);
  const [selectedSignalClosedAt, setSelectedSignalClosedAt] = useState<number | undefined>();
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunityCount, setOpportunityCount] = useState<number | null>(null);
  const [bestSpread, setBestSpread] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [now, setNow] = useState('');
  const [showSignalPanel, setShowSignalPanel] = useState(false);
  const tradeSize = useSettingsStore(s => s.tradeSize);

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    setNow(fmt());
    const t = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/profitable-gaps')
      .then(r => {
        if (r.ok) setConnectionStatus('connected');
        else setConnectionStatus('error');
      })
      .catch(() => setConnectionStatus('error'));
  }, []);

  useEffect(() => {
    fetchHealthSummary().then(setHealth);
  }, []);

  const handleOpportunityData = useCallback((opps: Opportunity[]) => {
    setOpportunities(opps);
    setOpportunityCount(opps.length);
    const allFreeTier = opps.length > 0 && opps.every(o => o._isFreeTier);
    setBestSpread(
      opps.length === 0 || allFreeTier
        ? null
        : Math.max(...opps.map(o => o.netSpread))
    );
  }, []);

  // Auto-clear signal pane when the selected gap disappears from the feed
  // Skip if the signal is already a ghost (user clicked the ghost row intentionally)
  useEffect(() => {
    if (selectedSignal && !selectedSignalIsGhost && opportunities.length > 0) {
      const stillExists = opportunities.some(o => o.id === selectedSignal.id);
      if (!stillExists) {
        setSelectedSignal(null);
        setShowSignalPanel(false);
        setSelectedSignalIsGhost(false);
        setSelectedSignalClosedAt(undefined);
      }
    }
  }, [opportunities, selectedSignal, selectedSignalIsGhost]);

  // Unique base coins that currently have at least one active signal
  const signalCoins = [...new Set(
    opportunities
      .map(g => g.symbol?.split("/")[0])
      .filter((s): s is string => Boolean(s))
  )];

  const exchangeCount = health?.exchanges ?? 0;
  const symbolCount = health?.symbols ?? 0;
  const countDisplay = opportunityCount === null ? "—" : formatNumber(opportunityCount);
  const isFreeTierOpps = opportunities.length > 0 && opportunities.every(o => o._isFreeTier);
  const spreadDisplay = bestSpread === null
    ? (isFreeTierOpps ? "Upgrade" : "—")
    : formatPercent(bestSpread, 4);

  const statCards = [
    {
      label: "Active Exchanges",
      value: exchangeCount || "—",
      subtitle: exchangeCount > 0 ? `${exchangeCount} exchanges connected` : "Fetching…",
      glow: "bg-[#3FB950]/5",
      glowBorder: exchangeCount > 0 ? "hover:border-[#3FB950]/40" : "",
      pulse: false,
      pulseColor: "#3FB950",
      valueColor: "text-[#E6EDF3]",
    },
    {
      label: "Symbols Tracked",
      value: symbolCount || "—",
      subtitle: symbolCount > 0 ? `across ${exchangeCount} exchanges` : "Fetching…",
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
      glow: opportunityCount !== null && opportunityCount > 0 ? "bg-[#3FB950]/5" : "bg-transparent",
      glowBorder: opportunityCount !== null && opportunityCount > 0 ? "hover:border-[#3FB950]/40" : "",
      pulse: opportunityCount !== null && opportunityCount > 0,
      pulseColor: "#3FB950",
      valueColor: opportunityCount !== null && opportunityCount > 0 ? "text-[#3FB950]" : "text-[#E6EDF3]",
    },
    {
      label: "Best Net Spread",
      value: spreadDisplay,
      subtitle: isFreeTierOpps
        ? "unavailable on free plan"
        : bestSpread !== null
        ? "highest net spread"
        : "No spread detected",
      glow: bestSpread !== null ? "bg-[#388BFD]/5" : "bg-transparent",
      glowBorder: bestSpread !== null ? "hover:border-[#388BFD]/40" : "",
      pulse: bestSpread !== null,
      pulseColor: "#388BFD",
      valueColor: isFreeTierOpps
        ? "text-[#D29922]"
        : bestSpread !== null
        ? "text-[#388BFD]"
        : "text-[#E6EDF3]",
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0D1117] text-[#E6EDF3] pb-14 lg:pb-0">

      <AppHeader
        activePage="/dashboard"
        connectionStatus={connectionStatus}
        statusSlot={now ? <span className="text-[#484F58] text-[11px] font-mono mr-2">{now}</span> : null}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">

        <ErrorBoundary name="Watchlist">
          <PriceSidebar onSelectCoin={setSelectedCoin} selectedCoin={selectedCoin} />
        </ErrorBoundary>

        <div className="hidden lg:block">
          <ErrorBoundary name="Coin detail">
            <CoinDetailPanel
              symbol={selectedCoin}
              onSelectSignal={(signal) => setSelectedSignal(signal as unknown as Opportunity)}
              signalCoins={signalCoins}
            />
          </ErrorBoundary>
        </div>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-3 gap-2">

          <div className="flex justify-between items-center shrink-0">
            <span className="text-[11px] text-[#8B949E] font-sans">
              Live signals · polled every 2s · net spread after all fees
            </span>
            <span className="text-[11px] text-[#484F58] font-sans hidden lg:block">
              click any row to open signal panel
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <ErrorBoundary name="Opportunities">
              <OpportunityTable
                onSelectSignal={(signal) => {
                  setSelectedSignal(signal as Opportunity);
                  setShowSignalPanel(true);
                  if (signal?.symbol) setSelectedCoin(signal.symbol);
                  const isGhost = !!(signal as any).closedAt;
                  setSelectedSignalIsGhost(isGhost);
                  setSelectedSignalClosedAt((signal as any).closedAt);
                }}
                selectedSignalId={selectedSignal ? selectedSignal.id : null}
                onDataUpdate={handleOpportunityData}
              />
            </ErrorBoundary>
          </div>

          <p className="text-[11px] text-[#484F58] font-sans text-right shrink-0 pb-1 hidden lg:block">
            All spreads shown are net of taker fees + withdrawal fees · Notional trade size ${tradeSize.toLocaleString()} USDT
          </p>
        </div>

        <div className="hidden lg:block">
          <ErrorBoundary name="Signal insight">
            <SignalInsightPanel
              signal={selectedSignal}
              onClose={() => {
                setSelectedSignal(null);
                setSelectedCoin(null);
                setSelectedSignalIsGhost(false);
                setSelectedSignalClosedAt(undefined);
              }}
              isGhost={selectedSignalIsGhost}
              ghostClosedAt={selectedSignalClosedAt}
            />
          </ErrorBoundary>
        </div>

        {showSignalPanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowSignalPanel(false)} />
            <div className="ml-auto relative z-10 w-[300px] max-w-[85vw] h-full">
              <ErrorBoundary name="Signal insight mobile">
                <SignalInsightPanel
                  signal={selectedSignal}
                  onClose={() => {
                    setSelectedSignal(null);
                    setShowSignalPanel(false);
                    setSelectedSignalIsGhost(false);
                    setSelectedSignalClosedAt(undefined);
                  }}
                  isGhost={selectedSignalIsGhost}
                  ghostClosedAt={selectedSignalClosedAt}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

      </div>

      {selectedSignal && !showSignalPanel && (
        <button
          onClick={() => setShowSignalPanel(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 bg-[#388BFD] text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-[#388BFD]/20 active:scale-95 transition-transform"
          title="View signal"
        >
          <ActivityIcon className="h-5 w-5" />
        </button>
      )}

      <MobileNav activePage="/dashboard" />
    </div>
  );
}
