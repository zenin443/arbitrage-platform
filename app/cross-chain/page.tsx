"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, ArrowRightLeftIcon, RefreshCwIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrossChainOpportunity {
  id: string;
  symbol: string;
  buyChain: string;
  buyDex: string;
  buyPrice: number;
  sellChain: string;
  sellDex: string;
  sellPrice: number;
  priceDiffPercent: number;
  estimatedBridgeCostUsd: number;
  estimatedBridgeCostPercent: number;
  netProfitPercent: number;
  estimatedProfit1k: number;
  liquidityUsd: number;
  confidence: "high" | "medium" | "low";
  detectedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(3) + "%";
}

function fmtUsd(v: number, decimals = 2): string {
  const abs = Math.abs(v);
  const prefix = v < 0 ? "-$" : "+$";
  if (abs >= 1_000_000) return prefix + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return prefix + (abs / 1_000).toFixed(1) + "K";
  return prefix + abs.toFixed(decimals);
}

function fmtPrice(v: number): string {
  if (v <= 0) return "—";
  if (v >= 10_000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(8);
}

function netProfitColor(v: number): string {
  if (v >= 0.5) return "text-[#3FB950]";
  if (v >= 0) return "text-[#D29922]";
  return "text-[#F85149]";
}

function confidenceBadge(c: string): string {
  if (c === "high") return "bg-[#3FB950]/20 text-[#3FB950]";
  if (c === "medium") return "bg-[#D29922]/20 text-[#D29922]";
  return "bg-[#484F58]/20 text-[#8B949E]";
}

function chainLabel(chain: string): string {
  const MAP: Record<string, string> = {
    ethereum: "ETH",
    solana: "SOL",
    arbitrum: "ARB",
    polygon: "POL",
    bsc: "BSC",
    avalanche: "AVAX",
    optimism: "OP",
  };
  return MAP[chain] ?? chain.toUpperCase().slice(0, 4);
}

function chainColor(chain: string): string {
  const MAP: Record<string, string> = {
    ethereum: "text-[#627EEA]",
    solana: "text-[#9945FF]",
    arbitrum: "text-[#28A0F0]",
    polygon: "text-[#8247E5]",
    bsc: "text-[#F0B90B]",
    avalanche: "text-[#E84142]",
    optimism: "text-[#FF0420]",
  };
  return MAP[chain] ?? "text-[#8B949E]";
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
        <span className="text-xs text-[#484F58] font-mono">v0.2.4</span>
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
        <Link href="/triangular" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
          <span className="text-[10px] font-mono">Triangular</span>
        </Link>
        <Link href="/cross-chain" className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#388BFD]/10 border border-[#388BFD]/40 text-[#388BFD] text-[10px] font-mono whitespace-nowrap">
          Cross-Chain
        </Link>
        <Link href="/new-listings" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
          <span className="text-[10px] font-mono">New Listings</span>
        </Link>
        <Link href="/alerts" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
          <span className="text-[10px] font-mono">Alerts</span>
        </Link>
        <Link href="/funding-rates" className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap">
          <span className="text-[10px] font-mono">Funding Rates</span>
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

// ─── Row ──────────────────────────────────────────────────────────────────────

function OppRow({ opp }: { opp: CrossChainOpportunity }) {
  return (
    <tr className="border-b border-[#21262D]/50 hover:bg-[#1C2128] transition-colors">
      <td className="px-3 py-1 font-mono font-bold text-[12px] text-[#E6EDF3]">{opp.symbol}</td>
      <td className="px-3 py-1">
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className={chainColor(opp.buyChain)}>{chainLabel(opp.buyChain)}</span>
          <span className="text-[#484F58] text-[10px]">({opp.buyDex})</span>
        </div>
        <div className="text-[10px] font-mono text-[#8B949E]">{fmtPrice(opp.buyPrice)}</div>
      </td>
      <td className="px-3 py-1 text-[#484F58] text-[12px]">→</td>
      <td className="px-3 py-1">
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className={chainColor(opp.sellChain)}>{chainLabel(opp.sellChain)}</span>
          <span className="text-[#484F58] text-[10px]">({opp.sellDex})</span>
        </div>
        <div className="text-[10px] font-mono text-[#8B949E]">{fmtPrice(opp.sellPrice)}</div>
      </td>
      <td className={`px-3 py-1 text-[11px] font-mono font-semibold ${netProfitColor(opp.priceDiffPercent)}`}>
        {fmtPct(opp.priceDiffPercent)}
      </td>
      <td className="px-3 py-1 text-[10px] font-mono text-[#F85149]">
        ${opp.estimatedBridgeCostUsd.toFixed(0)} ({fmtPct(opp.estimatedBridgeCostPercent)})
      </td>
      <td className={`px-3 py-1 text-[12px] font-mono font-bold ${netProfitColor(opp.netProfitPercent)}`}>
        {fmtPct(opp.netProfitPercent)}
      </td>
      <td className={`px-3 py-1 text-[11px] font-mono font-semibold ${netProfitColor(opp.estimatedProfit1k)}`}>
        {fmtUsd(opp.estimatedProfit1k)}
      </td>
      <td className="px-3 py-1 text-[11px] font-mono text-[#8B949E]">
        {opp.liquidityUsd >= 1_000 ? fmtUsd(opp.liquidityUsd, 0) : "—"}
      </td>
      <td className="px-3 py-1">
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0 rounded uppercase ${confidenceBadge(opp.confidence)}`}>
          {opp.confidence}
        </span>
      </td>
    </tr>
  );
}

const HEADERS = ["SYMBOL", "BUY CHAIN", "", "SELL CHAIN", "GROSS %", "BRIDGE COST", "NET %", "P&L @$1K", "LIQUIDITY", "CONF"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrossChainPage() {
  const [opps, setOpps] = useState<CrossChainOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [showAll, setShowAll] = useState(false);

  const fetchOpps = useCallback(async () => {
    try {
      const res = await fetch("/api/cross-chain", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setOpps(data);
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
    fetchOpps();
    const interval = setInterval(fetchOpps, 3_000);
    return () => clearInterval(interval);
  }, [fetchOpps]);

  const profitable = opps.filter((o) => o.netProfitPercent > 0);
  const displayed = showAll ? opps : profitable;
  const highConf = opps.filter((o) => o.confidence === "high");

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
                <ArrowRightLeftIcon className="h-4 w-4 text-[#388BFD]" />
                CROSS-CHAIN ARBITRAGE
              </h1>
            </div>
            <p className="text-[12px] text-[#8B949E] font-mono ml-5">
              Same token · different chains · bridge cost deducted
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#484F58] font-mono">
              Updated: {lastUpdated}
            </span>
            <button
              onClick={fetchOpps}
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
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">Opportunities</div>
          <div className="text-base font-mono font-bold text-[#E6EDF3]">{opps.length}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">Net Profitable</div>
          <div className="text-base font-mono font-bold text-[#3FB950]">{profitable.length}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">High Confidence</div>
          <div className="text-base font-mono font-bold text-[#3FB950]">{highConf.length}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-[#8B949E] uppercase tracking-widest">Best Net</div>
          <div className={`text-base font-mono font-bold ${netProfitColor(profitable[0]?.netProfitPercent ?? 0)}`}>
            {profitable[0] ? fmtPct(profitable[0].netProfitPercent) : "—"}
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[#21262D] text-[#8B949E] hover:border-[#388BFD] hover:text-[#388BFD] transition-colors"
          >
            {showAll ? "Profitable only" : "Show all"}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <main className="flex-1 px-4 py-3 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto">
        <div className="bg-[#161B22] border border-[#21262D] rounded overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#21262D]">
                {HEADERS.map((h, i) => (
                  <th
                    key={`${h}-${i}`}
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
                  <td colSpan={10} className="px-4 py-4 text-center">
                    <span className="text-[12px] text-[#484F58] font-mono animate-pulse">
                      Loading DEX price data across chains…
                    </span>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-4 text-center max-h-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowRightLeftIcon className="h-6 w-6 text-[#21262D]" />
                      <span className="text-[12px] text-[#484F58] font-mono">
                        {opps.length === 0
                          ? "No cross-chain data yet — DEX adapters may still be loading"
                          : "No net-profitable cross-chain opportunities after bridge costs"}
                      </span>
                      {opps.length > 0 && !showAll && (
                        <button
                          onClick={() => setShowAll(true)}
                          className="text-[11px] font-mono text-[#388BFD] hover:underline mt-1"
                        >
                          Show all {opps.length} opportunities
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((o) => <OppRow key={o.id} opp={o} />)
              )}
            </tbody>
          </table>
        </div>

        {/* ── Explainer ── */}
        <div className="mt-3 bg-[#161B22] border border-[#21262D] rounded p-2 text-[10px] font-mono text-[#8B949E] space-y-1">
          <p className="text-[#E6EDF3] font-semibold mb-1">How cross-chain arbitrage works</p>
          <p>Buy a token where it is cheaper on one chain, bridge it to another chain, and sell at the higher price.</p>
          <p className="text-[#484F58]">
            Bridge costs shown are conservative estimates for a $1,000 trade size.
            Actual costs vary by chain, bridge, and gas conditions.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[10px]">
            {[
              { chains: "ETH ↔ ARB", cost: "$5" },
              { chains: "ETH ↔ SOL", cost: "$15" },
              { chains: "ETH ↔ POL", cost: "$4" },
              { chains: "SOL ↔ ARB", cost: "$12" },
              { chains: "ARB ↔ OP", cost: "$3" },
              { chains: "BSC ↔ ETH", cost: "$8" },
            ].map(({ chains, cost }) => (
              <div key={chains} className="flex items-center gap-1.5">
                <span>{chains}</span>
                <span className="text-[#F85149]">{cost}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
