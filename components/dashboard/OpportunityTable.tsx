"use client";

import { useRef } from "react";
import { clsx } from "clsx";
import type { ArbitrageOpportunity } from "@/types";
import {
  formatSpread,
  formatProfit,
  formatTimestamp,
} from "@/lib/utils/formatters";
import { useWebSocket } from "@/app/lib/useWebSocket";

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  bybit: "Bybit",
  okx: "OKX",
  kucoin: "KuCoin",
};

function exchangeLabel(id: string): string {
  return EXCHANGE_LABELS[id] ?? id.toUpperCase();
}

type ConfidenceTier = ArbitrageOpportunity["confidence"];

const ROW_ACCENT: Record<ConfidenceTier, string> = {
  high:   "border-l-2 border-l-[#3FB950] border-b border-[#21262D] hover:bg-[#1C2128]",
  medium: "border-l-2 border-l-[#D29922] border-b border-[#21262D] hover:bg-[#1C2128]",
  low:    "border-l-2 border-l-[#21262D] border-b border-[#21262D] hover:bg-[#1C2128]",
};

const CONFIDENCE_BADGE: Record<ConfidenceTier, string> = {
  high:   "bg-[#3FB950]/10 text-[#3FB950] border border-[#3FB950]/20 text-xs px-2 py-0.5 rounded-full",
  medium: "bg-[#D29922]/10 text-[#D29922] border border-[#D29922]/20 text-xs px-2 py-0.5 rounded-full",
  low:    "text-[#8B949E] text-xs px-2 py-0.5",
};

export default function OpportunityTable() {
  const seenIds = useRef<Set<string>>(new Set());

  const { opportunities, connected } = useWebSocket("ws://localhost:3002");

  const isConnecting = !connected && opportunities.length === 0;
  const isError = false; // WebSocket errors are handled internally with reconnect

  // Track new IDs for flash animation
  const newIds = new Set<string>();
  for (const opp of opportunities) {
    if (!seenIds.current.has(opp.id)) {
      newIds.add(opp.id);
      seenIds.current.add(opp.id);
    }
  }

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161B22] border-b border-[#21262D]">
        <span className="text-xs font-mono text-[#388BFD] uppercase tracking-wider">
          Arbitrage Opportunities
        </span>
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <span className="text-xs font-mono text-[#484F58]">Connecting…</span>
          ) : isError ? (
            <span className="text-xs font-mono text-[#F85149]">Feed error</span>
          ) : (
            <>
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
              <span className="bg-[#388BFD]/10 text-[#388BFD] border border-[#388BFD]/20 text-xs px-2 py-0.5 rounded-full font-mono">
                {opportunities.length} signal
                {opportunities.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-[#1C2128] text-[#484F58] uppercase tracking-widest text-[10px] font-mono">
              <th className="px-4 py-2.5 text-left font-medium">Symbol</th>
              <th className="px-4 py-2.5 text-left font-medium">Buy</th>
              <th className="px-4 py-2.5 text-left font-medium">Sell</th>
              <th className="px-4 py-2.5 text-right font-medium">Gross %</th>
              <th className="px-4 py-2.5 text-right font-medium">Net %</th>
              <th className="px-4 py-2.5 text-right font-medium">Est. Profit</th>
              <th className="px-4 py-2.5 text-right font-medium">Liquidity</th>
              <th className="px-4 py-2.5 text-right font-medium">Network</th>
              <th className="px-4 py-2.5 text-right font-medium">Confidence</th>
              <th className="px-4 py-2.5 text-right font-medium">Detected</th>
            </tr>
          </thead>
            <tbody>
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-3 text-[#484F58]">
                    <div className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1C2128] opacity-60" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-[#161B22] border border-[#21262D]" />
                    </div>
                    <span className="text-xs tracking-widest uppercase text-[#8B949E]">
                      {isConnecting
                        ? "Connecting to price feed…"
                        : "No opportunities detected"}
                    </span>
                    <span className="text-[10px] text-[#484F58]">
                      {!isConnecting && "Scanning all exchange pairs in real-time"}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              opportunities.map((opp) => {
                const tier = opp.confidence;
                const isNew = newIds.has(opp.id);

                return (
                  <tr
                    key={opp.id}
                    className={clsx(
                      "transition-colors duration-200",
                      ROW_ACCENT[tier],
                      isNew && "animate-fade-in"
                    )}
                  >
                    <td className="px-4 py-2.5 text-[#E6EDF3] font-mono font-semibold">
                      {opp.symbol}
                    </td>
                    <td className="px-4 py-2.5 text-[#3FB950] font-mono text-xs">
                      {exchangeLabel(opp.buyExchange)}
                    </td>
                    <td className="px-4 py-2.5 text-[#F85149] font-mono text-xs">
                      {exchangeLabel(opp.sellExchange)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#8B949E] font-mono text-sm tabular-nums">
                      {formatSpread(opp.grossSpread)}
                    </td>
                    <td className={clsx("px-4 py-2.5 text-right tabular-nums font-mono font-bold", opp.netSpread >= 0 ? "text-[#3FB950]" : "text-[#F85149]")}>
                      {formatSpread(opp.netSpread)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#388BFD] font-mono font-semibold tabular-nums">
                      {formatProfit(opp.estimatedProfit)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <LiquidityBar score={opp.liquidityScore} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#8B949E] tabular-nums text-[10px]">
                      {opp.bestNetwork || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={clsx("inline-flex items-center font-mono uppercase", CONFIDENCE_BADGE[tier])}>
                        {tier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#484F58] tabular-nums">
                      {formatTimestamp(opp.detectedAt)}
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

function LiquidityBar({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(100, score)));
  const color =
    pct >= 70 ? "bg-[#3FB950]" : pct >= 40 ? "bg-[#D29922]" : "bg-[#484F58]";

  return (
    <span className="inline-flex items-center gap-1.5 justify-end">
      <span className="text-[#8B949E] tabular-nums">{pct}</span>
      <span className="w-10 h-1 rounded-full bg-[#1C2128] overflow-hidden">
        <span
          className={clsx("h-full rounded-full block", color)}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}
