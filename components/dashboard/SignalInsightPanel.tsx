"use client";

import { useState, useEffect, useRef } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  netSpread?: number;
  withdrawFee?: number;
  bestNetwork?: string;
  confidence?: "high" | "medium" | "low";
  isVolatile?: boolean;
  isThinVolume?: boolean;
  minViableTradeUsd?: number;
}

interface OrderLevel {
  price: number;
  volume: number;
  exchange?: string;
}

interface Props {
  signal: GapRecord | null;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 360;

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance", bybit: "Bybit", okx: "OKX", kucoin: "KuCoin",
  kraken: "Kraken", coinbase: "Coinbase", gate: "Gate.io", gateio: "Gate.io",
  htx: "HTX", mexc: "MEXC", bitget: "Bitget", bingx: "BingX",
  bitfinex: "Bitfinex", cryptocom: "Crypto.com", jupiter: "Jupiter",
  uniswap_v3: "Uniswap", hyperliquid: "Hyperliquid",
};

const EXCHANGE_SHORT: Record<string, string> = {
  binance: "BIN", bybit: "BYB", okx: "OKX", kucoin: "KUC", bitfinex: "BFX",
  gateio: "GATE", "gate.io": "GATE", gate: "GATE", mexc: "MEXC", bitget: "BTG",
  htx: "HTX", bingx: "BNGX", kraken: "KRK", coinbase: "CB", cryptocom: "CRO",
  hyperliquid: "HYP", jupiter: "JUP", uniswap_v3: "UNI",
};

