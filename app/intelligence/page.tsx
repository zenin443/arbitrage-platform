"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, BrainCircuitIcon, TrendingUpIcon, ChevronDownIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { formatNumber, formatUsd, formatPnl } from "@/lib/utils";

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
  type: "cex_cex" | "spot_futures" | "dex_cex" | "triangular" | "cross_chain";
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  buyPrice: number;
  sellPrice: number;
  buyBidSize: number;
  sellAskSize: number;
  maxTradeableUsd: number;
  detectedAt: number;
  lastSeenAt: number;
  durationMs: number;
  isActive: boolean;
  profitSimulation: ProfitSim;
  depthAnalysis: DepthAnalysis | null;
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
  totalSimulatedProfit1h_10k: number;
  totalSimulatedProfit24h_10k: number;
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
  hourlyDistribution: number[];
  durationBuckets: {
    under5s: number;
    under30s: number;
    under1m: number;
    under5m: number;
    over5m: number;
  };
}

interface SimTrade {
  id: string;
  botId: string;
  timestamp: number;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  type: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  quantity: number;
  tradeSizeUsd: number;
  grossProfit: number;
  buyFee: number;
  sellFee: number;
  totalFees: number;
  netProfit: number;
  depthLimited: boolean;
  inventoryLimited: boolean;
}

interface VoidedSignal {
  id: string;
  botId: string;
  timestamp: number;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  reason: string;
}

interface RebalanceEvent {
  id: string;
  botId: string;
  timestamp: number;
  tier: 1 | 2 | 3 | 4;
  type: "sell_rebuy" | "usdt_transfer" | "coin_transfer";
  asset: string;
  fromExchange: string;
  toExchange: string;
  amount: number;
  amountUsd: number;
  fee: number;
  feeType: "trading" | "network";
  chain: string | null;
  transferTimeMinutes: number | null;
  reason: string;
  balanceBefore: { from: number; to: number };
  balanceAfter: { from: number; to: number };
}

interface InTransitFund {
  id: string;
  asset: string;
  amount: number;
  fromExchange: string;
  toExchange: string;
  startedAt: number;
  estimatedArrival: number;
  status: "in_transit" | "arrived";
}

interface RebalanceStats {
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier1Fees: number;
  tier2Fees: number;
  tier3Fees: number;
  totalRebalanceCost: number;
  inTransitCount: number;
  inTransitValueUsd: number;
}

interface LiquidationCycleResults {
  totalCoinsLiquidated: number;
  totalUsdtRecovered: number;
  realizedPnl: number;
  feesForLiquidation: number;
  feesForRestock: number;
  totalCycleFees: number;
}

interface RestockResults {
  coinsRestocked: number;
  totalInvested: number;
  averagePricePerCoin: Record<string, number>;
}

interface LiquidationCycle {
  cycleNumber: number;
  startedAt: number;
  phase: "trading" | "liquidating" | "restocking";
  liquidationResults: LiquidationCycleResults | null;
  restockResults: RestockResults | null;
}

interface ExchangeWallet {
  [asset: string]: number;
}

interface BotState {
  id: string;
  name: string;
  startingCapital: number;
  portfolio: Record<string, ExchangeWallet>;
  totalPortfolioValueUsd: number;
  totalPnl: number;
  totalPnlPercent: number;
  tradingPnl: number;
  totalTrades: number;
  voidedSignals: number;
  voidedReasons: Record<string, number>;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  bestTrade: SimTrade | null;
  worstTrade: SimTrade | null;
  totalFeesPaid: number;
  totalRebalanceFees: number;
  rebalanceCount: number;
  maxDrawdown: number;
  peakValue: number;
  inventoryCoins: string[];
  activeExchanges: string[];
  recentTrades: SimTrade[];
  recentVoided: VoidedSignal[];
  recentRebalances: RebalanceEvent[];
  startedAt: number;
  lastTradeAt: number | null;
  isRunning: boolean;
  voidByCategory?: {
    dex: number;
    exchangeMissing: number;
    noInventory: number;
    noUsdt: number;
    tooSmall: number;
  };
  rebalanceStats?: RebalanceStats;
  inTransitFunds?: InTransitFund[];
  rescuedVoids?: number;
  // v0.3.5
  currentCycle?: LiquidationCycle;
  cycleHistory?: LiquidationCycle[];
  nextCycleAt?: number;
  totalCycleFees?: number;
  realizedInventoryPnl?: number;
  unrealizedInventoryPnl?: number;
  restockPrices?: Record<string, number>;
}

interface BotStates {
  magnusBeta1k: BotState;
  magnusBeta10k: BotState;
}

