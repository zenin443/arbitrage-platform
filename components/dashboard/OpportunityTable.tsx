"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { formatTimestamp } from "@/lib/utils/formatters";
import { formatUsd } from "@/lib/utils";
import { formatPercent } from "@/lib/formatters";
import { normalizeApiGapList, NormalizedGap } from "@/lib/response-transformer";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

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
    case "cex_cex":        return "CEX-CEX";
    case "dex_cex":        return "DEX-CEX";
    case "spot_futures":   return "SPOT-F";
    case "triangular":     return "TRI";
    case "cross_chain":    return "X-CHAIN";
    case "stablecoin":     return "STABLE";
    case "pairs_trading":  return "PAIRS";
    case "liquidation":    return "LIQ";
    case "calendar":       return "CAL";
    case "new_listing":    return "NEW";
    case "wrapped_token":  return "WRAP";
    default:               return type.replace(/_/g, "-").toUpperCase();
  }
}

type ConfidenceTier = "high" | "medium" | "low";

function computeConfidence(spreadPercent: number, durationMs: number, backendConfidence?: string): ConfidenceTier {
  // Prefer backend confidence tag set by the signal scorer (Sprint 1.5)
  if (backendConfidence === "high" || backendConfidence === "medium" || backendConfidence === "low") {
    return backendConfidence as ConfidenceTier;
  }
  // Fallback: derive from spread size and signal age
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
  high:   "bg-[#3FB950]/15 text-[#3FB950] px-1.5 py-0.5 rounded font-mono",
  medium: "bg-[#D29922]/12 text-[#D29922] px-1.5 py-0.5 rounded font-mono",
  low:    "bg-[#8B949E]/12 text-[#8B949E] px-1.5 py-0.5 rounded font-mono",
};

type GapRecord = NormalizedGap;

// ── Filter config ────────────────────────────────────────────────────────────

const TYPE_FILTERS: Array<{ key: string | null; label: string }> = [
  { key: null,            label: 'All' },
  { key: 'cex_cex',       label: 'CEX-CEX' },
  { key: 'spot_futures',  label: 'Spot-F' },
  { key: 'dex_cex',       label: 'DEX-CEX' },
  { key: 'triangular',    label: 'Tri' },
  { key: 'cross_chain',   label: 'X-Chain' },
  { key: 'stablecoin',    label: 'Stable' },
  { key: 'pairs_trading', label: 'Pairs' },
]

const QUOTE_FILTERS: Array<{ key: string | null; label: string }> = [
  { key: null,   label: 'All' },
  { key: 'USDT', label: 'USDT' },
  { key: 'USDC', label: 'USDC' },
  { key: 'BTC',  label: 'BTC' },
  { key: 'ETH',  label: 'ETH' },
]

interface OpportunityTableProps {
  onSelectSignal: (signal: GapRecord) => void;
  selectedSignalId: string | null;
  onDataUpdate?: (gaps: GapRecord[]) => void;
}