const DEX_EXCHANGES = new Set(["jupiter", "uniswap_v3", "hyperliquid"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function exchangeLabel(id: string): string {
  return EXCHANGE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function shortExName(id: string): string {
  return EXCHANGE_SHORT[id] ?? (id ? id.slice(0, 5).toUpperCase() : "UNK");
}

function formatPx(p: number): string {
  if (!p) return "—";
  if (p >= 10000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatDuration(ms: number): string {
  const s = Math.floor((ms ?? 0) / 1000);
  if (s <= 0) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function generateOrderLevels(basePrice: number, side: "buy" | "sell", maxVol: number): OrderLevel[] {
  const volDist = [0.5, 0.25, 0.15, 0.1];
  return Array.from({ length: 4 }, (_, i) => {
    const multiplier = side === "buy" ? 1 : -1;
    const offset = i === 0 ? 0 : basePrice * 0.0002 * (i + 1) * multiplier;
    return { price: basePrice + offset, volume: maxVol * volDist[i] };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence?: "high" | "medium" | "low" }) {
  if (!confidence) return null;
  const cfg = {
    high:   { pill: "bg-[#3FB950]/15 border-[#3FB950]/40 text-[#3FB950]", label: "● HIGH" },
    medium: { pill: "bg-[#D29922]/15 border-[#D29922]/40 text-[#D29922]", label: "● MED" },
    low:    { pill: "bg-[#8B949E]/15 border-[#8B949E]/40 text-[#8B949E]", label: "● LOW" },
  };
  const { pill, label } = cfg[confidence];
  return (
    <span className={`inline-flex items-center px-1.5 py-[2px] rounded border text-[9px] font-mono font-bold tracking-wide ${pill}`}>
      {label}
    </span>
  );
}

function RailsBadge({ status }: { status: string }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center px-1.5 py-[2px] rounded border text-[9px] font-mono font-bold bg-[#3FB950]/10 border-[#3FB950]/30 text-[#3FB950]">
        ✓ OPEN
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="inline-flex items-center px-1.5 py-[2px] rounded border text-[9px] font-mono font-bold bg-[#F85149]/10 border-[#F85149]/30 text-[#F85149]">
        ⚠ BLOCKED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-[2px] rounded border text-[9px] font-mono font-bold bg-[#8B949E]/10 border-[#8B949E]/30 text-[#8B949E]">
      — UNK
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SignalInsightPanel({ signal, onClose }: Props) {
  const [buyLevels, setBuyLevels] = useState<OrderLevel[]>([]);
  const [sellLevels, setSellLevels] = useState<OrderLevel[]>([]);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [isDexSignal, setIsDexSignal] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH);
  const prevSignalId = useRef<string | undefined>(undefined);
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number>(PANEL_WIDTH);
  const userTradeSize = useSettingsStore(s => s.tradeSize);
  const { getRouteStatus } = useNetworkStatus();

  const onDragStart = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = dragStartX.current! - ev.clientX;
      const next = Math.min(560, Math.max(280, dragStartWidth.current + delta));
      setPanelWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    e.preventDefault();
  };

  useEffect(() => {
    if (signal && signal.id !== prevSignalId.current) {
      prevSignalId.current = signal.id;
      setBuyLevels(generateOrderLevels(signal.buyPrice, "buy", signal.maxTradeableUsd || 10000));
      setSellLevels(generateOrderLevels(signal.sellPrice, "sell", signal.maxTradeableUsd || 10000));
      setBuyPrice(signal.buyPrice);
      setSellPrice(signal.sellPrice);
      setIsDexSignal(DEX_EXCHANGES.has(signal.buyExchange) || DEX_EXCHANGES.has(signal.sellExchange));
    }
  }, [signal]);

  // Poll live prices every 2 s to keep order book fresh
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active || !signal) return;
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        const ticks = Array.isArray(data) ? data : (data.ticks || []);

        type RawTick = {
          exchangeId?: string; exchange?: string; e?: string;
          symbol?: string; s?: string;
          bid?: number; ask?: number; price?: number;
          bidSize?: number; askSize?: number;
        };
        const getExId = (t: RawTick) => t.exchangeId || t.exchange || t.e || "";
        const getSym  = (t: RawTick) => t.symbol || t.s || "";

        const buyTick  = ticks.find((t: RawTick) => getSym(t) === signal.symbol && getExId(t) === signal.buyExchange);
        const sellTick = ticks.find((t: RawTick) => getSym(t) === signal.symbol && getExId(t) === signal.sellExchange);

        const currentBuyAsk  = buyTick?.ask  || buyTick?.bid  || buyTick?.price  || signal.buyPrice  || 0;
        const currentSellBid = sellTick?.bid || sellTick?.price || signal.sellPrice || 0;

        if (currentBuyAsk  > 0) setBuyPrice(currentBuyAsk);
        if (currentSellBid > 0) setSellPrice(currentSellBid);

        const allSymbolTicks = ticks.filter((t: RawTick) => getSym(t) === signal.symbol);

        const buyLevelsRaw: OrderLevel[] = allSymbolTicks
          .filter((t: RawTick) => t.ask && (t.ask ?? 0) > 0)
          .map((t: RawTick) => ({
            price: t.ask ?? 0,
            volume: (t.askSize || 0) * (t.ask ?? 0) || signal.maxTradeableUsd || 5000,
            exchange: getExId(t),
          }))
          .sort((a: OrderLevel, b: OrderLevel) => a.price - b.price)
          .slice(0, 5);

        const sellLevelsRaw: OrderLevel[] = allSymbolTicks
          .filter((t: RawTick) => t.bid && (t.bid ?? 0) > 0)
          .map((t: RawTick) => ({
            price: t.bid ?? 0,
            volume: (t.bidSize || 0) * (t.bid ?? 0) || signal.maxTradeableUsd || 5000,
            exchange: getExId(t),
          }))
          .sort((a: OrderLevel, b: OrderLevel) => b.price - a.price)
          .slice(0, 5);

        if (buyLevelsRaw.length  > 0) setBuyLevels(buyLevelsRaw);
        if (sellLevelsRaw.length > 0) setSellLevels(sellLevelsRaw);
      } catch { /* non-fatal */ }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal?.id]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!signal || !signal.symbol) {
    return (
      <div
        className="flex-shrink-0 h-full bg-[#0D1117] border-l border-[#21262D] flex flex-col relative"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="absolute left-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-[#388BFD]/30 transition-colors z-10"
          title="Drag to resize"
        />
        <div className="shrink-0 px-3 py-2.5 bg-[#161B22] border-b border-[#21262D]">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-[#8B949E] uppercase">
            Signal Insight
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <div
            className="text-[44px] leading-none select-none"
            style={{ color: "#21262D" }}
          >
            ⬡
          </div>
          <div className="text-[12px] font-mono text-[#8B949E] leading-relaxed max-w-[220px]">
            Select a signal from the table to view order book depth and P&amp;L estimate
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-12 bg-[#21262D]" />
            <span className="text-[9px] font-mono text-[#484F58] tracking-wide">waiting for selection</span>
            <div className="h-px w-12 bg-[#21262D]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const liveBuyAsk  = buyPrice  || signal.buyPrice  || 0;
  const liveSellBid = sellPrice || signal.sellPrice || 0;

  const hasFeeData   = (signal.withdrawFee ?? 0) > 0 || (signal.bestNetwork ?? "") !== "";
  const signalSpread = signal.spreadPercent ?? 0;
  const coin         = signal.symbol?.split("/")[0] ?? "";
  const routeStatus  = getRouteStatus(signal.buyExchange, signal.sellExchange, coin);

  // Spread shown on the divider line — live when possible
  const liveSreadPct =
    liveBuyAsk > 0 && liveSellBid > 0
      ? ((liveSellBid - liveBuyAsk) / liveBuyAsk) * 100
      : signalSpread;

  // P&L
  const effectiveMax = (signal.maxTradeableUsd ?? 0) > 0 ? signal.maxTradeableUsd! : userTradeSize;
  const tradeSize    = Math.min(userTradeSize, effectiveMax);
  const grossProfit  = tradeSize * (signalSpread / 100);
  const fees         = tradeSize * 0.002;
  const slippage     = grossProfit * 0.05;
  const netProfit    = grossProfit - fees - slippage;
  const netRoi       = tradeSize > 0 ? (netProfit / tradeSize) * 100 : 0;

  // Order book — 3 asks sorted DESC (best ask = lowest = last row before divider)
  //              3 bids sorted DESC (best bid = highest = first row after divider)
  const asks3 = buyLevels.slice(0, 3).sort((a, b) => b.price - a.price);
  const bids3 = sellLevels.slice(0, 3);

  const maxAskVol = Math.max(...asks3.map(l => l.volume), 1);
  const maxBidVol = Math.max(...bids3.map(l => l.volume), 1);

  const hasRailsBlocked = routeStatus.status === "blocked";
  const hasWarnings = hasRailsBlocked || !hasFeeData || !!signal.isVolatile || !!signal.isThinVolume;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex-shrink-0 h-full flex flex-col bg-[#0D1117] border-l border-[#21262D] overflow-hidden relative"
      style={{ width: `${panelWidth}px`, fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace" }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="absolute left-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-[#388BFD]/30 transition-colors z-10"
        title="Drag to resize"
      />
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER  ~56 px
      ════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 px-3 pt-2.5 pb-2 bg-[#161B22] border-b border-[#21262D]">
        <div className="flex items-start justify-between gap-2">

          {/* Left: symbol + exchange route + time */}
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-mono font-bold text-[#E6EDF3] leading-tight tracking-wide">
              {signal.symbol}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] font-mono text-[#8B949E]">
              <span className="font-bold">{shortExName(signal.buyExchange)}</span>
              <span className="text-[#484F58] tracking-tighter">──────</span>
              <span className="font-bold">{shortExName(signal.sellExchange)}</span>
            </div>
            <div className="text-[10px] font-mono text-[#484F58] mt-[1px]">
              {signal.detectedAt ? timeAgo(signal.detectedAt) : "—"} · {formatDuration(signal.durationMs ?? 0)}
            </div>
          </div>

          {/* Right: close + confidence + rails badges */}
          <div className="flex flex-col items-end gap-[4px] shrink-0">
            <button
              onClick={onClose}
              className="text-[#484F58] hover:text-[#E6EDF3] transition-colors text-[11px] leading-none"
              aria-label="Close panel"
            >
              ✕
            </button>
            <ConfidenceBadge confidence={signal.confidence} />
            <RailsBadge status={routeStatus.status} />
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICES  ~48 px
      ════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 px-3 py-2 bg-[#0D1117] border-b border-[#21262D]">
        {/* Row 1: BUY / SELL prices */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span>
              <span className="text-[9px] font-mono text-[#3FB950] mr-1 tracking-wide">BUY</span>
              <span className="text-[12px] font-mono font-semibold text-[#E6EDF3] tabular-nums">
                ${formatPx(liveBuyAsk)}
              </span>
            </span>
            <span>
              <span className="text-[9px] font-mono text-[#F85149] mr-1 tracking-wide">SELL</span>
              <span className="text-[12px] font-mono font-semibold text-[#E6EDF3] tabular-nums">
                ${formatPx(liveSellBid)}
              </span>
            </span>
          </div>
          {!isDexSignal && (
            <span className="flex items-center gap-1 text-[9px] font-mono">
              <span className="w-[5px] h-[5px] rounded-full bg-[#3FB950] animate-pulse inline-block" />
              <span className="text-[#3FB950] tracking-wide">LIVE</span>
            </span>
          )}
        </div>
        {/* Row 2: Spread / Net */}
        <div className="flex items-center gap-3 mt-[3px] text-[9px] font-mono">
          <span className="text-[#8B949E]">
            Spread <span className="text-[#D29922]">{signalSpread.toFixed(3)}%</span>
          </span>
          {(signal.netSpread ?? 0) > 0 && (
            <span className="text-[#8B949E]">
              Net <span className="text-[#3FB950]">{(signal.netSpread ?? 0).toFixed(3)}%</span>
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          WARNINGS  ~28 px each, conditional
      ════════════════════════════════════════════════════════════════════ */}
      {hasWarnings && (
        <div className="shrink-0 border-b border-[#21262D]">
          {hasRailsBlocked && (
            <div className="flex items-center gap-1.5 px-3 h-[28px] bg-[#F85149]/5 border-b border-[#21262D] text-[10px] font-mono text-[#F85149]">
              <span>⚠</span>
              <span className="truncate">{routeStatus.reason ?? "Rails blocked — verify before trading"}</span>
            </div>
          )}
          {!hasFeeData && (
            <div className="flex items-center gap-1.5 px-3 h-[28px] bg-[#D29922]/5 border-b border-[#21262D] text-[10px] font-mono text-[#D29922]">
              <span>⚠</span>
              <span>Fee data unavailable — net spread is approximate</span>
            </div>
          )}
          {signal.isVolatile && (
            <div className="flex items-center gap-1.5 px-3 h-[28px] bg-[#D29922]/5 border-b border-[#21262D] text-[10px] font-mono text-[#D29922]">
              <span>⚡</span>
              <span>Volatile — price spike detected in last 5 min</span>
            </div>
          )}
          {signal.isThinVolume && (
            <div className="flex items-center gap-1.5 px-3 h-[28px] text-[10px] font-mono text-[#58A6FF] bg-[#58A6FF]/5">
              <span>💧</span>
              <span>Thin volume — elevated slippage risk</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ORDER BOOK  capped height, scrollable
      ════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex flex-col bg-[#161B22] border-b border-[#21262D] overflow-y-auto" style={{ maxHeight: "220px" }}>

        {/* Asks label */}
        <div className="shrink-0 flex items-center px-3 py-1">
          <div className="flex-1 h-px bg-[#F85149]/20" />
          <span className="px-2 text-[9px] font-mono text-[#F85149]/50 tracking-widest">ASKS</span>
          <div className="flex-1 h-px bg-[#F85149]/20" />
        </div>

        {/* Ask rows — 3 levels, highest price first, best ask (lowest) closest to spread */}
        <div className="shrink-0">
          {asks3.map((level, i) => {
            const isBestAsk = i === asks3.length - 1;
            const barPct    = Math.min(100, (level.volume / maxAskVol) * 100);
            return (
              <div
                key={i}
                className={`flex items-center px-3 py-[3px] gap-1.5 ${isBestAsk ? "bg-[#F85149]/8" : ""}`}
              >
                <span
                  className={`w-[82px] text-[11px] font-mono tabular-nums shrink-0 ${
                    isBestAsk ? "text-[#F85149] font-bold" : "text-[#E6EDF3]"
                  }`}
                >
                  ${formatPx(level.price)}
                </span>
                <span className="w-[28px] text-[9px] font-mono text-[#484F58] shrink-0">
                  {level.exchange ? shortExName(level.exchange) : shortExName(signal.buyExchange)}
                </span>
                <div className="flex-1 h-2.5 bg-[#161B22] rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${isBestAsk ? "bg-[#F85149]/60" : "bg-[#F85149]/30"}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <span className="w-[38px] text-right text-[9px] font-mono text-[#8B949E] shrink-0">
                  ${formatVolume(level.volume)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Spread divider */}
        <div className="shrink-0 flex items-center px-3 py-1.5">
          <div className="flex-1 h-px bg-[#D29922]/30" />
          <span className="px-2 text-[9px] font-mono text-[#D29922] tracking-wider whitespace-nowrap">
            SPREAD {liveSreadPct.toFixed(3)}%
          </span>
          <div className="flex-1 h-px bg-[#D29922]/30" />
        </div>

        {/* Bid rows — best bid (highest) first, closest to spread */}
        <div className="shrink-0">
          {bids3.map((level, i) => {
            const isBestBid = i === 0;
            const barPct    = Math.min(100, (level.volume / maxBidVol) * 100);
            return (
              <div
                key={i}
                className={`flex items-center px-3 py-[3px] gap-1.5 ${isBestBid ? "bg-[#3FB950]/8" : ""}`}
              >
                <span
                  className={`w-[82px] text-[11px] font-mono tabular-nums shrink-0 ${
                    isBestBid ? "text-[#3FB950] font-bold" : "text-[#E6EDF3]"
                  }`}
                >
                  ${formatPx(level.price)}
                </span>
                <span className="w-[28px] text-[9px] font-mono text-[#484F58] shrink-0">
                  {level.exchange ? shortExName(level.exchange) : shortExName(signal.sellExchange)}
                </span>
                <div className="flex-1 h-2.5 bg-[#161B22] rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${isBestBid ? "bg-[#3FB950]/60" : "bg-[#3FB950]/30"}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <span className="w-[38px] text-right text-[9px] font-mono text-[#8B949E] shrink-0">
                  ${formatVolume(level.volume)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bids label */}
        <div className="shrink-0 flex items-center px-3 py-1">
          <div className="flex-1 h-px bg-[#3FB950]/20" />
          <span className="px-2 text-[9px] font-mono text-[#3FB950]/50 tracking-widest">BIDS</span>
          <div className="flex-1 h-px bg-[#3FB950]/20" />
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          P&L CALCULATOR
      ════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 px-3 py-2.5 bg-[#161B22] border-b border-[#21262D]">
        <div className="text-[9px] font-mono text-[#484F58] tracking-widest uppercase mb-1.5">P&amp;L Estimate</div>
        <div className="flex justify-between items-center text-[10px] font-mono py-[2px]">
          <span className="text-[#8B949E]">Trade size</span>
          <span className="text-[#E6EDF3] tabular-nums">${tradeSize.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono py-[2px]">
          <span className="text-[#8B949E]">Gross profit</span>
          <span className="text-[#3FB950] tabular-nums">+${grossProfit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono py-[2px]">
          <span className="text-[#8B949E]">Fees (0.2%)</span>
          <span className="text-[#F85149] tabular-nums">-${fees.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono py-[2px]">
          <span className="text-[#8B949E]">Slippage ~5%</span>
          <span className="text-[#D29922] tabular-nums">~${slippage.toFixed(2)}</span>
        </div>
        <div className="border-t border-[#21262D] my-[5px]" />
        <div className="flex justify-between items-baseline text-[10px] font-mono py-[1px]">
          <span className="text-[#E6EDF3] font-bold">Net profit</span>
          <span className="flex items-baseline gap-2">
            <span
              className="text-[13px] font-bold tabular-nums"
              style={{ color: netProfit >= 0 ? "#3FB950" : "#F85149" }}
            >
              {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
            </span>
            <span
              className="text-[10px] tabular-nums"
              style={{ color: netRoi >= 0 ? "#3FB950" : "#F85149" }}
            >
              {isNaN(netRoi) ? "0.000" : (netRoi >= 0 ? "+" : "") + netRoi.toFixed(3)}%
            </span>
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          AD ZONE  flex-1, reserved for future placement
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-[80px] bg-[#0D1117] mx-3 mb-3 mt-2 border border-dashed border-[#21262D]/40 rounded" />
    </div>
  );
}
