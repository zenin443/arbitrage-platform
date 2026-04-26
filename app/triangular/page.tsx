"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, GitMergeIcon, RefreshCwIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TriangularRoute {
  id: string;
  exchange: string;
  path: string;
  baseSymbol: string;
  crossSymbol: string;
  altSymbol: string;
  profitPercent: number;
  direction: "forward" | "reverse";
  prices: {
    step1: number;
    step2: number;
    step3: number;
  };
  feesPercent: number;
  netProfitPercent: number;
  estimatedProfit1k: number;
  detectedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(3) + "%";
}

function fmtUsd(v: number): string {
  if (v >= 0) return "+$" + v.toFixed(2);
  return "-$" + Math.abs(v).toFixed(2);
}

function fmtPrice(v: number): string {
  if (v <= 0) return "—";
  if (v >= 10_000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(8);
}

function profitColor(v: number): string {
  if (v >= 0.3) return "text-[#3FB950]";
  if (v >= 0) return "text-[#D29922]";
  return "text-[#F85149]";
}

function exchangeLabel(ex: string): string {
  const MAP: Record<string, string> = {
    binance: "BINANCE",
    bybit: "BYBIT",
    okx: "OKX",
    kucoin: "KUCOIN",
  };
  return MAP[ex] ?? ex.toUpperCase();
}

function exchangeBadgeColor(ex: string): string {
  const MAP: Record<string, string> = {
    binance: "bg-[#F0B90B]/15 text-[#F0B90B]",
    bybit: "bg-[#F7A600]/15 text-[#F7A600]",
    okx: "bg-[#FFFFFF]/15 text-[#AAAAAA]",
    kucoin: "bg-[#00B4D8]/15 text-[#00B4D8]",
  };
  return MAP[ex] ?? "bg-[#484F58]/15 text-[#8B949E]";
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#161B22] border-b border-[#21262D] shrink-0">
      <div className="flex items-center gap-3">
        <ZapIcon className="h-4 w-4 text-[#388BFD]" />
        <span className="text-sm font-bold tracking-widest uppercase font-mono text-[#388BFD]">
          Arbitrage Terminal
        </span>
        <span className="text-[#484F58] select-none mx-1">|</span>
        <span className="text-xs text-[#484F58] font-mono">v0.5.2</span>
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
        <Link href="/funding-rates" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
          <span className="text-[10px] font-mono">Funding Rates</span>
        </Link>
        <Link href="/alerts" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
          <span className="text-[10px] font-mono">Alerts</span>
        </Link>
        <Link href="/dashboard" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
          <span className="text-[10px] font-mono">Dashboard</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap" title="Settings">
          <SettingsIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

// ─── Route row ────────────────────────────────────────────────────────────────

function RouteRow({ route }: { route: TriangularRoute }) {
  return (
    <tr className="border-b border-[#21262D]/50 hover:bg-[#1C2128] transition-colors">
      <td className="px-3 py-1">
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0 rounded ${exchangeBadgeColor(route.exchange)}`}>
          {exchangeLabel(route.exchange)}
        </span>
      </td>
      <td className="px-3 py-1 text-[12px] font-mono text-[#E6EDF3] max-w-[220px]">
        <span className="text-[#8B949E] text-[10px] mr-1">{route.direction === "forward" ? "→" : "↩"}</span>
        {route.path}
      </td>
      <td className="px-3 py-1 text-[10px] font-mono text-[#8B949E]">
        <div>{route.baseSymbol}</div>
        <div>{route.crossSymbol}</div>
        <div>{route.altSymbol}</div>
      </td>
      <td className="px-3 py-1 text-[10px] font-mono text-[#8B949E]">
        <div>p1: {fmtPrice(route.prices.step1)}</div>
        <div>p2: {fmtPrice(route.prices.step2)}</div>
        <div>p3: {fmtPrice(route.prices.step3)}</div>
      </td>
      <td className={`px-3 py-1 text-[12px] font-mono font-bold ${profitColor(route.profitPercent)}`}>
        {fmtPct(route.profitPercent)}
      </td>
      <td className="px-3 py-1 text-[11px] font-mono text-[#F85149]">
        -{route.feesPercent.toFixed(2)}%
      </td>
      <td className={`px-3 py-1 text-[12px] font-mono font-bold ${profitColor(route.netProfitPercent)}`}>
        {fmtPct(route.netProfitPercent)}
      </td>
      <td className={`px-3 py-1 text-[12px] font-mono font-semibold ${profitColor(route.estimatedProfit1k)}`}>
        {fmtUsd(route.estimatedProfit1k)}
      </td>
    </tr>
  );
}

const HEADERS = ["EXCHANGE", "PATH", "SYMBOLS", "PRICES", "GROSS %", "FEES", "NET %", "P&L @$1K"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TriangularPage() {
  const [routes, setRoutes] = useState<TriangularRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [showAll, setShowAll] = useState(false);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch("/api/triangular", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setRoutes(data);
        setLastUpdated(
          new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        );
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
    const interval = setInterval(fetchRoutes, 3_000);
    return () => clearInterval(interval);
  }, [fetchRoutes]);

  const profitable = routes.filter((r) => r.netProfitPercent > 0);
  const displayed = showAll ? routes : profitable;

  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <NavBar />

      {/* ── Page Header ── */}
      <div className="px-6 pt-4 pb-3 border-b border-[#21262D]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <span className="flex h-2 w-2 rounded-full bg-[#3FB950] animate-pulse" />
              <h1 className="text-lg font-bold font-mono text-[#E6EDF3] flex items-center gap-2">
                <GitMergeIcon className="h-4 w-4 text-[#388BFD]" />
                TRIANGULAR ARBITRAGE
              </h1>
            </div>
            <p className="text-[12px] text-[#8B949E] font-mono ml-5">
              Intra-exchange · 3-leg routes · cross-pair REST polling every 5s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#484F58] font-mono">
              Updated: {lastUpdated}
            </span>
            <button
              onClick={fetchRoutes}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors"
            >
              <RefreshCwIcon className="h-3 w-3" />
              <span className="text-[11px] font-mono">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-6 px-6 py-1.5 border-b border-[#21262D] bg-[#0D1117]">
        <div className="text-center">
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">Total Routes</div>
          <div className="text-base font-mono font-bold text-[#E6EDF3]">{routes.length}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">Net Profitable</div>
          <div className="text-base font-mono font-bold text-[#3FB950]">{profitable.length}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">Best Net</div>
          <div className={`text-base font-mono font-bold ${profitColor(profitable[0]?.netProfitPercent ?? 0)}`}>
            {profitable[0] ? fmtPct(profitable[0].netProfitPercent) : "—"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">Fees (3 legs)</div>
          <div className="text-base font-mono font-bold text-[#F85149]">0.30%</div>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[#21262D] text-[#8B949E] hover:border-[#388BFD] hover:text-[#388BFD] transition-colors"
          >
            {showAll ? "Show profitable only" : "Show all routes"}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <main className="flex-1 px-4 py-3 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto">
        <div className="bg-[#161B22] border border-[#21262D] rounded overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[#21262D]">
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-[9px] font-mono text-[#8B949E] uppercase tracking-wider font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center">
                    <span className="text-[12px] text-[#484F58] font-mono animate-pulse">
                      Polling cross-pair prices… (Binance, Bybit, OKX, KuCoin)
                    </span>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center max-h-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <GitMergeIcon className="h-6 w-6 text-[#21262D]" />
                      <span className="text-[12px] text-[#484F58] font-mono">
                        {routes.length === 0
                          ? "No cross-pair prices loaded yet — backend may be warming up"
                          : "No net-profitable triangular routes found · spreads below 0.30% fee threshold"}
                      </span>
                      {routes.length > 0 && !showAll && (
                        <button
                          onClick={() => setShowAll(true)}
                          className="text-[11px] font-mono text-[#388BFD] hover:underline mt-1"
                        >
                          Show all {routes.length} routes anyway
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((r) => <RouteRow key={r.id} route={r} />)
              )}
            </tbody>
          </table>
        </div>

        {/* ── Explainer ── */}
        <div className="mt-3 bg-[#161B22] border border-[#21262D] rounded p-2 text-[11px] font-mono text-[#8B949E] space-y-1">
          <p className="text-[#E6EDF3] font-semibold mb-2">How triangular arbitrage works</p>
          <p><span className="text-[#388BFD]">Forward:</span> USDT → BTC → ALT → USDT — buy BTC, use BTC to buy ALT, sell ALT back to USDT</p>
          <p><span className="text-[#388BFD]">Reverse:</span> USDT → ALT → BTC → USDT — buy ALT, sell ALT for BTC, sell BTC to USDT</p>
          <p className="text-[#484F58] mt-2">
            Fees: 0.10% taker × 3 legs = 0.30% minimum · Cross-pair prices REST-polled every 5s from each exchange
          </p>
        </div>
        </div>
      </main>
    </div>
  );
}
