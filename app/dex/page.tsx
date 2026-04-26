"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ZapIcon, SettingsIcon, ActivityIcon, ArrowRightLeftIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DexPrice {
  symbol: string;
  dexId: string;
  chain: string;
  price: number;
  priceImpact1k: number;
  priceImpact10k: number;
  liquidity: number;
  source: string;
  timestamp: number;
}

interface CexPrice {
  symbol: string;
  exchange: string;
  price: number;
}

interface CexDexOpportunity {
  id: string;
  symbol: string;
  direction: "buy_cex_sell_dex" | "buy_dex_sell_cex";
  netProfitPercent: number;
  cexExchange: string;
  cexPrice: number;
  dexId: string;
  chain: string;
  dexPrice: number;
  estimatedGasFee: number;
  maxTradeSize: number;
  liquidityUSD: number;
  priceDiffPercent: number;
  confidence: "high" | "medium" | "low";
  detectedAt: number;
}

// ─── Mock fallback data (shown while backend is warming up) ───────────────────

const MOCK_DEX_PRICES: DexPrice[] = [
  { symbol: "SOL/USDT",  dexId: "jupiter",     chain: "solana",   price: 148.32,  priceImpact1k: 0.20, priceImpact10k: 2.0, liquidity: 500000,  source: "rest", timestamp: 0 },
  { symbol: "BTC/USDT",  dexId: "jupiter",     chain: "solana",   price: 67420.5, priceImpact1k: 0.20, priceImpact10k: 2.0, liquidity: 500000,  source: "rest", timestamp: 0 },
  { symbol: "ETH/USDT",  dexId: "uniswap_v3",  chain: "ethereum", price: 3521.18, priceImpact1k: 0.10, priceImpact10k: 1.0, liquidity: 1000000, source: "rest", timestamp: 0 },
  { symbol: "BTC/USDT",  dexId: "uniswap_v3",  chain: "ethereum", price: 67398.0, priceImpact1k: 0.10, priceImpact10k: 1.0, liquidity: 1000000, source: "rest", timestamp: 0 },
  { symbol: "LINK/USDT", dexId: "uniswap_v3",  chain: "ethereum", price: 9.33,    priceImpact1k: 0.10, priceImpact10k: 1.0, liquidity: 1000000, source: "rest", timestamp: 0 },
  { symbol: "ETH/USDT",  dexId: "hyperliquid", chain: "arbitrum", price: 3519.75, priceImpact1k: 0.05, priceImpact10k: 0.5, liquidity: 2000000, source: "ws",   timestamp: 0 },
  { symbol: "SOL/USDT",  dexId: "hyperliquid", chain: "arbitrum", price: 148.15,  priceImpact1k: 0.05, priceImpact10k: 0.5, liquidity: 2000000, source: "ws",   timestamp: 0 },
  { symbol: "BNB/USDT",  dexId: "hyperliquid", chain: "arbitrum", price: 598.42,  priceImpact1k: 0.05, priceImpact10k: 0.5, liquidity: 2000000, source: "ws",   timestamp: 0 },
];

const MOCK_CEX_DEX_OPPS: CexDexOpportunity[] = [
  {
    id: "mock-1",
    symbol: "SOL/USDT",
    direction: "buy_cex_sell_dex",
    netProfitPercent: 0.18,
    cexExchange: "Binance",
    cexPrice: 147.95,
    dexId: "jupiter",
    chain: "solana",
    dexPrice: 148.32,
    estimatedGasFee: 0.25,
    maxTradeSize: 5000,
    liquidityUSD: 500000,
    priceDiffPercent: 0.25,
    confidence: "high",
    detectedAt: Date.now(),
  },
  {
    id: "mock-2",
    symbol: "ETH/USDT",
    direction: "buy_dex_sell_cex",
    netProfitPercent: 0.09,
    cexExchange: "Bybit",
    cexPrice: 3524.5,
    dexId: "hyperliquid",
    chain: "arbitrum",
    dexPrice: 3519.75,
    estimatedGasFee: 1.8,
    maxTradeSize: 20000,
    liquidityUSD: 2000000,
    priceDiffPercent: 0.13,
    confidence: "medium",
    detectedAt: Date.now(),
  },
  {
    id: "mock-3",
    symbol: "BTC/USDT",
    direction: "buy_dex_sell_cex",
    netProfitPercent: 0.03,
    cexExchange: "OKX",
    cexPrice: 67445.0,
    dexId: "uniswap_v3",
    chain: "ethereum",
    dexPrice: 67398.0,
    estimatedGasFee: 4.5,
    maxTradeSize: 10000,
    liquidityUSD: 1000000,
    priceDiffPercent: 0.07,
    confidence: "low",
    detectedAt: Date.now(),
  },
];

