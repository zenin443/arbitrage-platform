"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { formatNumber, formatPnl, formatUsd } from "@/lib/utils";

const EX_COLS = [
  { id: "okx", label: "OKX" },
  { id: "gateio", label: "GATE" },
  { id: "binance", label: "BIN" },
  { id: "bitget", label: "BTG" },
  { id: "kucoin", label: "KUC" },
  { id: "bingx", label: "BNX" },
  { id: "htx", label: "HTX" },
  { id: "mexc", label: "MEXC" },
  { id: "kraken", label: "KRK" },
] as const;

const COIN_ROWS = [
  "APE", "INJ", "ORDI", "WIF", "SHIB", "PEPE", "TIA", "WLD", "OP", "BONK", "ATOM", "RENDER", "UNI", "NEAR", "ARB",
];

interface ExchangeWallet {
  [asset: string]: number;
}

interface RebalanceEvent {
  id: string;
  tier: 1 | 2 | 3 | 4;
  type: string;
  asset: string;
  fromExchange: string;
  toExchange: string;
  fee: number;
  timestamp: number;
  reason: string;
}

interface BotStateLike {
  totalPortfolioValueUsd: number;
  startingCapital: number;
  startedAt: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  voidedSignals: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalRebalanceFees: number;
  rebalanceStats?: { totalRebalanceCost: number };
  voidByCategory?: { tooSmall: number; noUsdt: number; noInventory: number; dex: number; exchangeMissing: number };
  portfolio: Record<string, ExchangeWallet>;
  targetAllocations?: Record<string, Record<string, number>>;
  magnusAlphaMeta?: {
    flowTracker: {
      exchangeFlow: Record<string, { buys: number; sells: number; netFlow: number }>;
    };
    rebalanceOutcomes: Record<string, { tradesEnabled: number; profit: number; description: string }>;
    rebalanceRoi: {
      totalRebalanceCost: number;
      tradesEnabledByRebalancing: number;
      profitFromEnabledTrades: number;
      rebalanceROI: number;
      bestRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null;
      worstRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null;
    };
  };
}

interface RebalanceRoiBlock {
  totalRebalanceCost: number;
  tradesEnabledByRebalancing: number;
  profitFromEnabledTrades: number;
  rebalanceROI: number;
  bestRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null;
  worstRebalanceDecision: { description: string; tradesEnabled: number; profit: number } | null;
}

interface MagnusPerformance {
  capitalUtilization: number;
  reserveUtilization: number;
  rebalanceROI: RebalanceRoiBlock;
  inventoryScore: number;
  depletedPositions: number;
  totalPositions: number;
  avgReserveLevel: number;
  exchangesBelowReserve: number;
  healthPercent: number;
  alphaVsBeta: {
    alphaVoidRate: number;
    betaVoidRate: number;
    alphaTradesPerHour: number;
    betaTradesPerHour: number;
    alphaPnlPerHour: number;
    betaPnlPerHour: number;
  } | null;
}

interface BotStates {
  magnusBeta1k: BotStateLike;
  magnusBeta10k: BotStateLike;
}

interface FuturesTrade {
  id: string;
  timestamp: number;
  symbol: string;
  type: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  tradeSizeUsd: number;
  grossProfit: number;
  totalFees: number;
  netProfit: number;
}

