'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, BarChart2, Clock, ArrowUpDown } from 'lucide-react';

interface GapRecord {
  id?: string;
  type?: string;
  symbol?: string;
  buyExchange?: string;
  sellExchange?: string;
  spreadPercent?: number;
  maxTradeableUsd?: number;
  detectedAt?: number;
  durationMs?: number;
  confidence?: string;
  [key: string]: unknown;
}

type SortKey = 'spreadPercent' | 'maxTradeableUsd' | 'durationMs';

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  high:   { bg: '#3FB950/10', text: '#3FB950', bar: '#3FB950' },
  medium: { bg: '#D29922/10', text: '#D29922', bar: '#D29922' },
  mid:    { bg: '#D29922/10', text: '#D29922', bar: '#D29922' },
  low:    { bg: '#F85149/10', text: '#F85149', bar: '#F85149' },
};

const TYPE_COLORS: Record<string, string> = {
  'CEX-CEX':     '#388BFD',
  'DEX-CEX':     '#A371F7',
  'Spot-Futures':'#D29922',
  'Funding':     '#3FB950',
};

function getConfidence(gap: GapRecord): string {
  if (gap.confidence) return gap.confidence.toLowerCase();
  const spread = gap.spreadPercent ?? 0;
  if (spread >= 0.5) return 'high';
  if (spread >= 0.2) return 'medium';
  return 'low';
}