export default function OpportunityTable({ onSelectSignal, selectedSignalId, onDataUpdate }: OpportunityTableProps) {
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [quoteFilter, setQuoteFilter] = useState<string | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceTier | null>(null);
  const [maxAgeMinutes, setMaxAgeMinutes] = useState<number>(0);
  const seenIds = useRef<Set<string>>(new Set());

  const selectedExchanges = useSettingsStore(s => s.selectedExchanges);
  const selectedCoins = useSettingsStore(s => s.selectedCoins);
  const minNetSpread = useSettingsStore(s => s.minNetSpread);
  const { getRouteStatus } = useNetworkStatus();

  useEffect(() => {
    const fetchGaps = async () => {
      try {
        const res = await fetch("/api/signals/unified");
        const raw = await res.json();
        const normalized = normalizeApiGapList(Array.isArray(raw) ? raw : []);

        // Deduplicate by composite key — keep highest spread when duplicated
        const dedupMap = new Map<string, GapRecord>();
        for (const g of normalized) {
          const key = `${g.symbol}|${g.type}|${g.buyExchange}|${g.sellExchange}`;
          const existing = dedupMap.get(key);
          if (!existing || (g.spreadPercent ?? 0) > (existing.spreadPercent ?? 0)) {
            dedupMap.set(key, g);
          }
        }
        // Replace entire state — signals not in latest response are gone
        const deduped = Array.from(dedupMap.values());
        setGaps(deduped);
        onDataUpdate?.(deduped);
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

  const now = Date.now();

  // Base filter — everything except type filter applied
  // Used for badge counts so clicking a type shows exactly what the badge says
  const baseFiltered = gaps.filter(g => {
    const quoteOk      = quoteFilter === null || g.quoteCurrency === quoteFilter;
    const ageOk        = maxAgeMinutes === 0 || !g.detectedAt ||
                         (now - g.detectedAt) <= maxAgeMinutes * 60_000;
    const confidence   = computeConfidence(g.spreadPercent ?? 0, g.durationMs ?? 0, g.confidence);
    const confidenceOk = confidenceFilter === null || confidence === confidenceFilter;
    const exchangeOk   = selectedExchanges.length === 0 ||
                         selectedExchanges.includes(g.buyExchange) ||
                         selectedExchanges.includes(g.sellExchange);
    const baseCoin     = g.symbol?.split("/")[0] ?? "";
    const coinOk       = selectedCoins.length === 0 || selectedCoins.includes(baseCoin);
    const spreadOk     = !g._isFreeTier && g.netSpread != null
                         ? g.netSpread >= minNetSpread
                         : true;
    return quoteOk && ageOk && confidenceOk && exchangeOk && coinOk && spreadOk;
  });

  // Final filtered — add type filter on top of base
  const filteredGaps = typeFilter === null
    ? baseFiltered
    : baseFiltered.filter(g => g.type === typeFilter);

  // Badge counts from baseFiltered — always matches what clicking the button would show
  const countByType = (key: string) => baseFiltered.filter(g => g.type === key).length;

  // Detect whether all current rows are free-tier limited
  const allFreeTier = filteredGaps.length > 0 && filteredGaps.every(g => g._isFreeTier);

  const newIds = new Set<string>();
  for (const gap of filteredGaps) {
    const key = gap.id;
    if (!seenIds.current.has(key)) {
      newIds.add(key);
      seenIds.current.add(key);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0D1117] border border-[#21262D] rounded-lg overflow-hidden">
      {/* ── Filter bar — grid-aligned labels ── */}
      <div className="shrink-0 px-3 pt-2 pb-1.5 border-b border-[#21262D] bg-[#0D1117] space-y-1">
        {/* Type row */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#484F58] font-mono w-[72px] shrink-0 text-right pr-2">Type</span>
          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_FILTERS.map(f => {
              const count = f.key === null ? baseFiltered.length : countByType(f.key);
              const active = typeFilter === f.key;
              const typeBg =
                f.key === 'cex_cex'       ? (active ? 'bg-[#388BFD]/20 border-[#388BFD]/50 text-[#388BFD]' : 'border-[#21262D] text-[#8B949E] hover:border-[#388BFD]/30 hover:text-[#388BFD]') :
                f.key === 'spot_futures'  ? (active ? 'bg-[#3FB950]/20 border-[#3FB950]/50 text-[#3FB950]' : 'border-[#21262D] text-[#8B949E] hover:border-[#3FB950]/30 hover:text-[#3FB950]') :
                f.key === 'dex_cex'       ? (active ? 'bg-[#D29922]/20 border-[#D29922]/50 text-[#D29922]' : 'border-[#21262D] text-[#8B949E] hover:border-[#D29922]/30 hover:text-[#D29922]') :
                f.key === 'triangular'    ? (active ? 'bg-[#BC8CFF]/20 border-[#BC8CFF]/50 text-[#BC8CFF]' : 'border-[#21262D] text-[#8B949E] hover:border-[#BC8CFF]/30 hover:text-[#BC8CFF]') :
                f.key === 'cross_chain'   ? (active ? 'bg-[#F78166]/20 border-[#F78166]/50 text-[#F78166]' : 'border-[#21262D] text-[#8B949E] hover:border-[#F78166]/30 hover:text-[#F78166]') :
                f.key === 'stablecoin'    ? (active ? 'bg-[#58A6FF]/20 border-[#58A6FF]/50 text-[#58A6FF]' : 'border-[#21262D] text-[#8B949E] hover:border-[#58A6FF]/30 hover:text-[#58A6FF]') :
                f.key === 'pairs_trading' ? (active ? 'bg-[#E3B341]/20 border-[#E3B341]/50 text-[#E3B341]' : 'border-[#21262D] text-[#8B949E] hover:border-[#E3B341]/30 hover:text-[#E3B341]') :
                                            (active ? 'bg-[#E6EDF3]/10 border-[#8B949E]/50 text-[#E6EDF3]' : 'border-[#21262D] text-[#8B949E] hover:border-[#8B949E]/40 hover:text-[#E6EDF3]');
              return (
                <button
                  key={String(f.key)}
                  onClick={() => setTypeFilter(f.key)}
                  className={clsx(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-colors',
                    typeBg
                  )}
                >
                  {f.label}
                  <span className="text-[9px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quote row */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#484F58] font-mono w-[72px] shrink-0 text-right pr-2">Quote</span>
          <div className="flex items-center gap-1 flex-wrap">
            {QUOTE_FILTERS.map(f => {
              const count = f.key === null ? baseFiltered.length : baseFiltered.filter(g => g.quoteCurrency === f.key).length;
              const active = quoteFilter === f.key;
              return (
                <button
                  key={String(f.key)}
                  onClick={() => setQuoteFilter(f.key)}
                  className={clsx(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-colors',
                    active
                      ? 'bg-[#388BFD]/15 border-[#388BFD]/40 text-[#388BFD]'
                      : 'border-[#21262D] text-[#8B949E] hover:border-[#388BFD]/30 hover:text-[#388BFD]'
                  )}
                >
                  {f.label}
                  {f.key !== null && <span className="text-[9px] opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confidence row */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#484F58] font-mono w-[72px] shrink-0 text-right pr-2">Confidence</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setConfidenceFilter(null)}
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-colors',
                confidenceFilter === null
                  ? 'bg-[#E6EDF3]/10 border-[#8B949E]/50 text-[#E6EDF3]'
                  : 'border-[#21262D] text-[#8B949E] hover:border-[#8B949E]/40 hover:text-[#E6EDF3]'
              )}
            >
              All
            </button>
            {(['high', 'medium', 'low'] as ConfidenceTier[]).map(tier => {
              const count = baseFiltered.filter(g => computeConfidence(g.spreadPercent ?? 0, g.durationMs ?? 0, g.confidence) === tier).length;
              const active = confidenceFilter === tier;
              const color =
                tier === 'high'   ? (active ? 'bg-[#3FB950]/20 border-[#3FB950]/50 text-[#3FB950]'   : 'border-[#21262D] text-[#8B949E] hover:border-[#3FB950]/40 hover:text-[#3FB950]') :
                tier === 'medium' ? (active ? 'bg-[#D29922]/20 border-[#D29922]/50 text-[#D29922]'   : 'border-[#21262D] text-[#8B949E] hover:border-[#D29922]/40 hover:text-[#D29922]') :
                                    (active ? 'bg-[#8B949E]/20 border-[#8B949E]/50 text-[#8B949E]'   : 'border-[#21262D] text-[#484F58] hover:border-[#8B949E]/40 hover:text-[#8B949E]');
              return (
                <button
                  key={tier}
                  onClick={() => setConfidenceFilter(active ? null : tier)}
                  className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-colors capitalize', color)}
                >
                  {tier}
                  <span className="text-[9px] opacity-70">{count}</span>
                </button>
              );
            })}

            {/* Detected within — inline after confidence divider */}
            <span className="text-[#21262D] mx-1 select-none">│</span>
            <span className="text-[10px] text-[#484F58] font-mono shrink-0">Detected within</span>
            <input
              type="number"
              min={0}
              value={maxAgeMinutes === 0 ? '' : maxAgeMinutes}
              onChange={e => setMaxAgeMinutes(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="∞"
              className="w-10 bg-[#161B22] border border-[#21262D] rounded px-1 py-0.5 text-[10px] font-mono text-[#E6EDF3] placeholder-[#484F58] outline-none focus:border-[#388BFD]/50 text-center"
            />
            <span className="text-[10px] text-[#484F58] font-mono shrink-0">min</span>
          </div>
        </div>

        {/* Active filter summary */}
        {(typeFilter !== null || quoteFilter !== null || confidenceFilter !== null || maxAgeMinutes > 0) && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="w-[72px] shrink-0" />
            <span className="text-[10px] font-mono text-[#D29922]">
              {[typeFilter && 'type', quoteFilter && 'quote', confidenceFilter && 'confidence', maxAgeMinutes > 0 && 'time'].filter(Boolean).length} filter{[typeFilter, quoteFilter, confidenceFilter, maxAgeMinutes].filter(Boolean).length !== 1 ? 's' : ''} active
            </span>
            <button
              onClick={() => { setTypeFilter(null); setQuoteFilter(null); setConfidenceFilter(null); setMaxAgeMinutes(0); }}
              className="text-[10px] font-mono text-[#484F58] hover:text-[#F85149] transition-colors"
            >
              Clear all ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Table header row (count badge) ── */}
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
                {filteredGaps.length !== baseFiltered.length
                  ? `${filteredGaps.length} / ${baseFiltered.length}`
                  : `${baseFiltered.length}`}{' '}
                signal{filteredGaps.length !== 1 ? 's' : ''}
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
            <tr className="bg-[#161B22] border-b border-[#21262D]" style={{ fontSize: 'var(--fs-xs, 11px)' }}>
              <th className="px-2 py-1.5 text-left font-medium text-[#8B949E] uppercase tracking-wider">Symbol</th>
              <th className="px-2 py-1.5 text-left font-medium text-[#8B949E] uppercase tracking-wider">Route</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Spread</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Net %</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Est. profit</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Liquidity</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Type</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Confidence</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Rails</th>
              <th className="px-2 py-1.5 text-right font-medium text-[#8B949E] uppercase tracking-wider">Detected</th>
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
            ) : filteredGaps.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6">
                  <div className="flex flex-col items-center gap-2 text-[#484F58]">
                    <span className="text-[11px] font-sans text-[#8B949E]">No signals match the active filters</span>
                    <button
                      onClick={() => { setTypeFilter(null); setQuoteFilter(null); }}
                      className="text-[11px] font-mono text-[#388BFD] hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredGaps.map((gap) => {
                const key = gap.id;
                const isFreeTier = gap._isFreeTier;
                const tier = computeConfidence(gap.spreadPercent, gap.durationMs, gap.confidence);
                const netSpread = gap.netSpread;
                const estimatedProfit = isFreeTier
                  ? null
                  : (gap.maxTradeableUsd * gap.spreadPercent) / 100 - gap.maxTradeableUsd * 0.002;
                const liquidityScore = isFreeTier ? 0 : Math.min(100, (gap.maxTradeableUsd / 10_000) * 100);
                const isNew = newIds.has(key);
                const isSelected = selectedSignalId === key;

                const tierBorderColor =
                  tier === "high"   ? "border-l-[#3FB950]" :
                  tier === "medium" ? "border-l-[#D29922]" :
                                      "border-l-[#21262D]";

                const typeBadgeClass =
                  gap.type === 'cex_cex'       ? 'bg-[#388BFD]/12 text-[#388BFD]' :
                  gap.type === 'spot_futures'  ? 'bg-[#3FB950]/12 text-[#3FB950]' :
                  gap.type === 'dex_cex'       ? 'bg-[#D29922]/12 text-[#D29922]' :
                  gap.type === 'triangular'    ? 'bg-[#BC8CFF]/12 text-[#BC8CFF]' :
                  gap.type === 'cross_chain'   ? 'bg-[#F78166]/12 text-[#F78166]' :
                  gap.type === 'stablecoin'    ? 'bg-[#58A6FF]/12 text-[#58A6FF]' :
                  gap.type === 'pairs_trading' ? 'bg-[#E3B341]/12 text-[#E3B341]' :
                                                 'bg-[#8B949E]/12 text-[#8B949E]';

                return (
                  <tr
                    key={key}
                    onClick={() => onSelectSignal(gap)}
                    className={clsx(
                      "cursor-pointer transition-colors border-b border-[#21262D]/30 border-l-2",
                      isSelected
                        ? "bg-[#161B22] border-l-[#388BFD]"
                        : clsx(tierBorderColor, "hover:bg-[#161B22]/60"),
                      isNew && !isSelected && "animate-fade-in"
                    )}
                  >
                    {/* Symbol */}
                    <td className="px-2 py-1.5 text-[#E6EDF3] font-mono font-medium" style={{ fontSize: 'var(--fs-sm, 12px)' }}>
                      {gap.symbol}
                    </td>
                    {/* Route — free tier: plain "BIN → BYB" string; trader+: exchange links */}
                    <td className="px-2 py-1.5" style={{ fontSize: 'var(--fs-sm, 12px)' }}>
                      {isFreeTier ? (
                        <span className="text-[#8B949E] font-mono">{gap._direction}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[#388BFD]">{exchangeLabel(gap.buyExchange)}</span>
                          <span className="text-[#484F58]">→</span>
                          <span className="text-[#F85149]">{exchangeLabel(gap.sellExchange)}</span>
                        </span>
                      )}
                    </td>
                    {/* Spread — free tier shows delayed string */}
                    <td className="px-2 py-1.5 text-right text-[#8B949E] font-mono tabular-nums" style={{ fontSize: 'var(--fs-sm, 12px)' }}>
                      {isFreeTier ? (
                        <span className="inline-flex items-center gap-1 justify-end">
                          {gap._delayedSpread}
                          <span className="text-[9px] text-[#D29922] opacity-70">~</span>
                        </span>
                      ) : (
                        formatPercent(gap.spreadPercent, 3)
                      )}
                    </td>
                    {/* Net spread — unavailable for free tier */}
                    <td
                      className={clsx(
                        "px-2 py-1.5 text-right tabular-nums font-mono font-medium",
                        isFreeTier ? "text-[#484F58]" : netSpread >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
                      )}
                      style={{ fontSize: 'var(--fs-sm, 12px)' }}
                    >
                      {isFreeTier ? "—" : formatPercent(netSpread, 3)}
                    </td>
                    {/* Est. profit — unavailable for free tier */}
                    <td className="px-2 py-1.5 text-right font-mono font-medium tabular-nums" style={{ fontSize: 'var(--fs-sm, 12px)' }}>
                      {isFreeTier || estimatedProfit === null ? (
                        <span className="text-[#484F58]">—</span>
                      ) : (
                        <span className="text-[#388BFD]">{formatUsd(estimatedProfit)}</span>
                      )}
                    </td>
                    {/* Liquidity — unavailable for free tier */}
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {isFreeTier ? (
                        <span className="text-[#484F58] text-[11px] font-mono">—</span>
                      ) : (
                        <LiquidityBar
                          score={liquidityScore}
                          label={formatLiquidity(gap.maxTradeableUsd)}
                        />
                      )}
                    </td>
                    {/* Type badge */}
                    <td className="px-2 py-1.5 text-right">
                      <span
                        className={clsx('px-1.5 py-0.5 rounded font-mono text-center', typeBadgeClass)}
                        style={{ fontSize: 'var(--fs-xs, 11px)' }}
                      >
                        {networkLabel(gap.type)}
                      </span>
                    </td>
                    {/* Confidence */}
                    <td className="px-2 py-1.5 text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <span
                          className={clsx("font-medium uppercase", CONFIDENCE_BADGE[tier])}
                          style={{ fontSize: 'var(--fs-xs, 11px)' }}
                        >
                          {tier}
                        </span>
                        {gap.isVolatile && (
                          <span title="Price volatile — spike detected" className="text-[#D29922] leading-none" style={{ fontSize: '10px' }}>⚡</span>
                        )}
                        {gap.isThinVolume && (
                          <span title="Thin volume — low liquidity" className="text-[#58A6FF] leading-none" style={{ fontSize: '10px' }}>💧</span>
                        )}
                      </span>
                    </td>
                    {/* Wallet Rails */}
                    <td className="px-2 py-1.5 text-right">
                      {isFreeTier ? (
                        <span className="text-[#484F58] font-mono" style={{ fontSize: 'var(--fs-xs, 11px)' }}>—</span>
                      ) : (() => {
                        const coin = gap.symbol?.split('/')[0] ?? '';
                        const route = getRouteStatus(gap.buyExchange, gap.sellExchange, coin);
                        if (route.status === 'blocked') {
                          return (
                            <span
                              title={route.reason ?? 'Transfer route blocked'}
                              className="px-1.5 py-0.5 rounded font-mono bg-[#F85149]/12 text-[#F85149]"
                              style={{ fontSize: 'var(--fs-xs, 11px)' }}
                            >
                              ⚠ blocked
                            </span>
                          );
                        }
                        if (route.status === 'ok') {
                          return (
                            <span
                              className="px-1.5 py-0.5 rounded font-mono bg-[#3FB950]/10 text-[#3FB950]"
                              style={{ fontSize: 'var(--fs-xs, 11px)' }}
                            >
                              ✓ open
                            </span>
                          );
                        }
                        return (
                          <span className="text-[#484F58] font-mono" style={{ fontSize: 'var(--fs-xs, 11px)' }}>
                            —
                          </span>
                        );
                      })()}
                    </td>
                    {/* Detected */}
                    <td className="px-2 py-1.5 text-right text-[#484F58] tabular-nums font-sans" style={{ fontSize: 'var(--fs-xs, 11px)' }}>
                      {gap.detectedAt ? timeAgo(gap.detectedAt) : formatTimestamp(Date.now())}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Free-tier footer — shown when data is delayed/limited */}
      {allFreeTier && gaps.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-t border-[#21262D] flex items-center justify-between bg-[#0D1117]">
          <span className="text-[11px] font-mono text-[#484F58]">
            Showing delayed data · net spread, liquidity & profit unavailable
          </span>
          <a
            href="/pricing"
            className="text-[11px] font-mono text-[#238636] hover:text-[#3FB950] border border-[#238636]/40 hover:border-[#3FB950] rounded px-2.5 py-0.5 transition-colors"
          >
            Upgrade for full access →
          </a>
        </div>
      )}
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
