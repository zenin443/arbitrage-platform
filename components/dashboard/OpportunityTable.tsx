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
  high: "border-l-2 border-green-500 bg-green-950/20 hover:bg-green-950/30",
  medium: "border-l-2 border-yellow-500 bg-yellow-950/15 hover:bg-yellow-950/25",
  low: "border-l-2 border-gray-700 hover:bg-gray-800/40",
};

const CONFIDENCE_BADGE: Record<ConfidenceTier, string> = {
  high: "text-green-400",
  medium: "text-yellow-400",
  low: "text-gray-500",
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
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Arbitrage Opportunities
        </span>
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <span className="text-xs font-mono text-gray-600">Connecting…</span>
          ) : isError ? (
            <span className="text-xs font-mono text-red-500">Feed error</span>
          ) : (
            <>
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-gray-600">
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
            <tr className="bg-gray-900/60 text-gray-500 uppercase tracking-wider text-[10px]">
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
          <tbody className="divide-y divide-gray-800/50">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <div className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-700 opacity-60" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-gray-800 border border-gray-700" />
                    </div>
                    <span className="text-xs tracking-widest uppercase">
                      {isConnecting
                        ? "Connecting to price feed…"
                        : "No opportunities detected"}
                    </span>
                    <span className="text-[10px] text-gray-700">
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
                    <td className="px-4 py-2.5 text-gray-200 font-semibold">
                      {opp.symbol}
                    </td>
                    <td className="px-4 py-2.5 text-cyan-400">
                      {exchangeLabel(opp.buyExchange)}
                    </td>
                    <td className="px-4 py-2.5 text-purple-400">
                      {exchangeLabel(opp.sellExchange)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">
                      {formatSpread(opp.grossSpread)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-400 tabular-nums font-semibold">
                      {formatSpread(opp.netSpread)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-300 tabular-nums">
                      {formatProfit(opp.estimatedProfit)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <LiquidityBar score={opp.liquidityScore} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums text-[10px]">
                      {opp.bestNetwork || "—"}
                    </td>
                    <td
                      className={clsx(
                        "px-4 py-2.5 text-right tabular-nums font-semibold uppercase text-[10px]",
                        CONFIDENCE_BADGE[tier]
                      )}
                    >
                      {tier}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
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
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-gray-600";

  return (
    <span className="inline-flex items-center gap-1.5 justify-end">
      <span className="text-gray-400 tabular-nums">{pct}</span>
      <span className="w-10 h-1 rounded-full bg-gray-800 overflow-hidden">
        <span
          className={clsx("h-full rounded-full block", color)}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}