export default function AdminGapsPage() {
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('spreadPercent');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchGaps = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/gaps');
      if (r.ok) {
        const data = await r.json() as GapRecord[];
        setGaps(Array.isArray(data) ? data : []);
        setLastRefresh(new Date());
      }
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchGaps(); }, [fetchGaps]);

  // ── Derived analytics ──────────────────────────────────────────────────────
  const filtered = typeFilter
    ? gaps.filter(g => (g.type ?? '').includes(typeFilter))
    : gaps;

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortBy] as number) ?? 0;
    const bv = (b[sortBy] as number) ?? 0;
    return bv - av;
  });

  // Confidence distribution
  const confDist = { high: 0, medium: 0, low: 0 };
  for (const g of gaps) {
    const c = getConfidence(g);
    if (c === 'high') confDist.high++;
    else if (c === 'medium' || c === 'mid') confDist.medium++;
    else confDist.low++;
  }
  const total = gaps.length || 1;

  // Top pairs by frequency
  const pairCounts: Record<string, number> = {};
  for (const g of gaps) {
    const key = g.symbol ?? 'Unknown';
    pairCounts[key] = (pairCounts[key] ?? 0) + 1;
  }
  const topPairs = Object.entries(pairCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  // Exchange pair activity matrix
  const exPairCounts: Record<string, number> = {};
  for (const g of gaps) {
    if (g.buyExchange && g.sellExchange) {
      const key = `${g.buyExchange} → ${g.sellExchange}`;
      exPairCounts[key] = (exPairCounts[key] ?? 0) + 1;
    }
  }
  const topExPairs = Object.entries(exPairCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Type distribution
  const typeCounts: Record<string, number> = {};
  for (const g of gaps) {
    const t = g.type ?? 'Unknown';
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  const types = Object.keys(typeCounts);

  // Lifespan histogram (buckets in seconds)
  const lifespanBuckets = [
    { label: '<1s',   max: 1000 },
    { label: '1–5s',  max: 5000 },
    { label: '5–30s', max: 30000 },
    { label: '30s–2m',max: 120000 },
    { label: '>2m',   max: Infinity },
  ];
  const lifespanDist = lifespanBuckets.map(b => ({
    label: b.label,
    count: gaps.filter(g => {
      const d = (g.durationMs ?? 0) as number;
      return d <= b.max;
    }).length,
  }));
  // Convert cumulative to buckets
  for (let i = lifespanDist.length - 1; i > 0; i--) {
    lifespanDist[i].count -= lifespanDist[i - 1].count;
  }
  const maxLifespan = Math.max(...lifespanDist.map(b => b.count), 1);

  // Avg spread
  const avgSpread = gaps.length
    ? gaps.reduce((s, g) => s + (g.spreadPercent ?? 0), 0) / gaps.length
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1300px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3] flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-[#388BFD]" />
            Gap Analytics
          </h1>
          <p className="text-xs text-[#484F58] mt-0.5">
            {gaps.length} live gaps
            {lastRefresh && <> · Refreshed {lastRefresh.toLocaleTimeString()}</>}
          </p>
        </div>
        <button
          onClick={() => void fetchGaps()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Gaps" value={String(gaps.length)} color="#388BFD" />
        <KpiCard label="Avg Spread" value={`${avgSpread.toFixed(3)}%`} color="#3FB950" />
        <KpiCard label="High Confidence" value={String(confDist.high)} color="#3FB950" />
        <KpiCard label="Unique Pairs" value={String(Object.keys(pairCounts).length)} color="#A371F7" />
      </div>

      {/* Analytics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Confidence Distribution */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
          <h2 className="text-xs font-medium text-[#E6EDF3] flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#388BFD]" />
            Confidence Distribution
          </h2>
          <div className="space-y-3">
            {(['high', 'medium', 'low'] as const).map(lvl => {
              const count = lvl === 'medium' ? confDist.medium : confDist[lvl];
              const pct = Math.round((count / total) * 100);
              const c = CONFIDENCE_COLORS[lvl];
              return (
                <div key={lvl}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono capitalize" style={{ color: c.text }}>
                      {lvl}
                    </span>
                    <span className="text-[10px] font-mono text-[#8B949E]">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-[#21262D] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: c.bar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Type breakdown */}
          <div className="mt-5 pt-4 border-t border-[#21262D]">
            <div className="text-[10px] text-[#484F58] mb-3">BY TYPE</div>
            <div className="space-y-2">
              {Object.entries(typeCounts).map(([t, c]) => {
                const pct = Math.round((c / total) * 100);
                const color = TYPE_COLORS[t] || '#8B949E';
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono text-[#8B949E]">{t}</span>
                      <span className="text-[10px] font-mono text-[#484F58]">{c}</span>
                    </div>
                    <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(typeCounts).length === 0 && (
                <p className="text-[10px] text-[#484F58] text-center py-2">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Pairs */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
          <h2 className="text-xs font-medium text-[#E6EDF3] flex items-center gap-2 mb-4">
            <TrendingUp className="h-3.5 w-3.5 text-[#3FB950]" />
            Top Symbols
          </h2>
          {topPairs.length === 0 ? (
            <p className="text-xs text-[#484F58] text-center py-8">No data</p>
          ) : (
            <div className="space-y-2.5">
              {topPairs.map(([sym, cnt], i) => {
                const pct = Math.round((cnt / total) * 100);
                return (
                  <div key={sym} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[#484F58] w-4">{i + 1}</span>
                    <span className="text-xs font-mono text-[#E6EDF3] w-20 truncate">{sym}</span>
                    <div className="flex-1 h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#388BFD] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#8B949E] w-8 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top exchange pairs */}
          {topExPairs.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#21262D]">
              <div className="text-[10px] text-[#484F58] mb-3">TOP EXCHANGE PAIRS</div>
              <div className="space-y-2">
                {topExPairs.map(([pair, cnt]) => (
                  <div key={pair} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#8B949E] truncate">{pair}</span>
                    <span className="text-[10px] font-mono text-[#E6EDF3] shrink-0 ml-2">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lifespan Histogram */}
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
          <h2 className="text-xs font-medium text-[#E6EDF3] flex items-center gap-2 mb-4">
            <Clock className="h-3.5 w-3.5 text-[#A371F7]" />
            Gap Lifespan
          </h2>
          <div className="space-y-3">
            {lifespanDist.map(b => {
              const pct = maxLifespan > 0 ? Math.round((b.count / maxLifespan) * 100) : 0;
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-[#8B949E] w-14">{b.label}</span>
                    <div className="flex-1 mx-2 h-2 bg-[#21262D] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#A371F7] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#484F58] w-6 text-right">{b.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-[#484F58] mt-4">
            Shorter-lived gaps require faster execution. Gaps above 30s are safer for semi-manual strategies.
          </p>
        </div>
      </div>

      {/* Gap Table */}
      <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#21262D] flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-medium text-[#E6EDF3] flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#388BFD]" />
            Live Gap Feed
            <span className="text-[10px] text-[#484F58] font-normal">({filtered.length})</span>
          </h2>

          <div className="flex items-center gap-2">
            {/* Type filter */}
            <div className="flex gap-1">
              <button
                onClick={() => setTypeFilter('')}
                className={`px-2 py-0.5 text-[9px] font-mono rounded transition-colors ${
                  !typeFilter ? 'bg-[#388BFD]/15 text-[#388BFD]' : 'text-[#484F58] hover:text-[#8B949E]'
                }`}
              >
                ALL
              </button>
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded transition-colors ${
                    typeFilter === t ? 'bg-[#388BFD]/15 text-[#388BFD]' : 'text-[#484F58] hover:text-[#8B949E]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="text-[9px] bg-[#0D1117] border border-[#21262D] rounded px-2 py-0.5 text-[#8B949E] focus:outline-none"
            >
              <option value="spreadPercent">Sort: Spread</option>
              <option value="maxTradeableUsd">Sort: Volume</option>
              <option value="durationMs">Sort: Duration</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] text-[#484F58] uppercase tracking-wide border-b border-[#21262D]">
                <th className="text-left px-4 py-2">Symbol</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Buy Exchange</th>
                <th className="text-left px-4 py-2">Sell Exchange</th>
                <th className="text-right px-4 py-2">Spread</th>
                <th className="text-right px-4 py-2">Max Vol.</th>
                <th className="text-right px-4 py-2">Duration</th>
                <th className="text-center px-4 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262D]">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-2">
                      <div className="h-4 bg-[#21262D] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-[#484F58]">
                    No gaps available — backend may be offline
                  </td>
                </tr>
              ) : (
                sorted.slice(0, 50).map((g, i) => {
                  const conf = getConfidence(g);
                  const cc = CONFIDENCE_COLORS[conf] || CONFIDENCE_COLORS.low;
                  return (
                    <tr key={g.id ?? i} className="hover:bg-[#21262D]/30 transition-colors">
                      <td className="px-4 py-2 text-xs font-mono text-[#E6EDF3]">{g.symbol ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            color: TYPE_COLORS[g.type ?? ''] ?? '#8B949E',
                            backgroundColor: `${TYPE_COLORS[g.type ?? ''] ?? '#8B949E'}22`,
                          }}
                        >
                          {g.type ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[10px] font-mono text-[#8B949E] capitalize">{g.buyExchange ?? '—'}</td>
                      <td className="px-4 py-2 text-[10px] font-mono text-[#8B949E] capitalize">{g.sellExchange ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-xs font-mono font-medium text-[#3FB950]">
                        {g.spreadPercent != null ? `${g.spreadPercent.toFixed(3)}%` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right text-[10px] font-mono text-[#8B949E]">
                        {g.maxTradeableUsd != null
                          ? `$${g.maxTradeableUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-right text-[10px] font-mono text-[#484F58]">
                        {g.durationMs != null
                          ? g.durationMs < 1000
                            ? `${g.durationMs}ms`
                            : `${(g.durationMs / 1000).toFixed(1)}s`
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded capitalize"
                          style={{ color: cc.text, backgroundColor: `${cc.bar}22` }}
                        >
                          {conf}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 50 && (
          <div className="px-4 py-2 border-t border-[#21262D] text-[10px] text-[#484F58] text-center">
            Showing 50 of {sorted.length} gaps
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4">
      <div className="text-[10px] text-[#484F58] mb-1">{label}</div>
      <div className="text-2xl font-mono font-medium" style={{ color }}>{value}</div>
    </div>
  );
}
