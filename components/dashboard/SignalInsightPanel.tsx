"use client";

import { useState, useEffect, useRef } from "react";
import { ExchangeLink, getCommission } from "@/lib/referrals";
import AdZone from "@/components/ui/AdZone";

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

interface OrderLevel {
  price: number;
  volume: number;
  exchange?: string;
}

type SpreadDirection = "narrowing" | "widening" | "stable";

interface Props {
  signal: GapRecord | null;
  onClose: () => void;
  totalSignals?: number;
  bestSpread?: string;
  topCoin?: string;
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance:     "Binance",
  bybit:       "Bybit",
  okx:         "OKX",
  kucoin:      "KuCoin",
  kraken:      "Kraken",
  coinbase:    "Coinbase",
  gate:        "Gate.io",
  gateio:      "Gate.io",
  htx:         "HTX",
  mexc:        "MEXC",
  bitget:      "Bitget",
  bingx:       "BingX",
  bitfinex:    "Bitfinex",
  cryptocom:   "Crypto.com",
  jupiter:     "Jupiter",
  uniswap_v3:  "Uniswap",
  hyperliquid: "Hyperliquid",
};

const EXCHANGE_SHORT: Record<string, string> = {
  binance:     "BIN",
  bybit:       "BYB",
  okx:         "OKX",
  kucoin:      "KUC",
  bitfinex:    "BFX",
  gateio:      "GATE",
  "gate.io":   "GATE",
  gate:        "GATE",
  mexc:        "MEXC",
  bitget:      "BTG",
  htx:         "HTX",
  bingx:       "BNGX",
  kraken:      "KRK",
  coinbase:    "CB",
  cryptocom:   "CRO",
  hyperliquid: "HYP",
  jupiter:     "JUP",
  uniswap_v3:  "UNI",
};

const DEX_EXCHANGES = new Set(["jupiter", "uniswap_v3", "hyperliquid"]);