interface FuturesState {
  id: string;
  name: string;
  startingCapital: number;
  totalPortfolioValueUsd: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  voidedSignals: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalFeesPaid: number;
  maxDrawdown: number;
  peakValue: number;
  startedAt: number;
  lastTradeAt: number | null;
  activeExchanges: string[];
  portfolio: Record<string, { USDT: number }>;
  voidByCategory: { dex: number; exchangeMissing: number; noInventory: number; noUsdt: number; tooSmall: number };
  recentTrades: FuturesTrade[];
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function shortEx(name: string): string {
  const m: Record<string, string> = {
    okx: "OKX",
    gateio: "GATE",
    binance: "BIN",
    bitget: "BTG",
    kucoin: "KUC",
    bingx: "BNX",
    htx: "HTX",
    mexc: "MEXC",
    kraken: "KRK",
  };
  return m[name] ?? name.slice(0, 4).toUpperCase();
}

function heatColor(ratio: number, hasTarget: boolean): string {
  if (!hasTarget) return "bg-[#21262D]";
  if (ratio <= 0 || ratio < 0.1) return "bg-[#F85149]";
  if (ratio < 0.5) return "bg-[#D29922]";
  if (ratio <= 1.5) return "bg-[#3FB950]";
  if (ratio <= 2.0) return "bg-[#3FB950]";
  return "bg-[#388BFD]";
}

function ComparisonTable({
  perf,
  alphaState,
  beta,
  cfgK,
}: {
  perf: MagnusPerformance;
  alphaState: BotStateLike | null;
  beta: BotStateLike;
  cfgK: number;
}) {
  const a = perf.alphaVsBeta!;
  const alphaH = Math.max(0.0001, (Date.now() - (alphaState?.startedAt ?? Date.now())) / 3_600_000);
  const betaH = Math.max(0.0001, (Date.now() - beta.startedAt) / 3_600_000);
  const rebalCostHrAlpha =
    (alphaState?.rebalanceStats?.totalRebalanceCost ?? alphaState?.totalRebalanceFees ?? 0) / alphaH;
  const rebalCostHrBeta = (beta.rebalanceStats?.totalRebalanceCost ?? beta.totalRebalanceFees) / betaH;

  const rows: { metric: string; va: string; vb: string; delta: string; win: boolean }[] = [
    {
      metric: "Void rate",
      va: `${a.alphaVoidRate.toFixed(0)}%`,
      vb: `${a.betaVoidRate.toFixed(0)}%`,
      delta: `${(a.betaVoidRate - a.alphaVoidRate).toFixed(0)}%`,
      win: a.alphaVoidRate < a.betaVoidRate,
    },
    {
      metric: "Trades/hr",
      va: a.alphaTradesPerHour.toFixed(1),
      vb: a.betaTradesPerHour.toFixed(1),
      delta: `${(((a.alphaTradesPerHour - a.betaTradesPerHour) / Math.max(0.001, a.betaTradesPerHour)) * 100).toFixed(0)}%`,
      win: a.alphaTradesPerHour > a.betaTradesPerHour,
    },
    {
      metric: "P&L/hr",
      va: `+$${a.alphaPnlPerHour.toFixed(2)}`,
      vb: `+$${a.betaPnlPerHour.toFixed(2)}`,
      delta: `${(((a.alphaPnlPerHour - a.betaPnlPerHour) / Math.max(0.001, Math.abs(a.betaPnlPerHour))) * 100).toFixed(0)}%`,
      win: a.alphaPnlPerHour > a.betaPnlPerHour,
    },
    {
      metric: "Win rate",
      va: `${(alphaState?.winRate ?? 0).toFixed(0)}%`,
      vb: `${beta.winRate.toFixed(0)}%`,
      delta: `${((alphaState?.winRate ?? 0) - beta.winRate).toFixed(0)}%`,
      win: (alphaState?.winRate ?? 0) > beta.winRate,
    },
    {
      metric: "Rebal cost/hr",
      va: `$${rebalCostHrAlpha.toFixed(2)}`,
      vb: `$${rebalCostHrBeta.toFixed(2)}`,
      delta: `${(rebalCostHrAlpha - rebalCostHrBeta).toFixed(2)}`,
      win: rebalCostHrAlpha < rebalCostHrBeta,
    },
    {
      metric: "Capital efficiency",
      va: `${perf.capitalUtilization.toFixed(0)}%`,
      vb: "—",
      delta: "—",
      win: true,
    },
  ];

  return (
    <table className="w-full text-[11px] font-mono">
      <thead>
        <tr className="text-[#8B949E] border-b border-[#21262D]">
          <th className="text-left py-1">Metric</th>
          <th className="text-right py-1">Magnus Alpha (${cfgK}K)</th>
          <th className="text-right py-1">Magnus Beta ($10K)</th>
          <th className="text-right py-1">Δ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.metric} className="border-b border-[#21262D]/60">
            <td className="py-1 text-[#8B949E]">{r.metric}</td>
            <td className="text-right text-[#3FB950]">{r.va}</td>
            <td className="text-right">{r.vb}</td>
            <td className="text-right">
              {r.delta} {r.win ? "✅" : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FuturesPanel({ state }: { state: FuturesState | null }) {
  if (!state) {
    return (
      <div className="max-w-[1600px] mx-auto text-[11px] font-mono text-[#8B949E]">
        Magnus Futures initialising… spot-futures gaps required (type === &apos;spot_futures&apos;).
      </div>
    );
  }

  const FUTURES_EXCHANGES = ["okx", "gateio", "binance", "bitget", "kucoin", "mexc", "htx"];
  const hours = Math.max(0.0001, (Date.now() - state.startedAt) / 3_600_000);
  const voidTotal =
    state.totalTrades + state.voidedSignals > 0
      ? (state.voidedSignals / (state.totalTrades + state.voidedSignals)) * 100
      : 0;

  const statCards = [
    {
      label: "PORTFOLIO",
      value: `$${state.totalPortfolioValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${state.totalPnl >= 0 ? "+" : ""}$${(state.totalPortfolioValueUsd - state.startingCapital).toFixed(2)} vs start`,
      color: state.totalPortfolioValueUsd >= state.startingCapital ? "text-[#3FB950]" : "text-[#F85149]",
    },
    {
      label: "TOTAL P&L",
      value: formatPnl(state.totalPnl),
      sub: `${state.totalPnlPercent >= 0 ? "+" : ""}${state.totalPnlPercent.toFixed(3)}%`,
      color: state.totalPnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]",
    },
    {
      label: "TRADES",
      value: formatNumber(state.totalTrades),
      sub: state.totalTrades > 0
        ? `${state.winRate.toFixed(0)}% win · ${state.winningTrades}W/${state.losingTrades}L`
        : "—",
      color: "text-[#E6EDF3]",
    },
    {
      label: "VOID RATE",
      value: `${voidTotal.toFixed(0)}%`,
      sub: `sm:${state.voidByCategory.tooSmall} nu:${state.voidByCategory.noUsdt} ex:${state.voidByCategory.exchangeMissing}`,
      color: "text-[#D29922]",
    },
    {
      label: "FEES PAID",
      value: `$${state.totalFeesPaid.toFixed(3)}`,
      sub: "0.1% × 2 legs",
      color: "text-[#8B949E]",
    },
    {
      label: "TRADES/HR",
      value: (state.totalTrades / hours).toFixed(1),
      sub: `P&L/hr: ${state.totalPnl >= 0 ? "+" : ""}$${(state.totalPnl / hours).toFixed(2)}`,
      color: "text-[#A371F7]",
    },
    {
      label: "MAX DD",
      value: `${state.maxDrawdown.toFixed(2)}%`,
      sub: `peak $${state.peakValue.toFixed(2)}`,
      color: state.maxDrawdown > 2 ? "text-[#F85149]" : "text-[#3FB950]",
    },
    {
      label: "MODEL",
      value: "NEUTRAL",
      sub: "no coin exposure",
      color: "text-[#A371F7]",
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* Header badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#A371F7]/20 text-[#A371F7] border border-[#A371F7]/40">
          SPOT-FUTURES · MARKET NEUTRAL · USDT-ONLY
        </span>
        <span className="text-[10px] text-[#484F58] font-mono">
          $142.86 / exchange · no coin inventory · no price exposure
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {statCards.map((c) => (
          <div key={c.label} className="bg-[#161B22] border border-[#21262D] rounded p-2">
            <p className="text-[8px] font-mono text-[#8B949E] uppercase">{c.label}</p>
            <p className={`text-[13px] font-mono font-bold ${c.color}`}>{c.value}</p>
            {c.sub && <p className="text-[9px] font-mono text-[#484F58] mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        {/* Left — USDT balances */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="bg-[#161B22] border border-[#21262D] rounded p-3">
            <p className="text-[9px] font-mono text-[#8B949E] uppercase mb-3">USDT balance per exchange</p>
            <div className="space-y-2">
              {FUTURES_EXCHANGES.map((ex) => {
                const u = state.portfolio[ex]?.USDT ?? 0;
                const target = state.startingCapital / FUTURES_EXCHANGES.length;
                const fill = Math.min(100, (u / (target * 2)) * 100);
                const barColor = u >= target ? "bg-[#3FB950]" : u >= target * 0.5 ? "bg-[#D29922]" : "bg-[#F85149]";
                const pnl = u - target;
                return (
                  <div key={ex} className="text-[10px] font-mono">
                    <div className="flex justify-between mb-0.5">
                      <span className="w-16 text-[#E6EDF3]">{shortEx(ex)}</span>
                      <span className="text-[#E6EDF3]">${u.toFixed(2)}</span>
                      <span className={pnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#21262D] rounded overflow-hidden">
                      <div className={`h-full ${barColor} rounded`} style={{ width: `${fill}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Void breakdown */}
          <div className="bg-[#161B22] border border-[#21262D] rounded p-3">
            <p className="text-[9px] font-mono text-[#8B949E] uppercase mb-2">Void signal breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "Too small", val: state.voidByCategory.tooSmall },
                { label: "No USDT", val: state.voidByCategory.noUsdt },
                { label: "Exchange missing", val: state.voidByCategory.exchangeMissing },
                { label: "No inventory", val: state.voidByCategory.noInventory },
                { label: "DEX", val: state.voidByCategory.dex },
              ].map((v) => (
                <div key={v.label} className="bg-[#0D1117] rounded p-2 text-center">
                  <p className="text-[11px] font-mono font-bold text-[#D29922]">{v.val}</p>
                  <p className="text-[9px] font-mono text-[#484F58] mt-0.5">{v.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Recent trades */}
        <div className="w-full xl:w-[55%] space-y-3">
          <div className="bg-[#161B22] border border-[#21262D] rounded overflow-hidden">
            <p className="text-[9px] font-mono text-[#8B949E] uppercase px-2 py-1 border-b border-[#21262D]">
              Recent trades
            </p>
            {state.recentTrades.length === 0 ? (
              <p className="px-3 py-4 text-[11px] font-mono text-[#484F58]">
                No trades yet — waiting for spot-futures gaps ≥ 0.25% spread…
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="text-[#484F58] border-b border-[#21262D]">
                      <th className="text-left px-2 py-1">TIME</th>
                      <th className="text-left px-2 py-1">SYMBOL</th>
                      <th className="text-left px-2 py-1">ROUTE</th>
                      <th className="text-right px-2 py-1">SPREAD</th>
                      <th className="text-right px-2 py-1">SIZE</th>
                      <th className="text-right px-2 py-1">NET P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.recentTrades.map((t) => (
                      <tr key={t.id} className="border-b border-[#21262D]/60 h-6">
                        <td className="px-2 text-[#8B949E]">{fmtTime(t.timestamp)}</td>
                        <td className="px-2 text-[#E6EDF3]">{t.symbol}</td>
                        <td className="px-2 text-[#8B949E]">
                          {shortEx(t.buyExchange)}→{shortEx(t.sellExchange)}
                        </td>
                        <td className="px-2 text-right text-[#D29922]">{t.spreadPercent.toFixed(2)}%</td>
                        <td className="px-2 text-right">${t.tradeSizeUsd.toFixed(0)}</td>
                        <td className={`px-2 text-right font-bold ${t.netProfit >= 0 ? "text-[#3FB950]" : "text-[#F85149]"}`}>
                          {t.netProfit >= 0 ? "+" : ""}${t.netProfit.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Why market neutral */}
          <div className="bg-[#161B22] border border-[#A371F7]/20 rounded p-3">
            <p className="text-[9px] font-mono text-[#A371F7] uppercase mb-2">Why market neutral?</p>
            <div className="space-y-1 text-[10px] font-mono text-[#8B949E]">
              <p><span className="text-[#3FB950]">CEX-CEX (Alpha):</span> buys coins on exchange A, sells on B → holds coin inventory → exposed to price drops</p>
              <p><span className="text-[#A371F7]">Spot-Futures (this):</span> buys spot + shorts equal futures simultaneously → spread captured at convergence → zero net coin exposure</p>
              <p className="text-[#484F58] pt-1">Both sides use USDT only. No rebalancing needed. No inventory depreciation risk.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MagnusPage() {
  const [tab, setTab] = useState<"alpha" | "beta" | "futures">("alpha");
  const [alphaState, setAlphaState] = useState<BotStateLike | null>(null);
  const [perf, setPerf] = useState<MagnusPerformance | null>(null);
  const [rebalances, setRebalances] = useState<RebalanceEvent[]>([]);
  const [betaStates, setBetaStates] = useState<BotStates | null>(null);
  const [futuresState, setFuturesState] = useState<FuturesState | null>(null);
  const [compareOpen, setCompareOpen] = useState(true);
  const [now, setNow] = useState(() => new Date().toLocaleTimeString("en-US", { hour12: false }));

  const fetchAll = useCallback(async () => {
    try {
      const [a, p, r, b, f] = await Promise.all([
        fetch("/api/magnus/alpha", { cache: "no-store" }),
        fetch("/api/magnus/alpha/performance", { cache: "no-store" }),
        fetch("/api/magnus/alpha/rebalances?limit=20", { cache: "no-store" }),
        fetch("/api/simulators", { cache: "no-store" }),
        fetch("/api/magnus/futures", { cache: "no-store" }),
      ]);
      if (a.ok) setAlphaState(await a.json());
      if (p.ok) setPerf(await p.json());
      if (r.ok) setRebalances(await r.json());
      if (b.ok) setBetaStates(await b.json());
      if (f.ok) setFuturesState(await f.json());
      setNow(new Date().toLocaleTimeString("en-US", { hour12: false }));
    } catch {
      /* keep */
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 5_000);
    const t = setInterval(() => setNow(new Date().toLocaleTimeString("en-US", { hour12: false })), 1_000);
    return () => {
      clearInterval(i);
      clearInterval(t);
    };
  }, [fetchAll]);

  const reserve = 1000;
  const cfgCap = alphaState?.startingCapital ?? 19000;
  const roi = perf?.rebalanceROI ?? alphaState?.magnusAlphaMeta?.rebalanceRoi;
  const voidTotal =
    (alphaState?.totalTrades ?? 0) + (alphaState?.voidedSignals ?? 0) > 0
      ? ((alphaState?.voidedSignals ?? 0) / ((alphaState?.totalTrades ?? 0) + (alphaState?.voidedSignals ?? 0))) * 100
      : 0;
  const winStr =
    alphaState && alphaState.totalTrades > 0
      ? `${alphaState.winRate.toFixed(0)}% (${alphaState.winningTrades}W/${alphaState.losingTrades}L)`
      : "—";

  let healthy = 0,
    low = 0,
    depleted = 0,
    surplus = 0;
  const targets = alphaState?.targetAllocations ?? {};

  for (const coin of COIN_ROWS) {
    for (const { id: ex } of EX_COLS) {
      const tgt = targets[ex]?.[coin];
      const q = alphaState?.portfolio[ex]?.[coin] ?? 0;
      if (tgt == null || tgt <= 0) continue;
      const ratio = q / tgt;
      if (ratio <= 0 || ratio < 0.1) depleted++;
      else if (ratio < 0.5) low++;
      else if (ratio > 2) surplus++;
      else healthy++;
    }
  }

  const flowMap = alphaState?.magnusAlphaMeta?.flowTracker.exchangeFlow ?? {};

  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-[#E6EDF3]">
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
          <Link
            href="/intelligence"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Intelligence</span>
          </Link>
          <Link
            href="/magnus"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#388BFD]/10 border border-[#388BFD]/40 text-[#388BFD] text-[10px] font-mono whitespace-nowrap"
          >
            Magnus
          </Link>
          <Link
            href="/dex"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">DEX Markets</span>
          </Link>
          <Link
            href="/funding-rates"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Funding Rates</span>
          </Link>
          <Link
            href="/alerts"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Alerts</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Dashboard</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
            title="Settings"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="px-6 pt-4 pb-3 border-b border-[#21262D] flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold font-mono text-[#E6EDF3]">⚡ MAGNUS ARBITRATOR</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40">
              ● LIVE
            </span>
          </div>
          <p className="text-[11px] text-[#8B949E] font-mono mt-1">
            Inventory model · ROI-driven rebalancing · predictive pre-balancing
          </p>
        </div>
        <span className="text-[10px] text-[#484F58] font-mono">v0.5.4 · Last updated: {now}</span>
      </div>

      <div className="px-6 pt-3 flex gap-1">
        <button
          onClick={() => setTab("alpha")}
          className={`px-3 py-1 rounded text-[10px] font-mono border ${
            tab === "alpha"
              ? "bg-[#388BFD]/15 text-[#388BFD] border-[#388BFD]"
              : "text-[#8B949E] border-[#21262D]"
          }`}
        >
          Magnus Alpha · ${Math.round(cfgCap / 1000)}K
        </button>
        <button
          onClick={() => setTab("beta")}
          className={`px-3 py-1 rounded text-[10px] font-mono border ${
            tab === "beta"
              ? "bg-[#388BFD]/15 text-[#388BFD] border-[#388BFD]"
              : "text-[#8B949E] border-[#21262D]"
          }`}
        >
          Magnus Beta · $10K
        </button>
        <button
          onClick={() => setTab("futures")}
          className={`px-3 py-1 rounded text-[10px] font-mono border ${
            tab === "futures"
              ? "bg-[#A371F7]/15 text-[#A371F7] border-[#A371F7]"
              : "text-[#8B949E] border-[#21262D]"
          }`}
        >
          Magnus Futures · $1K
        </button>
      </div>

      <main className="flex-1 px-6 py-4 overflow-y-auto">
        {tab === "futures" ? (
          <FuturesPanel state={futuresState} />
        ) : tab === "beta" ? (
          <div className="max-w-[1600px] mx-auto text-[11px] font-mono text-[#8B949E]">
            Beta baseline bots run on the server with frozen logic. View raw states via{" "}
            <Link href="/api/simulators" className="text-[#388BFD]">
              /api/simulators
            </Link>
            . Switch tab to Alpha for the production dashboard.
          </div>
        ) : (
          <div className="max-w-[1600px] mx-auto space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {[
                {
                  label: "PORTFOLIO",
                  value: alphaState ? formatUsd(alphaState.totalPortfolioValueUsd) : "—",
                  sub: alphaState
                    ? `${alphaState.totalPortfolioValueUsd >= alphaState.startingCapital ? "+" : ""}${formatUsd(Math.abs(alphaState.totalPortfolioValueUsd - alphaState.startingCapital), 0)} vs start`
                    : "",
                  color:
                    alphaState && alphaState.totalPortfolioValueUsd >= alphaState.startingCapital
                      ? "text-[#3FB950]"
                      : "text-[#F85149]",
                },
                {
                  label: "TOTAL P&L",
                  value: alphaState ? formatPnl(alphaState.totalPnl) : "—",
                  sub: alphaState ? `${alphaState.totalPnlPercent >= 0 ? "+" : ""}${alphaState.totalPnlPercent.toFixed(2)}%` : "",
                  color: alphaState && alphaState.totalPnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]",
                },
                { label: "TRADES", value: formatNumber(alphaState?.totalTrades ?? 0), sub: winStr, color: "text-[#E6EDF3]" },
                {
                  label: "VOID RATE",
                  value: `${voidTotal.toFixed(0)}%`,
                  sub: `sm:${alphaState?.voidByCategory?.tooSmall ?? 0} nu:${alphaState?.voidByCategory?.noUsdt ?? 0}`,
                  color: "text-[#D29922]",
                },
                {
                  label: "CAPITAL UTIL",
                  value: `${(perf?.capitalUtilization ?? 0).toFixed(0)}%`,
                  sub: "working vs idle",
                  color: "text-[#8B949E]",
                },
                {
                  label: "INV HEALTH",
                  value: `${(perf?.inventoryScore ?? 0).toFixed(0)}%`,
                  sub: `${135 - (perf?.depletedPositions ?? depleted)} / 135 positions`,
                  color: "text-[#3FB950]",
                },
                {
                  label: "REBAL ROI",
                  value: roi ? `${roi.rebalanceROI.toFixed(1)}x` : "—",
                  sub: "profit / cost",
                  color:
                    (roi?.rebalanceROI ?? 0) >= 2
                      ? "text-[#3FB950]"
                      : (roi?.rebalanceROI ?? 0) >= 1
                        ? "text-[#D29922]"
                        : "text-[#F85149]",
                },
                {
                  label: "RESERVE",
                  value: `$${(perf?.avgReserveLevel ?? 0).toFixed(0)} avg`,
                  sub: `${perf?.exchangesBelowReserve ?? 0} below floor`,
                  color:
                    (perf?.avgReserveLevel ?? 0) > reserve * 1.2
                      ? "text-[#3FB950]"
                      : (perf?.avgReserveLevel ?? 0) > reserve * 0.8
                        ? "text-[#D29922]"
                        : "text-[#F85149]",
                },
              ].map((c) => (
                <div key={c.label} className="bg-[#161B22] border border-[#21262D] rounded p-2">
                  <p className="text-[8px] font-mono text-[#8B949E] uppercase">{c.label}</p>
                  <p className={`text-[13px] font-mono font-bold ${c.color}`}>{c.value}</p>
                  {c.sub && <p className="text-[9px] font-mono text-[#484F58] mt-0.5">{c.sub}</p>}
                </div>
              ))}
            </div>

            <div className="flex flex-col xl:flex-row gap-4">
              {/* Left 60% */}
              <div className="flex-1 min-w-0 space-y-3 xl:w-[60%]">
                <div className="bg-[#161B22] border border-[#21262D] rounded overflow-hidden">
                  <p className="text-[9px] font-mono text-[#8B949E] uppercase px-2 py-1 border-b border-[#21262D]">
                    Rebalance activity
                  </p>
                  <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                    <table className="w-full text-[10px] font-mono">
                      <thead>
                        <tr className="text-[#484F58] border-b border-[#21262D]">
                          <th className="text-left px-1 py-1">TIME</th>
                          <th className="text-left px-1 py-1">TIER</th>
                          <th className="text-left px-1 py-1">ACTION</th>
                          <th className="text-left px-1 py-1">ASSET</th>
                          <th className="text-left px-1 py-1">ROUTE</th>
                          <th className="text-right px-1 py-1">COST</th>
                          <th className="text-left px-1 py-1">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rebalances.map((ev) => {
                          const out = alphaState?.magnusAlphaMeta?.rebalanceOutcomes[ev.id];
                          const age = Date.now() - ev.timestamp;
                          const roiTxt =
                            out && out.tradesEnabled > 0
                              ? `→ ${out.tradesEnabled} trades +$${out.profit.toFixed(2)}`
                              : age < 120_000
                                ? "pending"
                                : "0 trades";
                          const tierBadge =
                            ev.tier === 1
                              ? "bg-[#3FB950]/20 text-[#3FB950]"
                              : ev.tier === 2
                                ? "bg-[#388BFD]/20 text-[#388BFD]"
                                : ev.tier === 3
                                  ? "bg-[#D29922]/20 text-[#D29922]"
                                  : "bg-[#A371F7]/20 text-[#A371F7]";
                          const action =
                            ev.type === "usdt_transfer" ? "xfer" : ev.type === "coin_transfer" ? "xfer" : "rebuy";
                          const route =
                            ev.fromExchange === ev.toExchange
                              ? `${shortEx(ev.fromExchange)} (${action})`
                              : `${shortEx(ev.fromExchange)}→${shortEx(ev.toExchange)}`;
                          return (
                            <tr key={ev.id} className="border-b border-[#21262D]/80 h-6">
                              <td className="px-1 text-[10px] text-[#8B949E]">{fmtTime(ev.timestamp)}</td>
                              <td className="px-1">
                                <span className={`px-1 rounded text-[9px] ${tierBadge}`}>
                                  {ev.tier === 4 ? "PRED" : `T${ev.tier}`}
                                </span>
                              </td>
                              <td className="px-1 text-[11px]">{action}</td>
                              <td className="px-1 font-mono text-[11px]">{ev.asset}</td>
                              <td className="px-1 text-[10px] text-[#8B949E]">{route}</td>
                              <td className="px-1 text-right">${ev.fee.toFixed(2)}</td>
                              <td
                                className={`px-1 text-[10px] ${
                                  out && out.tradesEnabled > 0
                                    ? "text-[#3FB950]"
                                    : roiTxt === "pending"
                                      ? "text-[#484F58]"
                                      : "text-[#F85149]"
                                }`}
                              >
                                {roiTxt}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#161B22] border border-[#21262D] rounded p-2">
                  <p className="text-[9px] font-mono text-[#8B949E] uppercase mb-2">Trade flow map</p>
                  <div className="space-y-1">
                    {EX_COLS.map(({ id, label }) => {
                      const f = flowMap[id] ?? { buys: 0, sells: 0, netFlow: 0 };
                      const nf = f.netFlow;
                      let line = "";
                      let color = "text-[#3FB950]";
                      if (nf <= -5) {
                        line = `${"→".repeat(3)} heavy buy (USDT depleting)`;
                        color = "text-[#D29922]";
                      } else if (nf >= 5) {
                        line = `${"←".repeat(3)} heavy sell (coins depleting)`;
                        color = "text-[#F85149]";
                      } else {
                        line = "←→ balanced";
                        color = "text-[#3FB950]";
                      }
                      return (
                        <div key={id} className={`flex justify-between text-[10px] font-mono ${color}`}>
                          <span className="w-20">{label}</span>
                          <span className="flex-1 truncate">{line}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#161B22] border border-[#21262D] p-2 rounded">
                  <p className="text-[9px] font-mono text-[#8B949E] uppercase mb-1">Rebalance ROI summary</p>
                  <div className="text-[11px] font-mono space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-[#8B949E]">Total rebalance cost:</span>
                      <span>${(roi?.totalRebalanceCost ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B949E]">Trades enabled:</span>
                      <span>{roi?.tradesEnabledByRebalancing ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B949E]">Profit from enabled:</span>
                      <span className="text-[#3FB950]">
                        ${(roi?.profitFromEnabledTrades ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B949E]">Rebalancing ROI:</span>
                      <span
                        className={
                          (roi?.rebalanceROI ?? 0) >= 2 ? "text-[#3FB950]" : "text-[#D29922]"
                        }
                      >
                        {(roi?.rebalanceROI ?? 0).toFixed(1)}x
                      </span>
                    </div>
                    {roi?.bestRebalanceDecision && (
                      <p className="text-[#3FB950] pt-1">
                        Best: {roi.bestRebalanceDecision.description} · {roi.bestRebalanceDecision.tradesEnabled}{" "}
                        trades +${roi.bestRebalanceDecision.profit.toFixed(2)}
                      </p>
                    )}
                    {roi?.worstRebalanceDecision && (
                      <p className="text-[#F85149]">
                        Worst: {roi.worstRebalanceDecision.description} ·{" "}
                        {roi.worstRebalanceDecision.tradesEnabled} trades $
                        {roi.worstRebalanceDecision.profit.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right 40% */}
              <div className="w-full xl:w-[40%] space-y-3">
                <div className="bg-[#161B22] border border-[#21262D] rounded p-2 overflow-x-auto">
                  <p className="text-[9px] font-mono text-[#8B949E] uppercase mb-2">Inventory heatmap</p>
                  <div className="inline-block min-w-full">
                    <div className="flex gap-0.5 mb-0.5 pl-12">
                      {EX_COLS.map((c) => (
                        <div key={c.id} className="w-3 text-[8px] font-mono text-[#484F58] text-center">
                          {c.label}
                        </div>
                      ))}
                    </div>
                    {COIN_ROWS.map((coin) => (
                      <div key={coin} className="flex items-center gap-0.5 mb-0.5">
                        <span className="w-11 text-[9px] font-mono text-[#8B949E] shrink-0">{coin}</span>
                        {EX_COLS.map(({ id: ex }) => {
                          const tgt = targets[ex]?.[coin];
                          const q = alphaState?.portfolio[ex]?.[coin] ?? 0;
                          const hasT = tgt != null && tgt > 0;
                          const ratio = hasT ? q / tgt! : 0;
                          return (
                            <div
                              key={ex}
                              title={`${coin} @ ${ex}: ${q.toFixed(4)} / target ${tgt?.toFixed(4) ?? "—"}`}
                              className={`w-3 h-3 shrink-0 rounded-sm ${heatColor(ratio, hasT)}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#8B949E] font-mono mt-2">
                    Healthy: {healthy}/135 · Low: {low} · Depleted: {depleted} · Surplus: {surplus}
                  </p>
                </div>

                <div className="bg-[#161B22] border border-[#21262D] rounded p-2">
                  <p className="text-[9px] font-mono text-[#8B949E] uppercase mb-2">USDT reserve monitor</p>
                  <div className="space-y-1.5">
                    {EX_COLS.map(({ id, label }) => {
                      const u = alphaState?.portfolio[id]?.USDT ?? 0;
                      const trad = Math.max(0, u - reserve);
                      const maxBar = reserve + 600;
                      const fill = Math.min(100, (u / maxBar) * 100);
                      const reservePct = (reserve / maxBar) * 100;
                      const barColor =
                        u > reserve + 200 ? "bg-[#3FB950]" : u >= reserve ? "bg-[#D29922]" : "bg-[#F85149]";
                      return (
                        <div key={id} className="text-[10px] font-mono">
                          <div className="flex justify-between mb-0.5">
                            <span className="w-12">{label}</span>
                            <span>${u.toFixed(0)}</span>
                          </div>
                          <div className="h-2 bg-[#21262D] rounded relative overflow-hidden">
                            <div className={`h-full ${barColor} rounded`} style={{ width: `${fill}%` }} />
                            <div
                              className="absolute top-0 bottom-0 w-px bg-[#E6EDF3]/80"
                              style={{ left: `${reservePct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="bg-[#161B22] border border-[#21262D] rounded">
              <button
                type="button"
                onClick={() => setCompareOpen(!compareOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-[#E6EDF3] hover:bg-[#21262D]/50"
              >
                {compareOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                ALPHA vs BETA COMPARISON
              </button>
              {compareOpen && perf?.alphaVsBeta && betaStates && (
                <div className="px-3 pb-3 overflow-x-auto">
                  <ComparisonTable
                    perf={perf}
                    alphaState={alphaState}
                    beta={betaStates.magnusBeta10k}
                    cfgK={Math.round(cfgCap / 1000)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
