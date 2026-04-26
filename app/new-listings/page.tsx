"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewListing {
  id: string;
  exchange: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  detectedAt: number;
  priceAtDetection: number | null;
  currentPrice: number | null;
  priceChange1m: number | null;
  priceChange5m: number | null;
  priceChange10m: number | null;
  volume24h: number | null;
  alsoOnExchanges: string[];
  status: "new" | "tracking" | "completed";
}

interface ScannerStats {
  exchangeSymbolCounts: Record<string, number>;
  lastScanTime: number;
  totalScans: number;
  isBaselineComplete: boolean;
  activityLog: Array<{ time: number; message: string; type: "baseline" | "new_listing" | "error" }>;
}

// ─── Exchange badge styles ────────────────────────────────────────────────────

const EXCHANGE_STYLES: Record<string, { label: string; badge: string }> = {
  binance: { label: "BINANCE", badge: "bg-[#F0B90B]/15 text-[#F0B90B]" },
  bybit:   { label: "BYBIT",   badge: "bg-[#F7A600]/15 text-[#F7A600]" },
  okx:     { label: "OKX",     badge: "bg-[#FFFFFF]/15 text-[#FFFFFF]" },
  mexc:    { label: "MEXC",    badge: "bg-[#00B4D8]/15 text-[#00B4D8]" },
  gateio:  { label: "GATE.IO", badge: "bg-[#E74C3C]/15 text-[#E74C3C]" },
};

