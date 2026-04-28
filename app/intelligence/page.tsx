"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, ChevronDownIcon, ChevronRightIcon, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Maximize2, X } from "lucide-react";
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
        <td colSpan={6} className="px-3 py-2 bg-[#0D1117] border-t border-[#21262D]">
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

function GapRow({
  gap,
  rowIndex = 0,
  scoreThresholds = { high: 55, med: 45 },
}: {
  gap: GapRecord;
  rowIndex?: number;
  symHistory?: Record<string, number[]>;
  scoreThresholds?: { high: number; med: number };
}) {
  const [expanded, setExpanded] = useState(false);
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
        style={{ background: rowGradient }}
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
        {/* Max USD — position sizing */}
        <td className="text-[10px] font-mono px-2 py-1 whitespace-nowrap">
          {isFreeTier || !gap.maxTradeableUsd ? (
            <span className="text-[#484F58]">—</span>
          ) : (
            <span className={gap.maxTradeableUsd >= 10_000 ? "text-[#3FB950]" : gap.maxTradeableUsd >= 1_000 ? "text-[#D29922]" : "text-[#8B949E]"}>
              {fmtUsd(gap.maxTradeableUsd, 0)}
            </span>
          )}
        </td>
        {/* Sim P&L @$1K — simulated profit at $1,000 trade size */}
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
              className={`text-[10px] px-1 py-0 rounded-sm font-mono ${
                score >= scoreThresholds.high ? "text-[#3FB950]" :
                score >= scoreThresholds.med  ? "text-[#D29922]" :
                "text-[#484F58]"
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
}

const TABLE_HEADERS = ["Symbol", "Type", "Spread", "Route", "Max USD", "Sim P&L", "Duration", "Score"];

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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [minSpread, setMinSpread] = useState<number>(0.2);
  const [filterInput, setFilterInput] = useState<string>("0.2");
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [leftWidth, setLeftWidth] = useState(200);
  const [rightWidth, setRightWidth] = useState(240);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [expandedModal, setExpandedModal] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"pulse" | "routes" | "types" | "bias">("pulse");
  const closeModal = useCallback(() => setExpandedModal(null), []);

  const [statHistory, setStatHistory] = useState<{
    gaps: number[];
    profitable: number[];
    spread: number[];
    duration: number[];
  }>({ gaps: [], profitable: [], spread: [], duration: [] });

  const [symbolHistory, setSymbolHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem("intelLeftWidth");
    if (saved) setLeftWidth(Math.max(160, Math.min(Number(saved), 260)));
  }, []);
  useEffect(() => {
    localStorage.setItem("intelLeftWidth", String(leftWidth));
  }, [leftWidth]);
  useEffect(() => {
    const saved = localStorage.getItem("intelRightWidth");
    if (saved) setRightWidth(Math.max(190, Math.min(Number(saved), 300)));
  }, []);
  useEffect(() => {
    localStorage.setItem("intelRightWidth", String(rightWidth));
  }, [rightWidth]);

  useEffect(() => {
    fetch('/api/profitable-gaps')
      .then(r => {
        if (r.ok) setConnectionStatus('connected')
        else setConnectionStatus('error')
      })
      .catch(() => setConnectionStatus('error'))
  }, []);

  const fetchStats = useCallback(async () => {
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
    try {
      const res = await fetch("/api/profitable-gaps", { cache: "no-store" });
      if (!res.ok) return;
      const raw: unknown[] = await res.json();

      // Normalize both free-tier (4-field) and trader+ response shapes into
      // a uniform GapRecord so the filter and rendering always have valid values.
      const data = normalizeApiGapList(raw) as unknown as GapRecord[];

      const scored = [...data].sort((a, b) => computeScore(b) - computeScore(a));
      setProfitableGaps(scored);
      setLastUpdated(now());
      setLoading(false);
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
    const mx: Record<string, Record<string, { spread: number; count: number }>> = {};
    HEATMAP_SYMS.forEach(s => { mx[s] = {}; });
    profitableGaps.forEach(g => {
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
  }, [profitableGaps]);

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
    const bySymbol: Record<string, { count: number; maxSpread: number }> = {};
    profitableGaps.forEach(g => {
      const coin = g.symbol?.split("/")[0] || g.symbol || "";
      if (!bySymbol[coin]) bySymbol[coin] = { count: 0, maxSpread: 0 };
      bySymbol[coin].count++;
      bySymbol[coin].maxSpread = Math.max(bySymbol[coin].maxSpread, g.spreadPercent || 0);
    });
    return Object.entries(bySymbol)
      .map(([coin, d]) => ({ coin, count: d.count, maxSpread: d.maxSpread }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [profitableGaps]);

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

  // ── Filtered gaps ──
  const allFilteredGaps = profitableGaps
    .filter(g => g.spreadPercent >= minSpread)
    .filter(g => filterSymbol ? g.symbol?.startsWith(filterSymbol) : true);

  // Free users see only first 10 rows; remaining are blurred
  const filteredGaps = isRealtime ? allFilteredGaps : allFilteredGaps.slice(0, FREE_GAP_LIMIT);
  const hasHiddenGaps = !isRealtime && allFilteredGaps.length > FREE_GAP_LIMIT;
  const hiddenCount = hasHiddenGaps ? allFilteredGaps.length - FREE_GAP_LIMIT : 0;

  // ── Drag handlers ──
  function startLeftDrag(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX, startW = leftWidth;
    const move = (ev: MouseEvent) =>
      setLeftWidth(Math.max(160, Math.min(startW + (ev.clientX - startX), 260)));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }

  function startRightDrag(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX, startW = rightWidth;
    const move = (ev: MouseEvent) =>
      setRightWidth(Math.max(190, Math.min(startW + (startX - ev.clientX), 300)));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }

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

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] text-[#E6EDF3] overflow-hidden">

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 border-b border-[#21262D] flex-shrink-0" style={{ background: "linear-gradient(180deg, #1C2128 0%, #161B22 100%)" }}>
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-[#388BFD]" />
          <span className="text-[13px] font-medium text-[#388BFD]">Arbitrage Terminal</span>
          <span className="text-[#484F58] select-none">|</span>
          <span className="text-[11px] text-[#484F58] font-mono">v0.7.4</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <div className="flex items-center gap-1 mr-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span className="text-[#3FB950] font-mono">LIVE</span>
          </div>
          {!isRealtime && (
            <span className="text-[10px] font-mono text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/30 rounded px-1.5 py-0.5 mr-1">
              DELAYED 15s
            </span>
          )}
          {connectionStatus === 'connecting' && (
            <span className="text-[11px] text-[#D29922] font-mono mr-1">Connecting…</span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-[11px] text-[#F85149] font-mono mr-1">Backend unavailable</span>
          )}
          <Link href="/intelligence" className="px-2 py-0.5 rounded bg-[#388BFD]/15 text-[#388BFD] font-medium text-[11px]">
            Intelligence
          </Link>
          <Link href="/magnus" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px]">
            Magnus
          </Link>
          <Link href="/dex" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px]">
            DEX Markets
          </Link>
          <Link href="/funding-rates" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px]">
            Funding Rates
          </Link>
          <Link href="/dashboard" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors text-[11px]">
            Dashboard
          </Link>
          <Link href="/settings" className="px-2 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="Settings">
            <SettingsIcon className="h-3.5 w-3.5" />
          </Link>
          <NavAuthButton />
        </div>
      </header>

      {/* ── Ad pill — only for free users ── */}
      <AdBanner zone="pill" />

      {/* ── 3-column layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ════ LEFT SIDEBAR ════ */}
        {leftCollapsed ? (
          <aside
            className="flex-shrink-0 border-r border-[#21262D] flex flex-col items-center pt-2 gap-3 z-20"
            style={{ width: 28, background: "linear-gradient(180deg, #161B22 0%, #0F1319 100%)" }}
          >
            <button
              onClick={() => setLeftCollapsed(false)}
              className="text-[#484F58] hover:text-[#388BFD] transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
            {/* Vertical label */}
            <span
              className="text-[9px] uppercase tracking-widest text-[#484F58] font-mono select-none"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Intel
            </span>
          </aside>
        ) : (
        <aside
          className="flex-shrink-0 border-r border-[#21262D] flex flex-col overflow-y-auto relative"
          style={{
            width: `${leftWidth}px`,
            minWidth: "clamp(160px, 13vw, 200px)",
            maxWidth: "260px",
            background: "linear-gradient(180deg, #161B22 0%, #0F1319 100%)",
          }}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-[4px] cursor-ew-resize hover:bg-[#388BFD]/30 transition-colors z-10"
            onMouseDown={startLeftDrag}
          />

          {/* Market pulse */}
          {/* Sidebar header with tab nav */}
          <div className="flex-shrink-0 border-b border-[#21262D]" style={{ background: "linear-gradient(180deg, #1C2128 0%, #161B22 100%)" }}>
            <div className="flex items-center justify-between px-2 pt-1.5 pb-0">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#484F58]">Intel</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedModal(`left-${leftTab}`)}
                  className="text-[#484F58] hover:text-[#388BFD] transition-colors"
                  title="Expand panel"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button onClick={() => setLeftCollapsed(true)} className="text-[#484F58] hover:text-[#8B949E] transition-colors" title="Collapse">
                  <PanelLeftClose className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="flex">
              {(["pulse", "routes", "types", "bias"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={`flex-1 text-[8px] uppercase font-mono py-1.5 transition-colors border-b-2 ${
                    leftTab === tab
                      ? "text-[#388BFD] border-[#388BFD]"
                      : "text-[#484F58] border-transparent hover:text-[#8B949E]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: PULSE */}
          {leftTab === "pulse" && (
            <div className="p-2 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded border border-[#21262D] py-2 text-center" style={{ background: "linear-gradient(135deg, #1C2128 0%, #0D1117 100%)" }}>
                  <div className="text-[20px] text-[#3FB950] font-medium font-mono leading-none">{formatNumber(stats?.totalGapsLast1h ?? 0)}</div>
                  <div className="text-[8px] text-[#484F58] font-mono mt-1">gaps/hr</div>
                </div>
                <div className="rounded border border-[#21262D] py-2 text-center" style={{ background: "linear-gradient(135deg, #1C2128 0%, #0D1117 100%)" }}>
                  <div className="text-[20px] text-[#E6EDF3] font-medium font-mono leading-none">{profitableGaps.length}</div>
                  <div className="text-[8px] text-[#484F58] font-mono mt-1">tracked</div>
                </div>
              </div>
              {/* Duration bar */}
              {buckets && (
                <div>
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[#484F58] mb-1.5">Duration split</div>
                  <div className="flex h-[5px] rounded overflow-hidden mb-1.5">
                    <div className="bg-[#F85149]" style={{ width: `${pctUnder5s}%` }} />
                    <div className="bg-[#D29922]" style={{ width: `${pctUnder30s}%` }} />
                    <div className="bg-[#3FB950]" style={{ width: `${pctUnder1m}%` }} />
                    <div className="bg-[#388BFD]" style={{ width: `${pctOver1m}%` }} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[{ bg: "#F85149", label: "<5s" }, { bg: "#D29922", label: "<30s" }, { bg: "#3FB950", label: "<1m" }, { bg: "#388BFD", label: ">1m" }].map(b => (
                      <div key={b.label} className="flex items-center gap-1">
                        <div className="w-[3px] h-[3px] rounded-sm flex-shrink-0" style={{ background: b.bg }} />
                        <span className="text-[8px] text-[#484F58] font-mono">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: ROUTES */}
          {leftTab === "routes" && (
            <div className="p-2 overflow-y-auto flex-1">
              <div className="text-[8px] font-mono uppercase tracking-widest text-[#484F58] mb-2">Top routes</div>
              <ErrorBoundary name="Top routes">
                {!stats?.exchangePairRanking?.length ? (
                  <WidgetSkeleton type="list" rows={5} />
                ) : (
                  <div>
                    {stats.exchangePairRanking.slice(0, 7).map((pair, i) => (
                      <div key={`${pair.buyExchange}-${pair.sellExchange}`} className="flex items-center justify-between border-b border-[#21262D]/25" style={{ height: 22 }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-[#484F58] w-3">{i + 1}</span>
                          <span className="text-[10px] font-mono text-[#E6EDF3]">{shortEx(pair.buyExchange)}<span className="text-[#484F58]">→</span>{shortEx(pair.sellExchange)}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${i < 2 ? "text-[#3FB950]" : "text-[#8B949E]"}`}>{pair.gapCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            </div>
          )}

          {/* Tab: TYPES */}
          {leftTab === "types" && (
            <div className="p-2 overflow-y-auto flex-1 space-y-3">
              <div className="text-[8px] font-mono uppercase tracking-widest text-[#484F58]">Gap type mix</div>
              <ErrorBoundary name="Gap types">
                {profitableGaps.length === 0 ? <WidgetSkeleton type="list" rows={3} /> : (
                  <div className="space-y-3">
                    {[
                      { label: "CEX-CEX", count: cexCount, pct: cexPct, color: "#3FB950", grad: "linear-gradient(90deg, rgba(63,185,80,0.85) 0%, rgba(63,185,80,0.3) 100%)" },
                      { label: "DEX-CEX", count: dexCount, pct: dexPct, color: "#D29922", grad: "linear-gradient(90deg, rgba(210,153,34,0.85) 0%, rgba(210,153,34,0.3) 100%)" },
                      { label: "Spot-Fut", count: sfCount,  pct: sfPct,  color: "#388BFD", grad: "linear-gradient(90deg, rgba(56,139,253,0.85) 0%, rgba(56,139,253,0.3) 100%)" },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-mono text-[#8B949E]">{row.label}</span>
                          <span className="text-[10px] font-mono" style={{ color: row.color }}>{row.count} <span className="text-[#484F58]">({row.pct}%)</span></span>
                        </div>
                        <div className="h-[3px] bg-[#21262D] rounded overflow-hidden">
                          <div className="h-full rounded transition-all duration-500" style={{ width: `${row.pct}%`, background: row.grad }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            </div>
          )}

          {/* Tab: BIAS */}
          {leftTab === "bias" && (
            <div className="p-2 overflow-y-auto flex-1 space-y-3">
              <div>
                <div className="text-[8px] font-mono uppercase tracking-widest text-[#484F58] mb-1.5">Pricing bias</div>
                <ErrorBoundary name="Pricing bias">
                  {pricingBias.length === 0 ? (
                    <EmptyState title="Calculating" subtitle="Requires tick data" />
                  ) : (
                    <>
                      <div className="flex justify-between text-[8px] font-mono text-[#484F58] mb-1.5"><span>← Buy</span><span>Sell →</span></div>
                      <div className="space-y-1">
                        {pricingBias.map(({ ex, cheapPct }) => (
                          <div key={ex} className="flex items-center gap-1.5" style={{ height: 18 }}>
                            <span className={`text-[9px] font-mono w-7 flex-shrink-0 ${cheapPct > 55 ? "text-[#3FB950]" : cheapPct < 45 ? "text-[#F85149]" : "text-[#8B949E]"}`}>{shortEx(ex)}</span>
                            <div className="flex-1 flex h-[5px] relative">
                              <div className="absolute top-0 bottom-0 w-px bg-[#484F58]/30" style={{ left: "50%" }} />
                              <div className="w-1/2 flex justify-end overflow-hidden">
                                <div className="h-full bg-[#3FB950] rounded-l" style={{ width: `${cheapPct}%`, opacity: cheapPct > 55 ? 0.6 : 0.2 }} />
                              </div>
                              <div className="w-1/2 overflow-hidden">
                                <div className="h-full bg-[#F85149] rounded-r" style={{ width: `${100 - cheapPct}%`, opacity: cheapPct < 45 ? 0.6 : 0.2 }} />
                              </div>
                            </div>
                            <span className="text-[8px] font-mono text-[#484F58] w-6 text-right flex-shrink-0">{cheapPct}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </ErrorBoundary>
              </div>
            </div>
          )}

          {/* Ad — footer of sidebar */}
          <div className="mt-auto border-t border-[#21262D]/30 flex-shrink-0 px-1.5 py-1">
            <AdBanner zone="contextual-signal" context={{ exchange: "okx" }} />
          </div>
        </aside>
        )}

        {/* ════ CENTER MAIN ════ */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* ── KPI bar ── */}
          <div
            className="flex-shrink-0 flex items-center gap-0 px-3 border-b border-[#21262D] overflow-x-auto"
            style={{ height: 52, background: "linear-gradient(180deg, #1C2128 0%, #161B22 100%)" }}
          >
            {(() => {
              const profitableActive = (stats?.profitableGapsCount ?? 0) > 0;
              const spreadVal = stats?.avgSpreadPercent ?? 0;
              const durMs = stats?.avgGapDurationMs ?? 0;
              const sim24h = stats?.totalSimulatedProfit24h ?? 0;
              const bestSp = stats?.bestSpreadSeen?.spreadPercent ?? 0;
              const bestSym = stats?.bestSpreadSeen?.symbol ?? "";
              const kpis = [
                {
                  label: "GAPS/HR", value: formatNumber(stats?.totalGapsLast1h ?? 0),
                  sub: `${formatNumber(stats?.totalGapsLast24h ?? 0)} 24h`,
                  color: "#8B949E", sparkData: statHistory.gaps, ping: false,
                },
                {
                  label: "PROFITABLE", value: formatNumber(stats?.profitableGapsCount ?? 0),
                  sub: `${stats?.profitableGapsPercent ?? 0}% rate`,
                  color: profitableActive ? "#3FB950" : "#8B949E", sparkData: statHistory.profitable, ping: profitableActive,
                },
                {
                  label: "AVG SPREAD", value: formatPercent(spreadVal, 3),
                  sub: "after fees",
                  color: spreadVal >= 0.2 ? "#3FB950" : spreadVal >= 0.05 ? "#D29922" : "#8B949E", sparkData: statHistory.spread, ping: false,
                },
                {
                  label: "GAP LIFE", value: formatDuration(durMs),
                  sub: "avg open",
                  color: durMs >= 60_000 ? "#3FB950" : durMs >= 30_000 ? "#D29922" : "#F85149", sparkData: statHistory.duration, ping: false,
                },
                {
                  label: "SIM PROFIT 24H", value: fmtUsd(sim24h),
                  sub: `1h: ${fmtUsd(stats?.totalSimulatedProfit1h ?? 0)}`,
                  color: sim24h >= 0 ? "#3FB950" : "#F85149", sparkData: statHistory.profitable, ping: false,
                },
                {
                  label: "BEST SPREAD", value: bestSp > 0 ? formatPercent(bestSp, 3) : "—",
                  sub: bestSym || "no data",
                  color: bestSp >= 0.5 ? "#388BFD" : bestSp >= 0.2 ? "#3FB950" : "#D29922", sparkData: statHistory.spread, ping: bestSp >= 0.5,
                },
              ];
              return kpis.map((k, i) => (
                <div key={k.label} className="flex items-center flex-shrink-0">
                  {i > 0 && <div className="w-px h-3.5 bg-[#21262D] mx-2.5 flex-shrink-0" />}
                  <div className="flex flex-col gap-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-[#484F58] whitespace-nowrap">{k.label}</span>
                      {k.ping && <span className="h-1 w-1 rounded-full bg-[#388BFD] animate-pulse flex-shrink-0" />}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[12px] font-mono font-medium tabular-nums whitespace-nowrap" style={{ color: k.color }}>{k.value}</span>
                      <StatDeltaBadge history={k.sparkData} />
                    </div>
                    <span className="text-[8px] font-mono text-[#484F58] whitespace-nowrap leading-none">{k.sub}</span>
                  </div>
                </div>
              ));
            })()}

            {/* Right side: filter + sidebar toggles */}
            <div className="ml-auto flex items-center gap-3">
              {filterSymbol && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[#484F58]">SYM</span>
                  <span className="text-[9px] font-mono bg-[#3FB950]/10 border border-[#3FB950]/25 text-[#3FB950] px-1.5 rounded">{filterSymbol}</span>
                  <button onClick={() => setFilterSymbol(null)} className="text-[#484F58] hover:text-[#F85149] text-[9px] transition-colors">✕</button>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-[#484F58]">MIN</span>
                <input
                  type="number" step="0.01" min="0"
                  value={filterInput}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-10 text-[10px] font-mono bg-[#0D1117] border border-[#21262D] rounded px-1 py-0 text-center text-[#E6EDF3] focus:outline-none focus:border-[#388BFD] transition-colors"
                  style={{ height: 20 }}
                />
                <span className="text-[9px] font-mono text-[#484F58]">%</span>
              </div>
              {leftCollapsed && (
                <button onClick={() => setLeftCollapsed(false)} className="text-[#484F58] hover:text-[#388BFD] transition-colors" title="Open Intel panel">
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                </button>
              )}
              {rightCollapsed && (
                <button onClick={() => setRightCollapsed(false)} className="text-[#484F58] hover:text-[#388BFD] transition-colors" title="Open Stats panel">
                  <PanelRightOpen className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Widget row: Heatmap · Spread Distribution ── */}
          <div
            className="flex-shrink-0"
            style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "4px", height: 152, padding: "2px 6px" }}
          >
            {/* ── Matrix Heatmap: symbol × exchange ── */}
            <ErrorBoundary name="Arbitrage heatmap">
            <div
              className="overflow-hidden border border-[#21262D] rounded-md flex flex-col p-1.5"
              style={{ background: "linear-gradient(180deg, #1C2128 0%, #0D1117 100%)" }}
            >
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Arb heatmap · click to filter</span>
                <div className="flex items-center gap-1">
                  <InfoCorner text={TIP.heatmap} />
                  <button
                    onClick={() => setExpandedModal("heatmap")}
                    className="text-[#484F58] hover:text-[#E6EDF3] transition-colors"
                    title="Expand heatmap"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {profitableGaps.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState title="Waiting for gap data" subtitle="Heatmap populates as gaps are detected" />
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  {/* Exchange column headers */}
                  <div className="flex mb-[2px]" style={{ marginLeft: 30 }}>
                    {HEATMAP_EXS.map(ex => (
                      <div key={ex} className="flex-1 text-center">
                        <span className="text-[7px] font-mono text-[#484F58] tracking-wide">{ex}</span>
                      </div>
                    ))}
                  </div>
                  {/* Symbol rows */}
                  <div className="flex flex-col gap-[2px]">
                    {HEATMAP_SYMS.map(sym => {
                      const isSelected = filterSymbol === sym;
                      return (
                        <div key={sym} className="flex items-center gap-[2px]">
                          {/* Symbol label */}
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

            {/* ── Spread Distribution Histogram ── */}
            <ErrorBoundary name="Spread distribution">
            <div
              className="overflow-hidden border border-[#21262D] rounded-md flex flex-col p-1.5"
              style={{ background: "linear-gradient(180deg, #1C2128 0%, #0D1117 100%)" }}
            >
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Spread dist.</span>
                <div className="flex items-center gap-1">
                  <InfoCorner text={TIP.spreadDist} />
                  <button
                    onClick={() => setExpandedModal("spread")}
                    className="text-[#484F58] hover:text-[#E6EDF3] transition-colors"
                    title="Expand spread distribution"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {profitableGaps.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState title="Calculating spread distribution" subtitle="Requires active gap data" />
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-[2px] flex-1 min-h-0" style={{ minHeight: 0 }}>
                    {spreadHistBuckets.map(b => (
                      <div key={b.key} className="flex flex-col items-center flex-1 h-full justify-end">
                        <span className="font-mono text-[#8B949E] mb-0.5 leading-none text-[9px]">
                          {b.count > 0 ? b.count : ""}
                        </span>
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${Math.max(2, (b.count / maxBucket) * 46)}px`,
                            background: b.bg,
                            border: `0.5px solid ${b.border}`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex mt-1 flex-shrink-0">
                    {spreadHistBuckets.map(b => (
                      <span
                        key={b.key}
                        className="flex-1 text-center text-[9px] font-mono"
                        style={{
                          color: b.color,
                          fontWeight: b.key === tallestBucketKey ? 500 : 400,
                        }}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            </ErrorBoundary>


          </div>

          {/* Ad banner — only for free users */}
          <div className="flex-shrink-0">
            <AdBanner zone="horizontal" />
          </div>

          {/* ── Live gaps table ── */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col" style={{ padding: "0 var(--pad-md, 6px)" }}>

            {/* Table toolbar */}
            <div className="flex items-center justify-between py-1 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#3FB950]">Live gaps</span>
                <span className="text-[9px] font-mono bg-[#3FB950]/10 border border-[#3FB950]/20 text-[#3FB950] px-1.5 rounded">{filteredGaps.length}</span>
              </div>
              <button
                onClick={() => setExpandedModal("table")}
                className="flex items-center gap-1 text-[9px] font-mono text-[#484F58] hover:text-[#388BFD] transition-colors"
                title="Expand table full-screen"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Full view</span>
              </button>
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
            <div className="text-[10px] text-right py-1 text-[#484F58] border-t border-[#21262D] flex-shrink-0">
              All spreads net of fees
            </div>
          </div>
        </main>

        {/* ════ RIGHT SIDEBAR ════ */}
        {rightCollapsed ? (
          <aside
            className="flex-shrink-0 border-l border-[#21262D] flex flex-col items-center pt-2 gap-3 z-20"
            style={{ width: 28, background: "linear-gradient(180deg, #161B22 0%, #0F1319 100%)" }}
          >
            <button
              onClick={() => setRightCollapsed(false)}
              className="text-[#484F58] hover:text-[#388BFD] transition-colors"
              title="Expand sidebar"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
            </button>
            <span
              className="text-[9px] uppercase tracking-widest text-[#484F58] font-mono select-none"
              style={{ writingMode: "vertical-rl" }}
            >
              Stats
            </span>
          </aside>
        ) : (
        <aside
          className="flex-shrink-0 border-l border-[#21262D] flex flex-col overflow-y-auto relative"
          style={{
            width: `${rightWidth}px`,
            minWidth: "clamp(180px, 14vw, 210px)",
            maxWidth: "300px",
            background: "linear-gradient(180deg, #161B22 0%, #0F1319 100%)",
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-[4px] cursor-ew-resize hover:bg-[#388BFD]/30 transition-colors z-10"
            onMouseDown={startRightDrag}
          />

          {/* ── Dense leaderboard: Most gapped assets ── */}
          <ErrorBoundary name="Most gapped assets">
          <div className="border-b border-[#21262D]/50" style={{ padding: "4px 6px" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Most gapped assets</span>
              <div className="flex items-center gap-1">
                <InfoCorner text={TIP.mostGapped} />
                <button
                  onClick={() => setExpandedModal("leaderboard")}
                  className="text-[#484F58] hover:text-[#388BFD] transition-colors"
                  title="Expand leaderboard"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setRightCollapsed(true)}
                  className="text-[#484F58] hover:text-[#8B949E] transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelRightClose className="h-3 w-3" />
                </button>
              </div>
            </div>
            {!leaderboard.length ? (
              <WidgetSkeleton type="list" rows={5} />
            ) : (
              <div style={{ fontSize: "11px" }}>
                {leaderboard.map((item, i) => (
                  <div
                    key={item.coin}
                    className="flex items-center gap-2 hover:bg-[#161B22]/60"
                    style={{ fontSize: "11px", height: "22px" }}
                  >
                    <span
                      className={`font-mono w-[14px] text-right flex-shrink-0 ${i === 0 ? "text-[#D29922]" : "text-[#484F58]"}`}
                      style={{ fontSize: "10px" }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`font-mono flex-1 ${
                        i === 0 ? "text-[#E6EDF3] font-medium" : i < 3 ? "text-[#E6EDF3]" : "text-[#8B949E]"
                      }`}
                    >
                      {item.coin}
                    </span>
                    <span className="font-mono text-[#3FB950] w-[20px] text-right">{item.count}</span>
                    <span className="font-mono text-[#484F58] w-[42px] text-right">{item.maxSpread.toFixed(3)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          </ErrorBoundary>

          {/* Price variance index */}
          <ErrorBoundary name="Price variance">
          <div className="border-b border-[#21262D]/50" style={{ padding: "4px 6px" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase tracking-widest font-medium text-[#484F58] font-mono">Price variance</span>
              <div className="flex items-center gap-1">
                <InfoCorner text={TIP.priceVariance} />
                <button
                  onClick={() => setExpandedModal("priceVariance")}
                  className="text-[#484F58] hover:text-[#388BFD] transition-colors"
                  title="Expand price variance"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {priceVariance.length === 0 ? (
              <EmptyState title="Calculating price variance" subtitle="Requires multi-exchange price data" />
            ) : (
              <div className="space-y-0">
                {priceVariance.map((item, i) => {
                  const isExtreme = item.variance > 5;
                  const maxVar    = priceVariance[0].variance;
                  const barWidth  = maxVar > 0 ? (item.variance / maxVar) * 100 : 0;
                  return (
                    <div
                      key={item.symbol}
                      className="flex items-center gap-1 py-[1px]"
                      style={{ height: "20px" }}
                    >
                      <span
                        className={`text-[10px] font-mono w-[45px] flex-shrink-0 ${
                          isExtreme ? "text-[#F85149]" : i < 2 ? "text-[#D29922]" : "text-[#8B949E]"
                        }`}
                      >
                        {item.symbol}
                      </span>
                      <div className="flex-1 h-[4px] bg-[#21262D] rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${barWidth}%`,
                            background: isExtreme
                              ? "linear-gradient(90deg, #3FB950, #F85149)"
                              : i < 2 ? "#D29922" : "#484F58",
                          }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-mono w-[35px] text-right flex-shrink-0 ${
                          isExtreme ? "text-[#F85149]" : i < 2 ? "text-[#D29922]" : "text-[#8B949E]"
                        }`}
                      >
                        {item.variance.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </ErrorBoundary>

          {/* ── Gradient coverage bars ── */}
          <ErrorBoundary name="Exchange coverage">
          <div className="border-b border-[#21262D]/50" style={{ padding: "4px 6px" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-wider font-medium text-[#484F58]">Exchange coverage</span>
              <InfoCorner text={TIP.exchangeCoverage} />
            </div>
            {exchangeCoverage.length === 0 ? (
              <WidgetSkeleton type="list" rows={5} />
            ) : (
              <div className="space-y-0">
                {exchangeCoverage.map((ex, i) => (
                  <div key={ex.name} className="flex items-center gap-1 py-[1px]" style={{ height: "20px" }}>
                    <span
                      className={`text-[10px] font-mono flex-shrink-0 ${i < 3 ? "text-[#E6EDF3]" : "text-[#8B949E]"}`}
                      style={{ width: "35px" }}
                    >
                      {shortEx(ex.name)}
                    </span>
                    <div className="flex-1 h-[5px] bg-[#21262D] rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${Math.round((ex.symbols / maxExSymbols) * 100)}%`,
                          background: i < 3
                            ? "linear-gradient(90deg, rgba(63,185,80,0.5), #3FB950)"
                            : i < 6
                            ? "linear-gradient(90deg, rgba(56,139,253,0.4), #388BFD)"
                            : "rgba(139,148,158,0.4)",
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono ${i < 3 ? "text-[#3FB950]" : "text-[#8B949E]"}`}
                      style={{ width: "18px", textAlign: "right" }}
                    >
                      {ex.symbols}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          </ErrorBoundary>

          {/* Magnus AI card */}
          <div className="border-b border-[#21262D]/50" style={{ padding: "4px 6px" }}>
            <MagnusAICard />
          </div>

          {/* Ad zone — only for free users */}
          <div className="border-b border-[#21262D]/30" style={{ padding: "4px 6px" }}>
            <AdBanner zone="contextual-signal" context={{ exchange: "binance" }} />
          </div>

          {/* Upgrade nudge — shown to free users */}
          {!isRealtime && (
            <div style={{ padding: "4px 6px" }}>
              <div className="bg-[#D29922]/4 border border-[#21262D]/30 rounded-md p-1 text-center">
                <div className="text-[10px] text-[#D29922] font-medium">Upgrade to Pro</div>
                <div className="text-[10px] text-[#484F58] mt-0.5">Real-time alerts + Magnus AI</div>
                <a href="/pricing" className="text-[10px] text-[#D29922] block mt-0.5">
                  View plans →
                </a>
              </div>
            </div>
          )}
        </aside>
        )}

      </div>
    </div>
  );
}