function exchangeLabel(id: string): string {
  return EXCHANGE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function shortExName(id: string): string {
  return EXCHANGE_SHORT[id] ?? (id ? id.slice(0, 5).toUpperCase() : "UNK");
}

function formatPx(p: number): string {
  if (!p) return "—";
  if (p >= 10000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 100)   return p.toFixed(2);
  if (p >= 1)     return p.toFixed(4);
  return p.toFixed(6);
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatDuration(ms: number): string {
  const s = Math.floor((ms ?? 0) / 1000);
  if (s <= 0)   return "—";
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function formatLiq(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function generateOrderLevels(basePrice: number, side: "buy" | "sell", maxVol: number): OrderLevel[] {
  const volDist = [0.5, 0.25, 0.15, 0.1];
  return Array.from({ length: 4 }, (_, i) => {
    const multiplier = side === "buy" ? 1 : -1;
    const offset = i === 0 ? 0 : basePrice * 0.0002 * (i + 1) * multiplier;
    return { price: basePrice + offset, volume: maxVol * volDist[i] };
  });
}

function RiskBar({ label, score, activeColor }: { label: string; score: number; activeColor: string }) {
  return (
    <div className="flex justify-between items-center mb-1">
      <span className="text-[11px] text-[#8B949E] font-sans">{label}</span>
      <div className="flex gap-[2px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`w-2.5 h-1 rounded-sm ${i <= score ? activeColor : "bg-[#21262D]"}`} />
        ))}
      </div>
    </div>
  );
}

const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;

export default function SignalInsightPanel({
  signal,
  onClose,
  totalSignals,
  bestSpread: bestSpreadProp,
  topCoin,
}: Props) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [spreadHistory, setSpreadHistory] = useState<number[]>([]);
  const [spreadDirection, setSpreadDirection] = useState<SpreadDirection>("stable");
  const [buyLevels, setBuyLevels] = useState<OrderLevel[]>([]);
  const [sellLevels, setSellLevels] = useState<OrderLevel[]>([]);
  const [liveSpread, setLiveSpread] = useState<number | null>(null);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [isDexSignal, setIsDexSignal] = useState(false);
  const historyRef = useRef<number[]>([]);

  // Restore saved width from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("signalPanelWidth");
    if (saved) {
      const w = parseInt(saved);
      if (!isNaN(w)) setPanelWidth(Math.max(MIN_WIDTH, Math.min(w, MAX_WIDTH)));
    }
  }, []);

  // Save width to localStorage
  useEffect(() => {
    localStorage.setItem("signalPanelWidth", String(panelWidth));
  }, [panelWidth]);

  // Reset state when signal changes
  useEffect(() => {
    if (signal) {
      setBuyLevels(generateOrderLevels(signal.buyPrice, "buy", signal.maxTradeableUsd || 10000));
      setSellLevels(generateOrderLevels(signal.sellPrice, "sell", signal.maxTradeableUsd || 10000));
      setBuyPrice(signal.buyPrice);
      setSellPrice(signal.sellPrice);
      setLiveSpread(null);
      setSpreadHistory([]);
      setSpreadDirection("stable");
      historyRef.current = [];
      setIsDexSignal(DEX_EXCHANGES.has(signal.buyExchange) || DEX_EXCHANGES.has(signal.sellExchange));
    }
  }, [signal?.symbol, signal?.buyExchange, signal?.sellExchange]);

  // Live polling — builds real order book from /api/prices ticks
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active || !signal) return;
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        const ticks = Array.isArray(data) ? data : (data.ticks || []);

        const getExId = (t: any) => t.exchangeId || t.exchange || t.e || "";
        const getSym  = (t: any) => t.symbol || t.s || "";

        const buyTick  = ticks.find((t: any) => getSym(t) === signal.symbol && getExId(t) === signal.buyExchange);
        const sellTick = ticks.find((t: any) => getSym(t) === signal.symbol && getExId(t) === signal.sellExchange);

        // Use tick prices if available, else fall back to gap object prices (for DEX)
        const currentBuyAsk  = buyTick?.ask  || buyTick?.bid   || buyTick?.price  || signal.buyPrice  || 0;
        const currentSellBid = sellTick?.bid  || sellTick?.price || signal.sellPrice || 0;

        if (currentBuyAsk > 0 && currentSellBid > 0) {
          const newSpread = ((currentSellBid - currentBuyAsk) / currentBuyAsk) * 100;

          setLiveSpread((prev) => {
            if (prev !== null) {
              setSpreadDirection(
                newSpread > prev + 0.001 ? "widening" :
                newSpread < prev - 0.001 ? "narrowing" : "stable"
              );
            }
            return newSpread;
          });
          setBuyPrice(currentBuyAsk);
          setSellPrice(currentSellBid);

          const newHistory = [...historyRef.current, newSpread].slice(-30);
          historyRef.current = newHistory;
          setSpreadHistory([...newHistory]);

          // Build real order book from all ticks for this symbol across all exchanges
          const allSymbolTicks = ticks.filter((t: any) => getSym(t) === signal.symbol);

          const buyLevelsRaw: OrderLevel[] = allSymbolTicks
            .filter((t: any) => t.ask && t.ask > 0)
            .map((t: any) => ({
              price: t.ask,
              volume: (t.askSize || 0) * t.ask || signal.maxTradeableUsd || 5000,
              exchange: getExId(t),
            }))
            .sort((a: OrderLevel, b: OrderLevel) => a.price - b.price)
            .slice(0, 5);

          const sellLevelsRaw: OrderLevel[] = allSymbolTicks
            .filter((t: any) => t.bid && t.bid > 0)
            .map((t: any) => ({
              price: t.bid,
              volume: (t.bidSize || 0) * t.bid || signal.maxTradeableUsd || 5000,
              exchange: getExId(t),
            }))
            .sort((a: OrderLevel, b: OrderLevel) => b.price - a.price)
            .slice(0, 5);

          if (buyLevelsRaw.length > 0) setBuyLevels(buyLevelsRaw);
          if (sellLevelsRaw.length > 0) setSellLevels(sellLevelsRaw);
        }
      } catch (e) {
        console.error("Spread tracker error:", e);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [signal?.symbol, signal?.buyExchange, signal?.sellExchange]);

  // Drag handler for left edge resize
  const handleDragMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (ev: MouseEvent) => {
      // Dragging left = expanding (startX - ev.clientX > 0 = wider)
      const delta = startX - ev.clientX;
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(startWidth + delta, MAX_WIDTH)));
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  // Empty state
  if (!signal || !signal.symbol) {
    return (
      <div
        className="relative flex-shrink-0 h-full bg-[#0D1117] border-l border-[#21262D] flex flex-col"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Drag handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[5px] cursor-ew-resize hover:bg-[#388BFD]/30 transition-colors z-10"
          onMouseDown={handleDragMouseDown}
        />

        <div className="px-3 py-3 border-b border-[#21262D] bg-[#161B22]">
          <div className="text-[13px] font-sans font-medium text-[#E6EDF3]">Signal insight</div>
          <div className="text-[11px] font-sans text-[#8B949E] mt-1">Click any signal to view details</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="text-[32px] opacity-15 mb-3">📊</div>
          <div className="text-[11px] font-sans text-[#8B949E] leading-relaxed mb-4">
            Select a signal from the opportunities table to view live order book data, execution process, and P&amp;L analysis.
          </div>
          <div className="w-full bg-[#161B22] rounded-lg p-3">
            <div className="text-[11px] font-sans text-[#8B949E] mb-2">Quick stats</div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="font-sans text-[#8B949E]">Active signals</span>
                <span className="text-[#3FB950] font-mono">{totalSignals ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-[#8B949E]">Best spread</span>
                <span className="text-[#3FB950] font-mono">{bestSpreadProp ?? "0"}%</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-[#8B949E]">Top coin</span>
                <span className="text-[#E6EDF3] font-mono">{topCoin ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const buyEx  = exchangeLabel(signal.buyExchange ?? "");
  const sellEx = exchangeLabel(signal.sellExchange ?? "");

  const liveBuyAsk  = buyPrice  || (signal.buyPrice  ?? 0);
  const liveSellBid = sellPrice || (signal.sellPrice ?? 0);

  // Spread display logic
  const signalSpread = signal.spreadPercent ?? 0; // Always positive, at detection time
  const liveSpreadValue = liveSpread; // Can be negative, null
  const spreadClosed = liveSpreadValue !== null && liveSpreadValue <= 0;
  const spreadUnavailable = isDexSignal && liveSpreadValue === null;

  const spreadDelta = liveSpreadValue !== null ? liveSpreadValue - signalSpread : null;

  const spreadColor =
    signalSpread > 0.2 ? "#3FB950" :
    signalSpread > 0   ? "#D29922" :
                         "#F85149";

  // P&L (based on signal spread, which is always the detection-time value)
  const tradeSize   = Math.min(signal.maxTradeableUsd ?? 10000, 10000);
  const effectiveSpread = liveSpreadValue !== null && liveSpreadValue > 0 ? liveSpreadValue : signalSpread;
  const grossProfit = tradeSize * (effectiveSpread / 100);
  const fees        = tradeSize * 0.002;
  const slippage    = grossProfit * 0.05;
  const netProfit   = grossProfit - fees - slippage;
  const netRoi      = (netProfit / tradeSize) * 100;

  // Risk scores
  const liq = signal.maxTradeableUsd ?? 0;
  const liquidityScore =
    liq > 20000 ? 5 : liq > 10000 ? 4 : liq > 5000 ? 3 : liq > 1000 ? 2 : 1;
  const ageSeconds = (Date.now() - (signal.detectedAt ?? Date.now())) / 1000;
  const speedScore =
    ageSeconds < 30 ? 5 : ageSeconds < 60 ? 4 : ageSeconds < 300 ? 3 : ageSeconds < 600 ? 2 : 1;
  const confidenceScore =
    signalSpread > 0.4 ? 5 : signalSpread > 0.3 ? 4 : signalSpread > 0.2 ? 3 : signalSpread > 0.1 ? 2 : 1;

  // Sparkline geometry
  const sparkPts   = spreadHistory;
  const sparkMax   = Math.max(...sparkPts, 0.001);
  const sparkMin   = Math.min(...sparkPts, 0);
  const sparkRange = sparkMax - sparkMin || 0.001;
  const SPARK_H    = 36;

  // Order book helpers
  const maxBuyVol  = Math.max(...buyLevels.map((l) => l.volume), 1);
  const maxSellVol = Math.max(...sellLevels.map((l) => l.volume), 1);

  const buyCommission  = getCommission(signal.buyExchange);
  const sellCommission = getCommission(signal.sellExchange);

  // Arbitrage zone status
  const arbStatus = spreadClosed
    ? "Closed"
    : spreadUnavailable
    ? "DEX — check manually"
    : liveSpreadValue !== null && liveSpreadValue > 0.2
    ? "Profitable"
    : liveSpreadValue !== null && liveSpreadValue > 0.05
    ? "Closing"
    : "Monitoring";

  const arbStatusColor = spreadClosed
    ? "text-[#F85149]"
    : liveSpreadValue !== null && liveSpreadValue > 0.2
    ? "text-[#3FB950]"
    : liveSpreadValue !== null && liveSpreadValue > 0.05
    ? "text-[#D29922]"
    : "text-[#8B949E]";

  return (
    <>
      <style>{`
        .sip-scroll::-webkit-scrollbar { width: 3px; }
        .sip-scroll::-webkit-scrollbar-thumb { background: #21262D; border-radius: 2px; }
        .sip-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div
        className="relative flex-shrink-0 h-full flex flex-col bg-[#0D1117] border-l border-[#21262D] overflow-hidden"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Drag handle on left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[5px] cursor-ew-resize hover:bg-[#388BFD]/30 transition-colors z-10"
          onMouseDown={handleDragMouseDown}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262D] bg-[#161B22] shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-sans text-[#8B949E]">Signal insight</div>
            <div className="text-[12px] font-mono font-medium text-[#E6EDF3] truncate">
              {signal.symbol} · {buyEx} → {sellEx}
            </div>
            <div className="text-[11px] font-sans text-[#484F58]">
              {signal.detectedAt ? timeAgo(signal.detectedAt) : "—"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#484F58] hover:text-[#E6EDF3] transition-colors ml-2 shrink-0 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="sip-scroll flex-1 overflow-y-auto">

          {/* ── SECTION A: Dual spread display ── */}
          <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-[#21262D]">
            {/* Signal spread — always positive, detection-time value */}
            <div className="bg-[#161B22] rounded p-2 text-center">
              <div className="text-[11px] font-sans text-[#8B949E]">Signal spread</div>
              <div className="text-[16px] font-mono font-medium text-[#3FB950]">
                {signalSpread.toFixed(3)}%
              </div>
              <div className="text-[11px] font-sans text-[#484F58]">at detection</div>
            </div>

            {/* Live spread — shows closed/unavailable states */}
            <div className="bg-[#161B22] rounded p-2 text-center">
              <div className="text-[11px] font-sans text-[#8B949E]">Live spread</div>
              {spreadUnavailable ? (
                <>
                  <div className="text-[13px] font-sans text-[#8B949E] mt-1">Unavailable</div>
                  <div className="text-[11px] font-sans text-[#484F58] mt-0.5">DEX prices may be delayed</div>
                </>
              ) : spreadClosed ? (
                <>
                  <div className="text-[14px] font-mono font-medium text-[#F85149]">Spread closed</div>
                  <div className="text-[11px] font-sans text-[#F85149]/70 mt-0.5">▼ {Math.abs(liveSpreadValue!).toFixed(3)}% inverted</div>
                </>
              ) : liveSpreadValue !== null ? (
                <>
                  <div
                    className="text-[16px] font-mono font-medium"
                    style={{ color: liveSpreadValue > 0 ? "#3FB950" : "#F85149" }}
                  >
                    {liveSpreadValue.toFixed(3)}%
                  </div>
                  <div
                    className={`text-[11px] font-sans ${
                      spreadDirection === "narrowing" ? "text-[#D29922]" :
                      spreadDirection === "widening"  ? "text-[#3FB950]" :
                                                        "text-[#8B949E]"
                    }`}
                  >
                    {spreadDirection === "narrowing" ? "▼ narrowing" :
                     spreadDirection === "widening"  ? "▲ widening"  : "— stable"}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[13px] font-sans text-[#8B949E] mt-1">Loading…</div>
                  <div className="text-[11px] font-sans text-[#484F58] mt-0.5">polling</div>
                </>
              )}
            </div>
          </div>

          {/* ── SECTION B: Live order book ── */}
          <div className="px-3 py-2 border-b border-[#21262D]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-sans text-[#8B949E]">Live order book</span>
              <div className="flex items-center gap-1">
                {isDexSignal ? (
                  <span className="text-[11px] font-mono text-[#8B949E]">DEX — price at detection</span>
                ) : (
                  <>
                    <span className="w-[5px] h-[5px] bg-[#3FB950] rounded-full animate-pulse inline-block" />
                    <span className="text-[11px] font-mono text-[#3FB950]">LIVE 2s</span>
                  </>
                )}
              </div>
            </div>

            {/* Two-exchange order book side by side */}
            <div className="grid grid-cols-[1fr_20px_1fr] gap-0">

              {/* BUY SIDE */}
              <div>
                <div className="text-center text-[11px] font-sans font-medium text-[#3FB950] mb-1">
                  Asks (buy cheap)
                </div>
                {buyLevels.map((level, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center px-1 py-[2px] text-[11px] mb-[1px] ${
                      i === 0 ? "bg-[#3FB950]/10 border border-[#3FB950]/20 rounded" : ""
                    }`}
                  >
                    <span className={i === 0 ? "text-[#3FB950] font-medium font-mono" : "text-[#E6EDF3] font-mono"}>
                      {formatPx(level.price)}
                    </span>
                    <span className="text-[11px] font-sans text-[#484F58]">
                      {level.exchange ? shortExName(level.exchange) : shortExName(signal.buyExchange)}
                    </span>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-[35px] h-[4px] bg-[#161B22] rounded overflow-hidden"
                        style={{ direction: "rtl" }}
                      >
                        <div
                          className="h-full bg-[#3FB950]/40 rounded"
                          style={{ width: `${Math.min(100, (level.volume / maxBuyVol) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#8B949E]">
                        ${formatVolume(level.volume)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CENTER SPREAD LINE */}
              <div className="flex items-center justify-center">
                <div className="w-[1px] h-full bg-[#D29922]" />
              </div>

              {/* SELL SIDE */}
              <div>
                <div className="text-center text-[11px] font-sans font-medium text-[#F85149] mb-1">
                  Bids (sell high)
                </div>
                {sellLevels.map((level, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center px-1 py-[2px] text-[11px] mb-[1px] ${
                      i === 0 ? "bg-[#F85149]/10 border border-[#F85149]/20 rounded" : ""
                    }`}
                  >
                    <span className={i === 0 ? "text-[#F85149] font-medium font-mono" : "text-[#E6EDF3] font-mono"}>
                      {formatPx(level.price)}
                    </span>
                    <span className="text-[11px] font-sans text-[#484F58]">
                      {level.exchange ? shortExName(level.exchange) : shortExName(signal.sellExchange)}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-[35px] h-[4px] bg-[#161B22] rounded overflow-hidden">
                        <div
                          className="h-full bg-[#F85149]/40 rounded"
                          style={{ width: `${Math.min(100, (level.volume / maxSellVol) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#8B949E]">
                        ${formatVolume(level.volume)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ARBITRAGE ZONE BAR */}
            {spreadClosed ? (
              <div className="h-[20px] bg-[#F85149]/10 border border-[#F85149]/20 rounded mt-2 flex items-center justify-center">
                <span className="text-[11px] font-mono font-medium text-[#F85149]">CLOSED</span>
              </div>
            ) : (
              <div className="relative h-[20px] bg-[#161B22] rounded mt-2 overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-[#3FB950]/15 flex items-center pl-1"
                  style={{ width: "44%" }}
                >
                  <span className="text-[11px] font-mono text-[#3FB950]">{formatPx(liveBuyAsk)}</span>
                </div>
                <div
                  className="absolute top-0 h-full bg-[#D29922]/20 border-l border-r border-dashed border-[#D29922] flex items-center justify-center"
                  style={{
                    left: "44%",
                    width: `${Math.max(2, Math.min(20, (liveSpreadValue ?? signalSpread) * 20))}%`,
                  }}
                >
                  <span className="text-[11px] font-sans font-medium text-[#D29922]">GAP</span>
                </div>
                <div
                  className="absolute right-0 top-0 h-full bg-[#F85149]/15 flex items-center justify-end pr-1"
                  style={{ width: "44%" }}
                >
                  <span className="text-[11px] font-mono text-[#F85149]">{formatPx(liveSellBid)}</span>
                </div>
              </div>
            )}

            {/* Status row */}
            <div className="flex justify-between mt-1 text-[11px] font-sans">
              <span className="text-[#8B949E]">Max: ${formatNumber(signal.maxTradeableUsd ?? 0)}</span>
              <span className="text-[#D29922]">Alive: {formatDuration(signal.durationMs ?? 0)}</span>
              <span className={arbStatusColor}>{arbStatus}</span>
            </div>
          </div>

          {/* ── Live spread tracker (sparkline + price boxes) ── */}
          <div className="px-3 pt-3 pb-2">
            <div className="text-[11px] font-sans text-[#8B949E] mb-2 flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
              Live spread tracker
            </div>

            {/* Big spread number — always shows signal spread; live spread shown if positive */}
            <div className="bg-[#161B22] rounded-md p-2.5 mb-2 text-center">
              <div className="text-[11px] font-sans text-[#8B949E] mb-0.5">
                {spreadClosed ? "Spread at detection" : "Current spread"}
              </div>
              <div className="text-[26px] font-mono font-medium tabular-nums" style={{ color: spreadColor }}>
                {spreadClosed
                  ? `${signalSpread.toFixed(3)}%`
                  : liveSpreadValue !== null && liveSpreadValue > 0
                  ? `${liveSpreadValue.toFixed(3)}%`
                  : `${signalSpread.toFixed(3)}%`}
              </div>
              {spreadClosed && (
                <div className="text-[11px] font-mono text-[#F85149] mt-0.5">
                  Spread has closed
                </div>
              )}
              {!spreadClosed && spreadDelta !== null && spreadDelta !== 0 && (
                <div
                  className="text-[11px] font-mono mt-0.5"
                  style={{ color: spreadDelta >= 0 ? "#3FB950" : "#F85149" }}
                >
                  {spreadDelta >= 0 ? "▲" : "▼"} {Math.abs(spreadDelta).toFixed(3)}% vs detection
                </div>
              )}
            </div>

            {/* Sparkline */}
            {sparkPts.length > 1 && (
              <div className="mb-2 px-0.5">
                <svg width="100%" height={SPARK_H} className="overflow-visible">
                  {(() => {
                    const threshY = SPARK_H - ((0.2 - sparkMin) / sparkRange) * (SPARK_H - 4) - 2;
                    if (threshY > 0 && threshY < SPARK_H) {
                      return (
                        <line
                          x1="0" y1={threshY} x2="100%" y2={threshY}
                          stroke="#388BFD" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4"
                        />
                      );
                    }
                    return null;
                  })()}
                  <polyline
                    points={sparkPts
                      .map((v, i) => {
                        const x = (i / (sparkPts.length - 1)) * 100;
                        const y = SPARK_H - ((v - sparkMin) / sparkRange) * (SPARK_H - 4) - 2;
                        return `${x}%,${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke={spreadColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {(() => {
                    const last = sparkPts[sparkPts.length - 1];
                    const y = SPARK_H - ((last - sparkMin) / sparkRange) * (SPARK_H - 4) - 2;
                    return <circle cx="100%" cy={y} r="2" fill={spreadColor} />;
                  })()}
                </svg>
                <div className="flex justify-between text-[11px] font-sans text-[#484F58] mt-0.5">
                  <span>← {sparkPts.length} ticks</span>
                  <span className="text-[#388BFD]/60">— 0.2% fee threshold</span>
                  <span>now →</span>
                </div>
              </div>
            )}

            {/* Buy ask / Sell bid boxes */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#3FB950]/5 border border-[#3FB950]/20 rounded p-2">
                <div className="text-[11px] font-sans text-[#3FB950]">Buy ask</div>
                <div className="text-[12px] font-mono font-medium text-[#E6EDF3] tabular-nums">
                  ${formatPx(liveBuyAsk)}
                </div>
                <div className="text-[11px] font-sans truncate">
                  <ExchangeLink exchangeId={signal.buyExchange} className="text-[#3FB950] font-medium">
                    {buyEx}
                  </ExchangeLink>
                </div>
                {buyCommission && (
                  <div className="text-[11px] font-sans text-[#3FB950]/70 mt-0.5 leading-tight">
                    Sign up &amp; trade → {buyCommission}
                  </div>
                )}
              </div>
              <div className="bg-[#F85149]/5 border border-[#F85149]/20 rounded p-2">
                <div className="text-[11px] font-sans text-[#F85149]">Sell bid</div>
                <div className="text-[12px] font-mono font-medium text-[#E6EDF3] tabular-nums">
                  ${formatPx(liveSellBid)}
                </div>
                <div className="text-[11px] font-sans truncate">
                  <ExchangeLink exchangeId={signal.sellExchange} className="text-[#F85149] font-medium">
                    {sellEx}
                  </ExchangeLink>
                </div>
                {sellCommission && (
                  <div className="text-[11px] font-sans text-[#F85149]/70 mt-0.5 leading-tight">
                    Sign up &amp; trade → {sellCommission}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#21262D] mx-3" />

          {/* ── P&L estimate ── */}
          <div className="px-3 py-2">
            <div className="text-[11px] font-sans text-[#8B949E] mb-1.5">P&L estimate</div>
            <table className="w-full text-[11px]">
              <tbody>
                <tr>
                  <td className="py-[2px] font-sans text-[#8B949E]">Trade size</td>
                  <td className="py-[2px] text-right font-mono text-[#E6EDF3]">${tradeSize.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans text-[#8B949E]">Gross profit</td>
                  <td className="py-[2px] text-right font-mono text-[#3FB950]">+${grossProfit.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans text-[#8B949E]">Fees (0.2%)</td>
                  <td className="py-[2px] text-right font-mono text-[#F85149]">−${fees.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans text-[#8B949E]">Slippage ~5%</td>
                  <td className="py-[2px] text-right font-mono text-[#D29922]">~${slippage.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="py-[2px]">
                    <div className="border-t border-[#21262D]" />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans font-medium text-[#8B949E]">Net profit</td>
                  <td
                    className="py-[2px] text-right text-[13px] font-mono font-medium tabular-nums"
                    style={{ color: netProfit >= 0 ? "#3FB950" : "#F85149" }}
                  >
                    {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans text-[#8B949E]">Net ROI</td>
                  <td
                    className="py-[2px] text-right font-mono tabular-nums"
                    style={{ color: netRoi >= 0 ? "#3FB950" : "#F85149" }}
                  >
                    {netRoi >= 0 ? "+" : ""}{netRoi.toFixed(4)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#21262D] mx-3" />

          {/* ── Risk assessment ── */}
          <div className="px-3 py-2">
            <div className="text-[11px] font-sans text-[#8B949E] mb-1.5">Risk assessment</div>
            <RiskBar label="Liquidity"  score={liquidityScore}  activeColor="bg-[#3FB950]" />
            <RiskBar label="Speed"      score={speedScore}      activeColor="bg-[#3FB950]" />
            <RiskBar label="Confidence" score={confidenceScore} activeColor="bg-[#388BFD]" />
          </div>

          <div className="border-t border-[#21262D] mx-3" />

          {/* ── Signal metadata ── */}
          <div className="px-3 py-2">
            <div className="text-[11px] font-sans text-[#8B949E] mb-1.5">Signal info</div>
            <div className="grid grid-cols-2 gap-y-1 text-[11px]">
              <span className="font-sans text-[#8B949E]">Detected</span>
              <span className="font-mono text-[#E6EDF3] text-right">
                {signal.detectedAt ? timeAgo(signal.detectedAt) : "—"}
              </span>
              <span className="font-sans text-[#8B949E]">Duration</span>
              <span className="font-mono text-[#D29922] text-right">{formatDuration(signal.durationMs ?? 0)}</span>
              <span className="font-sans text-[#8B949E]">Type</span>
              <span className="font-mono text-[#E6EDF3] text-right uppercase">
                {(signal.type ?? "").replace(/_/g, "-")}
              </span>
              <span className="font-sans text-[#8B949E]">Liquidity</span>
              <span className="font-mono text-[#E6EDF3] text-right">{formatLiq(signal.maxTradeableUsd ?? 0)}</span>
            </div>
          </div>

          {/* ── Contextual ad zone ── */}
          <AdZone
            zone="contextual-signal"
            context={{ symbol: signal.symbol?.split("/")[0], exchange: signal.buyExchange }}
          />
        </div>
      </div>
    </>
  );
}
