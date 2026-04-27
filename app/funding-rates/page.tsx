"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import NavAuthButton from "@/components/NavAuthButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpotFuturesOpportunity {
  symbol: string;
  strategy: string;
  combinedYieldAnnualized: number;
  spotExchange: string;
  spotPrice: number;
  futuresExchange: string;
  fundingRate: number; // annualized %
  estimatedProfit8h: number;
}

interface FundingRateEntry {
  symbol: string;
  exchange: string;
  rate: number; // annualized %
}

interface FundingRateRow {
  symbol: string;
  binance: number | null;
  bybit: number | null;
  okx: number | null;
  spread: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rateColor(rate: number | null): string {
  if (rate === null) return "text-[#484F58]";
  if (rate > 5) return "text-[#3FB950] font-semibold";
  if (rate < -5) return "text-[#F85149] font-semibold";
  return "text-[#8B949E]";
}

function fmtRate(rate: number | null): string {
  if (rate === null) return "—";
  return (rate >= 0 ? "+" : "") + rate.toFixed(2) + "%";
}

function fmtUsd(val: number): string {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function groupBySymbol(entries: FundingRateEntry[]): FundingRateRow[] {
  const map: Record<string, { binance: number | null; bybit: number | null; okx: number | null }> = {};

  for (const e of entries) {
    if (!map[e.symbol]) map[e.symbol] = { binance: null, bybit: null, okx: null };
    const key = e.exchange.toLowerCase() as "binance" | "bybit" | "okx";
    if (key === "binance" || key === "bybit" || key === "okx") {
      map[e.symbol][key] = e.rate;
    }
  }

  return Object.entries(map)
    .map(([symbol, rates]) => {
      const vals = [rates.binance, rates.bybit, rates.okx].filter((v): v is number => v !== null);
      const spread = vals.length >= 2 ? Math.max(...vals) - Math.min(...vals) : 0;
      return { symbol, ...rates, spread };
    })
    .sort((a, b) => b.spread - a.spread);
}

function averageRow(rows: FundingRateRow[]): { binance: number | null; bybit: number | null; okx: number | null; spread: number } {
  const avg = (key: "binance" | "bybit" | "okx") => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const b = avg("binance"), by = avg("bybit"), ok = avg("okx");
  const vals = [b, by, ok].filter((v): v is number => v !== null);
  const spread = vals.length >= 2 ? Math.max(...vals) - Math.min(...vals) : 0;
  return { binance: b, bybit: by, okx: ok, spread };
}

// Countdown to next funding window (funding happens every 8h: 00:00, 08:00, 16:00 UTC)
function useCountdown() {
  const [countdown, setCountdown] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const utcH = now.getUTCHours();
      const utcM = now.getUTCMinutes();
      const utcS = now.getUTCSeconds();
      const totalSec = utcH * 3600 + utcM * 60 + utcS;
      const periodSec = 8 * 3600;
      const rem = periodSec - (totalSec % periodSec);
      const hh = Math.floor(rem / 3600);
      const mm = Math.floor((rem % 3600) / 60);
      const ss = rem % 60;
      setCountdown(
        `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return countdown;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FundingRatesPage() {
  const [opportunities, setOpportunities] = useState<SpotFuturesOpportunity[]>([]);
  const [fundingRows, setFundingRows] = useState<FundingRateRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [loadingRates, setLoadingRates] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown();

  const now = () =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const fetchOpportunities = useCallback(async () => {
    try {
      const res = await fetch("/api/spot-futures", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setOpportunities(Array.isArray(data) ? data : data.opportunities ?? []);
    } catch {
      // API not yet available — keep previous data
    } finally {
      setLoadingOpps(false);
    }
  }, []);

  const fetchFundingRates = useCallback(async () => {
    try {
      const res = await fetch("/api/funding-rates", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      console.log('[FundingRates] received:', data.length, 'entries');
      const entries: FundingRateEntry[] = (Array.isArray(data) ? data : []).map(
        (item: { exchangeId: string; symbol: string; fundingRateAnnualized: number }) => ({
          symbol: item.symbol,
          exchange: item.exchangeId,
          rate: item.fundingRateAnnualized,
        })
      );
      setFundingRows(groupBySymbol(entries));
      setLastUpdated(now());
    } catch {
      // API not yet available — keep previous data
    } finally {
      setLoadingRates(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchOpportunities();
    fetchFundingRates();

    const oppInterval = setInterval(fetchOpportunities, 30_000);
    const rateInterval = setInterval(fetchFundingRates, 60_000);
    return () => {
      clearInterval(oppInterval);
      clearInterval(rateInterval);
    };
  }, [fetchOpportunities, fetchFundingRates]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 12, opportunities.length));
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [opportunities.length]);

  const visibleOpportunities = opportunities.slice(0, visibleCount);
  const allLoaded = visibleCount >= opportunities.length;
  const avgRow = fundingRows.length > 0 ? averageRow(fundingRows) : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[#161B22] border-b border-[#21262D] shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-[14px] font-medium font-sans text-[#388BFD]">
            Arbitrage Terminal
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] overflow-x-auto">
          <div className="flex items-center gap-1 mr-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span className="text-[#3FB950] font-mono">LIVE</span>
          </div>
          <Link href="/intelligence" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors whitespace-nowrap">
            Intelligence
          </Link>
          <Link href="/magnus" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors whitespace-nowrap">
            Magnus
          </Link>
          <Link href="/dex-markets" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors whitespace-nowrap">
            DEX Markets
          </Link>
          <Link href="/funding-rates" className="px-2 py-0.5 rounded bg-[#388BFD]/15 text-[#388BFD] font-medium whitespace-nowrap">
            Funding Rates
          </Link>
          <Link href="/dashboard" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors whitespace-nowrap">
            Dashboard
          </Link>
          <Link href="/settings" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="Settings">
            <SettingsIcon className="h-3.5 w-3.5" />
          </Link>
          <NavAuthButton />
        </div>
      </header>

      {/* ── Page Header ── */}
      <div className="px-6 pt-3 pb-2 border-b border-[#21262D]">
        <div className="flex items-center gap-3 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-[#3FB950] animate-pulse" />
          <h1 className="text-lg font-bold tracking-widest uppercase font-mono text-[#E6EDF3]">
            Funding Rates
          </h1>
        </div>
        <p className="text-xs text-[#8B949E] font-mono ml-5">
          Annualized funding rates across exchanges · Updated every 60s
        </p>
      </div>

      <main className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-4">
        {/* ── Section A: Arbitrage Opportunities ── */}
        <section>
          {/* Section header — stays outside the scroll container */}
          <div className="flex items-center gap-2 mb-1">
            <TrendingUpIcon className="h-3.5 w-3.5 text-[#484F58]" />
            <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider font-mono">
              Funding Rate Arbitrage Opportunities
            </h2>
            <span className="text-[#484F58] text-xs font-mono">· polled every 30s</span>
          </div>
          <p className="text-[11px] text-[#484F58] font-mono mb-4 ml-5">
            {loadingOpps
              ? "Loading opportunities…"
              : `Showing ${Math.min(visibleCount, opportunities.length)} of ${opportunities.length} opportunities`}
          </p>

          {/* Scrollable widget */}
          <div
            ref={scrollContainerRef}
            className="h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#21262D] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full relative"
            style={{ boxShadow: "inset 0 -20px 20px -10px #0D1117" }}
          >
            {loadingOpps ? (
              <div className="grid grid-cols-4 gap-3 p-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-[80px] rounded-lg bg-[#161B22] border border-[#21262D] animate-pulse" />
                ))}
              </div>
            ) : visibleOpportunities.length === 0 ? (
              <div className="rounded-lg border border-[#21262D] bg-[#161B22] px-6 py-3 text-center m-3 max-h-[200px]">
                <p className="text-xs text-[#484F58] font-mono">
                  No spot-futures arbitrage opportunities found · waiting for data from{" "}
                  <span className="text-[#388BFD]">/api/spot-futures</span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 p-3">
                {visibleOpportunities.map((opp, i) => (
                  <OpportunityCard key={`${opp.symbol}-${i}`} opp={opp} />
                ))}

                {!allLoaded && (
                  <div className="col-span-full flex justify-center py-4">
                    <div className="text-[#484F58] font-mono text-xs animate-pulse">Loading more...</div>
                  </div>
                )}

                {allLoaded && opportunities.length > 0 && (
                  <div className="col-span-full text-center py-4 text-[#484F58] font-mono text-xs">
                    ✓ All {opportunities.length} opportunities loaded
                  </div>
                )}
              </div>
            )}

            {/* Sentinel inside the scrollable container to trigger infinite scroll */}
            <div ref={sentinelRef} className="h-4" />
          </div>
        </section>

        {/* ── Section B: Full Funding Rate Table ── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
            <TrendingDownIcon className="h-3.5 w-3.5 text-[#484F58]" />
            <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider font-mono">
              Full Funding Rate Table
            </h2>
            <span className="text-[#484F58] text-xs font-mono">· sorted by spread desc</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-[#484F58]">
                Last updated: <span className="text-[#8B949E]">{lastUpdated}</span>
              </span>
              <div className="flex items-center gap-1.5 text-[#D29922] font-mono font-bold bg-[#D29922]/10 border border-[#D29922]/20 px-3 py-1 rounded">
                <span className="text-[#8B949E] font-normal">Next funding:</span>
                <span className="tabular-nums">{countdown}</span>
              </div>
            </div>
          </div>

          {loadingRates ? (
            <div className="rounded-lg border border-[#21262D] bg-[#161B22] overflow-hidden">
              <div className="h-64 animate-pulse bg-[#161B22]" />
            </div>
          ) : (
            <div className="rounded-lg border border-[#21262D] overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#21262D] bg-[#1C2128]">
                    <th className="text-left px-3 py-1 text-[#484F58] font-mono text-[11px] tracking-widest uppercase w-32">
                      Symbol
                    </th>
                    <th className="text-right px-3 py-1 text-[#484F58] font-mono text-[11px] tracking-widest uppercase">
                      Binance
                    </th>
                    <th className="text-right px-3 py-1 text-[#484F58] font-mono text-[11px] tracking-widest uppercase">
                      Bybit
                    </th>
                    <th className="text-right px-3 py-1 text-[#484F58] font-mono text-[11px] tracking-widest uppercase">
                      OKX
                    </th>
                    <th className="text-right px-3 py-1 text-[#484F58] font-mono text-[11px] tracking-widest uppercase">
                      Spread
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fundingRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-[#484F58]">
                        Loading funding rate data...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {fundingRows.map((row) => (
                        <tr
                          key={row.symbol}
                          className="border-b border-[#21262D] hover:bg-[#1C2128] transition-colors"
                        >
                          <td className="px-3 py-1 text-[#E6EDF3] text-[12px] font-mono font-semibold">{row.symbol}</td>
                          <td className={`px-3 py-1 text-right text-[11px] font-mono ${rateColor(row.binance)}`}>
                            {fmtRate(row.binance)}
                          </td>
                          <td className={`px-3 py-1 text-right text-[11px] font-mono ${rateColor(row.bybit)}`}>
                            {fmtRate(row.bybit)}
                          </td>
                          <td className={`px-3 py-1 text-right text-[11px] font-mono ${rateColor(row.okx)}`}>
                            {fmtRate(row.okx)}
                          </td>
                          <td className="px-3 py-1 text-right">
                            <SpreadBadge spread={row.spread} />
                          </td>
                        </tr>
                      ))}

                      {/* Average row */}
                      {avgRow && (
                        <tr className="border-t border-[#21262D] bg-[#161B22]">
                          <td className="px-3 py-1 text-[#484F58] uppercase text-[10px] tracking-widest font-mono">
                            Avg
                          </td>
                          <td className={`px-3 py-1 text-right text-[11px] font-mono ${rateColor(avgRow.binance)}`}>
                            {fmtRate(avgRow.binance)}
                          </td>
                          <td className={`px-3 py-1 text-right text-[11px] font-mono ${rateColor(avgRow.bybit)}`}>
                            {fmtRate(avgRow.bybit)}
                          </td>
                          <td className={`px-3 py-1 text-right text-[11px] font-mono ${rateColor(avgRow.okx)}`}>
                            {fmtRate(avgRow.okx)}
                          </td>
                          <td className="px-3 py-1 text-right">
                            <SpreadBadge spread={avgRow.spread} />
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 text-[10px] font-mono text-[#484F58]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm bg-[#3FB950]/60" />
              Rate &gt; 5% (longs paying shorts)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm bg-[#F85149]/60" />
              Rate &lt; -5% (shorts paying longs)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm bg-[#484F58]/60" />
              Neutral (-5% to 5%)
            </span>
          </div>
        </section>

        <p className="text-[10px] text-[#484F58] font-mono text-right pb-2">
          Funding rates are annualized · 8h settlement windows · Rates shown are indicative only
        </p>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: SpotFuturesOpportunity }) {
  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-2 flex flex-col gap-1 hover:border-[#388BFD]/30 transition-colors max-h-[80px] overflow-hidden">
      {/* Symbol + strategy + yield on one line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[13px] font-bold font-mono text-[#E6EDF3] leading-none">{opp.symbol}</p>
          <p className="text-[10px] text-[#8B949E] font-mono truncate">{opp.strategy}</p>
        </div>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          <p className="text-[16px] font-bold font-mono text-[#3FB950] tabular-nums leading-none">
            {(opp.combinedYieldAnnualized ?? 0) >= 0 ? "+" : ""}
            {(opp.combinedYieldAnnualized ?? 0).toFixed(2)}%
          </p>
          <p className="text-[9px] text-[#484F58] font-mono">ann.</p>
        </div>
      </div>

      {/* Exchange details inline */}
      <div className="flex items-center gap-3 text-[11px] font-mono">
        <span className="text-[#484F58]">Spot</span>
        <span className="text-[#388BFD] font-semibold">{opp.spotExchange}</span>
        <span className="text-[#E6EDF3] font-mono">{fmtUsd(opp.spotPrice ?? 0)}</span>
        <span className="text-[#484F58]">·</span>
        <span className="text-[#484F58]">Fund</span>
        <span className="text-[#388BFD] font-semibold">{opp.futuresExchange}</span>
        <span className={rateColor(opp.fundingRate ?? null)}>{fmtRate(opp.fundingRate ?? null)}</span>
        <span className="ml-auto text-[11px] text-[#3FB950] font-mono font-bold">{fmtUsd(opp.estimatedProfit8h ?? 0)}<span className="text-[9px] text-[#484F58] ml-0.5">/8h</span></span>
      </div>
    </div>
  );
}

function SpreadBadge({ spread }: { spread: number }) {
  const color =
    spread >= 10 ? "text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/20" :
    spread >= 5  ? "text-[#D29922] bg-[#D29922]/10 border-[#D29922]/20" :
                   "text-[#8B949E] bg-[#1C2128] border-[#21262D]";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold ${color}`}>
      {spread.toFixed(2)}%
    </span>
  );
}