// ─── Chain styling helpers ─────────────────────────────────────────────────────

const CHAIN_META: Record<string, { label: string; badge: string }> = {
  solana: {
    label: "Solana",
    badge: "bg-[#9945FF]/20 text-[#9945FF] border border-[#9945FF]/30",
  },
  ethereum: {
    label: "Ethereum",
    badge: "bg-[#627EEA]/20 text-[#627EEA] border border-[#627EEA]/30",
  },
  arbitrum: {
    label: "Arbitrum",
    badge: "bg-[#28A0F0]/20 text-[#28A0F0] border border-[#28A0F0]/30",
  },
};

const DEX_LABELS: Record<string, string> = {
  jupiter:     "Jupiter",
  uniswap_v3:  "Uniswap V3",
  hyperliquid: "Hyperliquid",
};

function dexLabel(dexId: string): string {
  return DEX_LABELS[dexId] ?? dexId;
}

function chainMeta(chain: string): { label: string; badge: string } {
  return CHAIN_META[chain] ?? { label: chain, badge: "bg-[#484F58]/20 text-[#484F58] border border-[#484F58]/30" };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPrice(price: number): string {
  if (price >= 1000) return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return "$" + price.toFixed(4);
  return "$" + price.toFixed(6);
}

function fmtUsd(val: number): string {
  if (val >= 1000) return "$" + (val / 1000).toFixed(0) + "k";
  return "$" + val.toFixed(2);
}

function fmtPct(val: number, sign = true): string {
  return (sign && val > 0 ? "+" : "") + val.toFixed(3) + "%";
}

// ─── DEX groups ───────────────────────────────────────────────────────────────

function groupByDex(prices: DexPrice[]): Record<string, DexPrice[]> {
  return prices.reduce<Record<string, DexPrice[]>>((acc, p) => {
    if (!acc[p.dexId]) acc[p.dexId] = [];
    acc[p.dexId].push(p);
    return acc;
  }, {});
}

// ─── CEX vs DEX comparison ────────────────────────────────────────────────────

interface ComparisonRow {
  symbol: string;
  cexBest: { exchange: string; price: number };
  dexBest: { dex: string; price: number };
  spreadPct: number;
}

function buildComparisons(cexPrices: CexPrice[], dexPrices: DexPrice[]): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  const dexBySymbol: Record<string, DexPrice[]> = {};

  for (const d of dexPrices) {
    if (!dexBySymbol[d.symbol]) dexBySymbol[d.symbol] = [];
    dexBySymbol[d.symbol].push(d);
  }

  const cexBySymbol: Record<string, CexPrice[]> = {};
  for (const c of cexPrices) {
    if (!cexBySymbol[c.symbol]) cexBySymbol[c.symbol] = [];
    cexBySymbol[c.symbol].push(c);
  }

  for (const [sym, cexList] of Object.entries(cexBySymbol)) {
    const dexList = dexBySymbol[sym] ?? [];
    if (dexList.length === 0) continue;

    const cexBestEntry = cexList.reduce((a, b) => (a.price < b.price ? a : b));
    const dexBestEntry = dexList.reduce((a, b) => (a.price < b.price ? a : b));
    const spreadPct = ((Math.max(cexBestEntry.price, dexBestEntry.price) - Math.min(cexBestEntry.price, dexBestEntry.price)) / Math.min(cexBestEntry.price, dexBestEntry.price)) * 100;

    rows.push({
      symbol: sym,
      cexBest: { exchange: cexBestEntry.exchange, price: cexBestEntry.price },
      dexBest: { dex: dexLabel(dexBestEntry.dexId), price: dexBestEntry.price },
      spreadPct,
    });
  }

  return rows.sort((a, b) => b.spreadPct - a.spreadPct);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DexMarketsPage() {
  const [dexPrices, setDexPrices] = useState<DexPrice[]>(MOCK_DEX_PRICES);
  const [cexPrices, setCexPrices] = useState<CexPrice[]>([]);
  const [opportunities, setOpportunities] = useState<CexDexOpportunity[]>(MOCK_CEX_DEX_OPPS);
  const [lastDex, setLastDex] = useState("—");
  const [lastOpp, setLastOpp] = useState("—");
  const [dexLoading, setDexLoading] = useState(true);
  const [oppLoading, setOppLoading] = useState(true);

  const now = () =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const fetchDexPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/dex-prices", { cache: "no-store" });
      if (!res.ok) return;
      const data: DexPrice[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setDexPrices(data);
        setLastDex(now());
      }
    } catch {
      // keep previous
    } finally {
      setDexLoading(false);
    }
  }, []);

  const fetchCexPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      // price server returns a bare array; wrapped format has data.ticks
      const raw = Array.isArray(data) ? data : (data.ticks ?? []);
      const ticks: Array<{ symbol: string; exchangeId: string; bid: number; ask: number; price?: number }> = raw;
      const mapped: CexPrice[] = ticks.map((t) => ({
        symbol: t.symbol,
        exchange: t.exchangeId,
        price: t.price ?? (t.bid + t.ask) / 2,
      }));
      if (mapped.length > 0) setCexPrices(mapped);
    } catch {
      // keep previous
    }
  }, []);

  const fetchOpportunities = useCallback(async () => {
    try {
      const res = await fetch("/api/cex-dex", { cache: "no-store" });
      if (!res.ok) return;
      const data: CexDexOpportunity[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setOpportunities(data);
        setLastOpp(now());
      }
    } catch {
      // keep previous
    } finally {
      setOppLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDexPrices();
    fetchCexPrices();
    fetchOpportunities();

    const dexInterval = setInterval(fetchDexPrices, 10_000);
    const cexInterval = setInterval(fetchCexPrices, 5_000);
    const oppInterval = setInterval(fetchOpportunities, 10_000);

    return () => {
      clearInterval(dexInterval);
      clearInterval(cexInterval);
      clearInterval(oppInterval);
    };
  }, [fetchDexPrices, fetchCexPrices, fetchOpportunities]);

  const dexGroups = groupByDex(dexPrices);
  const comparisons = buildComparisons(cexPrices, dexPrices);

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
          <Link
            href="/intelligence"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Intelligence</span>
          </Link>
          <Link
            href="/magnus"
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD] transition-colors whitespace-nowrap"
          >
            <span className="text-[10px] font-mono">Magnus</span>
          </Link>
          <Link
            href="/dex"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#388BFD]/10 border border-[#388BFD]/40 text-[#388BFD] text-[10px] font-mono whitespace-nowrap"
          >
            DEX Markets
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
            <span className="text-[10px] font-mono">Settings</span>
          </Link>
        </div>
      </header>

      {/* ── Page Header ── */}
      <div className="px-6 pt-3 pb-2 border-b border-[#21262D]">
        <div className="flex items-center gap-3 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-[#3FB950] animate-pulse" />
          <h1 className="text-lg font-bold tracking-widest uppercase font-mono text-[#E6EDF3]">
            DEX Markets
          </h1>
        </div>
        <p className="text-xs text-[#8B949E] font-mono ml-5">
          Decentralized exchange prices vs CEX · Jupiter · Uniswap V3 · Hyperliquid
        </p>
      </div>

      <main className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-4">

        {/* ══ SECTION A: DEX Live Prices ══ */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-3.5 w-3.5 text-[#484F58]" />
              <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider font-mono">
                DEX Live Prices
              </h2>
              <span className="text-[#484F58] text-xs font-mono">· polled every 10s</span>
            </div>
            <span className="text-[10px] text-[#484F58] font-mono">
              Last updated: <span className="text-[#8B949E]">{lastDex}</span>
            </span>
          </div>

          {dexLoading && dexPrices === MOCK_DEX_PRICES ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-lg bg-[#161B22] border border-[#21262D] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(dexGroups).map(([dexId, prices]) => {
                const chain = prices[0]?.chain ?? "ethereum";
                const meta = chainMeta(chain);
                return (
                  <div
                    key={dexId}
                    className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden"
                  >
                    {/* DEX group header */}
                    <div className="flex items-center justify-between px-3 py-1 border-b border-[#21262D] bg-[#1C2128]">
                      <span className="text-[12px] font-bold font-mono text-[#E6EDF3]">{dexLabel(dexId)}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0 rounded-full ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Price cards */}
                    <div className="divide-y divide-[#21262D]">
                      {prices.map((p) => (
                        <DexPriceRow key={`${p.dexId}-${p.symbol}`} price={p} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══ SECTION B: CEX vs DEX Comparison ══ */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeftIcon className="h-3.5 w-3.5 text-[#484F58]" />
            <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider font-mono">
              CEX vs DEX Comparison
            </h2>
            <span className="text-[#484F58] text-xs font-mono">· best bid across venues · sorted by spread</span>
          </div>

          {comparisons.length === 0 ? (
            <div className="rounded-lg border border-[#21262D] bg-[#161B22] px-6 py-3 text-center">
              <p className="text-xs text-[#484F58] font-mono">
                Waiting for CEX price data from{" "}
                <span className="text-[#388BFD]">/api/prices</span>
                {" "}— showing mock DEX data only
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[#21262D] overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#21262D] bg-[#1C2128]">
                    <th className="text-left px-3 py-1 text-[#484F58] uppercase tracking-widest text-[11px]">Symbol</th>
                    <th className="text-right px-3 py-1 text-[#484F58] uppercase tracking-widest text-[11px]">CEX Best</th>
                    <th className="text-right px-3 py-1 text-[#484F58] uppercase tracking-widest text-[11px]">DEX Best</th>
                    <th className="text-right px-3 py-1 text-[#484F58] uppercase tracking-widest text-[11px]">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row) => {
                    const cexCheaper = row.cexBest.price <= row.dexBest.price;
                    return (
                      <tr key={row.symbol} className="border-b border-[#21262D] hover:bg-[#1C2128] transition-colors">
                        <td className="px-3 py-1 text-[#E6EDF3] text-[12px] font-semibold font-mono">{row.symbol}</td>
                        <td className="px-3 py-1 text-right text-[11px]">
                          <span className={`font-mono ${cexCheaper ? "text-[#3FB950] font-semibold" : "text-[#8B949E]"}`}>
                            {fmtPrice(row.cexBest.price)}
                          </span>
                          <span className="text-[#484F58] ml-1 text-[10px]">{row.cexBest.exchange}</span>
                        </td>
                        <td className="px-3 py-1 text-right text-[11px]">
                          <span className={`font-mono ${!cexCheaper ? "text-[#3FB950] font-semibold" : "text-[#8B949E]"}`}>
                            {fmtPrice(row.dexBest.price)}
                          </span>
                          <span className="text-[#484F58] ml-1 text-[10px]">{row.dexBest.dex}</span>
                        </td>
                        <td className="px-3 py-1 text-right">
                          <SpreadBadge spread={row.spreadPct} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ══ SECTION C: CEX-DEX Opportunities ══ */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ZapIcon className="h-3.5 w-3.5 text-[#484F58]" />
              <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider font-mono">
                CEX-DEX Opportunities
              </h2>
              <span className="text-[#484F58] text-xs font-mono">· polled every 10s · net of gas fees</span>
            </div>
            <span className="text-[10px] text-[#484F58] font-mono">
              Last updated: <span className="text-[#8B949E]">{lastOpp}</span>
            </span>
          </div>

          {oppLoading && opportunities === MOCK_CEX_DEX_OPPS ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[80px] rounded-lg bg-[#161B22] border border-[#21262D] animate-pulse" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="rounded-lg border border-[#21262D] bg-[#161B22] px-6 py-3 text-center max-h-[200px]">
              <p className="text-xs text-[#484F58] font-mono">
                No CEX-DEX opportunities found · waiting for data from{" "}
                <span className="text-[#388BFD]">/api/cex-dex</span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {opportunities.map((opp, i) => (
                <CexDexCard key={`${opp.symbol}-${i}`} opp={opp} />
              ))}
            </div>
          )}
        </section>

          <p className="text-[10px] text-[#484F58] font-mono text-right pb-2">
            DEX prices are indicative · Gas fees estimated · Not financial advice
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DexPriceRow({ price }: { price: DexPrice }) {
  const meta = chainMeta(price.chain);
  return (
    <div className="flex items-center justify-between px-2 py-1 hover:bg-[#1C2128] transition-colors">
      <div className="flex flex-col gap-0">
        <span className="text-[12px] font-bold font-mono text-[#E6EDF3]">{price.symbol}</span>
        <span className={`text-[9px] font-mono px-1.5 py-0 rounded-full inline-block w-fit ${meta.badge}`}>
          {dexLabel(price.dexId)}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0">
        <span className="text-[13px] font-bold font-mono text-[#E6EDF3] tabular-nums">
          {fmtPrice(price.price)}
        </span>
        <span className="text-[9px] font-mono text-[#8B949E]">
          impact{" "}
          <span className={price.priceImpact1k > 0.05 ? "text-[#F85149]" : "text-[#8B949E]"}>
            {price.priceImpact1k.toFixed(3)}%
          </span>
          {" "}/ $1k
        </span>
      </div>
    </div>
  );
}

function CexDexCard({ opp }: { opp: CexDexOpportunity }) {
  const isBuyCex = opp.direction === "buy_cex_sell_dex";
  const profitColor =
    opp.netProfitPercent >= 0.15
      ? "text-[#3FB950]"
      : opp.netProfitPercent >= 0.05
      ? "text-[#D29922]"
      : "text-[#8B949E]";
  const confBadge =
    opp.confidence === "high"
      ? "bg-[#3FB950]/10 text-[#3FB950] border-[#3FB950]/20"
      : opp.confidence === "medium"
      ? "bg-[#D29922]/10 text-[#D29922] border-[#D29922]/20"
      : "bg-[#484F58]/10 text-[#484F58] border-[#484F58]/20";

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-2 flex flex-col gap-1.5 hover:border-[#388BFD]/30 transition-colors max-h-[80px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold font-mono text-[#E6EDF3] leading-none">{opp.symbol}</p>
          <p className="text-[10px] font-mono text-[#8B949E]">
            {isBuyCex ? "Buy CEX → Sell DEX" : "Buy DEX → Sell CEX"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <p className={`text-[15px] font-bold font-mono tabular-nums ${profitColor}`}>
            {fmtPct(opp.netProfitPercent)}
          </p>
          <span className={`text-[9px] font-mono px-1.5 py-0 rounded border uppercase ${confBadge}`}>
            {opp.confidence}
          </span>
        </div>
      </div>

      {/* Exchange details inline */}
      <div className="flex items-center gap-3 text-[11px] font-mono">
        <span className="text-[#484F58]">CEX</span>
        <span className="text-[#388BFD] font-semibold">{opp.cexExchange}</span>
        <span className="text-[#E6EDF3] font-mono">{fmtPrice(opp.cexPrice)}</span>
        <span className="text-[#484F58]">·</span>
        <span className="text-[#484F58]">DEX</span>
        <span className="text-[#9945FF] font-semibold">{dexLabel(opp.dexId)}</span>
        <span className="text-[#E6EDF3] font-mono">{fmtPrice(opp.dexPrice)}</span>
        <span className="ml-auto text-[10px] text-[#F85149] font-mono">gas {fmtUsd(opp.estimatedGasFee)}</span>
      </div>
    </div>
  );
}

function SpreadBadge({ spread }: { spread: number }) {
  const color =
    spread >= 0.2
      ? "text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/20"
      : spread >= 0.05
      ? "text-[#D29922] bg-[#D29922]/10 border-[#D29922]/20"
      : "text-[#8B949E] bg-[#1C2128] border-[#21262D]";
  return (
    <span className={`inline-flex items-center px-1.5 py-0 rounded border text-[10px] font-mono font-semibold ${color}`}>
      {spread.toFixed(3)}%
    </span>
  );
}