interface MagnusPerformance {
  capitalUtilization: number;
  reserveUtilization: number;
  rebalanceROI: {
    totalRebalanceCost: number;
    tradesEnabledByRebalancing: number;
    profitFromEnabledTrades: number;
    rebalanceROI: number;
    bestRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null;
    worstRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null;
  };
  inventoryScore: number;
  avgReserveLevel: number;
  exchangesBelowReserve: number;
  healthPercent: number;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtUsd(val: number, decimals = 2): string {
  const abs = Math.abs(val);
  const prefix = val < 0 ? "-$" : "$";
  if (abs >= 1_000_000) return prefix + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return prefix + (abs / 1_000).toFixed(1) + "K";
  return prefix + abs.toFixed(decimals);
}

function fmtCompact(val: number): string {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
  return val.toFixed(0);
}

function fmtDuration(ms: number): string {
  if (ms < 1_000) return "<1s";
  const s = Math.floor(ms / 1_000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function fmtSpread(pct: number): string {
  return pct.toFixed(3) + "%";
}

function fmtProfit(val: number): string {
  if (val >= 0) return "+$" + val.toFixed(2);
  return "-$" + Math.abs(val).toFixed(2);
}

function shortEx(name: string): string {
  const MAP: Record<string, string> = {
    binance: "BIN",
    bybit: "BYB",
    okx: "OKX",
    kucoin: "KUC",
    kraken: "KRK",
    coinbase: "CB",
    gateio: "GATE",
    mexc: "MEXC",
    huobi: "HTX",
    htx: "HTX",
    bingx: "BNX",
    bitget: "BTG",
    jupiter: "JUP",
    uniswap_v3: "UNI",
    hyperliquid: "HYP",
  };
  return MAP[name] ?? name.slice(0, 3).toUpperCase();
}

function now(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ─── Gap score calculation ─────────────────────────────────────────────────────
// spread weight 40% + duration weight 30% + depth weight 30%

function computeScore(gap: GapRecord): number {
  const spreadScore = Math.min(gap.spreadPercent / 1.0, 1) * 100 * 0.4;
  const durSec = gap.durationMs / 1_000;
  const durationScore = Math.min(durSec / 300, 1) * 100 * 0.3;
  const depthBase = gap.depthAnalysis
    ? gap.depthAnalysis.profitableSize
    : gap.maxTradeableUsd;
  const depthScore = Math.min(depthBase / 50_000, 1) * 100 * 0.3;
  return Math.round(spreadScore + durationScore + depthScore);
}

function scoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 70) return { label: "HIGH", color: "text-[#3FB950]", bg: "bg-[#3FB950]/20" };
  if (score >= 40) return { label: "MED", color: "text-[#D29922]", bg: "bg-[#D29922]/20" };
  return { label: "LOW", color: "text-[#F85149]", bg: "bg-[#F85149]/20" };
}

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_META: Record<GapRecord["type"], { label: string; color: string; bg: string }> = {
  cex_cex: { label: "CEX", color: "text-[#388BFD]", bg: "bg-[#388BFD]/15" },
  spot_futures: { label: "S-F", color: "text-[#A371F7]", bg: "bg-[#A371F7]/15" },
  dex_cex: { label: "DEX", color: "text-[#3FB950]", bg: "bg-[#3FB950]/15" },
  triangular: { label: "TRI", color: "text-[#D29922]", bg: "bg-[#D29922]/15" },
  cross_chain: { label: "XCH", color: "text-[#F85149]", bg: "bg-[#F85149]/15" },
};

// ─── Spread color ─────────────────────────────────────────────────────────────

function spreadColor(pct: number): string {
  if (pct >= 0.2) return "text-[#3FB950]";
  if (pct >= 0.1) return "text-[#D29922]";
  return "text-[#F85149]";
}

function profitColor(val: number): string {
  return val >= 0 ? "text-[#3FB950]" : "text-[#F85149]";
}

function fmtBalance(val: number): string {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPnl(val: number, pct: number): string {
  const sign = val >= 0 ? "+" : "";
  const absStr = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}$${absStr} (${sign}${pct.toFixed(2)}%)`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function durationColor(ms: number): string {
  if (ms >= 30_000) return "text-[#3FB950]";
  if (ms >= 5_000) return "text-[#D29922]";
  return "text-[#F85149]";
}

// ─── Bar chart mini ───────────────────────────────────────────────────────────

function MiniBar({ pct, color }: { pct: number; color: string }) {
  const filled = Math.round(pct / 10);
  return (
    <span className="font-mono text-[10px]">
      <span className={color}>{"█".repeat(filled)}</span>
      <span className="text-[#21262D]">{"░".repeat(10 - filled)}</span>
    </span>
  );
}

// ─── Cycle countdown timer ────────────────────────────────────────────────────

function CycleCountdown({ nextCycleAt }: { nextCycleAt: number }) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, nextCycleAt - Date.now()));

  useEffect(() => {
    const iv = setInterval(() => setMsLeft(Math.max(0, nextCycleAt - Date.now())), 1_000);
    return () => clearInterval(iv);
  }, [nextCycleAt]);

  const totalSec = Math.floor(msLeft / 1_000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return (
    <span className="text-[11px] font-mono text-[#388BFD]">
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

// ─── Section A: Stats card ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded py-2 px-2 text-center flex flex-col gap-0.5">
      <span className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">{label}</span>
      <span className={`text-base font-mono font-bold leading-tight ${valueColor ?? "text-[#E6EDF3]"}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] font-mono text-[#484F58]">{sub}</span>}
    </div>
  );
}

// ─── Depth cell ───────────────────────────────────────────────────────────────

function DepthCell({ gap }: { gap: GapRecord }) {
  const d = gap.depthAnalysis;
  if (!d) {
    return (
      <span
        className="text-[11px] font-mono text-[#484F58]"
        title="Estimated — full depth pending"
      >
        {gap.maxTradeableUsd > 0 ? fmtUsd(gap.maxTradeableUsd, 0) : "—"}*
      </span>
    );
  }
  const size = d.profitableSize;
  const color =
    size >= 5_000
      ? "text-[#3FB950]"
      : size >= 1_000
      ? "text-[#D29922]"
      : "text-[#F85149]";
  return <span className={`text-[11px] font-mono font-semibold ${color}`}>{fmtUsd(size, 0)}</span>;
}

// ─── Optimal cell ─────────────────────────────────────────────────────────────

function OptimalCell({ gap }: { gap: GapRecord }) {
  const d = gap.depthAnalysis;
  if (!d || d.optimalSize <= 0) return <span className="text-[11px] font-mono text-[#484F58]">—</span>;
  return (
    <span className="text-[11px] font-mono whitespace-nowrap">
      <span className="text-[#8B949E]">{fmtUsd(d.optimalSize, 0)}</span>
      <span className="text-[#484F58]"> → </span>
      <span className={profitColor(d.optimalProfit)}>{fmtProfit(d.optimalProfit)}</span>
    </span>
  );
}

// ─── Depth detail panel ───────────────────────────────────────────────────────

function DepthDetailPanel({ gap }: { gap: GapRecord }) {
  const d = gap.depthAnalysis;
  if (!d) {
    return (
      <tr>
        <td colSpan={9} className="px-3 py-2 bg-[#0D1117] border-t border-[#21262D]">
          <span className="text-[11px] font-mono text-[#484F58] animate-pulse">
            Fetching order book depth…
          </span>
        </td>
      </tr>
    );
  }

  const curve = d.profitCurve;
  return (
    <tr>
      <td colSpan={9} className="bg-[#0D1117] border-t border-[#21262D] p-2">
        <div className="text-[11px] font-mono space-y-1.5">
          {/* Profit curve */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {curve.map((p) => (
              <span key={p.tradeSize} className="whitespace-nowrap">
                <span className="text-[#484F58]">{fmtUsd(p.tradeSize, 0)} → </span>
                <span className={profitColor(p.netProfit)}>{fmtProfit(p.netProfit)}</span>
              </span>
            ))}
          </div>
          {/* Key metrics row */}
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
              <span className="text-[#D29922]">{fmtUsd(d.optimalSize, 0)} → {fmtProfit(d.optimalProfit)}</span>
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

// ─── Gap row ─────────────────────────────────────────────────────────────────

function GapRow({ gap, isHistory }: { gap: GapRecord; isHistory?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const score = computeScore(gap);
  const sl = scoreLabel(score);
  const tm = TYPE_META[gap.type] ?? { label: "?", color: "text-[#8B949E]", bg: "bg-[#8B949E]/15" };

  return (
    <>
      <tr
        className={`border-b border-[#21262D]/50 hover:bg-[#1C2128] transition-colors cursor-pointer select-none ${
          !gap.isActive && isHistory ? "opacity-50" : ""
        }`}
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-2 py-1 font-mono font-bold text-[12px] text-[#E6EDF3] whitespace-nowrap">
          <span className="inline-flex items-center gap-1">
            {expanded
              ? <ChevronDownIcon className="h-3 w-3 text-[#484F58] flex-shrink-0" />
              : <ChevronRightIcon className="h-3 w-3 text-[#484F58] flex-shrink-0" />
            }
            {gap.symbol}
          </span>
        </td>
        <td className="px-2 py-1">
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0 rounded ${tm.bg} ${tm.color}`}>
            {tm.label}
          </span>
        </td>
        <td className={`px-2 py-1 text-[12px] font-mono font-semibold whitespace-nowrap ${spreadColor(gap.spreadPercent)}`}>
          {fmtSpread(gap.spreadPercent)}
        </td>
        <td className="px-2 py-1 text-[11px] font-mono text-[#8B949E] whitespace-nowrap">
          <span className="text-[#E6EDF3]">{shortEx(gap.buyExchange)}</span>
          <span className="text-[#484F58]"> → </span>
          <span className="text-[#E6EDF3]">{shortEx(gap.sellExchange)}</span>
        </td>
        <td className="px-2 py-1 whitespace-nowrap">
          <DepthCell gap={gap} />
        </td>
        <td className="px-2 py-1 whitespace-nowrap">
          <OptimalCell gap={gap} />
        </td>
        <td className={`px-2 py-1 text-[11px] font-mono font-semibold whitespace-nowrap ${profitColor(gap.profitSimulation.at1k)}`}>
          {fmtProfit(gap.profitSimulation.at1k)}
        </td>
        <td className={`px-2 py-1 text-[11px] font-mono whitespace-nowrap ${durationColor(gap.durationMs)}`}>
          {fmtDuration(gap.durationMs)}
        </td>
        <td className="px-2 py-1">
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0 rounded ${sl.bg} ${sl.color}`}>
            {sl.label} {score}
          </span>
        </td>
      </tr>
      {expanded && <DepthDetailPanel gap={gap} />}
    </>
  );
}

// ─── Table headers ────────────────────────────────────────────────────────────

const TABLE_HEADERS = ["SYMBOL", "TYPE", "SPREAD", "BUY → SELL", "DEPTH", "OPTIMAL", "P&L @$1K", "DURATION", "SCORE"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [profitableGaps, setProfitableGaps] = useState<GapRecord[]>([]);
  const [gapHistory, setGapHistory] = useState<GapRecord[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [loading, setLoading] = useState(true);
  const [minSpread, setMinSpread] = useState<number>(0.2);
  const [filterInput, setFilterInput] = useState<string>("0.2");
  const [capitalMode, setCapitalMode] = useState<"magnus-alpha" | "beta-1k" | "beta-10k">("magnus-alpha");
  const [botStates, setBotStates] = useState<BotStates | null>(null);
  const [magnusAlphaState, setMagnusAlphaState] = useState<BotState | null>(null);
  const [magnusPerf, setMagnusPerf] = useState<MagnusPerformance | null>(null);
  const [simTrades, setSimTrades] = useState<SimTrade[]>([]);
  const [simVoided, setSimVoided] = useState<VoidedSignal[]>([]);
  const [simRebalances, setSimRebalances] = useState<RebalanceEvent[]>([]);
  const [resetting, setResetting] = useState(false);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevGapIds = useRef<Set<string>>(new Set());

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/trading-stats", { cache: "no-store" });
      if (res.ok) setStats(await res.json());
    } catch { /* keep previous */ }
  }, []);

  const fetchProfitable = useCallback(async () => {
    try {
      const res = await fetch("/api/profitable-gaps", { cache: "no-store" });
      if (!res.ok) return;
      const data: GapRecord[] = await res.json();
      const scored = [...data].sort((a, b) => computeScore(b) - computeScore(a));
      prevGapIds.current = new Set(scored.map((g) => g.id));
      setProfitableGaps(scored);
      setLastUpdated(now());
      setLoading(false);
    } catch { /* keep previous */ }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/gap-history?limit=50", { cache: "no-store" });
      if (res.ok) setGapHistory(await res.json());
    } catch { /* keep previous */ }
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
    } catch { /* keep previous */ }
  }, []);

  const fetchSimulators = useCallback(async () => {
    try {
      const res = await fetch("/api/simulators", { cache: "no-store" });
      if (res.ok) setBotStates(await res.json());
    } catch { /* keep previous */ }
  }, []);

  const fetchMagnusAlpha = useCallback(async () => {
    try {
      const res = await fetch("/api/magnus/alpha", { cache: "no-store" });
      if (res.ok) setMagnusAlphaState(await res.json());
    } catch { /* keep previous */ }
  }, []);

  const fetchMagnusPerf = useCallback(async () => {
    try {
      const res = await fetch("/api/magnus/alpha/performance", { cache: "no-store" });
      if (res.ok) setMagnusPerf(await res.json());
    } catch { /* keep previous */ }
  }, []);

  const fetchSimTrades = useCallback(async () => {
    try {
      if (capitalMode === "magnus-alpha") {
        const res = await fetch(`/api/magnus/alpha/trades?limit=10`, { cache: "no-store" });
        if (res.ok) setSimTrades(await res.json());
        return;
      }
      const botId = capitalMode === "beta-1k" ? "magnus-beta-1k" : "magnus-beta-10k";
      const res = await fetch(`/api/simulator/${botId}/trades?limit=10`, { cache: "no-store" });
      if (res.ok) setSimTrades(await res.json());
    } catch { /* keep previous */ }
  }, [capitalMode]);

  const fetchSimVoided = useCallback(async () => {
    try {
      if (capitalMode === "magnus-alpha") {
        const res = await fetch(`/api/magnus/alpha/voided?limit=30`, { cache: "no-store" });
        if (res.ok) setSimVoided(await res.json());
        return;
      }
      const botId = capitalMode === "beta-1k" ? "magnus-beta-1k" : "magnus-beta-10k";
      const res = await fetch(`/api/simulator/${botId}/voided?limit=30`, { cache: "no-store" });
      if (res.ok) setSimVoided(await res.json());
    } catch { /* keep previous */ }
  }, [capitalMode]);

  const fetchSimRebalances = useCallback(async () => {
    try {
      if (capitalMode === "magnus-alpha") {
        const res = await fetch(`/api/magnus/alpha/rebalances?limit=10`, { cache: "no-store" });
        if (res.ok) setSimRebalances(await res.json());
        return;
      }
      const botId = capitalMode === "beta-1k" ? "magnus-beta-1k" : "magnus-beta-10k";
      const res = await fetch(`/api/simulator/${botId}/rebalances?limit=10`, { cache: "no-store" });
      if (res.ok) setSimRebalances(await res.json());
    } catch { /* keep previous */ }
  }, [capitalMode]);

  const handleResetSimulator = async () => {
    if (capitalMode === "magnus-alpha") {
      if (!confirm("Reset Magnus Alpha? This clears trade history and re-seeds inventory.")) return;
      setResetting(true);
      try {
        await fetch("/api/magnus/alpha/reset", { method: "POST" });
        await Promise.all([fetchMagnusAlpha(), fetchMagnusPerf(), fetchSimTrades(), fetchSimVoided(), fetchSimRebalances()]);
      } catch { /* ignore */ } finally {
        setResetting(false);
      }
      return;
    }
    const botId = capitalMode === "beta-1k" ? "magnus-beta-1k" : "magnus-beta-10k";
    const capital = capitalMode === "beta-1k" ? "$1,000" : "$10,000";
    if (!confirm(`Reset ${botId} back to ${capital}? This clears all trade history and re-seeds inventory.`)) return;
    setResetting(true);
    try {
      await fetch(`/api/simulator/${botId}/reset`, { method: "POST" });
      await Promise.all([fetchSimulators(), fetchSimTrades(), fetchSimVoided(), fetchSimRebalances()]);
    } catch { /* ignore */ } finally {
      setResetting(false);
    }
  };

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
      } catch { /* ignore */ }
    }, 500);
  };

  useEffect(() => {
    fetchStats();
    fetchProfitable();
    fetchHistory();
    fetchAlertConfig();
    fetchSimulators();
    fetchMagnusAlpha();
    fetchMagnusPerf();
    fetchSimTrades();
    fetchSimVoided();
    fetchSimRebalances();

    const statsInterval = setInterval(fetchStats, 5_000);
    const profitableInterval = setInterval(fetchProfitable, 3_000);
    const historyInterval = setInterval(fetchHistory, 10_000);
    const simInterval = setInterval(fetchSimulators, 3_000);
    const magnusInterval = setInterval(fetchMagnusAlpha, 3_000);
    const magnusPerfInterval = setInterval(fetchMagnusPerf, 5_000);
    const simTradesInterval = setInterval(fetchSimTrades, 5_000);
    const simVoidedInterval = setInterval(fetchSimVoided, 8_000);
    const simRebalancesInterval = setInterval(fetchSimRebalances, 15_000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(profitableInterval);
      clearInterval(historyInterval);
      clearInterval(simInterval);
      clearInterval(magnusInterval);
      clearInterval(magnusPerfInterval);
      clearInterval(simTradesInterval);
      clearInterval(simVoidedInterval);
      clearInterval(simRebalancesInterval);
    };
  }, [fetchStats, fetchProfitable, fetchHistory, fetchAlertConfig, fetchSimulators, fetchMagnusAlpha, fetchMagnusPerf, fetchSimTrades, fetchSimVoided, fetchSimRebalances]);

  useEffect(() => {
    fetchSimTrades();
    fetchSimVoided();
    fetchSimRebalances();
  }, [capitalMode, fetchSimTrades, fetchSimVoided, fetchSimRebalances]);

  // Apply min spread filter client-side
  const filteredGaps = profitableGaps.filter((g) => g.spreadPercent >= minSpread);

  const activeBot =
    capitalMode === "magnus-alpha"
      ? magnusAlphaState
      : capitalMode === "beta-1k"
        ? botStates?.magnusBeta1k
        : botStates?.magnusBeta10k;
  const simLabel =
    capitalMode === "magnus-alpha" ? "$19K" : capitalMode === "beta-1k" ? "$1K" : "$10K";
  const botLabel =
    capitalMode === "magnus-alpha"
      ? "MAGNUS ALPHA · $19K"
      : capitalMode === "beta-1k"
        ? "MAGNUS BETA · $1K"
        : "MAGNUS BETA · $10K";

  // Duration bucket totals for percentages
  const buckets = stats?.durationBuckets;
  const bucketTotal = buckets
    ? buckets.under5s + buckets.under30s + buckets.under1m + buckets.under5m + buckets.over5m
    : 0;

  function bucketPct(n: number): number {
    return bucketTotal > 0 ? Math.round((n / bucketTotal) * 100) : 0;
  }

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
          <span className="text-xs text-[#484F58] font-mono">v0.5.4</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto">
          <div className="flex items-center gap-1 mr-1">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span className="text-[#3FB950] font-mono">LIVE</span>
          </div>
          <Link href="/intelligence" className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#388BFD]/10 border border-[#388BFD]/40 text-[#388BFD] text-[10px] font-mono whitespace-nowrap">
            Intelligence
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

      {/* ── Page Header ── */}
      <div className="px-6 pt-4 pb-3 border-b border-[#21262D]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <span className="flex h-2 w-2 rounded-full bg-[#3FB950] animate-pulse" />
              <h1 className="text-lg font-bold font-mono text-[#E6EDF3] flex items-center gap-2">
                <BrainCircuitIcon className="h-4 w-4 text-[#388BFD]" />
                TRADING INTELLIGENCE
              </h1>
            </div>
            <p className="text-[12px] text-[#8B949E] font-mono ml-5">
              Live gap analysis · order book depth · profit simulation
            </p>
          </div>
          <span className="text-[10px] text-[#484F58] font-mono">
            Last updated: {lastUpdated}
          </span>
        </div>
      </div>

      <main className="flex-1 px-3 py-3 overflow-y-auto space-y-3">
        <div className="max-w-[1600px] mx-auto space-y-3">
        {/* ── Section A: Key Metrics Bar ── */}

        {/* Capital toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-[#8B949E] uppercase tracking-widest">Capital:</span>
          <button
            onClick={() => setCapitalMode("magnus-alpha")}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              capitalMode === "magnus-alpha"
                ? "bg-[#388BFD]/15 text-[#388BFD] border-[#388BFD]/40"
                : "bg-transparent text-[#8B949E] border-[#21262D] hover:border-[#388BFD]/40"
            }`}
          >
            Magnus Alpha · $19K
          </button>
          <button
            onClick={() => setCapitalMode("beta-1k")}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              capitalMode === "beta-1k"
                ? "bg-[#388BFD]/15 text-[#388BFD] border-[#388BFD]/40"
                : "bg-transparent text-[#8B949E] border-[#21262D] hover:border-[#388BFD]/40"
            }`}
          >
            Magnus Beta · $1K
          </button>
          <button
            onClick={() => setCapitalMode("beta-10k")}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              capitalMode === "beta-10k"
                ? "bg-[#388BFD]/15 text-[#388BFD] border-[#388BFD]/40"
                : "bg-transparent text-[#8B949E] border-[#21262D] hover:border-[#388BFD]/40"
            }`}
          >
            Magnus Beta · $10K
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatCard
            label="Gaps Detected"
            value={formatNumber(stats?.totalGapsLast1h ?? 0)}
            sub="last hour"
          />
          <StatCard
            label="Profitable"
            value={`${formatNumber(stats?.profitableGapsCount ?? 0)} / ${formatNumber(stats?.totalGapsLast1h ?? 0)}`}
            sub={`${stats?.profitableGapsPercent ?? 0}%`}
            valueColor="text-[#3FB950]"
          />
          <StatCard
            label="Avg Spread"
            value={fmtSpread(stats?.avgSpreadPercent ?? 0)}
            valueColor={
              (stats?.avgSpreadPercent ?? 0) >= 0.2
                ? "text-[#3FB950]"
                : (stats?.avgSpreadPercent ?? 0) >= 0.05
                ? "text-[#D29922]"
                : "text-[#8B949E]"
            }
          />
          <StatCard
            label="Avg Duration"
            value={fmtDuration(stats?.avgGapDurationMs ?? 0)}
            valueColor={
              (stats?.avgGapDurationMs ?? 0) >= 30_000
                ? "text-[#3FB950]"
                : (stats?.avgGapDurationMs ?? 0) < 5_000
                ? "text-[#F85149]"
                : "text-[#D29922]"
            }
          />
          {/* Live bot cards */}
          <StatCard
            label={`PORTFOLIO · ${simLabel}`}
            value={activeBot ? fmtBalance(activeBot.totalPortfolioValueUsd) : "—"}
            valueColor={
              activeBot
                ? activeBot.totalPortfolioValueUsd >= activeBot.startingCapital
                  ? "text-[#3FB950]"
                  : "text-[#F85149]"
                : "text-[#8B949E]"
            }
            sub={activeBot ? `started ${fmtBalance(activeBot.startingCapital)}` : undefined}
          />
          <StatCard
            label={`P&L · ${simLabel}`}
            value={activeBot ? formatPnl(activeBot.totalPnl) : "—"}
            sub={
              activeBot
                ? `${activeBot.totalPnlPercent >= 0 ? "+" : ""}${activeBot.totalPnlPercent.toFixed(2)}%`
                : undefined
            }
            valueColor={
              activeBot
                ? activeBot.totalPnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
                : "text-[#8B949E]"
            }
          />
          <StatCard
            label={`TRADES · ${simLabel}`}
            value={formatNumber(activeBot?.totalTrades ?? 0)}
            sub={activeBot?.totalTrades ? `${activeBot.winRate.toFixed(0)}% win rate` : "no trades yet"}
            valueColor="text-[#E6EDF3]"
          />
          <StatCard
            label={`VOIDED · ${simLabel}`}
            value={formatNumber(activeBot?.voidedSignals ?? 0)}
            valueColor="text-[#D29922]"
            sub={
              activeBot && (activeBot.totalTrades + activeBot.voidedSignals) > 0
                ? `${Math.round((activeBot.voidedSignals / (activeBot.totalTrades + activeBot.voidedSignals)) * 100)}% void rate`
                : "no signals yet"
            }
          />
        </div>

        {/* ── Section B+C: Main 2-col layout ── */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* ── Section B: Profitable Gaps Table (65%) ── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <TrendingUpIcon className="h-3.5 w-3.5 text-[#3FB950]" />
              <h2 className="text-[11px] font-mono font-semibold text-[#3FB950] uppercase tracking-wider">
                Live Profitable Gaps
              </h2>
              <span className="bg-[#3FB950]/20 text-[#3FB950] text-[10px] font-mono px-1.5 py-0.5 rounded">
                {filteredGaps.length}
              </span>
              <span className="text-[10px] text-[#484F58] font-mono">
                · min spread: {minSpread}% · sorted by score
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[10px] text-[#8B949E] font-mono">Filter:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={filterInput}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="bg-[#0D1117] border border-[#21262D] rounded px-2 py-1 text-[#E6EDF3] font-mono text-[11px] w-[72px] focus:outline-none focus:border-[#388BFD] transition-colors"
                />
                <span className="text-[10px] text-[#8B949E] font-mono">%</span>
              </div>
            </div>

            <div className="bg-[#161B22] border border-[#21262D] rounded overflow-x-auto">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr className="border-b border-[#21262D]">
                    {TABLE_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="text-left px-2 py-2 text-[9px] font-mono text-[#8B949E] uppercase tracking-wider font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center">
                        <span className="text-[12px] text-[#484F58] font-mono animate-pulse">
                          Initializing trading intelligence…
                        </span>
                      </td>
                    </tr>
                  ) : filteredGaps.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <BrainCircuitIcon className="h-6 w-6 text-[#21262D]" />
                          <span className="text-[12px] text-[#484F58] font-mono">
                            No gaps above {minSpread}% right now · Lower the threshold or wait for new opportunities
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredGaps.map((gap) => (
                      <GapRow key={gap.id} gap={gap} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Section C: Analytics Sidebar (35%) ── */}
          <div className="w-full lg:w-[320px] flex-shrink-0 space-y-2">
            {/* Panel 1: Exchange Pair Ranking */}
            <div className="bg-[#161B22] border border-[#21262D] rounded p-2">
              <h3 className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest mb-2">
                Exchange Pair Ranking
              </h3>
              {!stats?.exchangePairRanking?.length ? (
                <p className="text-[11px] font-mono text-[#484F58]">No data yet…</p>
              ) : (
                <div className="space-y-0.5">
                  {stats.exchangePairRanking.slice(0, 10).map((pair, i) => (
                    <div key={`${pair.buyExchange}-${pair.sellExchange}`} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-[#484F58] w-4 text-right">{i + 1}.</span>
                      <span className="text-[#E6EDF3] w-16 flex-shrink-0">
                        {shortEx(pair.buyExchange)} → {shortEx(pair.sellExchange)}
                      </span>
                      <span className="text-[#8B949E] flex-1">
                        {pair.gapCount} gaps
                      </span>
                      <span className="text-[#D29922] w-12 text-right">
                        {fmtSpread(pair.avgSpread)}
                      </span>
                      <span className="text-[#3FB950] w-14 text-right">
                        {fmtUsd(pair.totalSimProfit)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel 2: Symbol Ranking */}
            <div className="bg-[#161B22] border border-[#21262D] rounded p-2">
              <h3 className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest mb-2">
                Symbol Ranking
              </h3>
              {!stats?.symbolRanking?.length ? (
                <p className="text-[11px] font-mono text-[#484F58]">No data yet…</p>
              ) : (
                <div className="space-y-0.5">
                  {stats.symbolRanking.slice(0, 8).map((sym, i) => (
                    <div key={sym.symbol} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-[#484F58] w-4 text-right">{i + 1}.</span>
                      <span className="text-[#E6EDF3] font-bold w-24 flex-shrink-0">{sym.symbol}</span>
                      <span className="text-[#8B949E] flex-1">{sym.gapCount} gaps</span>
                      <span className="text-[#3FB950] w-14 text-right">
                        best {fmtSpread(sym.bestSpread)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel 3: Gap Duration Breakdown */}
            <div className="bg-[#161B22] border border-[#21262D] rounded p-2">
              <h3 className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest mb-2">
                Gap Duration Breakdown
              </h3>
              {!buckets ? (
                <p className="text-[11px] font-mono text-[#484F58]">No data yet…</p>
              ) : (
                <div className="space-y-1">
                  {[
                    { label: "< 5s", n: buckets.under5s, note: "not tradeable", color: "text-[#F85149]" },
                    { label: "< 30s", n: buckets.under30s, note: "marginal", color: "text-[#D29922]" },
                    { label: "< 1m", n: buckets.under1m, note: "tradeable", color: "text-[#3FB950]" },
                    { label: "< 5m", n: buckets.under5m, note: "good", color: "text-[#3FB950]" },
                    { label: "> 5m", n: buckets.over5m, note: "excellent", color: "text-[#3FB950]" },
                  ].map(({ label, n, note, color }) => {
                    const pct = bucketPct(n);
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] w-8 ${color}`}>{label}</span>
                        <span className="font-mono text-[10px] text-[#8B949E] w-7 text-right">{pct}%</span>
                        <MiniBar pct={pct} color={color} />
                        <span className="text-[10px] text-[#484F58] font-mono">({note})</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel 4: Inventory Bot */}
            <div className="bg-[#161B22] border border-[#21262D] rounded p-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h3 className="text-[9px] font-mono text-[#388BFD] uppercase tracking-widest font-bold">
                    {botLabel}
                  </h3>
                  <p className="text-[8px] font-mono text-[#484F58]">Inventory Model · 9 exchanges · 15 coins</p>
                </div>
                {activeBot?.isRunning && (
                  <span className="flex items-center gap-1">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
                    <span className="text-[9px] font-mono text-[#3FB950]">LIVE</span>
                  </span>
                )}
              </div>

              {!activeBot ? (
                <p className="text-[10px] font-mono text-[#484F58] animate-pulse">Loading bot…</p>
              ) : (
                <>
                  {/* Portfolio Overview */}
                  <div className="space-y-0.5 text-[10px] font-mono mb-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#484F58] flex-shrink-0">Starting capital:</span>
                      <span className="text-[#8B949E] text-right">{fmtBalance(activeBot.startingCapital)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#484F58] flex-shrink-0">Portfolio value:</span>
                      <span className={`text-right ${activeBot.totalPortfolioValueUsd >= activeBot.startingCapital ? "text-[#3FB950]" : "text-[#F85149]"}`}>
                        {fmtBalance(activeBot.totalPortfolioValueUsd)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#484F58] flex-shrink-0">Total P&L:</span>
                      <span className={`text-right ${activeBot.totalPnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}`}>
                        {fmtPnl(activeBot.totalPnl, activeBot.totalPnlPercent)}
                      </span>
                    </div>
                    {/* v0.3.5: 4-line P&L breakdown */}
                    <div className="flex justify-between gap-2">
                      <span className="text-[#484F58] flex-shrink-0 pl-2">└ Trading P&L:</span>
                      <span className={`text-right ${activeBot.tradingPnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}`}>
                        {activeBot.tradingPnl >= 0 ? "+" : ""}${activeBot.tradingPnl.toFixed(2)}
                      </span>
                    </div>
                    {(() => {
                      const realizedInv = activeBot.realizedInventoryPnl ?? 0;
                      const unrealizedInv = activeBot.unrealizedInventoryPnl ?? 0;
                      const cycleFees = activeBot.totalCycleFees ?? 0;
                      return (
                        <>
                          <div className="flex justify-between gap-2">
                            <span className="text-[#484F58] flex-shrink-0 pl-2">└ Realized inv P&L:</span>
                            <span className={`text-right ${realizedInv >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}`}>
                              {realizedInv >= 0 ? "+" : ""}${realizedInv.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-[#484F58] flex-shrink-0 pl-2">└ Unrealized inv:</span>
                            <span className={`text-right ${unrealizedInv >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}`}>
                              {unrealizedInv >= 0 ? "+" : ""}${unrealizedInv.toFixed(2)}
                            </span>
                          </div>
                          {cycleFees > 0 && (
                            <div className="flex justify-between gap-2">
                              <span className="text-[#484F58] flex-shrink-0 pl-2">└ Cycle fees:</span>
                              <span className="text-right text-[#8B949E]">-${cycleFees.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {capitalMode === "magnus-alpha" && magnusPerf && (
                    <div className="border-t border-[#21262D] pt-1.5 mb-1.5 space-y-0.5 text-[10px] font-mono">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#484F58]">Avg reserve / ex:</span>
                        <span className="text-[#8B949E]">${magnusPerf.avgReserveLevel.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#484F58]">Rebalance ROI:</span>
                        <span
                          className={
                            magnusPerf.rebalanceROI.rebalanceROI >= 2
                              ? "text-[#3FB950]"
                              : magnusPerf.rebalanceROI.rebalanceROI >= 1
                                ? "text-[#D29922]"
                                : "text-[#F85149]"
                          }
                        >
                          {magnusPerf.rebalanceROI.rebalanceROI.toFixed(1)}x
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#484F58]">Inventory health:</span>
                        <span className="text-[#8B949E]">{magnusPerf.inventoryScore.toFixed(0)}%</span>
                      </div>
                      {magnusPerf.exchangesBelowReserve > 0 && (
                        <p className="text-[#D29922] text-[9px]">
                          {magnusPerf.exchangesBelowReserve} exchange(s) below reserve floor
                        </p>
                      )}
                      <Link href="/magnus" className="inline-block text-[10px] text-[#388BFD] mt-0.5 hover:underline">
                        View full dashboard →
                      </Link>
                    </div>
                  )}

                  {/* v0.3.5: Cycle status */}
                  {activeBot.currentCycle && (
                    <div className="border-t border-[#21262D] pt-1.5 mb-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#484F58]">
                          Cycle #{activeBot.currentCycle.cycleNumber}
                        </span>
                        <span className={
                          activeBot.currentCycle.phase === "trading"
                            ? "text-[#3FB950]"
                            : "text-[#D29922] animate-pulse"
                        }>
                          {activeBot.currentCycle.phase === "trading"
                            ? "● Trading"
                            : activeBot.currentCycle.phase === "liquidating"
                            ? "⟳ Liquidating..."
                            : "⟳ Restocking..."}
                        </span>
                        {activeBot.nextCycleAt && activeBot.currentCycle.phase === "trading" && (
                          <span className="flex items-center gap-1 text-[9px] text-[#484F58]">
                            Next: <CycleCountdown nextCycleAt={activeBot.nextCycleAt} />
                          </span>
                        )}
                      </div>
                      {/* Last completed cycle summary */}
                      {activeBot.cycleHistory?.[0]?.liquidationResults && (
                        <div className="mt-0.5 text-[9px] font-mono text-[#8B949E] leading-snug">
                          {(() => {
                            const lr = activeBot.cycleHistory![0]!.liquidationResults!;
                            return (
                              <>
                                Last: sold {lr.totalCoinsLiquidated} pos ·{" "}
                                realized{" "}
                                <span className={lr.realizedPnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}>
                                  {lr.realizedPnl >= 0 ? "+" : ""}${lr.realizedPnl.toFixed(2)}
                                </span>{" "}
                                · fees{" "}
                                <span className="text-[#484F58]">
                                  -${lr.totalCycleFees.toFixed(2)}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trade Stats */}
                  <div className="border-t border-[#21262D] pt-1.5 mb-1.5 space-y-0.5 text-[10px] font-mono">
                    {[
                      { label: "Trades executed:", value: formatNumber(activeBot.totalTrades), color: "text-[#E6EDF3]" },
                      {
                        label: "Signals voided:",
                        value: `${formatNumber(activeBot.voidedSignals)}${activeBot.totalTrades + activeBot.voidedSignals > 0 ? ` (${Math.round((activeBot.voidedSignals / (activeBot.totalTrades + activeBot.voidedSignals)) * 100)}%)` : ""}`,
                        color: "text-[#D29922]",
                      },
                      {
                        label: "Win rate:",
                        value: `${activeBot.winRate.toFixed(0)}% (${activeBot.winningTrades}W / ${activeBot.losingTrades}L)`,
                        color: activeBot.winRate >= 50 ? "text-[#3FB950]" : "text-[#D29922]",
                      },
                      {
                        label: "Rebalance cost:",
                        value: `-$${(activeBot.rebalanceStats?.totalRebalanceCost ?? activeBot.totalRebalanceFees).toFixed(2)}`,
                        color: "text-[#8B949E]",
                      },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="text-[#484F58] flex-shrink-0">{label}</span>
                        <span className={`${color} text-right`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Void Category Breakdown */}
                  {activeBot.voidedSignals > 0 && (
                    <div className="border-t border-[#21262D] pt-1.5 mb-1.5">
                      {(() => {
                        const total = activeBot.totalTrades + activeBot.voidedSignals;
                        const voidRate = total > 0 ? Math.round((activeBot.voidedSignals / total) * 100) : 0;
                        const cat = activeBot.voidByCategory ?? { dex: 0, exchangeMissing: 0, noInventory: 0, noUsdt: 0, tooSmall: 0 };
                        const catTotal = activeBot.voidedSignals;
                        function pct(n: number) { return catTotal > 0 ? Math.round((n / catTotal) * 100) : 0; }
                        const categories: Array<{ key: string; label: string; count: number; color: string }> = [
                          { key: "dex", label: "DEX", count: cat.dex, color: "text-[#484F58]" },
                          { key: "exchangeMissing", label: "No exchange", count: cat.exchangeMissing, color: "text-[#3FB950]" },
                          { key: "noInventory", label: "No inventory", count: cat.noInventory, color: "text-[#D29922]" },
                          { key: "noUsdt", label: "No USDT", count: cat.noUsdt, color: "text-[#F85149]" },
                          { key: "tooSmall", label: "Too small", count: cat.tooSmall, color: "text-[#8B949E]" },
                        ].filter(c => c.count > 0);
                        return (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[8px] font-mono text-[#484F58] uppercase tracking-widest">Why signals skipped:</p>
                              <span className="text-[9px] font-mono font-bold text-[#D29922]">Void: {voidRate}%</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {categories.map(c => (
                                <span key={c.key} className={`inline-flex items-center gap-0.5 text-[8px] font-mono px-1 py-0.5 rounded bg-[#21262D] ${c.color}`}>
                                  <span className="font-bold">{c.label}</span>
                                  <span className="text-[#484F58]">·</span>
                                  <span>{c.count} ({pct(c.count)}%)</span>
                                </span>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Rebalance Stats — 3-tier breakdown */}
                  {activeBot.rebalanceStats && (
                    <div className="border-t border-[#21262D] pt-1.5 mb-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[8px] font-mono text-[#484F58] uppercase tracking-widest">Rebalances:</p>
                        {(activeBot.rescuedVoids ?? 0) > 0 && (
                          <span className="text-[9px] font-mono font-bold text-[#3FB950]">
                            ✓ {activeBot.rescuedVoids} rescued
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 text-[9px] font-mono">
                        <div className="flex items-center gap-1">
                          <span className="text-[#3FB950] w-20 flex-shrink-0">T1 sell/rebuy:</span>
                          <span className="text-[#E6EDF3] w-14">{activeBot.rebalanceStats.tier1Count} actions</span>
                          <span className="text-[#484F58] flex-1 text-right">-${activeBot.rebalanceStats.tier1Fees.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[#388BFD] w-20 flex-shrink-0">T2 USDT xfer:</span>
                          <span className="text-[#E6EDF3] w-14">{activeBot.rebalanceStats.tier2Count} actions</span>
                          <span className="text-[#484F58] flex-1 text-right">-${activeBot.rebalanceStats.tier2Fees.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[#D29922] w-20 flex-shrink-0">T3 coin xfer:</span>
                          <span className="text-[#E6EDF3] w-14">{activeBot.rebalanceStats.tier3Count} actions</span>
                          <span className="text-[#484F58] flex-1 text-right">-${activeBot.rebalanceStats.tier3Fees.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* In-transit funds */}
                      {(activeBot.inTransitFunds ?? []).filter(f => f.status === "in_transit").map(fund => {
                        const msLeft = fund.estimatedArrival - Date.now();
                        const mLeft  = Math.max(0, Math.ceil(msLeft / 60_000));
                        const amtStr = fund.asset === "USDT"
                          ? `$${Math.round(fund.amount)}`
                          : `${fund.amount.toFixed(4)} ${fund.asset}`;
                        return (
                          <div key={fund.id} className="mt-1 flex items-center gap-1 text-[9px] font-mono text-[#388BFD]">
                            <span className="flex-shrink-0">↻</span>
                            <span>{amtStr} {shortEx(fund.fromExchange)}→{shortEx(fund.toExchange)}</span>
                            <span className="text-[#484F58] ml-auto">{mLeft}m left</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Exchange USDT Balances — 2-column compact layout for 9 exchanges */}
                  {Object.keys(activeBot.portfolio).length > 0 && (
                    <div className="border-t border-[#21262D] pt-1.5 mb-1.5">
                      <p className="text-[8px] font-mono text-[#484F58] uppercase tracking-widest mb-1">USDT per exchange:</p>
                      {(() => {
                        const perEx = activeBot.startingCapital / 9;
                        const usdtTarget = perEx * 0.4;
                        const exchanges = activeBot.activeExchanges;
                        const mid = Math.ceil(exchanges.length / 2);
                        const left = exchanges.slice(0, mid);
                        const right = exchanges.slice(mid);
                        const allUsdt = exchanges.map(ex => activeBot.portfolio[ex]?.USDT ?? 0);
                        const maxUsdt = Math.max(...allUsdt, usdtTarget * 1.5);

                        function ExRow({ ex }: { ex: string }) {
                          const usdt = activeBot!.portfolio[ex]?.USDT ?? 0;
                          const barPct = Math.min((usdt / maxUsdt) * 100, 100);
                          const filled = Math.round(barPct / 14);
                          const barColor = usdt >= usdtTarget
                            ? "text-[#3FB950]"
                            : usdt < usdtTarget * 0.5
                            ? "text-[#F85149]"
                            : "text-[#D29922]";
                          const incoming = (activeBot!.inTransitFunds ?? [])
                            .filter(f => f.status === "in_transit" && f.toExchange === ex && f.asset === "USDT")
                            .reduce((s, f) => s + f.amount, 0);
                          return (
                            <div className="flex items-center gap-0.5 text-[9px] font-mono">
                              <span className="text-[#8B949E] w-7 flex-shrink-0">{shortEx(ex)}</span>
                              <span className={`w-10 text-right flex-shrink-0 ${barColor}`}>${Math.round(usdt)}</span>
                              <span className="ml-0.5">
                                <span className={barColor}>{"█".repeat(filled)}</span>
                                <span className="text-[#21262D]">{"░".repeat(Math.max(0, 7 - filled))}</span>
                              </span>
                              {incoming > 0 && (
                                <span className="text-[#388BFD] ml-0.5 whitespace-nowrap">+${Math.round(incoming)}</span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 gap-x-2">
                            <div className="space-y-0.5">{left.map(ex => <ExRow key={ex} ex={ex} />)}</div>
                            <div className="space-y-0.5">{right.map(ex => <ExRow key={ex} ex={ex} />)}</div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Recent Trades */}
                  {simTrades.length > 0 && (
                    <div className="border-t border-[#21262D] pt-1.5 mb-1.5">
                      <p className="text-[8px] font-mono text-[#484F58] uppercase tracking-widest mb-1">Recent Trades</p>
                      <div className="space-y-0">
                        {simTrades.map((t) => (
                          <div key={t.id} className="flex items-center gap-1 text-[9px] font-mono py-0.5">
                            <span className="text-[#484F58] w-14 flex-shrink-0">{fmtTime(t.timestamp)}</span>
                            <span className="text-[#E6EDF3] w-10 flex-shrink-0">{t.baseAsset}</span>
                            <span className="text-[#8B949E] flex-shrink-0">
                              {shortEx(t.buyExchange)}→{shortEx(t.sellExchange)}
                            </span>
                            <span className={`flex-1 text-right ${t.netProfit >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}`}>
                              {t.netProfit >= 0 ? "+" : ""}${t.netProfit.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Rebalances */}
                  {simRebalances.length > 0 && (
                    <div className="border-t border-[#21262D] pt-1.5 mb-1.5">
                      <p className="text-[8px] font-mono text-[#484F58] uppercase tracking-widest mb-1">Recent Rebalances</p>
                      <div className="space-y-0">
                        {simRebalances.slice(0, 5).map((r) => {
                          const tierColor =
                            r.tier === 1 ? "bg-[#3FB950]/20 text-[#3FB950]" :
                            r.tier === 2 ? "bg-[#388BFD]/20 text-[#388BFD]" :
                            r.tier === 3 ? "bg-[#D29922]/20 text-[#D29922]" :
                                           "bg-[#A371F7]/20 text-[#A371F7]";
                          const direction = r.fromExchange === r.toExchange
                            ? `${shortEx(r.fromExchange)} (${r.type === "sell_rebuy" ? (r.reason.startsWith("Bought") || r.reason.startsWith("Rescue: bought") ? "buy" : "sell") : "?"})`
                            : `${shortEx(r.fromExchange)}→${shortEx(r.toExchange)}`;
                          return (
                            <div key={r.id} className="flex items-center gap-1 text-[9px] font-mono py-0.5">
                              <span className={`px-1 py-0 rounded text-[8px] font-bold flex-shrink-0 ${tierColor}`}>
                                {r.tier === 4 ? "PR" : `T${r.tier}`}
                              </span>
                              <span className="text-[#E6EDF3] w-10 flex-shrink-0">{r.asset}</span>
                              <span className="text-[#8B949E] flex-1 truncate">{direction}</span>
                              <span className="text-[#484F58] flex-shrink-0 whitespace-nowrap">
                                -${r.fee.toFixed(2)}{r.chain ? ` ${r.chain.slice(0, 3)}` : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleResetSimulator}
                    disabled={resetting}
                    className="mt-1 w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded border border-[#F85149]/30 text-[#F85149] text-[9px] font-mono uppercase tracking-wider hover:bg-[#F85149]/10 transition-colors disabled:opacity-50"
                  >
                    <RotateCcwIcon className="h-2.5 w-2.5" />
                    {resetting ? "Resetting…" : "Reset Bot"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Section D: Gap History (collapsible) ── */}
        <div className="bg-[#161B22] border border-[#21262D] rounded">
          <button
            onClick={() => setHistoryExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#1C2128] transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-mono font-semibold text-[#8B949E] uppercase tracking-wider">
                Recent Gap History
              </h2>
              <span className="bg-[#21262D] text-[#8B949E] text-[10px] font-mono px-1.5 py-0.5 rounded">
                {gapHistory.length}
              </span>
              <span className="text-[10px] text-[#484F58] font-mono">· closed gaps shown in grey</span>
            </div>
            <span className="text-[11px] font-mono text-[#484F58]">
              {historyExpanded ? "▲ collapse" : "▼ expand"}
            </span>
          </button>

          {historyExpanded && (
            <div className="overflow-x-auto border-t border-[#21262D]">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr className="border-b border-[#21262D]">
                    {TABLE_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="text-left px-2 py-2 text-[9px] font-mono text-[#8B949E] uppercase tracking-wider font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gapHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center">
                        <span className="text-[12px] text-[#484F58] font-mono">
                          No history yet — gaps will appear here as they are detected
                        </span>
                      </td>
                    </tr>
                  ) : (
                    gapHistory.map((gap) => (
                      <GapRow key={gap.id} gap={gap} isHistory />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="text-[10px] text-[#484F58] font-mono text-right pb-2">
          v0.5.4 · Inventory bots (9 CEX · 15 coins) · hourly liquidation cycle · speed-priority USDT (Solana 1min) ·
          0.1% taker fee · T1:2m · T2:5m · T3:10m · Gap history: last {formatNumber(stats?.totalGapsDetected ?? 0)} total
        </div>
        </div>
      </main>
    </div>
  );
}
