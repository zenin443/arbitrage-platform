'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BOT_REGISTRY, type BotDefinition } from '@/lib/magnus/botRegistry';
import {
  Bot, RefreshCw, Settings, RotateCcw, Pause, Play,
  Edit3, Check, X, AlertTriangle, Info,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BotRuntime {
  totalPnl?: number;
  winRate?: number | string;
  totalTrades?: number;
  capital?: number;
  totalPortfolioValueUsd?: number;
  recentTrades?: TradeRow[];
  qualityMetrics?: { totalTrades?: number; winRate?: string | number };
  [key: string]: unknown;
}

interface TradeRow {
  id?: string;
  symbol?: string;
  side?: string;
  entryPrice?: number;
  exitPrice?: number;
  netProfit?: number;
  pnl?: number;
  timestamp?: number | string;
  createdAt?: string;
  [key: string]: unknown;
}

interface BotConfig {
  [key: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SIMULATOR_BOTS = new Set([
  'magnus-beta-1k', 'magnus-beta-10k',
  'magnus-pairs', 'magnus-cascade',
  'magnus-calendar', 'magnus-listing',
]);

const LIVE_BOT_APIS: Record<string, {
  main: string;
  trades: string;
  reset: string;
  config?: string;
}> = {
  'magnus-alpha': {
    main: '/api/admin/magnus/performance',
    trades: '/api/admin/magnus/trades',
    reset: '/api/admin/magnus/reset',
    config: '/api/admin/magnus/config',
  },
  'magnus-futures': {
    main: '/api/admin/magnus/futures',
    trades: '/api/admin/magnus/futures/trades',
    reset: '/api/admin/magnus/futures/reset',
  },
  'magnus-rate-harvest': {
    main: '/api/admin/magnus/rate-harvest',
    trades: '/api/admin/magnus/rate-harvest/trades',
    reset: '/api/admin/magnus/rate-harvest/reset',
  },
};

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtPnl(n: number | undefined): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | string | undefined): string {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return isNaN(num) ? '—' : `${num.toFixed(1)}%`;
}

function fmtTs(ts: number | string | undefined): string {
  if (!ts) return '—';
  try {
    const d = new Date(typeof ts === 'string' ? ts : ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return '—'; }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MagnusAdminPage() {
  // Fleet data
  const [runtimes, setRuntimes] = useState<Record<string, BotRuntime>>({});
  const [simData, setSimData] = useState<Record<string, BotRuntime>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Selected bot detail
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'trades' | 'config'>('trades');

  // Controls — persisted to localStorage
  const [botNames, setBotNames] = useState<Record<string, string>>({});
  const [botPaused, setBotPaused] = useState<Record<string, boolean>>({});

  // Inline rename
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  // Modals
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configDraft, setConfigDraft] = useState<BotConfig>({});
  const [saving, setSaving] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load localStorage ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const names = JSON.parse(localStorage.getItem('arb_bot_names') || '{}') as Record<string, string>;
      const paused = JSON.parse(localStorage.getItem('arb_bot_paused') || '{}') as Record<string, boolean>;
      setBotNames(names);
      setBotPaused(paused);
    } catch { /* noop */ }
  }, []);

  // ── Fleet fetch ────────────────────────────────────────────────────────────
  const fetchFleet = useCallback(async () => {
    try {
      const [hermesData, kronosData, atlasData, simArr] = await Promise.all([
        fetch('/api/admin/magnus/performance').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/admin/magnus/futures').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/admin/magnus/rate-harvest').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/simulators').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      const newRuntimes: Record<string, BotRuntime> = {};
      if (hermesData) newRuntimes['magnus-alpha'] = hermesData as BotRuntime;
      if (kronosData) newRuntimes['magnus-futures'] = kronosData as BotRuntime;
      if (atlasData) newRuntimes['magnus-rate-harvest'] = atlasData as BotRuntime;

      setRuntimes(newRuntimes);

      if (Array.isArray(simArr)) {
        const simMap: Record<string, BotRuntime> = {};
        for (const s of simArr as BotRuntime[]) {
          if (typeof s.id === 'string') simMap[s.id] = s;
        }
        setSimData(simMap);
      }

      setLastRefresh(new Date());
    } catch { /* non-fatal */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchFleet();
  }, [fetchFleet]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => void fetchFleet(), 10_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchFleet]);

  // ── Fetch bot detail on selection ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedBotId) { setTrades([]); setConfig(null); return; }

    // Trades
    setTradesLoading(true);
    const loadTrades = async () => {
      try {
        let data: TradeRow[] = [];
        if (selectedBotId === 'magnus-alpha') {
          const r = await fetch('/api/admin/magnus/trades');
          if (r.ok) data = (await r.json()) as TradeRow[];
        } else if (selectedBotId === 'magnus-futures') {
          const r = await fetch('/api/admin/magnus/futures/trades');
          if (r.ok) data = (await r.json()) as TradeRow[];
        } else if (selectedBotId === 'magnus-rate-harvest') {
          const r = await fetch('/api/admin/magnus/rate-harvest/trades');
          if (r.ok) data = (await r.json()) as TradeRow[];
        } else if (SIMULATOR_BOTS.has(selectedBotId)) {
          const sim = simData[selectedBotId];
          if (sim?.recentTrades) data = sim.recentTrades as TradeRow[];
        }
        setTrades(Array.isArray(data) ? data : []);
      } catch { setTrades([]); }
      setTradesLoading(false);
    };
    void loadTrades();

    // Config (HERMES only)
    if (selectedBotId === 'magnus-alpha') {
      setConfigLoading(true);
      fetch('/api/admin/magnus/config')
        .then(r => r.ok ? r.json() : null)
        .then(d => { setConfig(d as BotConfig | null); })
        .catch(() => setConfig(null))
        .finally(() => setConfigLoading(false));
    } else {
      setConfig(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBotId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getBotName = (bot: BotDefinition) => botNames[bot.internalId] || bot.codename;

  const getRuntime = (botId: string): BotRuntime =>
    SIMULATOR_BOTS.has(botId) ? (simData[botId] || {}) : (runtimes[botId] || {});

  const fleetPnl = BOT_REGISTRY.reduce((sum, b) => {
    const rt = getRuntime(b.internalId);
    return sum + (rt.totalPnl ?? 0);
  }, 0);

  const activeBots = BOT_REGISTRY.filter(b => !botPaused[b.internalId]).length;

  // ── Actions ────────────────────────────────────────────────────────────────
  const startRename = (bot: BotDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenaming(bot.internalId);
    setRenameValue(getBotName(bot));
    setTimeout(() => renameRef.current?.focus(), 50);
  };

  const saveRename = (botId: string) => {
    const trimmed = renameValue.trim();
    const next = { ...botNames };
    if (trimmed) next[botId] = trimmed;
    else delete next[botId];
    setBotNames(next);
    try { localStorage.setItem('arb_bot_names', JSON.stringify(next)); } catch { /* noop */ }
    setRenaming(null);
  };

  const togglePause = async (bot: BotDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    const nowPaused = !botPaused[bot.internalId];
    const next = { ...botPaused, [bot.internalId]: nowPaused };
    setBotPaused(next);
    try { localStorage.setItem('arb_bot_paused', JSON.stringify(next)); } catch { /* noop */ }

    // Propagate to config API for live bots
    const api = LIVE_BOT_APIS[bot.internalId];
    if (api?.config) {
      await fetch(api.config, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !nowPaused }),
      }).catch(() => { /* non-fatal */ });
    }
  };

  const handleReset = async (botId: string) => {
    setResetting(botId);
    try {
      const api = LIVE_BOT_APIS[botId];
      if (api) {
        await fetch(api.reset, { method: 'POST' });
      } else if (SIMULATOR_BOTS.has(botId)) {
        await fetch(`/api/admin/simulator/${botId}/reset`, { method: 'POST' });
      }
      await fetchFleet();
    } catch { /* noop */ }
    setResetting(null);
    setResetConfirm(null);
  };

  const openConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfigDraft({ ...(config || {}) });
    setShowConfigModal(true);
    setDetailTab('config');
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/magnus/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configDraft),
      });
      setConfig(prev => ({ ...(prev || {}), ...configDraft }));
      setShowConfigModal(false);
    } catch { /* noop */ }
    setSaving(false);
  };

  const selectedBot = BOT_REGISTRY.find(b => b.internalId === selectedBotId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-[#E6EDF3] flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#388BFD]" />
            Magnus Operations Center
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            <span className="text-[#E6EDF3] font-mono">{activeBots}</span>/{BOT_REGISTRY.length} bots active
            <span className="mx-2 text-[#30363D]">·</span>
            Fleet PnL:&nbsp;
            <span className={`font-mono font-medium ${fleetPnl >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
              {fmtPnl(fleetPnl)}
            </span>
            {lastRefresh && (
              <span className="ml-2 text-[#484F58]">
                · {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#484F58] flex items-center gap-1 mr-1">
            <Info className="h-3 w-3" />
            Names saved to browser
          </span>
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={`px-2.5 py-1 text-[10px] rounded font-mono border transition-colors ${
              autoRefresh
                ? 'bg-[#3FB950]/10 text-[#3FB950] border-[#3FB950]/30'
                : 'bg-[#21262D] text-[#8B949E] border-[#30363D]'
            }`}
          >
            AUTO {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => void fetchFleet()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Fleet Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {BOT_REGISTRY.map(bot => {
          const rt = getRuntime(bot.internalId);
          const isSelected = selectedBotId === bot.internalId;
          const isPaused = !!botPaused[bot.internalId];
          const isRenaming = renaming === bot.internalId;
          const isResetting = resetting === bot.internalId;

          const pnl = rt.totalPnl;
          const winRate = rt.winRate ?? rt.qualityMetrics?.winRate;
          const tradeCount = rt.totalTrades ?? rt.qualityMetrics?.totalTrades;
          const capital = rt.capital ?? rt.totalPortfolioValueUsd ??
            (typeof bot.startingCapital === 'number' ? bot.startingCapital : undefined);
          const hasLiveData = pnl != null || winRate != null || tradeCount != null;
          const canEditConfig = bot.internalId === 'magnus-alpha';

          return (
            <div
              key={bot.internalId}
              onClick={() => setSelectedBotId(isSelected ? null : bot.internalId)}
              className={`relative bg-[#161B22] border rounded-lg overflow-hidden cursor-pointer transition-all select-none ${
                isSelected
                  ? 'border-[#388BFD]/50 shadow-[0_0_0_1px_#388BFD22]'
                  : 'border-[#21262D] hover:border-[#30363D]'
              }`}
            >
              {/* Color accent */}
              <div className="h-[3px]" style={{ backgroundColor: bot.color }} />

              <div className="p-3.5 space-y-3">

                {/* Row 1: Name + status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          ref={renameRef}
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveRename(bot.internalId);
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          className="flex-1 bg-[#0D1117] border border-[#388BFD] rounded px-2 py-0.5 text-xs text-[#E6EDF3] font-mono focus:outline-none"
                          maxLength={20}
                          placeholder="Enter name…"
                        />
                        <button
                          onClick={() => saveRename(bot.internalId)}
                          className="text-[#3FB950] hover:text-[#3FB950]/70 shrink-0"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setRenaming(null)}
                          className="text-[#F85149] hover:text-[#F85149]/70 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-sm font-mono font-semibold truncate"
                          style={{ color: bot.color }}
                        >
                          {getBotName(bot)}
                        </span>
                        <span className="text-[9px] font-mono text-[#484F58] bg-[#21262D] px-1.5 py-0.5 rounded shrink-0">
                          {bot.strategyClass.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status pill */}
                  {isPaused ? (
                    <span className="text-[9px] font-mono bg-[#D29922]/10 text-[#D29922] border border-[#D29922]/30 px-1.5 py-0.5 rounded shrink-0">
                      PAUSED
                    </span>
                  ) : hasLiveData ? (
                    <span className="flex items-center gap-1 text-[9px] font-mono bg-[#3FB950]/10 text-[#3FB950] border border-[#3FB950]/30 px-1.5 py-0.5 rounded shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono bg-[#484F58]/20 text-[#484F58] px-1.5 py-0.5 rounded shrink-0">
                      OFFLINE
                    </span>
                  )}
                </div>

                {/* Row 2: tagline + capital */}
                <div className="text-[10px] text-[#8B949E]">
                  {bot.tagline}
                  <span className="text-[#484F58] mx-1.5">·</span>
                  {bot.capitalLabel}
                  {capital != null && capital !== bot.startingCapital && (
                    <span className="ml-1 text-[#484F58]">
                      (${capital.toLocaleString()})
                    </span>
                  )}
                </div>

                {/* Row 3: Metrics */}
                <div className="grid grid-cols-3 gap-1.5">
                  <MetricCell
                    label="PNL"
                    value={pnl != null ? fmtPnl(pnl) : '—'}
                    valueClass={
                      pnl == null ? 'text-[#484F58]' :
                      pnl >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'
                    }
                  />
                  <MetricCell
                    label="WIN RATE"
                    value={fmtPct(winRate)}
                    valueClass="text-[#E6EDF3]"
                  />
                  <MetricCell
                    label="TRADES"
                    value={tradeCount != null ? String(tradeCount) : '—'}
                    valueClass="text-[#E6EDF3]"
                  />
                </div>

                {/* Row 4: Action bar */}
                <div
                  className="flex items-center gap-1 pt-2 border-t border-[#21262D]"
                  onClick={e => e.stopPropagation()}
                >
                  <ActionBtn
                    icon={<Edit3 className="h-2.5 w-2.5" />}
                    label="Rename"
                    onClick={e => startRename(bot, e)}
                  />
                  {canEditConfig && (
                    <ActionBtn
                      icon={<Settings className="h-2.5 w-2.5" />}
                      label="Config"
                      hoverColor="hover:text-[#388BFD]"
                      onClick={e => {
                        setSelectedBotId(bot.internalId);
                        openConfig(e);
                      }}
                    />
                  )}
                  <ActionBtn
                    icon={<RotateCcw className={`h-2.5 w-2.5 ${isResetting ? 'animate-spin' : ''}`} />}
                    label="Reset"
                    hoverColor="hover:text-[#F85149]"
                    disabled={isResetting}
                    onClick={e => { e.stopPropagation(); setResetConfirm(bot.internalId); }}
                  />
                  {/* Pause/Resume on the right */}
                  <button
                    onClick={e => void togglePause(bot, e)}
                    className={`flex items-center gap-1 px-2 py-1 text-[9px] rounded ml-auto transition-colors font-mono ${
                      isPaused
                        ? 'bg-[#3FB950]/10 text-[#3FB950] hover:bg-[#3FB950]/20'
                        : 'bg-[#D29922]/10 text-[#D29922] hover:bg-[#D29922]/20'
                    }`}
                  >
                    {isPaused
                      ? <><Play className="h-2.5 w-2.5" />Resume</>
                      : <><Pause className="h-2.5 w-2.5" />Pause</>
                    }
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Selected Bot Detail ──────────────────────────────────────────────── */}
      {selectedBot && (
        <div className="bg-[#161B22] border border-[#21262D] rounded-lg overflow-hidden">
          {/* Detail header */}
          <div className="px-4 py-3 border-b border-[#21262D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedBot.color }} />
              <span className="text-sm font-medium text-[#E6EDF3] font-mono">{getBotName(selectedBot)}</span>
              <span className="text-[10px] text-[#484F58]">{selectedBot.tagline}</span>
              <span className="text-[9px] font-mono bg-[#21262D] text-[#8B949E] px-1.5 py-0.5 rounded">
                {selectedBot.strategyClass}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab switcher */}
              <div className="flex gap-1">
                {(['trades', 'config'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`px-2.5 py-1 text-[10px] rounded font-mono capitalize transition-colors ${
                      detailTab === tab
                        ? 'bg-[#388BFD]/15 text-[#388BFD]'
                        : 'text-[#484F58] hover:text-[#8B949E]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSelectedBotId(null)}
                className="text-[#484F58] hover:text-[#E6EDF3] ml-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Strategies strip */}
          <div className="px-4 py-2.5 border-b border-[#21262D] flex flex-wrap gap-1.5">
            {selectedBot.strategies.map(s => (
              <span
                key={s.name}
                title={s.description}
                className={`text-[9px] font-mono px-2 py-0.5 rounded cursor-help ${
                  s.type === 'primary'
                    ? 'bg-[#388BFD]/10 text-[#388BFD]'
                    : 'bg-[#21262D] text-[#8B949E]'
                }`}
              >
                {s.name}
              </span>
            ))}
          </div>

          {/* ── Trades Tab ──────────────────────────────────────────────────── */}
          {detailTab === 'trades' && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[#484F58] font-mono uppercase">Recent Trades</span>
                {tradesLoading && <RefreshCw className="h-3 w-3 animate-spin text-[#484F58]" />}
              </div>

              {tradesLoading ? (
                <div className="space-y-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-7 bg-[#21262D] rounded animate-pulse" />
                  ))}
                </div>
              ) : trades.length === 0 ? (
                <p className="text-xs text-[#484F58] py-6 text-center">
                  No trade history available for {getBotName(selectedBot)}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[9px] text-[#484F58] uppercase tracking-wide">
                        {['Symbol', 'Side', 'Entry', 'Exit', 'P&L', 'Time'].map(h => (
                          <th key={h} className={`pb-2 font-normal ${h !== 'Symbol' ? 'text-right' : 'text-left'} pr-4`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262D]/40">
                      {trades.slice(0, 25).map((t, i) => {
                        const pnl = t.netProfit ?? t.pnl;
                        const ts = t.timestamp ?? t.createdAt;
                        return (
                          <tr key={t.id ?? i} className="text-[11px] hover:bg-[#21262D]/30 transition-colors">
                            <td className="py-1.5 pr-4 font-mono text-[#E6EDF3]">{t.symbol ?? '—'}</td>
                            <td className="py-1.5 pr-4 text-right">
                              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                                (t.side ?? '').toLowerCase() === 'buy'
                                  ? 'bg-[#3FB950]/10 text-[#3FB950]'
                                  : 'bg-[#F85149]/10 text-[#F85149]'
                              }`}>
                                {t.side?.toUpperCase() ?? '—'}
                              </span>
                            </td>
                            <td className="py-1.5 pr-4 text-right font-mono text-[#8B949E]">
                              {t.entryPrice != null ? `$${Number(t.entryPrice).toFixed(4)}` : '—'}
                            </td>
                            <td className="py-1.5 pr-4 text-right font-mono text-[#8B949E]">
                              {t.exitPrice != null ? `$${Number(t.exitPrice).toFixed(4)}` : '—'}
                            </td>
                            <td className="py-1.5 pr-4 text-right font-mono font-medium">
                              {pnl != null ? (
                                <span className={pnl >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}>
                                  {fmtPnl(pnl)}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="py-1.5 text-right font-mono text-[10px] text-[#484F58]">
                              {fmtTs(ts)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {trades.length > 25 && (
                    <p className="text-[10px] text-[#484F58] text-center pt-2">
                      Showing 25 of {trades.length} trades
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Config Tab ──────────────────────────────────────────────────── */}
          {detailTab === 'config' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-[#484F58] font-mono uppercase">Configuration</span>
                {selectedBot.internalId === 'magnus-alpha' && (
                  <button
                    onClick={e => openConfig(e)}
                    className="flex items-center gap-1 text-[10px] text-[#388BFD] hover:text-[#388BFD]/70 transition-colors"
                  >
                    <Settings className="h-3 w-3" /> Edit Config
                  </button>
                )}
              </div>

              {selectedBot.internalId !== 'magnus-alpha' ? (
                <div className="text-xs text-[#484F58] bg-[#21262D]/40 rounded-lg px-4 py-4 text-center">
                  Config editing is available for HERMES (magnus-alpha) only via the admin API.
                  <br />
                  <span className="text-[10px] text-[#30363D]">
                    Simulator bots operate with static configuration parameters.
                  </span>
                </div>
              ) : configLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 bg-[#21262D] rounded animate-pulse" />
                  ))}
                </div>
              ) : config && Object.keys(config).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(config).map(([k, v]) => (
                    <div key={k} className="bg-[#0D1117] rounded-md px-3 py-2">
                      <div className="text-[9px] text-[#484F58] mb-0.5 uppercase">
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-xs font-mono text-[#E6EDF3] truncate">{String(v)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#484F58] text-center py-4">
                  Config not available (backend may be offline)
                </p>
              )}

              {/* Static bot info */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-[#0D1117] rounded-md px-3 py-2">
                  <div className="text-[9px] text-[#484F58] mb-0.5 uppercase">Win Rate Target</div>
                  <div className="text-xs font-mono text-[#E6EDF3]">{selectedBot.winRateBenchmark}</div>
                </div>
                <div className="bg-[#0D1117] rounded-md px-3 py-2">
                  <div className="text-[9px] text-[#484F58] mb-0.5 uppercase">Signals / Day</div>
                  <div className="text-xs font-mono text-[#E6EDF3]">{selectedBot.signalsPerDay}</div>
                </div>
                <div className="bg-[#0D1117] rounded-md px-3 py-2">
                  <div className="text-[9px] text-[#484F58] mb-0.5 uppercase">Sharpe Ratio</div>
                  <div className="text-xs font-mono text-[#E6EDF3]">{selectedBot.sharpe}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reset Confirm Modal ───────────────────────────────────────────────── */}
      {resetConfirm && (() => {
        const bot = BOT_REGISTRY.find(b => b.internalId === resetConfirm);
        if (!bot) return null;
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#161B22] border border-[#F85149]/40 rounded-xl p-6 max-w-[380px] w-full shadow-2xl">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#F85149]/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-[#F85149]" />
                </div>
                <h2 className="text-sm font-medium text-[#E6EDF3]">Reset Confirmation</h2>
              </div>
              <p className="text-xs text-[#8B949E] mb-1">
                Reset{' '}
                <span className="font-mono font-semibold" style={{ color: bot.color }}>
                  {getBotName(bot)}
                </span>
                ?
              </p>
              <p className="text-[11px] text-[#484F58] mb-5">
                This will permanently clear all PnL history and trade counters.
                The bot will continue running from a clean slate.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleReset(resetConfirm)}
                  disabled={resetting === resetConfirm}
                  className="flex-1 py-2 text-xs font-medium bg-[#F85149]/10 text-[#F85149] border border-[#F85149]/40 rounded-lg hover:bg-[#F85149]/20 transition-colors disabled:opacity-50"
                >
                  {resetting === resetConfirm ? 'Resetting…' : 'Confirm Reset'}
                </button>
                <button
                  onClick={() => setResetConfirm(null)}
                  className="flex-1 py-2 text-xs bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Config Edit Modal ─────────────────────────────────────────────────── */}
      {showConfigModal && selectedBot?.internalId === 'magnus-alpha' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 max-w-[520px] w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-medium text-[#E6EDF3] flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#388BFD]" />
                Edit Config —{' '}
                <span className="font-mono" style={{ color: selectedBot.color }}>
                  {getBotName(selectedBot)}
                </span>
              </h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-[#484F58] hover:text-[#E6EDF3]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {Object.keys(configDraft).length === 0 ? (
              <p className="text-xs text-[#484F58] text-center py-6">
                No config fields available (backend may be offline)
              </p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto mb-5">
                {Object.entries(configDraft).map(([k, v]) => (
                  <div key={k}>
                    <label className="block text-[10px] text-[#484F58] uppercase mb-1">
                      {k.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type={typeof v === 'number' ? 'number' : 'text'}
                      value={String(v ?? '')}
                      onChange={e => setConfigDraft(prev => ({
                        ...prev,
                        [k]: typeof v === 'number' ? parseFloat(e.target.value) : e.target.value,
                      }))}
                      className="w-full px-3 py-2 text-xs bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] font-mono focus:border-[#388BFD] focus:outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => void saveConfig()}
                disabled={saving || Object.keys(configDraft).length === 0}
                className="flex-1 py-2 text-xs font-medium bg-[#388BFD]/10 text-[#388BFD] border border-[#388BFD]/40 rounded-lg hover:bg-[#388BFD]/20 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Config'}
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 py-2 text-xs bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCell({
  label, value, valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="bg-[#0D1117] rounded-md px-2 py-1.5">
      <div className="text-[8px] text-[#484F58] mb-0.5 font-mono">{label}</div>
      <div className={`text-xs font-mono font-medium ${valueClass}`}>{value}</div>
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, hoverColor = 'hover:text-[#E6EDF3]', disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  hoverColor?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono rounded bg-[#21262D] text-[#8B949E] ${hoverColor} transition-colors disabled:opacity-40`}
    >
      {icon}
      {label}
    </button>
  );
}