function exchangeBadge(exchange: string): { label: string; badge: string } {
  return EXCHANGE_STYLES[exchange] ?? { label: exchange.toUpperCase(), badge: "bg-[#484F58]/15 text-[#8B949E]" };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCompact(val: number): string {
  if (val >= 1_000_000_000) return "$" + (val / 1_000_000_000).toFixed(2) + "B";
  if (val >= 1_000_000) return "$" + (val / 1_000_000).toFixed(2) + "M";
  if (val >= 1_000) return "$" + (val / 1_000).toFixed(1) + "K";
  return "$" + val.toFixed(2);
}

function formatPrice(price: number): string {
  if (price >= 1000) return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return "$" + price.toFixed(4);
  if (price >= 0.0001) return "$" + price.toFixed(6);
  return "$" + price.toExponential(4);
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatHMS(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function fmtCount(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Change badge ─────────────────────────────────────────────────────────────

function ChangeBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null) {
    return (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262D] text-[#484F58]">
        {label}: —
      </span>
    );
  }
  const isPos = value >= 0;
  const color = isPos
    ? "bg-[#3FB950]/15 text-[#3FB950]"
    : "bg-[#F85149]/15 text-[#F85149]";
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${color}`}>
      {label}: {isPos ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: NewListing }) {
  const ex = exchangeBadge(listing.exchange);
  const isRecent = Date.now() - listing.detectedAt < 5 * 60 * 1000;

  const statusBadge = {
    new: "border border-[#3FB950]/50 text-[#3FB950] animate-pulse",
    tracking: "border border-[#388BFD]/50 text-[#388BFD]",
    completed: "border border-[#21262D] text-[#8B949E]",
  }[listing.status];

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded p-3 flex flex-col gap-1.5 hover:border-[#388BFD]/30 transition-colors">
      {/* Row 1: exchange + symbol + status */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${ex.badge}`}>
          {ex.label}
        </span>
        <span className="text-[14px] font-mono font-bold text-[#E6EDF3] flex-1">
          {listing.baseAsset}
          <span className="text-[#8B949E] font-normal">/{listing.quoteAsset}</span>
        </span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${statusBadge}`}>
          {listing.status}
        </span>
      </div>

      {/* Row 2: time + price + volume */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-[11px] font-mono ${isRecent ? "text-[#D29922]" : "text-[#8B949E]"}`}>
          {formatTimeAgo(listing.detectedAt)}
        </span>
        <span className="text-[#484F58] text-[10px]">·</span>
        <span className="text-[12px] font-mono text-[#E6EDF3]">
          {listing.currentPrice !== null ? formatPrice(listing.currentPrice) : "..."}
        </span>
        <span className="text-[#484F58] text-[10px]">·</span>
        <span className="text-[11px] font-mono text-[#8B949E]">
          Vol: {listing.volume24h !== null ? formatCompact(listing.volume24h) : "—"}
        </span>
      </div>

      {/* Row 3: change badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChangeBadge label="1m" value={listing.priceChange1m} />
        <ChangeBadge label="5m" value={listing.priceChange5m} />
        <ChangeBadge label="10m" value={listing.priceChange10m} />
      </div>

      {/* Row 4: also on */}
      {listing.alsoOnExchanges.length > 0 && (
        <div className="text-[10px] font-mono text-[#388BFD]">
          Also on: {listing.alsoOnExchanges.join(", ")}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewListingsPage() {
  const [listings, setListings] = useState<NewListing[]>([]);
  const [stats, setStats] = useState<ScannerStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState("—");

  const now = () =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/new-listings", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setListings(Array.isArray(data.listings) ? data.listings : []);
      if (data.stats) setStats(data.stats);
      setLastUpdated(now());
    } catch {
      // keep previous
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const secondsAgo = stats?.lastScanTime
    ? Math.floor((Date.now() - stats.lastScanTime) / 1000)
    : null;

  const logEntries = stats?.activityLog?.slice(0, 30) ?? [];

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
              <h1 className="text-lg font-bold font-mono text-[#E6EDF3]">⚡ NEW LISTINGS</h1>
            </div>
            <p className="text-[12px] text-[#8B949E] font-mono ml-5">
              Real-time new token detection · Binance · Bybit · OKX · MEXC · Gate.io
            </p>
          </div>
          <span className="text-[10px] text-[#484F58] font-mono">
            Last updated: <span className="text-[#8B949E]">{lastUpdated}</span>
          </span>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="mx-3 mt-2 bg-[#161B22] border border-[#21262D] rounded p-1.5 flex items-center gap-4 flex-wrap">
        {/* Scanner status */}
        <div className="flex items-center gap-1.5">
          {stats?.isBaselineComplete ? (
            <>
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
              <span className="text-[11px] font-mono text-[#3FB950]">Scanner active</span>
            </>
          ) : (
            <>
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#D29922] animate-pulse" />
              <span className="text-[11px] font-mono text-[#D29922]">Building baseline...</span>
            </>
          )}
        </div>

        <span className="text-[#21262D]">|</span>

        {/* Exchange pills */}
          <div className="flex items-center gap-1 flex-wrap">
          {(["binance", "bybit", "okx", "mexc", "gateio"] as const).map((ex) => {
            const style = EXCHANGE_STYLES[ex];
            const count = stats?.exchangeSymbolCounts?.[ex];
            return (
              <span key={ex} className={`text-[9px] font-mono px-1.5 py-0 rounded ${style.badge}`}>
                {style.label} {count !== undefined ? fmtCount(count) : "—"}
              </span>
            );
          })}
        </div>

        <span className="text-[#21262D]">|</span>

        {/* Scan info */}
        <span className="text-[11px] font-mono text-[#8B949E] ml-auto">
          Scan interval: 60s
          {secondsAgo !== null && (
            <> · Last scan: <span className="text-[#E6EDF3]">{secondsAgo}s ago</span></>
          )}
        </span>
      </div>

      <main className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-3">
        {/* ── SECTION A: Listing Cards ── */}
        <section>
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 max-h-[200px] overflow-hidden">
              <span className="text-3xl">🔍</span>
              <p className="text-[12px] font-mono text-[#E6EDF3] font-semibold">
                No new listings detected yet
              </p>
              <p className="text-[11px] font-mono text-[#8B949E] text-center max-w-sm">
                Scanner is monitoring 5 exchanges for newly listed tokens
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION B: Activity Log ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[11px] text-[#8B949E] uppercase tracking-wider font-mono font-semibold">
              Scanner Log
            </h2>
            {stats && (
              <span className="text-[10px] font-mono text-[#484F58]">
                · {stats.totalScans} scan{stats.totalScans !== 1 ? "s" : ""} completed
              </span>
            )}
          </div>

          <div className="bg-[#161B22] border border-[#21262D] rounded p-2 max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#21262D] [&::-webkit-scrollbar-track]:bg-transparent">
            {logEntries.length === 0 ? (
              <p className="text-[11px] font-mono text-[#484F58]">
                Waiting for scanner to initialize...
              </p>
            ) : (
              <div className="flex flex-col gap-0">
                {logEntries.map((entry, i) => {
                  const color =
                    entry.type === "new_listing"
                      ? "text-[#3FB950]"
                      : entry.type === "error"
                      ? "text-[#F85149]"
                      : "text-[#8B949E]";
                  return (
                    <p key={i} className={`text-[10px] font-mono ${color} leading-tight`}>
                      {formatHMS(entry.time)} · {entry.message}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <p className="text-[10px] text-[#484F58] font-mono text-right pb-2">
          New listing detection is informational only · Not financial advice
        </p>
        </div>
      </main>
    </div>
  );
}
