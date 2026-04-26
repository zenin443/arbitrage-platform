"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { formatTimestamp } from "@/lib/utils/formatters";
import { formatUsd } from "@/lib/utils";
import { formatPercent } from "@/lib/formatters";
import { ExchangeLink } from "@/lib/referrals";

const EXCHANGE_LABELS: Record<string, string> = {
  binance:  "Binance",
  bybit:    "Bybit",
  okx:      "OKX",
  kucoin:   "KuCoin",
  kraken:   "Kraken",
  coinbase: "Coinbase",
  gate:     "Gate.io",
  htx:      "HTX",
  mexc:     "MEXC",
};

function exchangeLabel(id: string): string {
  return EXCHANGE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function networkLabel(type: string): string {
  switch (type) {
    case "cex_cex":      return "CEX";
    case "dex_cex":      return "DEX";
    case "spot_futures": return "S-F";
    case "triangular":   return "TRI";
    case "cross_chain":  return "X-CHAIN";
    default:             return type.toUpperCase().replace(/_/g, "-");
  }
}

type ConfidenceTier = "high" | "medium" | "low";

function computeConfidence(spreadPercent: number, durationMs: number): ConfidenceTier {
  if (spreadPercent > 0.5 && durationMs < 30_000) return "high";
  if (spreadPercent > 0.2) return "medium";
  return "low";
}

function formatLiquidity(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

const CONFIDENCE_BADGE: Record<ConfidenceTier, string> = {
  high:   "bg-[#3FB950]/10 text-[#3FB950] border border-[#3FB950]/20 text-[11px] px-2 py-0.5 rounded-full",
  medium: "bg-[#D29922]/10 text-[#D29922] border border-[#D29922]/20 text-[11px] px-2 py-0.5 rounded-full",
  low:    "text-[#8B949E] text-[11px] px-2 py-0.5",
};

interface GapRecord {
  id?: string;
  type: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  buyPrice: number;
  sellPrice: number;
  maxTradeableUsd: number;
  detectedAt: number;
  durationMs: number;
}

interface OpportunityTableProps {
  onSelectSignal: (signal: GapRecord) => void;
  selectedSignalId: string | null;
}

export default function OpportunityTable({ onSelectSignal, selectedSignalId }: OpportunityTableProps) {
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchGaps = async () => {
      try {
        const res = await fetch("/api/profitable-gaps");
        const data = await res.json();
        setGaps(Array.isArray(data) ? data : []);
      } catch {
        // keep previous data on transient errors
      } finally {
        setLoading(false);
      }
    };

    fetchGaps();
    const interval = setInterval(fetchGaps, 3000);
    return () => clearInterval(interval);
  }, []);

  const newIds = new Set<string>();
  for (const gap of gaps) {
    const key = gap.id ?? `${gap.symbol}:${gap.buyExchange}:${gap.sellExchange}`;
    if (!seenIds.current.has(key)) {
      newIds.add(key);
      seenIds.current.add(key);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0D1117] border border-[#21262D] rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#21262D] shrink-0">
        <span className="text-[12px] font-sans text-[#388BFD]">
          Arbitrage opportunities
        </span>
        <div className="flex items-center gap-2">
          {loading && gaps.length === 0 ? (
            <span className="text-[12px] font-sans text-[#484F58]">Loading…</span>
          ) : (
            <>
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
              <span className="bg-[#388BFD]/10 text-[#388BFD] border border-[#388BFD]/20 text-[11px] px-2 py-0.5 rounded-full font-medium font-sans">
                {gaps.length} signal{gaps.length !== 1 ? "s" : ""}
              </span>
              {selectedSignalId && (
                <span className="text-[11px] font-sans text-[#484F58]">
                  · panel open →
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Scrollable table area */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-[800px] w-full text-xs font-mono">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#1C2128] text-[#484F58] text-[11px] font-sans">
              <th className="px-3 py-1 text-left font-medium">Symbol</th>
              <th className="px-3 py-1 text-left font-medium">Buy</th>
              <th className="px-3 py-1 text-left font-medium">Sell</th>
              <th className="px-3 py-1 text-right font-medium">Gross %</th>
              <th className="px-3 py-1 text-right font-medium">Net %</th>
              <th className="px-3 py-1 text-right font-medium">Est. profit</th>
              <th className="px-3 py-1 text-right font-medium">Liquidity</th>
              <th className="px-3 py-1 text-right font-medium">Network</th>
              <th className="px-3 py-1 text-right font-medium">Confidence</th>
              <th className="px-3 py-1 text-right font-medium">Detected</th>
            </tr>
          </thead>
          <tbody>
            {gaps.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-4">
                  <div className="flex flex-col items-center gap-2 text-[#484F58]">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1C2128] opacity-60" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#161B22] border border-[#21262D]" />
                    </div>
                    <span className="text-[11px] font-sans text-[#8B949E]">
                      {loading ? "Loading opportunities…" : "No profitable opportunities detected"}
                    </span>
                    {!loading && (
                      <span className="text-[11px] font-sans text-[#484F58] text-center max-w-md">
                        Spreads are currently below fee threshold.{" "}
                        <a href="/intelligence" className="text-[#388BFD] hover:underline">
                          See Intelligence page for all gap types →
                        </a>
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              gaps.map((gap) => {
                const key = gap.id ?? `${gap.symbol}:${gap.buyExchange}:${gap.sellExchange}`;
                const tier = computeConfidence(gap.spreadPercent, gap.durationMs);
                const netSpread = gap.spreadPercent - 0.2;
                const estimatedProfit =
                  (gap.maxTradeableUsd * gap.spreadPercent) / 100 -
                  gap.maxTradeableUsd * 0.002;
                const liquidityScore = Math.min(100, (gap.maxTradeableUsd / 10_000) * 100);
                const isNew = newIds.has(key);
                const isSelected = selectedSignalId === key;

                const tierBorderColor =
                  tier === "high"   ? "border-l-[#3FB950]" :
                  tier === "medium" ? "border-l-[#D29922]" :
                                      "border-l-[#21262D]";

                return (
                  <tr
                    key={key}
                    onClick={() => onSelectSignal(gap)}
                    className={clsx(
                      "cursor-pointer transition-colors duration-200 border-b border-[#21262D] border-l-2",
                      isSelected
                        ? "bg-[#161B22] border-l-[#388BFD]"
                        : clsx(tierBorderColor, "hover:bg-[#161B22]/30"),
                      isNew && !isSelected && "animate-fade-in"
                    )}
                  >
                    <td className="px-3 py-1 text-[#E6EDF3] font-mono text-[12px] font-medium">
                      {gap.symbol}
                    </td>
                    <td className="px-3 py-1 font-sans text-[12px]">
                      <ExchangeLink exchangeId={gap.buyExchange} className="text-[#388BFD]">
                        {exchangeLabel(gap.buyExchange)}
                      </ExchangeLink>
                    </td>
                    <td className="px-3 py-1 font-sans text-[12px]">
                      <ExchangeLink exchangeId={gap.sellExchange} className="text-[#F85149]">
                        {exchangeLabel(gap.sellExchange)}
                      </ExchangeLink>
                    </td>
                    <td className="px-3 py-1 text-right text-[#8B949E] font-mono text-[12px] tabular-nums">
                      {formatPercent(gap.spreadPercent, 3)}
                    </td>
                    <td
                      className={clsx(
                        "px-3 py-1 text-right tabular-nums font-mono text-[12px] font-medium",
                        netSpread >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
                      )}
                    >
                      {formatPercent(netSpread, 3)}
                    </td>
                    <td className="px-3 py-1 text-right text-[#388BFD] font-mono text-[12px] font-medium tabular-nums">
                      {formatUsd(estimatedProfit)}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">
                      <LiquidityBar
                        score={liquidityScore}
                        label={formatLiquidity(gap.maxTradeableUsd)}
                      />
                    </td>
                    <td className="px-3 py-1 text-right text-[#8B949E] tabular-nums text-[11px]">
                      <span className="bg-[#1C2128] border border-[#21262D] px-1.5 py-0.5 rounded text-[11px]">
                        {networkLabel(gap.type)}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-right">
                      <span
                        className={clsx(
                          "inline-flex items-center font-medium text-[11px] uppercase",
                          CONFIDENCE_BADGE[tier]
                        )}
                      >
                        {tier}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-right text-[#484F58] tabular-nums text-[11px] font-sans">
                      {gap.detectedAt ? timeAgo(gap.detectedAt) : formatTimestamp(Date.now())}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LiquidityBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(100, score)));
  const color =
    pct >= 70 ? "bg-[#3FB950]" : pct >= 40 ? "bg-[#D29922]" : "bg-[#484F58]";

  return (
    <span className="inline-flex items-center gap-1.5 justify-end">
      <span className="text-[#8B949E] tabular-nums text-[11px] font-mono">{label}</span>
      <span className="w-10 h-1 rounded-full bg-[#1C2128] overflow-hidden">
        <span
          className={clsx("h-full rounded-full block", color)}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}
