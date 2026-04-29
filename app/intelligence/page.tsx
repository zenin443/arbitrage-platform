"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, ChevronDownIcon, ChevronRightIcon, Maximize2, X } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { formatPercent, formatPrice, formatDuration } from "@/lib/formatters";
import { ExchangeLink } from "@/lib/referrals";
import AdBanner from "@/components/AdBanner";
import MagnusAICard from "@/components/intelligence/MagnusAICard";
import NavAuthButton from "@/components/NavAuthButton";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import InfoCorner from "@/components/ui/InfoCorner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { EmptyState } from "@/components/ui/EmptyState";
import { WidgetSkeleton } from "@/components/ui/WidgetSkeleton";
import { normalizeApiGapList } from "@/lib/response-transformer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfitSim {
  at100: number;
  at1k: number;
  at5k: number;
  at10k: number;
  breakEvenSpread: number;
  isProfitable: boolean;
  maxProfitableSize: number;
}

interface ProfitPoint {
  tradeSize: number;
  grossProfit: number;
  fees: number;
  netProfit: number;
  spreadAtSize: number;
}

interface DepthAnalysis {
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  spreadAtTop: number;
  convergenceSize: number;
  profitableSize: number;
  profitCurve: ProfitPoint[];
  optimalSize: number;
  optimalProfit: number;
  buyBookDepthUsd: number;
  sellBookDepthUsd: number;
}

interface GapRecord {
  id: string;
  type: "cex_cex" | "spot_futures" | "dex_cex" | "triangular" | "cross_chain" | string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  buyPrice: number;
  sellPrice: number;
  buyBidSize?: number;
  sellAskSize?: number;
  maxTradeableUsd: number;
  detectedAt: number;
  lastSeenAt?: number;
  durationMs: number;
  isActive: boolean;
  profitSimulation?: ProfitSim | null;
  depthAnalysis: DepthAnalysis | null;
  /** Quote currency e.g. "USDT", "USDC", "BTC". */
  quoteCurrency?: string;
  /** Present when the item came from the free-tier 4-field response shape. */
  _isFreeTier?: boolean;
  /** Original "0.25%" string from delayed_spread. Present when _isFreeTier. */
  _delayedSpread?: string;
  /** Original "binance → bybit" string from direction. Present when _isFreeTier. */
  _direction?: string;
}

interface TradingStats {
  totalGapsDetected: number;
  totalGapsLast1h: number;
  totalGapsLast24h: number;
  profitableGapsCount: number;
  profitableGapsPercent: number;
  avgSpreadPercent: number;
  avgGapDurationMs: number;
  bestSpreadSeen: GapRecord | null;
  totalSimulatedProfit1h: number;
  totalSimulatedProfit24h: number;
  exchangePairRanking: Array<{
    buyExchange: string;
    sellExchange: string;
    gapCount: number;
    avgSpread: number;
    totalSimProfit: number;
  }>;
  symbolRanking: Array<{
    symbol: string;
    gapCount: number;
    avgSpread: number;
    bestSpread: number;
  }>;
  durationBuckets: {
    under5s: number;
    under30s: number;
    under1m: number;
    under5m: number;
    over5m: number;
  };
}

// ─── Tooltip texts ─────────────────────────────────────────────────────────────

const TIP = {
  marketPulse:
    "Live system throughput. Ticks/s shows how many price updates are processed per second across all exchanges. Tracked shows total gaps being monitored in real-time.",
  topRoutes:
    "Most active exchange-to-exchange arbitrage routes ranked by gap count. Shows which exchange pairs consistently have price discrepancies you can trade.",
  gapTypes:
    "CEX-CEX: both exchanges centralized, fastest execution. DEX-CEX: one side decentralized, higher spread but slower. Spot-Futures: price difference between spot and futures contracts.",
  gapDuration:
    "How long arbitrage gaps stay open before prices converge. Under 5 seconds is too fast to trade. Over 1 minute is excellent for manual execution.",
  heatmap:
    "Shows which assets have the most arbitrage gaps right now. Cell size represents gap count. Color intensity shows spread quality. Click a cell to filter the table below.",
  spreadDist:
    "How spreads are distributed across all active gaps. Shows where the profitable sweet spot is. The tallest bar is where most tradeable opportunities cluster.",
  pricingBias:
    "Which exchanges are consistently cheap (buy here) vs expensive (sell here). Based on comparing each exchange's prices to the market average across all symbols.",
  typeProfitability:
    "Compares each gap type by average spread, average duration, and count. Helps identify which gap type gives the best risk/reward for your trading strategy.",
  mostGapped:
    "Leaderboard of assets ranked by total active arbitrage gap count. Higher count means more opportunities. Spread shows the best available gap for each asset.",
  priceVariance:
    "How much prices differ across exchanges for each asset. Higher variance means bigger price disagreements — more potential for arbitrage. RPL at 27% means extreme mispricing.",
  exchangeCoverage:
    "How many trading pairs each exchange provides data for. More coverage means more arbitrage opportunities can be detected on that exchange.",
  magnusAI:
    "Autonomous paper trading bot that detects and executes arbitrage trades in simulation. Tracks win rate and trade count. View full details on the Magnus dashboard.",
};

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtUsd(val: number, decimals = 2): string {
  const abs = Math.abs(val);
  const prefix = val < 0 ? "-$" : "$";
  if (abs >= 1_000_000) return prefix + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return prefix + (abs / 1_000).toFixed(1) + "K";
  return prefix + abs.toFixed(decimals);
}

const EX_DISPLAY: Record<string, string> = {
  binance: "BIN", bybit: "BYB", okx: "OKX", gateio: "GATE", kucoin: "KUC",
  bingx: "BNGX", mexc: "MEXC", htx: "HTX", huobi: "HTX", bitget: "BTG",
  coinbase: "CB", hyperliquid: "HYP", jupiter: "JUP",
  uniswap_v3: "UNI", bitfinex: "BFNX", kraken: "KRKN",
};

function exName(id: string): string {
  return EX_DISPLAY[id?.toLowerCase()] ?? id?.toUpperCase()?.slice(0, 4) ?? "??";
}

function shortEx(name: string): string {
  return exName(name);
}

