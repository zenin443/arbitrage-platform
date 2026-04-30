"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSimulators } from "@/contexts/SimulatorContext";
import { ActivityIcon } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import StatCard from "@/components/ui/StatCard";
import SignalHeatmap from "@/components/magnus/SignalHeatmap";
import StrategyPnlWaterfall from "@/components/magnus/StrategyPnlWaterfall";
import PriceSidebar from "@/components/dashboard/PriceSidebar";
import CoinDetailPanel from "@/components/dashboard/CoinDetailPanel";
import OpportunityTable from "@/components/dashboard/OpportunityTable";
import SignalInsightPanel from "@/components/dashboard/SignalInsightPanel";
import AdZone from "@/components/ui/AdZone";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { formatPercent, formatNumber } from "@/lib/formatters";
import { NormalizedGap } from "@/lib/response-transformer";

interface StatsResponse {
  total: number;
  byExchange: Record<string, number>;
  bySymbol: Record<string, number>;
}

type Opportunity = NormalizedGap;

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
  const [now, setNow] = useState('');
  const [heatmapData, setHeatmapData] = useState<Array<{ exchange: string; strategy: string; count: number; avgSpread: number }>>([]);
  const [waterfallData, setWaterfallData] = useState<Array<{ id: string; label: string; pnl: number; trades: number; color: string }>>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSignalPanel, setShowSignalPanel] = useState(false);

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    setNow(fmt());
    const t = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(t);
  }, []);

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

  // Receive opportunity data from OpportunityTable's single polling loop
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

  // Build signal heatmap data from opportunities
  useEffect(() => {
    if (opportunities.length === 0) return;
    const map = new Map<string, { count: number; spreadSum: number }>();
    for (const opp of opportunities) {
      const ex = opp.buyExchange ?? 'unknown';
      const strat = (opp.type as string) ?? 'cex_cex';
      const key = `${ex}:${strat}`;
      const prev = map.get(key) ?? { count: 0, spreadSum: 0 };
      map.set(key, { count: prev.count + 1, spreadSum: prev.spreadSum + (opp.spreadPercent ?? 0) });
    }
    const entries = Array.from(map.entries()).map(([k, v]) => {
      const [exchange, strategy] = k.split(':') as [string, string];
      return { exchange, strategy, count: v.count, avgSpread: v.count > 0 ? v.spreadSum / v.count : 0 };
    });
    setHeatmapData(entries);
  }, [opportunities]);

  // U1: read simulator bot data from shared context — no extra fetch
  const { simulators } = useSimulators();

  // Build waterfall bars: simulator bots from context + unique endpoints fetched once (U2: give up on 403)
  const failedWaterfallEndpoints = useRef(new Set<string>());
  useEffect(() => {
    const UNIQUE_BOTS = [
      { id: 'magnus-alpha',        label: 'Alpha',        ep: '/api/magnus/alpha' },
      { id: 'magnus-rate-harvest', label: 'Rate Harvest', ep: '/api/magnus/rate-harvest' },
    ];
    async function loadWaterfall() {
      // U4: skip when tab is hidden
      if (typeof document !== 'undefined' && document.hidden) return;
      const bars: typeof waterfallData = [];

      // Simulator bots: read from shared context — zero network calls
      const SIM_BOTS = [
        { id: 'magnus-beta-1k',  label: 'Beta $1K'  },
        { id: 'magnus-beta-10k', label: 'Beta $10K' },
      ];
      for (const bot of SIM_BOTS) {
        const found = simulators.find(s => s.id === bot.id);
        if (found) {
          bars.push({ id: bot.id, label: bot.label, pnl: (found.totalPnl as number) ?? 0, trades: (found.totalTrades as number) ?? 0, color: bot.id });
        }
      }

      // Unique endpoint bots: fetch once; give up on 401/403 (U2)
      for (const bot of UNIQUE_BOTS) {
        if (failedWaterfallEndpoints.current.has(bot.ep)) continue;
        try {
          const r = await fetch(bot.ep);
          if (r.status === 401 || r.status === 403) {
            failedWaterfallEndpoints.current.add(bot.ep); // U2: stop retrying
            continue;
          }
          if (!r.ok) continue;
          const data = await r.json() as { totalPnl?: number; totalTrades?: number };
          bars.push({ id: bot.id, label: bot.label, pnl: data?.totalPnl ?? 0, trades: data?.totalTrades ?? 0, color: bot.id });
        } catch { /* non-fatal */ }
      }
      if (bars.length > 0) setWaterfallData(bars);
    }
    void loadWaterfall();
    const t = setInterval(() => void loadWaterfall(), 15_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeExchangeCount = stats ? Object.keys(stats.byExchange).length : 0;
  const exchangeSubtitle = stats
    ? formatExchangeSubtitle(stats.byExchange)
    : "Fetching exchange data…";
  const countDisplay = opportunityCount === null ? "—" : formatNumber(opportunityCount);
  // bestSpread is null when loading or when all responses are free-tier (no net spread data)
  const isFreeTierOpps = opportunities.length > 0 && opportunities.every(o => o._isFreeTier);
  const spreadDisplay = bestSpread === null
    ? (isFreeTierOpps ? "Upgrade" : "—")
    : formatPercent(bestSpread, 4);

  const statCards = [
    {
      label: "Active Exchanges",
      value: activeExchangeCount || "—",
      subtitle: exchangeSubtitle,
      glow: "bg-[#3FB950]/5",
      glowBorder: activeExchangeCount > 0 ? "hover:border-[#3FB950]/40" : "",
      pulse: false,
      pulseColor: "#3FB950",
      valueColor: "text-[#E6EDF3]",
    },
    {
      label: "Symbols Tracked",
      value: activeExchangeCount > 0 ? activeExchangeCount * 7 : 128,
      subtitle: `${activeExchangeCount > 0 ? activeExchangeCount : 18} exchanges · 15 signal sources`,
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

      {/* ── Top navigation bar ── */}
      <AppHeader
        activePage="/dashboard"
        connectionStatus={connectionStatus}
        statusSlot={now ? <span className="text-[#484F58] text-[11px] font-mono mr-2">{now}</span> : null}
      />

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
              onSelectSignal={(signal) => setSelectedSignal(signal as unknown as Opportunity)}
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
              <StatCard
                key={card.label}
                label={card.label}
                value={String(card.value)}
                sub={card.subtitle}
                valueColor={card.valueColor}
                glow={card.glow}
                glowBorder={card.glowBorder}
                pulse={card.pulse}
                pulseColor={card.pulseColor}
                className="p-2.5"
              />
            ))}
          </div>

          {/* Horizontal ad zone — between stat cards and opportunity table */}
          <AdZone zone="horizontal" className="shrink-0" />

          {/* Magnus Signal Heatmap + PnL Waterfall (collapsible) */}
          <div className="shrink-0 border border-[#21262D] rounded-lg overflow-hidden">
            <button
              onClick={() => setShowHeatmap(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#161B22] hover:bg-[#1C2128] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[#8B949E]">⚡ Magnus Signal Heatmap</span>
                {heatmapData.length > 0 && (
                  <span className="text-[10px] text-[#3FB950] font-mono">
                    {heatmapData.reduce((s, d) => s + d.count, 0)} active signals
                  </span>
                )}
              </div>
              <span className="text-[#484F58] text-[11px]">{showHeatmap ? '▲ collapse' : '▼ expand'}</span>
            </button>
            {showHeatmap && (
              <div className="p-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <p className="text-[10px] text-[#484F58] mb-2">Exchange × Strategy signal density</p>
                  <SignalHeatmap data={heatmapData} />
                </div>
                <div>
                  <p className="text-[10px] text-[#484F58] mb-2">Strategy PnL waterfall (paper)</p>
                  <StrategyPnlWaterfall bars={waterfallData} />
                </div>
              </div>
            )}
          </div>

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
              <OpportunityTable
                onSelectSignal={(signal) => { setSelectedSignal(signal); setShowSignalPanel(true); }}
                selectedSignalId={selectedSignal ? selectedSignal.id : null}
                onDataUpdate={handleOpportunityData}
              />
            </ErrorBoundary>
          </div>

          {/* Footer note */}
          <p className="text-[11px] text-[#484F58] font-sans text-right shrink-0 pb-1 hidden lg:block">
            All spreads shown are net of taker fees + withdrawal fees · Notional trade size $1,000 USDT
          </p>
        </div>

        {/* Right: Signal insight panel — visible on lg+, toggleable overlay on mobile */}
        <div className="hidden lg:block">
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

        {/* Mobile signal panel overlay */}
        {showSignalPanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowSignalPanel(false)} />
            <div className="ml-auto relative z-10 w-[300px] max-w-[85vw] h-full">
              <ErrorBoundary name="Signal insight mobile">
                <SignalInsightPanel
                  signal={selectedSignal}
                  onClose={() => { setSelectedSignal(null); setShowSignalPanel(false); }}
                  totalSignals={opportunities.length}
                  bestSpread={opportunities.length > 0 ? Math.max(...opportunities.map((g) => g.spreadPercent ?? 0)).toFixed(3) : '0'}
                  topCoin={opportunities.length > 0 ? (opportunities[0].symbol?.split('/')[0] ?? '—') : '—'}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

      </div>

      {/* Mobile signal toggle FAB — shown below lg when a signal is selected */}
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
