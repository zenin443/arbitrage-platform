"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ZapIcon, BellIcon, SettingsIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Alert {
  id: string;
  type: "cex_cex" | "spot_futures" | "dex_cex" | "new_listing";
  symbol: string;
  spreadPercent: number;
  direction: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  netProfit: number | null;
  confidence: string | null;
  createdAt: number;
  expiresAt: number | null;
}

interface AlertStats {
  totalToday: number;
  totalAllTime: number;
  lastAlertTime: number | null;
  isRunning: boolean;
}

interface AlertConfig {
  minSpreadPercent: number;
  alertFrequency: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtPrice(price: number): string {
  if (price <= 0) return "—";
  if (price >= 1000)
    return (
      "$" +
      price.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  if (price >= 1) return "$" + price.toFixed(2);
  return "$" + price.toFixed(6);
}

function shortEx(name: string): string {
  return name.slice(0, 3).toUpperCase();
}

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_META: Record<
  Alert["type"],
  { label: string; badge: string; pill: string }
> = {
  cex_cex: {
    label: "CEX",
    badge: "bg-[#388BFD]/15 text-[#388BFD]",
    pill: "bg-[#388BFD]/20 text-[#388BFD] border-[#388BFD]",
  },
  spot_futures: {
    label: "S-F",
    badge: "bg-[#A371F7]/15 text-[#A371F7]",
    pill: "bg-[#A371F7]/20 text-[#A371F7] border-[#A371F7]",
  },
  dex_cex: {
    label: "DEX",
    badge: "bg-[#3FB950]/15 text-[#3FB950]",
    pill: "bg-[#3FB950]/20 text-[#3FB950] border-[#3FB950]",
  },
  new_listing: {
    label: "NEW",
    badge: "bg-[#D29922]/15 text-[#D29922]",
    pill: "bg-[#D29922]/20 text-[#D29922] border-[#D29922]",
  },
};

type FilterType = "all" | Alert["type"];

const FILTER_PILLS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cex_cex", label: "CEX-CEX" },
  { id: "spot_futures", label: "Spot-Futures" },
  { id: "dex_cex", label: "DEX-CEX" },
  { id: "new_listing", label: "New Listing" },
];

// ─── Spread color ─────────────────────────────────────────────────────────────

function spreadColor(pct: number): string {
  if (pct >= 0.1) return "text-[#3FB950]";
  if (pct >= 0.05) return "text-[#D29922]";
  return "text-[#8B949E]";
}

// ─── Row component ────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  isNew,
}: {
  alert: Alert;
  isNew: boolean;
}) {
  const meta = TYPE_META[alert.type];
  return (
    <tr
      className={`border-b border-[#21262D]/50 hover:bg-[#1C2128] transition-colors ${
        isNew ? "animate-flash-green" : ""
      }`}
    >
      <td className="px-3 py-1.5 text-[12px] font-mono text-[#8B949E] whitespace-nowrap">
        {fmtTime(alert.createdAt)}
      </td>
      <td className="px-3 py-1.5">
        <span
          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${meta.badge}`}
        >
          {meta.label}
        </span>
      </td>
      <td className="px-3 py-1.5 text-[12px] font-mono font-bold text-[#E6EDF3] whitespace-nowrap">
        {alert.symbol}
      </td>
      <td
        className={`px-3 py-1.5 text-[12px] font-mono font-semibold whitespace-nowrap ${spreadColor(
          alert.spreadPercent
        )}`}
      >
        {alert.spreadPercent.toFixed(3)}%
      </td>
      <td className="px-3 py-1.5 text-[11px] font-mono text-[#8B949E] whitespace-nowrap">
        <span className="text-[#E6EDF3]">{alert.buyExchange}</span>{" "}
        {fmtPrice(alert.buyPrice)}
      </td>
      <td className="px-3 py-1.5 text-[11px] font-mono text-[#8B949E] whitespace-nowrap">
        <span className="text-[#E6EDF3]">{alert.sellExchange}</span>{" "}
        {fmtPrice(alert.sellPrice)}
      </td>
      <td className="px-3 py-1.5 text-[11px] font-mono text-[#8B949E] whitespace-nowrap">
        {shortEx(alert.buyExchange)} → {shortEx(alert.sellExchange)}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const prevIdsRef = useRef<Set<string>>(new Set());

  const now = () =>
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?limit=200", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const incoming: Alert[] = Array.isArray(data.alerts) ? data.alerts : [];

      // Detect new alerts for flash animation
      const prevIds = prevIdsRef.current;
      const freshIds = new Set(
        incoming.filter((a) => !prevIds.has(a.id)).map((a) => a.id)
      );
      prevIdsRef.current = new Set(incoming.map((a) => a.id));

      if (freshIds.size > 0) {
        setNewIds(freshIds);
        setTimeout(() => setNewIds(new Set()), 1200);
      }

      setAlerts(incoming);
      if (data.stats) setStats(data.stats);
      setLastUpdated(now());
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/alert-config", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data) setConfig(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchConfig();
    const interval = setInterval(fetchAlerts, 5_000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchConfig]);

  const filtered =
    filter === "all" ? alerts : alerts.filter((a) => a.type === filter);

  const isEngineActive = stats?.isRunning ?? false;

  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      {/* ── Top Nav ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#161B22] border-b border-[#21262D] shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-sm font-bold tracking-widest uppercase font-mono text-[#388BFD]">
            Arbitrage Terminal
          </span>
          <span className="text-[#484F58] select-none mx-1">|</span>
          <span className="text-xs text-[#484F58] font-mono">v0.2.4</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto">
          <div className="flex items-center gap-1 mr-1">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span className="text-[#3FB950] font-mono">LIVE</span>
          </div>
          <Link href="/intelligence" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">Intelligence</span>
          </Link>
          <Link href="/magnus" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">Magnus</span>
          </Link>
          <Link href="/dex" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">DEX Markets</span>
          </Link>
          <Link href="/triangular" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">Triangular</span>
          </Link>
          <Link href="/cross-chain" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">Cross-Chain</span>
          </Link>
          <Link href="/new-listings" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">New Listings</span>
          </Link>
          <Link href="/alerts" className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#388BFD]/10 border border-[#388BFD]/40 text-[#388BFD] text-[10px] font-mono whitespace-nowrap">
            Alerts
          </Link>
          <Link href="/funding-rates" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">Funding Rates</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
            <span className="text-[10px] font-mono">Dashboard</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap" title="Settings">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono">Settings</span>
          </Link>
        </div>
      </header>

      {/* ── Page Header ── */}
      <div className="px-6 pt-5 pb-3 border-b border-[#21262D]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <span className="flex h-2 w-2 rounded-full bg-[#3FB950] animate-pulse" />
              <h1 className="text-lg font-bold font-mono text-[#E6EDF3] flex items-center gap-2">
                <BellIcon className="h-4 w-4 text-[#3FB950]" />
                ALERTS
              </h1>
            </div>
            <p className="text-[12px] text-[#8B949E] font-mono ml-5">
              Real-time alert feed · filtered by your settings
            </p>
          </div>
          <span className="text-[10px] text-[#484F58] font-mono">
            Last updated: {lastUpdated}
          </span>
        </div>
      </div>

      <main className="flex-1 px-6 py-3 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto">
        {/* ── Status bar ── */}
        <div className="bg-[#161B22] border border-[#21262D] rounded p-1.5 mb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-1.5 w-1.5 rounded-full ${
                isEngineActive
                  ? "bg-[#3FB950] animate-pulse"
                  : "bg-[#F85149]"
              }`}
            />
            <span className="text-[11px] font-mono text-[#8B949E]">
              Alert engine:{" "}
              <span
                className={
                  isEngineActive ? "text-[#3FB950]" : "text-[#F85149]"
                }
              >
                {isEngineActive ? "active" : "inactive"}
              </span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#8B949E]">
            {stats?.totalToday ?? 0} alerts today ·{" "}
            {stats?.totalAllTime ?? 0} all time
          </span>
          <span className="text-[11px] font-mono text-[#8B949E]">
            Min spread:{" "}
            <span className="text-[#E6EDF3]">
              {config?.minSpreadPercent?.toFixed(2) ?? "—"}%
            </span>{" "}
            · Freq:{" "}
            <span className="text-[#E6EDF3]">
              {config?.alertFrequency ?? "—"}
            </span>
          </span>
        </div>

        {/* ── Filter pills ── */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILTER_PILLS.map((pill) => {
            const isActive = filter === pill.id;
            const meta =
              pill.id !== "all" ? TYPE_META[pill.id as Alert["type"]] : null;
            return (
              <button
                key={pill.id}
                onClick={() => setFilter(pill.id)}
                className={`px-2.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                  isActive
                    ? meta?.pill ??
                      "bg-[#388BFD]/20 text-[#388BFD] border-[#388BFD]"
                    : "bg-transparent text-[#8B949E] border-[#21262D] hover:border-[#8B949E] hover:text-[#E6EDF3]"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* ── Table ── */}
        <div className="bg-[#161B22] border border-[#21262D] rounded overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#21262D]">
                    {["TIME", "TYPE", "SYMBOL", "SPREAD", "BUY", "SELL", "DIRECTION"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-1 text-[10px] font-mono text-[#8B949E] uppercase tracking-wider font-semibold"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center">
                    <span className="text-[12px] text-[#484F58] font-mono">
                      Loading...
                    </span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center max-h-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <BellIcon className="h-6 w-6 text-[#21262D]" />
                      <span className="text-[12px] text-[#484F58] font-mono">
                        No alerts triggered yet · Engine is monitoring all feeds
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    isNew={newIds.has(alert.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="mt-2 text-[10px] text-[#484F58] font-mono">
          Showing {filtered.length} alert{filtered.length !== 1 ? "s" : ""} ·
          engine evaluates every 2s
        </div>
        </div>
      </main>

      {/* Flash animation style */}
      <style>{`
        @keyframes flash-green {
          0% { background-color: rgba(63, 185, 80, 0.10); }
          100% { background-color: transparent; }
        }
        .animate-flash-green {
          animation: flash-green 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