function now(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function computeScore(gap: GapRecord): number {
  const spreadScore = Math.min(gap.spreadPercent / 1.0, 1) * 100 * 0.4;
  const durSec = gap.durationMs / 1_000;
  const durationScore = Math.min(durSec / 300, 1) * 100 * 0.3;
  const depthBase = gap.depthAnalysis ? gap.depthAnalysis.profitableSize : gap.maxTradeableUsd;
  const depthScore = Math.min(depthBase / 50_000, 1) * 100 * 0.3;
  return Math.round(spreadScore + durationScore + depthScore);
}

const TYPE_META: Record<GapRecord["type"], { label: string; color: string; bg: string }> = {
  cex_cex:      { label: "CEX", color: "text-[#388BFD]", bg: "bg-[#388BFD]/15" },
  spot_futures: { label: "S-F", color: "text-[#A371F7]", bg: "bg-[#A371F7]/15" },
  dex_cex:      { label: "DEX", color: "text-[#3FB950]", bg: "bg-[#3FB950]/15" },
  triangular:   { label: "TRI", color: "text-[#D29922]", bg: "bg-[#D29922]/15" },
  cross_chain:  { label: "XCH", color: "text-[#F85149]", bg: "bg-[#F85149]/15" },
};

function spreadColor(pct: number): string {
  if (pct >= 0.2) return "text-[#3FB950]";
  if (pct >= 0.1) return "text-[#D29922]";
  return "text-[#F85149]";
}

function profitColor(val: number): string {
  return val >= 0 ? "text-[#3FB950]" : "text-[#F85149]";
}

function durationColor(ms: number): string {
  if (ms >= 30_000) return "text-[#3FB950]";
  if (ms >= 5_000) return "text-[#D29922]";
  return "text-[#F85149]";
}

// ─── SparklineSVG ─────────────────────────────────────────────────────────────

function SparklineSVG({ data, color, id }: { data: number[]; color: string; id: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200, h = 30;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(" L")}`;
  const areaD = `${pathD} L${w},${h} L0,${h}Z`;
  const gradId = `sparkfade-${id}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="absolute bottom-0 left-0 right-0"
      style={{ height: "30px", width: "100%", opacity: 0.15 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ─── StatDeltaBadge ───────────────────────────────────────────────────────────

function StatDeltaBadge({ history }: { history: number[] }) {
  if (history.length < 2) return null;
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  if (prev === 0) return null;
  const deltaPct = ((curr - prev) / Math.abs(prev)) * 100;
  const isUp = curr >= prev;
  return (
    <span className={`text-[10px] font-mono ${isUp ? "text-[#3FB950]" : "text-[#F85149]"}`}>
      {isUp ? "+" : ""}{deltaPct.toFixed(1)}%
    </span>
  );
}

// ─── DepthDetailPanel ─────────────────────────────────────────────────────────

function DepthDetailPanel({ gap }: { gap: GapRecord }) {
  const [orderbookData, setOrderbookData] = useState<Record<string, unknown> | null>(null);
  const [orderbookLoading, setOrderbookLoading] = useState(false);
  const [orderbookError, setOrderbookError] = useState(false);

  useEffect(() => {
    // Skip orderbook fetch for free-tier gaps (no depth data available)
    if (gap.depthAnalysis || gap._isFreeTier) return;
    setOrderbookLoading(true);
    setOrderbookData(null);
    setOrderbookError(false);
    fetch(
      `/api/orderbook?symbol=${encodeURIComponent(gap.symbol)}&buyExchange=${encodeURIComponent(gap.buyExchange)}&sellExchange=${encodeURIComponent(gap.sellExchange)}`
    )
      .then(r => r.json())
      .then(data => {
        setOrderbookData(data);
        setOrderbookLoading(false);
      })
      .catch(() => {
        setOrderbookError(true);
        setOrderbookLoading(false);
      });
  }, [gap.symbol, gap.buyExchange, gap.sellExchange, gap.depthAnalysis, gap._isFreeTier]);

  // Free-tier items have no depth data — show upgrade prompt instead of orderbook panel
  if (gap._isFreeTier) {
    return (
      <tr>
        <td colSpan={7} className="px-3 py-2 bg-[#0D1117] border-t border-[#21262D]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#484F58]">
              Order book depth · profit simulation · exact prices
            </span>
            <a
              href="/pricing"
              className="text-[11px] font-mono text-[#D29922] hover:text-[#E6EDF3] border border-[#D29922]/30 hover:border-[#D29922] rounded px-2 py-0.5 transition-colors"
            >
              Upgrade for full data →
            </a>
          </div>
        </td>
      </tr>
    );
  }

  const d = gap.depthAnalysis;
  if (!d) {
    return (
      <tr>
        <td colSpan={7} className="px-3 py-2 bg-[#0D1117] border-t border-[#21262D]">
          {orderbookLoading ? (
            <span className="text-[11px] font-mono text-[#484F58] animate-pulse">
              Fetching order book depth…
            </span>
          ) : orderbookError ? (
            <span className="text-[11px] font-mono text-red-500/70">
              Order book data unavailable
            </span>
          ) : orderbookData?.error ? (
            <span className="text-[11px] font-mono text-[#484F58]">
              {String(orderbookData.error)}
            </span>
          ) : orderbookData ? (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#484F58] mb-1 font-mono">
                  Bids — {String(orderbookData.buyExchange ?? '') || shortEx(gap.buyExchange)}
                </div>
                {((orderbookData.bids || (orderbookData.buy as Record<string,unknown>)?.bids || []) as (number[] | {price:number;amount:number})[]).slice(0, 5).map((bid, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] font-mono gap-4">
                    <span className="text-green-400">{Number(Array.isArray(bid) ? bid[0] : bid.price).toFixed(6)}</span>
                    <span className="text-[#484F58]">{Number(Array.isArray(bid) ? bid[1] : bid.amount).toFixed(4)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#484F58] mb-1 font-mono">
                  Asks — {String(orderbookData.sellExchange ?? '') || shortEx(gap.sellExchange)}
                </div>
                {((orderbookData.asks || (orderbookData.sell as Record<string,unknown>)?.asks || []) as (number[] | {price:number;amount:number})[]).slice(0, 5).map((ask, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] font-mono gap-4">
                    <span className="text-red-400">{Number(Array.isArray(ask) ? ask[0] : ask.price).toFixed(6)}</span>
                    <span className="text-[#484F58]">{Number(Array.isArray(ask) ? ask[1] : ask.amount).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={7} className="bg-[#0D1117] border-t border-[#21262D] p-2">
        <div className="text-[11px] font-mono space-y-1.5">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {d.profitCurve.map((p) => (
              <span key={p.tradeSize} className="whitespace-nowrap">
                <span className="text-[#484F58]">{fmtUsd(p.tradeSize, 0)} → </span>
                <span className={profitColor(p.netProfit)}>{formatPrice(p.netProfit)}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
            <span>
              <span className="text-[#484F58]">Convergence: </span>
              <span className="text-[#E6EDF3]">{fmtUsd(d.convergenceSize, 0)}</span>
            </span>
            <span>
              <span className="text-[#484F58]">Profitable to: </span>
              <span className="text-[#3FB950]">{fmtUsd(d.profitableSize, 0)}</span>
            </span>
            <span>
              <span className="text-[#484F58]">Optimal: </span>
              <span className="text-[#D29922]">{fmtUsd(d.optimalSize, 0)} → {formatPrice(d.optimalProfit)}</span>
            </span>
            <span>
              <span className="text-[#484F58]">{shortEx(d.buyExchange)} asks: </span>
              <span className="text-[#8B949E]">{fmtUsd(d.buyBookDepthUsd, 0)} / 20 lvls</span>
            </span>
            <span>
              <span className="text-[#484F58]">{shortEx(d.sellExchange)} bids: </span>
              <span className="text-[#8B949E]">{fmtUsd(d.sellBookDepthUsd, 0)} / 20 lvls</span>
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── GapRow ───────────────────────────────────────────────────────────────────

// ─── Full-screen overlay modal ────────────────────────────────────────────────

function ExpandedModal({
  title,
  subtitle,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(13,17,23,0.82)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col rounded-lg border border-[#30363D] overflow-hidden shadow-2xl ${wide ? "w-full max-w-7xl" : "w-full max-w-3xl"}`}
        style={{ maxHeight: "90vh", background: "linear-gradient(180deg, #1C2128 0%, #0D1117 100%)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262D] flex-shrink-0"
          style={{ background: "linear-gradient(180deg, #21262D 0%, #161B22 100%)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E6EDF3] font-medium">{title}</span>
            {subtitle && <span className="text-[9px] font-mono text-[#484F58]">· {subtitle}</span>}
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-[9px] font-mono text-[#484F58] hover:text-[#E6EDF3] transition-colors px-2 py-1 rounded border border-transparent hover:border-[#21262D]"
          >
            <X className="h-3 w-3" />
            <span>ESC</span>
          </button>
        </div>
        {/* Modal body */}
        <div className="flex-1 min-h-0 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface GapRowProps {
  gap: GapRecord;
  rowIndex?: number;
  symHistory?: Record<string, number[]>;
  scoreThresholds?: { high: number; med: number };
}

// U5: custom comparator — only re-render when cell-visible values change.
// symHistory is decorative (not rendered in cells) so excluded to reduce churn.
function gapRowPropsEqual(prev: GapRowProps, next: GapRowProps): boolean {
  if (prev.gap.id !== next.gap.id) return false;
  if (prev.rowIndex !== next.rowIndex) return false;
  if (prev.gap.spreadPercent !== next.gap.spreadPercent) return false;
  if (prev.gap.durationMs !== next.gap.durationMs) return false;
  if (prev.gap.maxTradeableUsd !== next.gap.maxTradeableUsd) return false;
  if (prev.gap.buyExchange !== next.gap.buyExchange) return false;
  if (prev.gap.sellExchange !== next.gap.sellExchange) return false;
  if (prev.gap.profitSimulation?.at1k !== next.gap.profitSimulation?.at1k) return false;
  if ((prev.scoreThresholds?.high ?? 55) !== (next.scoreThresholds?.high ?? 55)) return false;
  if ((prev.scoreThresholds?.med ?? 45)  !== (next.scoreThresholds?.med ?? 45))  return false;
  return true;
}

const GapRow = React.memo(function GapRow({
  gap,
  rowIndex = 0,
  scoreThresholds = { high: 55, med: 45 },
}: GapRowProps) {
  const [expanded, setExpanded] = useState(false);

  // U5: smooth fade-in for genuinely new rows.
  // Because React.memo skips re-mounting unchanged rows, this only fires
  // when a row is actually added to the DOM (new gap or rank change).
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const score = computeScore(gap);
  const tm = TYPE_META[gap.type as keyof typeof TYPE_META] ?? { label: "?", color: "text-[#8B949E]", bg: "bg-[#8B949E]/15" };
  const isFreeTier = !!gap._isFreeTier;

  const rowGradient = rowIndex < 3
    ? "linear-gradient(90deg, rgba(63,185,80,0.07) 0%, rgba(63,185,80,0.02) 40%, transparent 100%)"
    : score >= scoreThresholds.high
    ? "linear-gradient(90deg, rgba(63,185,80,0.04) 0%, transparent 60%)"
    : score >= scoreThresholds.med
    ? "linear-gradient(90deg, rgba(210,153,34,0.04) 0%, transparent 60%)"
    : "none";

  return (
    <>
      <tr
        className={`border-b border-[#21262D]/40 transition-colors cursor-pointer select-none ${
          rowIndex < 3
            ? "border-l-2 border-l-[#3FB950]"
            : score >= scoreThresholds.high
            ? "border-l-2 border-l-[#3FB950]/40"
            : score >= scoreThresholds.med
            ? "border-l-2 border-l-[#D29922]/40"
            : "border-l-2 border-l-transparent"
        }`}
        style={{ background: rowGradient, opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
        onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.25)")}
        onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Symbol */}
        <td className="text-[11px] font-mono px-2 py-1 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 text-[#E6EDF3]">
            {expanded
              ? <ChevronDownIcon className="h-3 w-3 text-[#484F58] flex-shrink-0" />
              : <ChevronRightIcon className="h-3 w-3 text-[#484F58] flex-shrink-0" />
            }
            {gap.symbol}
          </span>
        </td>
        {/* Type */}
        <td className="px-2 py-1">
          <span className={`text-[10px] font-mono px-1 py-0 rounded text-center w-[28px] inline-block ${tm.bg} ${tm.color}`}>
            {tm.label}
          </span>
        </td>
        {/* Spread — free tier shows the delayed string with a "~" approximation marker */}
        <td className={`text-[11px] font-mono px-2 py-1 font-medium whitespace-nowrap ${spreadColor(gap.spreadPercent)}`}>
          {isFreeTier ? (
            <span className="inline-flex items-center gap-1">
              {gap._delayedSpread}
              <span className="text-[9px] text-[#D29922] opacity-60">~</span>
            </span>
          ) : (
            formatPercent(gap.spreadPercent, 3)
          )}
        </td>
        {/* Route — free tier shows plain direction text; trader+ shows exchange links */}
        <td className="text-[10px] font-mono px-2 py-1 whitespace-nowrap">
          {isFreeTier ? (
            <span className="text-[#8B949E]">{gap._direction}</span>
          ) : (
            <>
              <ExchangeLink exchangeId={gap.buyExchange} className="text-[#388BFD]">
                {shortEx(gap.buyExchange)}
              </ExchangeLink>
              <span className="text-[#484F58]"> → </span>
              <ExchangeLink exchangeId={gap.sellExchange} className="text-[#F85149]">
                {shortEx(gap.sellExchange)}
              </ExchangeLink>
            </>
          )}
        </td>
        {/* Est. Profit @$1K — simulated profit at $1,000 trade size */}
        <td className="text-[10px] font-mono px-2 py-1 whitespace-nowrap">
          {isFreeTier || !gap.profitSimulation ? (
            <span className="text-[#484F58]">—</span>
          ) : gap.profitSimulation.isProfitable ? (
            <span className="text-[#3FB950]">{fmtUsd(gap.profitSimulation.at1k)}</span>
          ) : (
            <span className="text-[#F85149]">{fmtUsd(gap.profitSimulation.at1k)}</span>
          )}
        </td>
        {/* Duration — unavailable for free tier */}
        <td className={`text-[11px] font-mono px-2 py-1 whitespace-nowrap ${isFreeTier ? "text-[#484F58]" : durationColor(gap.durationMs)}`}>
          {isFreeTier ? "—" : formatDuration(gap.durationMs)}
        </td>
        {/* Score — unavailable for free tier */}
        <td className="px-2 py-1">
          {isFreeTier ? (
            <span className="text-[10px] font-mono text-[#484F58]">—</span>
          ) : (
            <span
              className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded ${
                score >= scoreThresholds.high
                  ? "bg-[#3FB950]/15 text-[#3FB950]"
                  : score >= scoreThresholds.med
                  ? "bg-[#D29922]/15 text-[#D29922]"
                  : "bg-[#484F58]/15 text-[#484F58]"
              }`}
            >
              {score >= scoreThresholds.high ? "HIGH" : score >= scoreThresholds.med ? "MED" : "LOW"}
            </span>
          )}
        </td>
      </tr>
      {expanded && <DepthDetailPanel gap={gap} />}
    </>
  );
}, gapRowPropsEqual);

const TABLE_HEADERS = ["Symbol", "Type", "Spread", "Route", "Est. Profit", "Duration", "Score"];

interface PriceTick {
  symbol?: string; s?: string;
  exchangeId?: string; exchange?: string; e?: string;
  bid?: number; ask?: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FREE_GAP_LIMIT = 10;

export default function IntelligencePage() {
  const { canAccess } = useFeatureGate();
  const isRealtime = canAccess('real_time_data');

  const [stats, setStats] = useState<TradingStats | null>(null);
  const [profitableGaps, setProfitableGaps] = useState<GapRecord[]>([]);
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [loading, setLoading] = useState(true);
  // U6/U7: track first successful load — never set loading→true again on refetch
  const gapsLoadedRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [minSpread, setMinSpread] = useState<number>(0);
  const [filterInput, setFilterInput] = useState<string>("0");
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);
  const [quoteFilter, setQuoteFilter] = useState<"ALL" | "USDT" | "USDC" | "BTC">("ALL");
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandedModal, setExpandedModal] = useState<string | null>(null);
  const closeModal = useCallback(() => setExpandedModal(null), []);

  const [statHistory, setStatHistory] = useState<{
    gaps: number[];
    profitable: number[];
    spread: number[];
    duration: number[];
  }>({ gaps: [], profitable: [], spread: [], duration: [] });

  const [symbolHistory, setSymbolHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    fetch('/api/profitable-gaps')
      .then(r => {
        if (r.ok) setConnectionStatus('connected')
        else setConnectionStatus('error')
      })
      .catch(() => setConnectionStatus('error'))
  }, []);

  const fetchStats = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return; // U4
    try {
      const res = await fetch("/api/trading-stats", { cache: "no-store" });
      if (res.ok) {
        const data: TradingStats = await res.json();
        setStats(data);
        setStatHistory(prev => ({
          gaps:       [...prev.gaps.slice(-20),       data.totalGapsLast1h    ?? 0],
          profitable: [...prev.profitable.slice(-20), data.profitableGapsCount ?? 0],
          spread:     [...prev.spread.slice(-20),     data.avgSpreadPercent    ?? 0],
          duration:   [...prev.duration.slice(-20),   (data.avgGapDurationMs  ?? 0) / 1000],
        }));
      }
    } catch {}
  }, []);

  const fetchProfitable = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return; // U4
    try {
      const res = await fetch("/api/profitable-gaps", { cache: "no-store" });
      // Always clear loading on first attempt regardless of status
      if (!gapsLoadedRef.current) {
        gapsLoadedRef.current = true;
        setLoading(false);
      }
      if (!res.ok) return;
      const json: unknown = await res.json();

      // Defensive unwrap: handle both plain array and wrapped { gaps/data/opportunities: [...] }
      // shapes — mirrors the same pattern Dashboard uses for /api/opportunities.
      const raw: unknown[] = Array.isArray(json)
        ? json
        : ((json as Record<string, unknown>)?.gaps ??
           (json as Record<string, unknown>)?.data ??
           (json as Record<string, unknown>)?.opportunities ??
           []) as unknown[];

      // Normalize both free-tier (4-field) and trader+ response shapes into
      // a uniform GapRecord so the filter and rendering always have valid values.
      const data = normalizeApiGapList(raw) as unknown as GapRecord[];

      const scored = [...data].sort((a, b) => computeScore(b) - computeScore(a));
      setProfitableGaps(scored);
      setLastUpdated(now());
      setSymbolHistory(prev => {
        const next = { ...prev };
        data.forEach(g => {
          const key = g.symbol;
          next[key] = [...(prev[key] || []).slice(-10), g.spreadPercent];
        });
        return next;
      });
    } catch {}
  }, []);

  const fetchAlertConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/alert-config", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.minSpreadPercent === "number") {
        setMinSpread(data.minSpreadPercent);
        setFilterInput(String(data.minSpreadPercent));
      }
    } catch {}
  }, []);

  const fetchPrices = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return; // U4
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const t = Array.isArray(data) ? data : (data.ticks || []);
        setTicks(t);
      }
    } catch {}
  }, []);

  const handleFilterChange = (val: string) => {
    setFilterInput(val);
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(async () => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) return;
      setMinSpread(num);
      try {
        await fetch("/api/alert-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minSpreadPercent: num }),
        });
      } catch {}
    }, 500);
  };

  useEffect(() => {
    fetchStats();
    fetchProfitable();
    fetchAlertConfig();
    fetchPrices();

    const statsInterval     = setInterval(fetchStats,     5_000);
    const profitableInterval = setInterval(fetchProfitable, 3_000);
    const pricesInterval    = setInterval(fetchPrices,    10_000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(profitableInterval);
      clearInterval(pricesInterval);
    };
  }, [fetchStats, fetchProfitable, fetchAlertConfig, fetchPrices]);

  // ── Duration buckets ──
  const buckets = stats?.durationBuckets;
  const bucketTotal = buckets
    ? buckets.under5s + buckets.under30s + buckets.under1m + buckets.under5m + buckets.over5m
    : 0;
  function bucketPct(n: number): number {
    return bucketTotal > 0 ? Math.round((n / bucketTotal) * 100) : 0;
  }
  const pctUnder5s  = buckets ? bucketPct(buckets.under5s) : 0;
  const pctUnder30s = buckets ? bucketPct(buckets.under30s) : 0;
  const pctUnder1m  = buckets ? bucketPct(buckets.under1m) : 0;
  const pctOver1m   = buckets ? bucketPct(buckets.under5m + buckets.over5m) : 0;

  // ── Gap type breakdown ──
  const typeCounts = profitableGaps.reduce((acc, g) => {
    acc[g.type] = (acc[g.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeTotal = profitableGaps.length || 1;
  const cexCount = typeCounts.cex_cex || 0;
  const dexCount = typeCounts.dex_cex || 0;
  const sfCount  = typeCounts.spot_futures || 0;
  const cexPct   = Math.round((cexCount / typeTotal) * 100);
  const dexPct   = Math.round((dexCount / typeTotal) * 100);
  const sfPct    = Math.round((sfCount  / typeTotal) * 100);

  // ── Treemap data (computed for potential future use) ──
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const symbolData = useMemo(() => {
    const bySymbol: Record<string, { count: number; cex: number; dex: number; sf: number; totalSpread: number }> = {};
    profitableGaps.forEach(g => {
      const coin = g.symbol?.split("/")[0] || g.symbol;
      if (!bySymbol[coin]) bySymbol[coin] = { count: 0, cex: 0, dex: 0, sf: 0, totalSpread: 0 };
      bySymbol[coin].count++;
      bySymbol[coin].totalSpread += g.spreadPercent || 0;
      if (g.type === "cex_cex") bySymbol[coin].cex++;
      else if (g.type === "dex_cex") bySymbol[coin].dex++;
      else if (g.type === "spot_futures") bySymbol[coin].sf++;
    });
    return Object.entries(bySymbol)
      .map(([coin, d]) => ({ coin, ...d, avgSpread: d.totalSpread / d.count }))
      .sort((a, b) => b.count - a.count);
  }, [profitableGaps]);

  // ── Spread distribution ──
  const spreadBuckets = useMemo(() => {
    const b = { under01: 0, under02: 0, under03: 0, under05: 0, over05: 0 };
    profitableGaps.forEach(g => {
      const s = g.spreadPercent || 0;
      if (s < 0.1) b.under01++;
      else if (s < 0.2) b.under02++;
      else if (s < 0.3) b.under03++;
      else if (s < 0.5) b.under05++;
      else b.over05++;
    });
    return b;
  }, [profitableGaps]);

  // ── Exchange pricing bias (fixed: handles array or {ticks:[]}) ──
  const pricingBias = useMemo(() => {
    if (ticks.length === 0) return [];
    const bySymbol: Record<string, { ex: string; price: number }[]> = {};
    ticks.forEach(t => {
      const sym = t.symbol || t.s;
      const ex  = t.exchangeId || t.exchange || t.e;
      const mid = ((t.bid || 0) + (t.ask || 0)) / 2;
      if (mid > 0 && ex && sym) {
        if (!bySymbol[sym]) bySymbol[sym] = [];
        bySymbol[sym].push({ ex, price: mid });
      }
    });
    const exStats: Record<string, { below: number; total: number }> = {};
    Object.values(bySymbol).forEach(entries => {
      const avg = entries.reduce((s, e) => s + e.price, 0) / entries.length;
      entries.forEach(({ ex, price }) => {
        if (!exStats[ex]) exStats[ex] = { below: 0, total: 0 };
        exStats[ex].total++;
        if (price < avg) exStats[ex].below++;
      });
    });
    return Object.entries(exStats)
      .filter(([, d]) => d.total >= 3)
      .map(([ex, d]) => ({ ex, cheapPct: Math.round((d.below / d.total) * 100) }))
      .sort((a, b) => b.cheapPct - a.cheapPct)
      .slice(0, 7);
  }, [ticks]);

  // ── Type profitability ──
  const typeProfitability = useMemo(() => {
    const byType: Record<string, { count: number; totalSpread: number; totalDuration: number }> = {};
    profitableGaps.forEach(g => {
      if (!byType[g.type]) byType[g.type] = { count: 0, totalSpread: 0, totalDuration: 0 };
      byType[g.type].count++;
      byType[g.type].totalSpread   += g.spreadPercent || 0;
      byType[g.type].totalDuration += g.durationMs    || 0;
    });
    return (["spot_futures", "dex_cex", "cex_cex"] as const).map(type => ({
      type,
      label: type === "spot_futures" ? "S-F" : type === "dex_cex" ? "DEX" : "CEX",
      color: type === "spot_futures" ? "#A371F7" : type === "dex_cex" ? "#3FB950" : "#388BFD",
      count: byType[type]?.count || 0,
      avgSpread:   byType[type] ? byType[type].totalSpread   / byType[type].count : 0,
      avgDuration: byType[type] ? byType[type].totalDuration / byType[type].count : 0,
    }));
  }, [profitableGaps]);

  // ── Price variance ──
  const priceVariance = useMemo(() => {
    const bySymbol: Record<string, number[]> = {};
    ticks.forEach(t => {
      const sym = t.symbol || t.s;
      const mid = ((t.bid || 0) + (t.ask || 0)) / 2;
      if (mid <= 0 || !sym) return;
      if (!bySymbol[sym]) bySymbol[sym] = [];
      bySymbol[sym].push(mid);
    });
    return Object.entries(bySymbol)
      .filter(([, prices]) => prices.length >= 2)
      .map(([symbol, prices]) => {
        const mn = Math.min(...prices);
        const mx = Math.max(...prices);
        return { symbol: symbol.split("/")[0], variance: ((mx - mn) / mn) * 100 };
      })
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5);
  }, [ticks]);

  // ── Exchange coverage ──
  const exchangeSymbolMap = profitableGaps.reduce((acc, g) => {
    if (!acc[g.buyExchange])  acc[g.buyExchange]  = new Set<string>();
    if (!acc[g.sellExchange]) acc[g.sellExchange] = new Set<string>();
    acc[g.buyExchange].add(g.symbol);
    acc[g.sellExchange].add(g.symbol);
    return acc;
  }, {} as Record<string, Set<string>>);
  const exchangeCoverage = Object.entries(exchangeSymbolMap)
    .map(([name, symbols]) => ({ name, symbols: symbols.size }))
    .sort((a, b) => b.symbols - a.symbols)
    .slice(0, 5);
  const maxExSymbols = exchangeCoverage[0]?.symbols || 1;

  // ── Top assets (from stats) — kept for future use ──
  // const topAssets = stats?.symbolRanking?.slice(0, 8) || [];

  // ── Heatmap matrix: symbol × exchange (best spread per cell) ──
  const HEATMAP_SYMS = ["BTC","ETH","SOL","BNB","XRP","AVAX","ADA","DOT"];
  const HEATMAP_EXS  = ["BIN","BYB","OKX","KUC","GATE","MEXC","HTX","HYP"];

  const heatmapMatrix = useMemo(() => {
    const base = quoteFilter === 'ALL'
      ? profitableGaps
      : profitableGaps.filter(g => (g.quoteCurrency ?? g.symbol?.split('/')[1] ?? 'USDT') === quoteFilter);
    const mx: Record<string, Record<string, { spread: number; count: number }>> = {};
    HEATMAP_SYMS.forEach(s => { mx[s] = {}; });
    base.forEach(g => {
      const coin = g.symbol?.split("/")[0] || g.symbol;
      if (!HEATMAP_SYMS.includes(coin)) return;
      [g.buyExchange, g.sellExchange].forEach(ex => {
        const key = exName(ex);
        if (!HEATMAP_EXS.includes(key)) return;
        const prev = mx[coin]?.[key];
        if (!prev || g.spreadPercent > prev.spread) {
          mx[coin][key] = { spread: g.spreadPercent, count: (prev?.count ?? 0) + 1 };
        }
      });
    });
    return mx;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profitableGaps, quoteFilter]);

  function heatCellStyle(spread: number): { bg: string; border: string } {
    if (!spread)       return { bg: "linear-gradient(135deg, rgba(22,27,34,0.6) 0%, rgba(13,17,23,0.8) 100%)", border: "rgba(33,38,45,0.35)" };
    if (spread < 0.10) return { bg: "linear-gradient(135deg, rgba(63,185,80,0.10) 0%, rgba(63,185,80,0.04) 100%)", border: "rgba(63,185,80,0.25)" };
    if (spread < 0.20) return { bg: "linear-gradient(135deg, rgba(63,185,80,0.24) 0%, rgba(63,185,80,0.12) 100%)", border: "rgba(63,185,80,0.42)" };
    if (spread < 0.30) return { bg: "linear-gradient(135deg, rgba(63,185,80,0.42) 0%, rgba(63,185,80,0.22) 100%)", border: "rgba(63,185,80,0.58)" };
    if (spread < 0.40) return { bg: "linear-gradient(135deg, rgba(63,185,80,0.60) 0%, rgba(63,185,80,0.36) 100%)", border: "rgba(63,185,80,0.75)" };
    return                    { bg: "linear-gradient(135deg, rgba(63,185,80,0.80) 0%, rgba(63,185,80,0.55) 100%)", border: "rgba(63,185,80,0.92)" };
  }

  // ── Leaderboard from profitable gaps only (FIX 1) ──
  const leaderboard = useMemo(() => {
    const base = quoteFilter === 'ALL'
      ? profitableGaps
      : profitableGaps.filter(g => (g.quoteCurrency ?? g.symbol?.split('/')[1] ?? 'USDT') === quoteFilter);
    const bySymbol: Record<string, { count: number; maxSpread: number }> = {};
    base.forEach(g => {
      const coin = g.symbol?.split("/")[0] || g.symbol || "";
      if (!bySymbol[coin]) bySymbol[coin] = { count: 0, maxSpread: 0 };
      bySymbol[coin].count++;
      bySymbol[coin].maxSpread = Math.max(bySymbol[coin].maxSpread, g.spreadPercent || 0);
    });
    return Object.entries(bySymbol)
      .map(([coin, d]) => ({ coin, count: d.count, maxSpread: d.maxSpread }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [profitableGaps, quoteFilter]);

  // ── Score thresholds — dynamic percentile-based (FIX 6) ──
  const scoreThresholds = useMemo(() => {
    const scores = profitableGaps.map(g => computeScore(g)).filter(s => s > 0);
    if (scores.length < 5) return { high: 55, med: 45 };
    const sorted = [...scores].sort((a, b) => b - a);
    return {
      high: sorted[Math.floor(sorted.length * 0.2)] ?? 55,
      med:  sorted[Math.floor(sorted.length * 0.6)] ?? 45,
    };
  }, [profitableGaps]);

  // ── Seed sparklines on first load (FIX 5) ──
  useEffect(() => {
    if (statHistory.profitable.length === 0 && (stats?.profitableGapsCount ?? 0) > 0) {
      const gDet = stats?.totalGapsLast1h ?? 0;
      const prof = stats?.profitableGapsCount ?? 0;
      const sprd = stats?.avgSpreadPercent ?? 0;
      const dur  = (stats?.avgGapDurationMs ?? 0) / 1000;
      setStatHistory({
        gaps:       Array(5).fill(gDet),
        profitable: Array(5).fill(prof),
        spread:     Array(5).fill(sprd),
        duration:   Array(5).fill(dur),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.profitableGapsCount, stats?.totalGapsLast1h]);

  // ── Quote currency counts (for pill badges) ──
  const quoteCounts = useMemo(() => {
    const base = profitableGaps.filter(g => g.spreadPercent >= minSpread);
    const count = (q: string) => base.filter(g => (g.quoteCurrency ?? g.symbol?.split('/')[1] ?? 'USDT') === q).length;
    return { USDT: count('USDT'), USDC: count('USDC'), BTC: count('BTC') };
  }, [profitableGaps, minSpread]);

  // ── Filtered gaps ──
  const allFilteredGaps = profitableGaps
    .filter(g => g.spreadPercent >= minSpread)
    .filter(g => filterSymbol ? g.symbol?.startsWith(filterSymbol) : true)
    .filter(g => quoteFilter === 'ALL' ? true : (g.quoteCurrency ?? g.symbol?.split('/')[1] ?? 'USDT') === quoteFilter);

  // Free users see only first 10 rows; remaining are blurred
  const filteredGaps = isRealtime ? allFilteredGaps : allFilteredGaps.slice(0, FREE_GAP_LIMIT);
  const hasHiddenGaps = !isRealtime && allFilteredGaps.length > FREE_GAP_LIMIT;
  const hiddenCount = hasHiddenGaps ? allFilteredGaps.length - FREE_GAP_LIMIT : 0;


  // ── Spread histogram config ──
  const maxBucket = Math.max(
    spreadBuckets.under01, spreadBuckets.under02, spreadBuckets.under03,
    spreadBuckets.under05, spreadBuckets.over05, 1
  );
  const spreadHistBuckets = [
    { key: "under01", count: spreadBuckets.under01, label: "<0.1",    bg: "linear-gradient(180deg, rgba(248,81,73,0.35) 0%, rgba(248,81,73,0.12) 100%)",  border: "rgba(248,81,73,0.45)",  color: "#F85149" },
    { key: "under02", count: spreadBuckets.under02, label: "0.1-0.2", bg: "linear-gradient(180deg, rgba(210,153,34,0.35) 0%, rgba(210,153,34,0.12) 100%)", border: "rgba(210,153,34,0.45)", color: "#D29922" },
    { key: "under03", count: spreadBuckets.under03, label: "0.2-0.3", bg: "linear-gradient(180deg, rgba(63,185,80,0.42) 0%, rgba(63,185,80,0.15) 100%)",   border: "rgba(63,185,80,0.55)",  color: "#3FB950" },
    { key: "under05", count: spreadBuckets.under05, label: "0.3-0.5", bg: "linear-gradient(180deg, rgba(63,185,80,0.55) 0%, rgba(63,185,80,0.22) 100%)",   border: "rgba(63,185,80,0.65)",  color: "#3FB950" },
    { key: "over05",  count: spreadBuckets.over05,  label: ">0.5",    bg: "linear-gradient(180deg, rgba(56,139,253,0.38) 0%, rgba(56,139,253,0.12) 100%)", border: "rgba(56,139,253,0.45)", color: "#388BFD" },
  ];
  const tallestBucketKey = spreadHistBuckets.reduce(
    (prev, curr) => curr.count > prev.count ? curr : prev,
    spreadHistBuckets[0]
  ).key;

  // ── Type profitability rank helpers ──
  const profitTypes   = typeProfitability.filter(t => t.count > 0);
  const maxSpreadType = profitTypes.length ? profitTypes.reduce((a, b) => a.avgSpread > b.avgSpread ? a : b).type : "";
  const minSpreadType = profitTypes.length > 1 ? profitTypes.reduce((a, b) => a.avgSpread < b.avgSpread ? a : b).type : "";

  // ── Stat cards — identical card style to Dashboard ──
  const _gapsDetected   = stats?.totalGapsLast1h ?? 0;
  const _gaps24h        = stats?.totalGapsLast24h ?? 0;
  const _profCount      = stats?.profitableGapsCount ?? 0;
  const _profRate       = stats?.profitableGapsPercent ?? 0;
  const _avgSpread      = stats?.avgSpreadPercent ?? 0;
  const _bestSpreadVal  = stats?.bestSpreadSeen?.spreadPercent ?? 0;
  const _bestSpreadSym  = stats?.bestSpreadSeen?.symbol ?? "";

  const intelStatCards = [
    {
      label: "Gaps Detected",
      value: _gapsDetected > 0 ? formatNumber(_gapsDetected) : "—",
      subtitle: `${_gaps24h > 0 ? formatNumber(_gaps24h) : "—"} last 24h`,
      glow: "bg-[#3FB950]/5", glowBorder: _gapsDetected > 0 ? "hover:border-[#3FB950]/40" : "",
      pulse: _gapsDetected > 0, pulseColor: "#3FB950",
      valueColor: _gapsDetected > 0 ? "text-[#3FB950]" : "text-[#E6EDF3]",
    },
    {
      label: "Profitable",
      value: _profCount > 0 ? formatNumber(_profCount) : "—",
      subtitle: `${_profRate}% conversion rate`,
      glow: _profCount > 0 ? "bg-[#3FB950]/5" : "bg-transparent",
      glowBorder: _profCount > 0 ? "hover:border-[#3FB950]/40" : "",
      pulse: _profCount > 0, pulseColor: "#3FB950",
      valueColor: _profCount > 0 ? "text-[#3FB950]" : "text-[#E6EDF3]",
    },
    {
      label: "Avg Net Spread",
      value: _avgSpread > 0 ? formatPercent(_avgSpread, 3) : "—",
      subtitle: "after fees",
      glow: _avgSpread >= 0.2 ? "bg-[#3FB950]/5" : _avgSpread > 0 ? "bg-[#D29922]/5" : "bg-transparent",
      glowBorder: _avgSpread >= 0.2 ? "hover:border-[#3FB950]/40" : "",
      pulse: false, pulseColor: "#3FB950",
      valueColor: _avgSpread >= 0.2 ? "text-[#3FB950]" : _avgSpread >= 0.05 ? "text-[#D29922]" : "text-[#E6EDF3]",
    },
    {
      label: "Best Spread",
      value: _bestSpreadVal > 0 ? formatPercent(_bestSpreadVal, 3) : "—",
      subtitle: _bestSpreadSym || "no data yet",
      glow: _bestSpreadVal > 0 ? "bg-[#388BFD]/5" : "bg-transparent",
      glowBorder: _bestSpreadVal > 0 ? "hover:border-[#388BFD]/40" : "",
      pulse: _bestSpreadVal >= 0.5, pulseColor: "#388BFD",
      valueColor: _bestSpreadVal >= 0.5 ? "text-[#388BFD]" : _bestSpreadVal >= 0.2 ? "text-[#3FB950]" : "text-[#E6EDF3]",
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0D1117] text-[#E6EDF3]">

      {/* ── Top nav — identical structure to Dashboard ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[#161B22] border-b border-[#21262D] shrink-0">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-[14px] font-medium font-sans text-[#388BFD]">Arbitrage Terminal</span>
          <span className="text-[#484F58] select-none mx-1">|</span>
          <span className="text-[12px] text-[#484F58] font-mono">v0.7.4</span>
        </div>
        <div className="flex items-center gap-1 text-xs overflow-x-auto">
          <div className="flex items-center gap-1 mr-2">
            <span className="animate-pulse bg-[#3FB950] rounded-full w-1.5 h-1.5" />
            <span className="text-[#3FB950] font-mono text-[11px]">LIVE</span>
          </div>
          {!isRealtime && (
            <span className="text-[10px] font-mono text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/30 rounded px-1.5 py-0.5 mr-1">
              DELAYED 15s
            </span>
          )}
          {connectionStatus === 'connecting' && (
            <span className="text-[#D29922] font-mono text-[11px] mr-1">Connecting…</span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-[#F85149] font-mono text-[11px] mr-1">Backend unavailable</span>
          )}
          <Link href="/intelligence" className="px-2 py-0.5 rounded bg-[#388BFD]/15 text-[#388BFD] font-medium text-[11px] whitespace-nowrap">
            Intelligence
          </Link>
          <Link href="/magnus" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px] whitespace-nowrap">
            Magnus
          </Link>
          <Link href="/dex" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px] whitespace-nowrap">
            DEX Markets
          </Link>
          <Link href="/funding-rates" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px] whitespace-nowrap">
            Funding Rates
          </Link>
          <Link href="/dashboard" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px] whitespace-nowrap">
            Dashboard
          </Link>
          <Link href="/settings" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="Settings">
            <SettingsIcon className="h-3.5 w-3.5" />
          </Link>
          <NavAuthButton />
        </div>
      </header>

      {/* ── 3-column layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ════ LEFT SIDEBAR ════ */}
        <aside
          className="hidden lg:flex flex-col flex-shrink-0 h-full bg-[#0D1117] border-r border-[#21262D] overflow-y-auto"
          style={{ width: 200 }}
        >
          {/* Quote filter tabs — ALL | USDT | USDC | BTC */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#21262D] shrink-0">
            {(["ALL", "USDT", "USDC", "BTC"] as const).map(q => (
              <button key={q}
                onClick={() => setQuoteFilter(q)}
                className="flex-1 text-[10px] font-mono rounded py-0.5 transition-colors duration-150"
                style={{
                  background: quoteFilter === q ? "#388BFD22" : "transparent",
                  color:      quoteFilter === q ? "#388BFD"   : "#484F58",
                  border:     quoteFilter === q ? "1px solid #388BFD44" : "1px solid transparent",
                }}
              >{q}</button>
            ))}
          </div>

          {/* Live counts */}
          <div className="px-2 py-2 border-b border-[#21262D] shrink-0">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#161B22] border border-[#21262D] rounded p-1.5 text-center">
                <div className="text-[16px] text-[#3FB950] font-mono font-medium leading-none">{formatNumber(stats?.totalGapsLast1h ?? 0)}</div>
                <div className="text-[9px] text-[#484F58] font-mono mt-0.5">gaps/hr</div>
              </div>
              <div className="bg-[#161B22] border border-[#21262D] rounded p-1.5 text-center">
                <div className="text-[16px] text-[#E6EDF3] font-mono font-medium leading-none">{profitableGaps.length}</div>
                <div className="text-[9px] text-[#484F58] font-mono mt-0.5">tracked</div>
              </div>
            </div>
          </div>

          {/* Top Routes */}
          <div className="px-2 py-2 border-b border-[#21262D] shrink-0">
            <div className="text-[10px] font-sans text-[#484F58] mb-1.5">Top Routes</div>
            {!stats?.exchangePairRanking?.length ? (
              <div className="text-[10px] text-[#484F58] font-mono">Loading…</div>
            ) : (
              <div className="space-y-1">
                {stats.exchangePairRanking.slice(0, 5).map((pair, i) => (
                  <div key={`${pair.buyExchange}-${pair.sellExchange}`}
                    className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono text-[#484F58] w-3">{i + 1}</span>
                      <span className="text-[10px] font-mono">
                        <span className="text-[#388BFD]">{shortEx(pair.buyExchange)}</span>
                        <span className="text-[#484F58]">→</span>
                        <span className="text-[#F85149]">{shortEx(pair.sellExchange)}</span>
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono ${i < 2 ? "text-[#3FB950]" : "text-[#8B949E]"}`}>{pair.gapCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gap Type Breakdown */}
          <div className="px-2 py-2 border-b border-[#21262D] shrink-0">
            <div className="text-[10px] font-sans text-[#484F58] mb-1.5">Gap Types</div>
            <div className="space-y-2">
              {[
                { label: "CEX-CEX", count: cexCount, pct: cexPct, color: "#388BFD", grad: "linear-gradient(90deg, rgba(56,139,253,0.8) 0%, rgba(56,139,253,0.3) 100%)" },
                { label: "DEX-CEX", count: dexCount, pct: dexPct, color: "#3FB950", grad: "linear-gradient(90deg, rgba(63,185,80,0.8) 0%, rgba(63,185,80,0.3) 100%)" },
                { label: "Spot-Fut", count: sfCount,  pct: sfPct,  color: "#A371F7", grad: "linear-gradient(90deg, rgba(163,113,247,0.8) 0%, rgba(163,113,247,0.3) 100%)" },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] font-mono text-[#8B949E]">{row.label}</span>
                    <span className="text-[10px] font-mono" style={{ color: row.color }}>{row.pct}%</span>
                  </div>
                  <div className="h-[3px] bg-[#21262D] rounded overflow-hidden">
                    <div className="h-full rounded transition-all duration-500" style={{ width: `${row.pct}%`, background: row.grad }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Magnus compact card */}
          <div className="px-2 py-2 border-b border-[#21262D] shrink-0">
            <MagnusAICard />
          </div>

          {/* Ad */}
          <div className="mt-auto px-2 py-2 shrink-0">
            <AdBanner zone="contextual-signal" context={{ exchange: "okx" }} />
          </div>
        </aside>

        {/* ════ CENTER MAIN ════ */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden p-3 gap-2">

          {/* Ad pill */}
          <div className="shrink-0">
            <AdBanner zone="pill" />
          </div>

          {/* 4 Stat cards — IDENTICAL to Dashboard card style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
            {intelStatCards.map(card => (
              <div key={card.label}
                className={`relative bg-gradient-to-br from-[#161B22] to-[#0D1117] border border-[#21262D] rounded-lg p-2.5 overflow-hidden transition-colors ${card.glowBorder}`}
              >
                <div className={`absolute top-0 right-0 w-12 h-12 rounded-full blur-xl pointer-events-none ${card.glow}`} />
                {card.pulse && (
                  <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: card.pulseColor }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: card.pulseColor }} />
                  </span>
                )}
                <div className="flex items-start justify-between mb-0.5">
                  <span className="text-[11px] font-sans text-[#8B949E]">{card.label}</span>
                </div>
                <div className={`text-[20px] font-mono font-medium tabular-nums mt-0.5 ${card.valueColor}`}>{card.value}</div>
                <div className="text-[11px] text-[#484F58] font-sans truncate mt-0.5">{card.subtitle}</div>
              </div>
            ))}
          </div>

          {/* 3-column widget row — Heatmap | Spread Dist | Type Profit */}
          <div className="shrink-0 grid gap-2" style={{ gridTemplateColumns: "5fr 3fr 2.5fr", height: 172 }}>

            {/* Heatmap */}
            <ErrorBoundary name="Arbitrage heatmap">
            <div className="border border-[#21262D] rounded-lg overflow-hidden flex flex-col p-1.5"
              style={{ background: "linear-gradient(180deg, #1C2128 0%, #0D1117 100%)" }}>
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Arb Heatmap · click to filter</span>
                <div className="flex items-center gap-1">
                  <InfoCorner text={TIP.heatmap} />
                  {filterSymbol && (
                    <button onClick={() => setFilterSymbol(null)}
                      className="text-[8px] font-mono text-[#F85149] hover:opacity-80 px-1">✕{filterSymbol}</button>
                  )}
                  <button onClick={() => setExpandedModal("heatmap")} className="text-[#484F58] hover:text-[#E6EDF3] transition-colors" title="Expand heatmap">
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {profitableGaps.length === 0 ? (
                <div className="flex-1 flex flex-col gap-[3px] p-1 justify-center">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-[2px]" style={{ opacity: 0.4 + i * 0.05 }}>
                      <div className="w-[28px] h-[11px] rounded-sm bg-[#21262D] animate-pulse flex-shrink-0" />
                      {[...Array(6)].map((__, j) => (
                        <div key={j} className="flex-1 h-[11px] rounded-sm bg-[#21262D] animate-pulse" style={{ animationDelay: `${(i + j) * 60}ms` }} />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  <div className="flex mb-[2px]" style={{ marginLeft: 30 }}>
                    {HEATMAP_EXS.map(ex => (
                      <div key={ex} className="flex-1 text-center">
                        <span className="text-[7px] font-mono text-[#484F58] tracking-wide">{ex}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    {HEATMAP_SYMS.map(sym => {
                      const isSelected = filterSymbol === sym;
                      return (
                        <div key={sym} className="flex items-center gap-[2px]">
                          <span
                            className={`text-[8px] font-mono text-right pr-1 flex-shrink-0 cursor-pointer ${isSelected ? "text-[#3FB950]" : "text-[#8B949E]"}`}
                            style={{ width: 28 }}
                            onClick={() => setFilterSymbol(prev => prev === sym ? null : sym)}
                          >
                            {sym}
                          </span>
                          {/* Exchange cells */}
                          {HEATMAP_EXS.map(ex => {
                            const cell = heatmapMatrix[sym]?.[ex];
                            const { bg, border } = heatCellStyle(cell?.spread ?? 0);
                            return (
                              <div
                                key={ex}
                                title={cell ? `${sym} · ${ex}: ${cell.spread.toFixed(3)}%` : `${sym} · ${ex}: no gap`}
                                className="flex-1 rounded-sm cursor-pointer transition-all duration-150 hover:brightness-150"
                                style={{
                                  height: 13,
                                  background: bg,
                                  border: `0.5px solid ${border}`,
                                  outline: isSelected ? "1px solid rgba(56,139,253,0.5)" : "none",
                                }}
                                onClick={() => setFilterSymbol(prev => prev === sym ? null : sym)}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-1 mt-1" style={{ marginLeft: 30 }}>
                    <span className="text-[7px] font-mono text-[#484F58]">low</span>
                    {[0.05, 0.15, 0.25, 0.35, 0.45].map(v => {
                      const { bg, border } = heatCellStyle(v);
                      return (
                        <div key={v} className="rounded-sm" style={{ width: 12, height: 7, background: bg, border: `0.5px solid ${border}` }} />
                      );
                    })}
                    <span className="text-[7px] font-mono text-[#3FB950]">high</span>
                  </div>
                </div>
              )}
            </div>
            </ErrorBoundary>

            {/* Spread Distribution */}
            <ErrorBoundary name="Spread distribution">
            <div className="border border-[#21262D] rounded-lg overflow-hidden flex flex-col p-1.5"
              style={{ background: "linear-gradient(180deg, #1C2128 0%, #0D1117 100%)" }}>
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Spread Dist</span>
                <div className="flex items-center gap-1">
                  <InfoCorner text={TIP.spreadDist} />
                  <button onClick={() => setExpandedModal("spread")} className="text-[#484F58] hover:text-[#E6EDF3] transition-colors">
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {profitableGaps.length === 0 ? (
                <div className="flex items-end gap-[2px] flex-1 px-1 pb-1">
                  {[40, 70, 100, 80, 55].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-[#21262D] animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-[2px] flex-1 min-h-0">
                    {spreadHistBuckets.map(b => (
                      <div key={b.key} className="flex flex-col items-center flex-1 h-full justify-end">
                        <span className="font-mono text-[#8B949E] mb-0.5 leading-none text-[8px]">{b.count > 0 ? b.count : ""}</span>
                        <div className="w-full rounded-t"
                          style={{ height: `${Math.max(2, (b.count / maxBucket) * 50)}px`, background: b.bg, border: `0.5px solid ${b.border}` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex mt-1 flex-shrink-0">
                    {spreadHistBuckets.map(b => (
                      <span key={b.key} className="flex-1 text-center text-[8px] font-mono" style={{ color: b.color }}>{b.label}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
            </ErrorBoundary>

            {/* Type Profit */}
            <ErrorBoundary name="Type profitability">
            <div className="border border-[#21262D] rounded-lg overflow-hidden flex flex-col p-1.5"
              style={{ background: "linear-gradient(180deg, #1C2128 0%, #0D1117 100%)" }}>
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Type Profit</span>
                <InfoCorner text={TIP.typeProfitability} />
              </div>
              {profitableGaps.length === 0 ? (
                <WidgetSkeleton type="list" rows={3} />
              ) : (
                <div className="flex-1 space-y-2 pt-1">
                  {typeProfitability.map(t => {
                    const maxSp = Math.max(...typeProfitability.map(x => x.avgSpread), 0.01);
                    const barPct = t.count > 0 ? (t.avgSpread / maxSp) * 100 : 0;
                    return (
                      <div key={t.type}>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[9px] font-mono font-medium" style={{ color: t.color }}>{t.label}</span>
                          <span className="text-[8px] font-mono text-[#8B949E]">{t.count > 0 ? formatPercent(t.avgSpread, 2) : "—"}</span>
                        </div>
                        <div className="h-[4px] bg-[#21262D] rounded overflow-hidden">
                          <div className="h-full rounded transition-all duration-500"
                            style={{ width: `${barPct}%`, background: t.color,
                              boxShadow: t.type === maxSpreadType ? `0 0 4px ${t.color}60` : "none" }} />
                        </div>
                        <div className="text-[7px] font-mono text-[#484F58] mt-0.5">{t.count} gaps</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </ErrorBoundary>

          </div>{/* end 3-col widget row */}

          {/* Live signals subtitle — matches Dashboard */}
          <div className="flex justify-between items-center shrink-0">
            <span className="text-[11px] text-[#8B949E] font-sans">
              Live gaps · polled every 3s · net spread after all fees
            </span>
            <span className="text-[11px] text-[#484F58] font-sans hidden lg:block">
              click any row to expand orderbook →
            </span>
          </div>

          {/* ── Live gaps table ── */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1">

            {/* Market filter tabs + toolbar on one line — matching Dashboard style */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                {(["ALL", "USDT", "USDC", "BTC"] as const).map(q => {
                  const isActive = quoteFilter === q;
                  const count = q === "ALL" ? profitableGaps.filter(g => g.spreadPercent >= minSpread).length : quoteCounts[q];
                  return (
                    <button key={q} onClick={() => setQuoteFilter(q)}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors"
                      style={{
                        background:  isActive ? "rgba(63,185,80,0.12)" : "transparent",
                        color:       isActive ? "#3FB950" : "#484F58",
                        borderColor: isActive ? "rgba(63,185,80,0.35)" : "rgba(33,38,45,0.8)",
                      }}
                    >{q} <span style={{ opacity: 0.7 }}>({count})</span></button>
                  );
                })}
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-[9px] font-mono text-[#484F58]">MIN</span>
                  <input type="number" step="0.01" min="0" value={filterInput}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-10 text-[10px] font-mono bg-[#0D1117] border border-[#21262D] rounded px-1 py-0 text-center text-[#E6EDF3] focus:outline-none focus:border-[#388BFD] transition-colors"
                    style={{ height: 20 }} />
                  <span className="text-[9px] font-mono text-[#484F58]">%</span>
                </div>
                {filterSymbol && (
                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-[9px] font-mono bg-[#3FB950]/10 border border-[#3FB950]/25 text-[#3FB950] px-1.5 rounded">{filterSymbol}</span>
                    <button onClick={() => setFilterSymbol(null)} className="text-[#484F58] hover:text-[#F85149] text-[9px] transition-colors">✕</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#3FB950]">Live gaps</span>
                  <span className="text-[9px] font-mono bg-[#3FB950]/10 border border-[#3FB950]/20 text-[#3FB950] px-1.5 rounded">{filteredGaps.length}</span>
                  <span className="text-[9px] font-mono text-[#484F58]">{lastUpdated}</span>
                </div>
                <button onClick={() => setExpandedModal("table")}
                  className="flex items-center gap-1 text-[9px] font-mono text-[#484F58] hover:text-[#388BFD] transition-colors">
                  <Maximize2 className="h-3 w-3" />
                  <span>Full view</span>
                </button>
              </div>
            </div>

            {/* Scrollable table */}
            <ErrorBoundary name="Gaps table">
              {loading ? (
                <div className="flex-1 min-h-0 border border-[#21262D] rounded overflow-hidden" style={{ background: "linear-gradient(180deg, #161B22 0%, #0D1117 100%)" }}>
                  <WidgetSkeleton type="table" rows={8} />
                </div>
              ) : filteredGaps.length === 0 && allFilteredGaps.length === 0 ? (
                <div className="flex-1 min-h-0 border border-[#21262D] rounded overflow-hidden" style={{ background: "linear-gradient(180deg, #161B22 0%, #0D1117 100%)" }}>
                  <EmptyState
                    title="No arbitrage gaps detected"
                    subtitle={filterSymbol
                      ? `No ${filterSymbol} gaps above ${minSpread}% — click Clear to reset filter`
                      : "Gaps appear when price differences exceed fees"}
                  />
                </div>
              ) : (
                <div
                  className="flex-1 min-h-0 relative border border-[#21262D] rounded overflow-hidden flex flex-col"
                  style={{ background: "linear-gradient(180deg, #161B22 0%, #0D1117 100%)" }}
                >
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full min-w-[560px]">
                      <thead className="sticky top-0 z-10" style={{ background: "linear-gradient(180deg, #1C2128 0%, #161B22 100%)" }}>
                        <tr className="border-b border-[#21262D]">
                          {TABLE_HEADERS.map((h) => (
                            <th
                              key={h}
                              className="text-left text-[9px] uppercase tracking-widest font-mono font-medium text-[#484F58] px-2 py-1.5 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGaps.map((gap, i) => (
                          <GapRow key={gap.id} gap={gap} rowIndex={i} symHistory={symbolHistory} scoreThresholds={scoreThresholds} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Free user blur overlay — shown when there are hidden gaps */}
                  {hasHiddenGaps && (
                    <div className="flex-shrink-0 relative">
                      {/* Blur gradient over phantom rows */}
                      <div className="h-16 bg-gradient-to-b from-transparent to-[#161B22] pointer-events-none" />
                      <div className="px-3 py-3 bg-[#161B22] border-t border-[#21262D] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#484F58]">
                          +{hiddenCount} gaps hidden · upgrade for full access
                        </span>
                        <a
                          href="/pricing"
                          className="text-[11px] font-mono text-[#238636] hover:text-[#3FB950] border border-[#238636]/40 hover:border-[#3FB950] rounded px-2.5 py-0.5 transition-colors"
                        >
                          View plans →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ErrorBoundary>

            {/* Footer note */}
            <p className="text-[11px] text-[#484F58] font-sans text-right shrink-0 hidden lg:block">
              All spreads net of taker fees + withdrawal fees · Notional trade size $1,000 USDT
            </p>
          </div>
        </main>

        {/* ════ RIGHT SIDEBAR ════ */}
        <aside className="hidden lg:flex flex-col flex-shrink-0 h-full bg-[#161B22] border-l border-[#21262D] overflow-y-auto"
          style={{ width: 220 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262D] shrink-0">
              <span className="text-[11px] font-sans text-[#8B949E]">Intelligence</span>
            </div>

            {/* Most Gapped Assets — compact mini-rows matching Dashboard active-gaps style */}
            <ErrorBoundary name="Most gapped assets">
            <div className="border-b border-[#21262D]/50 px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Most Gapped</span>
                  <InfoCorner text={TIP.mostGapped} />
                </div>
                <button onClick={() => setExpandedModal("leaderboard")} className="text-[#484F58] hover:text-[#388BFD] transition-colors">
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
              {!leaderboard.length ? (
                <WidgetSkeleton type="list" rows={5} />
              ) : (
                <div>
                  {leaderboard.map((item, i) => (
                    <div key={item.coin} className="flex items-center gap-1.5 hover:bg-[#1C2128]/60" style={{ height: 20 }}>
                      <span className={`text-[9px] font-mono w-3 text-right flex-shrink-0 ${i === 0 ? "text-[#D29922]" : "text-[#484F58]"}`}>{i + 1}</span>
                      <span className={`text-[10px] font-mono flex-1 ${i === 0 ? "text-[#E6EDF3] font-medium" : i < 3 ? "text-[#C9D1D9]" : "text-[#8B949E]"}`}>
                        {item.coin}
                      </span>
                      <span className="text-[10px] font-mono text-[#3FB950] w-5 text-right">{item.count}</span>
                      <span className="text-[9px] font-mono text-[#484F58] w-10 text-right">{item.maxSpread.toFixed(3)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </ErrorBoundary>

            {/* Price Variance */}
            <ErrorBoundary name="Price variance">
            <div className="border-b border-[#21262D]/50 px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Price Variance</span>
                  <InfoCorner text={TIP.priceVariance} />
                </div>
                <button onClick={() => setExpandedModal("priceVariance")} className="text-[#484F58] hover:text-[#388BFD] transition-colors">
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
              {priceVariance.length === 0 ? (
                <div className="text-[9px] font-mono text-[#484F58] py-1 text-center">Calculating…</div>
              ) : (
                <div className="space-y-0">
                  {priceVariance.map((item, i) => {
                    const isExtreme = item.variance > 5;
                    const barWidth  = priceVariance[0].variance > 0 ? (item.variance / priceVariance[0].variance) * 100 : 0;
                    return (
                      <div key={item.symbol} className="flex items-center gap-1 py-[1px]" style={{ height: "20px" }}>
                        <span className={`text-[10px] font-mono w-[40px] flex-shrink-0 ${isExtreme ? "text-[#F85149]" : i < 2 ? "text-[#D29922]" : "text-[#8B949E]"}`}>
                          {item.symbol}
                        </span>
                        <div className="flex-1 h-[4px] bg-[#21262D] rounded overflow-hidden">
                          <div className="h-full rounded"
                            style={{ width: `${barWidth}%`, background: isExtreme ? "linear-gradient(90deg, #3FB950, #F85149)" : i < 2 ? "#D29922" : "#484F58" }} />
                        </div>
                        <span className={`text-[10px] font-mono w-[30px] text-right flex-shrink-0 ${isExtreme ? "text-[#F85149]" : i < 2 ? "text-[#D29922]" : "text-[#8B949E]"}`}>
                          {item.variance.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </ErrorBoundary>

            {/* Exchange Coverage */}
            <ErrorBoundary name="Exchange coverage">
            <div className="border-b border-[#21262D]/50 px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Exchange Coverage</span>
                <InfoCorner text={TIP.exchangeCoverage} />
              </div>
              {exchangeCoverage.length === 0 ? (
                <WidgetSkeleton type="list" rows={4} />
              ) : (
                <div className="space-y-0">
                  {exchangeCoverage.map((ex, i) => (
                    <div key={ex.name} className="flex items-center gap-1 py-[1px]" style={{ height: "20px" }}>
                      <span className={`text-[10px] font-mono flex-shrink-0 ${i < 3 ? "text-[#E6EDF3]" : "text-[#8B949E]"}`} style={{ width: "32px" }}>
                        {shortEx(ex.name)}
                      </span>
                      <div className="flex-1 h-[4px] bg-[#21262D] rounded overflow-hidden">
                        <div className="h-full rounded transition-all duration-500"
                          style={{ width: `${Math.round((ex.symbols / maxExSymbols) * 100)}%`,
                            background: i < 3 ? "linear-gradient(90deg, rgba(63,185,80,0.5), #3FB950)" : i < 6 ? "linear-gradient(90deg, rgba(56,139,253,0.4), #388BFD)" : "rgba(139,148,158,0.4)" }} />
                      </div>
                      <span className={`text-[10px] font-mono ${i < 3 ? "text-[#3FB950]" : "text-[#8B949E]"}`} style={{ width: "18px", textAlign: "right" }}>
                        {ex.symbols}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </ErrorBoundary>

            {/* Magnus AI card */}
            <div className="px-2 py-2">
              <MagnusAICard />
            </div>
        </aside>

      </div>

      {/* ══════════════════════════════════════════════════════════
           EXPANDED MODAL — overlays everything, background stays
         ══════════════════════════════════════════════════════════ */}

      {/* Heatmap modal */}
      {expandedModal === "heatmap" && (
        <ExpandedModal title="Arb Heatmap" subtitle="symbol × exchange · click cell to filter" onClose={closeModal} wide>
          <div className="p-4">
            {profitableGaps.length === 0 ? (
              <EmptyState title="Waiting for gap data" subtitle="Heatmap populates as gaps are detected" />
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex" style={{ marginLeft: 56 }}>
                  {HEATMAP_EXS.map(ex => (
                    <div key={ex} className="flex-1 text-center">
                      <span className="text-[10px] font-mono text-[#8B949E] tracking-wide">{ex}</span>
                    </div>
                  ))}
                </div>
                {HEATMAP_SYMS.map(sym => {
                  const isSelected = filterSymbol === sym;
                  return (
                    <div key={sym} className="flex items-center gap-1">
                      <span
                        className={`text-[11px] font-mono text-right pr-2 flex-shrink-0 cursor-pointer ${isSelected ? "text-[#3FB950]" : "text-[#8B949E]"}`}
                        style={{ width: 54 }}
                        onClick={() => setFilterSymbol(prev => prev === sym ? null : sym)}
                      >
                        {sym}
                      </span>
                      {HEATMAP_EXS.map(ex => {
                        const cell = heatmapMatrix[sym]?.[ex];
                        const { bg, border } = heatCellStyle(cell?.spread ?? 0);
                        return (
                          <div
                            key={ex}
                            title={cell ? `${sym} · ${ex}: ${cell.spread.toFixed(3)}% spread` : `${sym} · ${ex}: no gap`}
                            className="flex-1 rounded cursor-pointer transition-all hover:brightness-150 flex items-center justify-center"
                            style={{ height: 32, background: bg, border: `1px solid ${border}`, outline: isSelected ? "1px solid rgba(56,139,253,0.5)" : "none" }}
                            onClick={() => { setFilterSymbol(prev => prev === sym ? null : sym); closeModal(); }}
                          >
                            {cell && <span className="text-[9px] font-mono text-white/70">{cell.spread.toFixed(2)}%</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 mt-2" style={{ marginLeft: 56 }}>
                  <span className="text-[9px] font-mono text-[#484F58]">low spread</span>
                  {[0.05, 0.15, 0.25, 0.35, 0.45].map(v => {
                    const { bg, border } = heatCellStyle(v);
                    return <div key={v} className="rounded" style={{ width: 20, height: 12, background: bg, border: `1px solid ${border}` }} />;
                  })}
                  <span className="text-[9px] font-mono text-[#3FB950]">high spread</span>
                </div>
              </div>
            )}
          </div>
        </ExpandedModal>
      )}

      {/* Spread Distribution modal */}
      {expandedModal === "spread" && (
        <ExpandedModal title="Spread Distribution" subtitle="gap count by spread bucket · after fees" onClose={closeModal}>
          <div className="p-6">
            <div className="flex items-end gap-3 h-48">
              {spreadHistBuckets.map(b => (
                <div key={b.key} className="flex flex-col items-center flex-1 h-full justify-end">
                  <span className="font-mono text-[#8B949E] mb-1 text-[11px]">{b.count > 0 ? b.count : ""}</span>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(4, (b.count / (maxBucket || 1)) * 160)}px`, background: b.bg, border: `1px solid ${b.border}` }} />
                  <span className="font-mono mt-2 text-[11px]" style={{ color: b.color }}>{b.label}</span>
                  <span className="text-[9px] font-mono text-[#484F58]">{b.count} gaps</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-mono text-[#484F58] mt-4">{TIP.spreadDist}</p>
          </div>
        </ExpandedModal>
      )}

      {/* Leaderboard full modal */}
      {expandedModal === "leaderboard" && (
        <ExpandedModal title="Most Gapped Assets" subtitle="ranked by gap frequency · avg spread · best spread seen" onClose={closeModal} wide>
          <div className="p-4 overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262D]">
                  {["#", "Asset", "Gaps", "Avg Spread", "Best Spread", "Signal"].map(h => (
                    <th key={h} className="text-left text-[9px] font-mono uppercase tracking-widest text-[#484F58] px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.symbolRanking ?? leaderboard.map(l => ({ symbol: l.coin, gapCount: l.count, avgSpread: 0, bestSpread: l.maxSpread }))).map((item, i) => (
                  <tr key={item.symbol} className="border-b border-[#21262D]/25 hover:bg-[#161B22]/40">
                    <td className={`text-[10px] font-mono px-3 py-2.5 ${i === 0 ? "text-[#D29922]" : "text-[#484F58]"}`}>{i + 1}</td>
                    <td className={`text-[12px] font-mono px-3 py-2.5 ${i === 0 ? "text-[#E6EDF3] font-medium" : i < 3 ? "text-[#E6EDF3]" : "text-[#8B949E]"}`}>{item.symbol}</td>
                    <td className="text-[11px] font-mono px-3 py-2.5 text-[#3FB950]">{item.gapCount}</td>
                    <td className={`text-[11px] font-mono px-3 py-2.5 ${item.avgSpread >= 0.2 ? "text-[#3FB950]" : "text-[#D29922]"}`}>
                      {item.avgSpread > 0 ? formatPercent(item.avgSpread, 3) : "—"}
                    </td>
                    <td className={`text-[11px] font-mono px-3 py-2.5 ${item.bestSpread >= 0.3 ? "text-[#388BFD]" : "text-[#3FB950]"}`}>
                      {formatPercent(item.bestSpread, 3)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${item.bestSpread >= 0.3 ? "bg-[#388BFD]/15 text-[#388BFD]" : item.bestSpread >= 0.1 ? "bg-[#3FB950]/15 text-[#3FB950]" : "bg-[#21262D] text-[#484F58]"}`}>
                        {item.bestSpread >= 0.3 ? "HOT" : item.bestSpread >= 0.1 ? "ACTIVE" : "COOL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ExpandedModal>
      )}

      {/* Price Variance full modal */}
      {expandedModal === "priceVariance" && (
        <ExpandedModal title="Price Variance Index" subtitle="cross-exchange price disagreement per asset" onClose={closeModal} wide>
          <div className="p-5">
            {priceVariance.length === 0 ? (
              <EmptyState title="Calculating price variance" subtitle="Requires multi-exchange price data" />
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-[#484F58] mb-2">
                  <span>Asset</span>
                  <span>Price divergence across exchanges</span>
                </div>
                {priceVariance.map((item, i) => {
                  const isExtreme = item.variance > 5;
                  const maxVar = priceVariance[0]?.variance ?? 1;
                  const barPct = maxVar > 0 ? (item.variance / maxVar) * 100 : 0;
                  return (
                    <div key={item.symbol} className="flex items-center gap-3">
                      <span className={`text-[11px] font-mono w-16 flex-shrink-0 ${isExtreme ? "text-[#F85149] font-medium" : i < 3 ? "text-[#D29922]" : "text-[#8B949E]"}`}>{item.symbol}</span>
                      <div className="flex-1 h-[6px] bg-[#21262D] rounded overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${barPct}%`, background: isExtreme ? "linear-gradient(90deg, rgba(248,81,73,0.8) 0%, rgba(248,81,73,0.3) 100%)" : i < 3 ? "linear-gradient(90deg, rgba(210,153,34,0.7) 0%, rgba(210,153,34,0.3) 100%)" : "linear-gradient(90deg, rgba(139,148,158,0.4) 0%, rgba(139,148,158,0.1) 100%)" }} />
                      </div>
                      <span className={`text-[11px] font-mono w-12 text-right flex-shrink-0 ${isExtreme ? "text-[#F85149]" : i < 3 ? "text-[#D29922]" : "text-[#8B949E]"}`}>{item.variance.toFixed(2)}%</span>
                      {isExtreme && <span className="text-[9px] font-mono bg-[#F85149]/15 text-[#F85149] px-1.5 py-0.5 rounded flex-shrink-0">EXTREME</span>}
                    </div>
                  );
                })}
                <p className="text-[9px] font-mono text-[#484F58] pt-3 border-t border-[#21262D]/50">{TIP.priceVariance}</p>
              </div>
            )}
          </div>
        </ExpandedModal>
      )}

      {/* Full-screen table modal */}
      {expandedModal === "table" && (
        <ExpandedModal title="Live Profitable Gaps" subtitle={`${filteredGaps.length} gaps · min ${minSpread}% spread${filterSymbol ? ` · ${filterSymbol}` : ""}`} onClose={closeModal} wide>
          <div className="overflow-auto h-full">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10" style={{ background: "linear-gradient(180deg, #21262D 0%, #161B22 100%)" }}>
                <tr className="border-b border-[#21262D]">
                  {TABLE_HEADERS.map(h => (
                    <th key={h} className="text-left text-[9px] uppercase tracking-widest font-mono font-medium text-[#484F58] px-3 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGaps.map((gap, i) => (
                  <GapRow key={gap.id} gap={gap} rowIndex={i} symHistory={symbolHistory} scoreThresholds={scoreThresholds} />
                ))}
              </tbody>
            </table>
          </div>
        </ExpandedModal>
      )}

    </div>
  );
}
