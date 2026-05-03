"use client";

import { useState, useEffect, useRef } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

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

const PANEL_WIDTH = 280;

export default function SignalInsightPanel({ signal, onClose }: Props) {
  const [buyLevels, setBuyLevels] = useState<OrderLevel[]>([]);
  const [sellLevels, setSellLevels] = useState<OrderLevel[]>([]);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [isDexSignal, setIsDexSignal] = useState(false);
  const prevSignalId = useRef<string | undefined>(undefined);
  const userTradeSize = useSettingsStore(s => s.tradeSize);
  const { getRouteStatus } = useNetworkStatus();

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

  // Poll live prices to update order book
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active || !signal) return;
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        const ticks = Array.isArray(data) ? data : (data.ticks || []);

        type RawTick = { exchangeId?: string; exchange?: string; e?: string; symbol?: string; s?: string; bid?: number; ask?: number; price?: number; bidSize?: number; askSize?: number };
        const getExId = (t: RawTick) => t.exchangeId || t.exchange || t.e || "";
        const getSym = (t: RawTick) => t.symbol || t.s || "";

        const buyTick = ticks.find((t: RawTick) => getSym(t) === signal.symbol && getExId(t) === signal.buyExchange);
        const sellTick = ticks.find((t: RawTick) => getSym(t) === signal.symbol && getExId(t) === signal.sellExchange);

        const currentBuyAsk = buyTick?.ask || buyTick?.bid || buyTick?.price || signal.buyPrice || 0;
        const currentSellBid = sellTick?.bid || sellTick?.price || signal.sellPrice || 0;

        if (currentBuyAsk > 0) setBuyPrice(currentBuyAsk);
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

        if (buyLevelsRaw.length > 0) setBuyLevels(buyLevelsRaw);
        if (sellLevelsRaw.length > 0) setSellLevels(sellLevelsRaw);
      } catch { /* non-fatal */ }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal?.id]);

  // Empty state — no signal selected
  if (!signal || !signal.symbol) {
    return (
      <div
        className="flex-shrink-0 h-full bg-[#0D1117] border-l border-[#21262D] flex flex-col"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        <div className="px-3 py-3 border-b border-[#21262D] bg-[#161B22]">
          <div className="text-[13px] font-sans font-medium text-[#E6EDF3]">Signal insight</div>
          <div className="text-[11px] font-sans text-[#8B949E] mt-1">Click any signal to view details</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="text-[32px] opacity-15 mb-3">📊</div>
          <div className="text-[11px] font-sans text-[#8B949E] leading-relaxed">
            Select a signal from the table to view order book depth and P&amp;L estimate.
          </div>
        </div>
      </div>
    );
  }

  const buyEx = exchangeLabel(signal.buyExchange ?? "");
  const sellEx = exchangeLabel(signal.sellExchange ?? "");
  const liveBuyAsk = buyPrice || signal.buyPrice || 0;
  const liveSellBid = sellPrice || signal.sellPrice || 0;

  const hasFeeData = (signal.withdrawFee ?? 0) > 0 || (signal.bestNetwork ?? "") !== "";
  const signalSpread = signal.spreadPercent ?? 0;
  const coin = signal.symbol?.split('/')[0] ?? '';
  const routeStatus = getRouteStatus(signal.buyExchange, signal.sellExchange, coin);

  // P&L — uses trade size from Settings, capped by available liquidity
  const tradeSize = Math.min(userTradeSize, signal.maxTradeableUsd ?? userTradeSize);
  const grossProfit = tradeSize * (signalSpread / 100);
  const fees = tradeSize * 0.002;
  const slippage = grossProfit * 0.05;
  const netProfit = grossProfit - fees - slippage;
  const netRoi = (netProfit / tradeSize) * 100;

  // Order book helpers
  const maxBuyVol = Math.max(...buyLevels.map(l => l.volume), 1);
  const maxSellVol = Math.max(...sellLevels.map(l => l.volume), 1);

  return (
    <>
      <style>{`
        .sip-scroll::-webkit-scrollbar { width: 3px; }
        .sip-scroll::-webkit-scrollbar-thumb { background: #21262D; border-radius: 2px; }
        .sip-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div
        className="flex-shrink-0 h-full flex flex-col bg-[#0D1117] border-l border-[#21262D] overflow-hidden"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262D] bg-[#161B22] shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-sans text-[#8B949E]">Signal insight</div>
            <div className="text-[12px] font-mono font-medium text-[#E6EDF3] truncate">
              {signal.symbol} · {buyEx} → {sellEx}
            </div>
            <div className="text-[11px] font-sans text-[#484F58]">
              {signal.detectedAt ? timeAgo(signal.detectedAt) : "—"} · {formatDuration(signal.durationMs ?? 0)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#484F58] hover:text-[#E6EDF3] transition-colors ml-2 shrink-0 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        <div className="sip-scroll flex-1 overflow-y-auto">

          {/* Wallet rails status */}
          {routeStatus.status === 'blocked' && (
            <div className="mx-3 mt-2 px-2 py-1.5 bg-[#F85149]/10 border border-[#F85149]/30 rounded text-[10px] font-sans text-[#F85149] flex items-center gap-1.5">
              <span>⚠</span>
              <span>{routeStatus.reason ?? 'Transfer route blocked — verify rails before trading'}</span>
            </div>
          )}
          {routeStatus.status === 'ok' && (
            <div className="mx-3 mt-2 px-2 py-1.5 bg-[#3FB950]/8 border border-[#3FB950]/20 rounded text-[10px] font-sans text-[#3FB950] flex items-center gap-1.5">
              <span>✓</span>
              <span>Transfer route confirmed open</span>
            </div>
          )}

          {/* Fee data warning */}
          {!hasFeeData && (
            <div className="mx-3 mt-2 px-2 py-1.5 bg-[#D29922]/10 border border-[#D29922]/30 rounded text-[10px] font-sans text-[#D29922]">
              Fee data unavailable — net spread is approximate
            </div>
          )}

          {/* Buy / Sell price boxes */}
          <div className="grid grid-cols-2 gap-1.5 px-3 py-2">
            <div className="bg-[#3FB950]/5 border border-[#3FB950]/20 rounded p-2">
              <div className="text-[10px] font-sans text-[#3FB950]">BUY (ask)</div>
              <div className="text-[13px] font-mono font-medium text-[#E6EDF3] tabular-nums">
                ${formatPx(liveBuyAsk)}
              </div>
              <div className="text-[11px] font-sans text-[#3FB950] font-medium truncate">{buyEx}</div>
            </div>
            <div className="bg-[#F85149]/5 border border-[#F85149]/20 rounded p-2">
              <div className="text-[10px] font-sans text-[#F85149]">SELL (bid)</div>
              <div className="text-[13px] font-mono font-medium text-[#E6EDF3] tabular-nums">
                ${formatPx(liveSellBid)}
              </div>
              <div className="text-[11px] font-sans text-[#F85149] font-medium truncate">{sellEx}</div>
            </div>
          </div>

          {/* Order book — buy side liquidity */}
          <div className="px-3 py-2 border-t border-[#21262D]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-sans text-[#8B949E]">Buy Liquidity</span>
              {!isDexSignal && (
                <div className="flex items-center gap-1">
                  <span className="w-[5px] h-[5px] bg-[#3FB950] rounded-full animate-pulse inline-block" />
                  <span className="text-[10px] font-mono text-[#3FB950]">LIVE</span>
                </div>
              )}
            </div>
            {buyLevels.map((level, i) => (
              <div key={i} className={`flex justify-between items-center px-1 py-[2px] text-[10px] mb-[1px] ${i === 0 ? "bg-[#3FB950]/10 rounded" : ""}`}>
                <span className={i === 0 ? "text-[#3FB950] font-medium font-mono" : "text-[#E6EDF3] font-mono"}>
                  {formatPx(level.price)}
                </span>
                <span className="text-[10px] font-sans text-[#484F58]">
                  {level.exchange ? shortExName(level.exchange) : shortExName(signal.buyExchange)}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-[30px] h-[3px] bg-[#161B22] rounded overflow-hidden" style={{ direction: "rtl" }}>
                    <div className="h-full bg-[#3FB950]/40 rounded" style={{ width: `${Math.min(100, (level.volume / maxBuyVol) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#8B949E]">${formatVolume(level.volume)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Order book — sell side liquidity */}
          <div className="px-3 py-2 border-t border-[#21262D]">
            <span className="text-[11px] font-sans text-[#8B949E] mb-1.5 block">Sell Liquidity</span>
            {sellLevels.map((level, i) => (
              <div key={i} className={`flex justify-between items-center px-1 py-[2px] text-[10px] mb-[1px] ${i === 0 ? "bg-[#F85149]/10 rounded" : ""}`}>
                <span className={i === 0 ? "text-[#F85149] font-medium font-mono" : "text-[#E6EDF3] font-mono"}>
                  {formatPx(level.price)}
                </span>
                <span className="text-[10px] font-sans text-[#484F58]">
                  {level.exchange ? shortExName(level.exchange) : shortExName(signal.sellExchange)}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-[30px] h-[3px] bg-[#161B22] rounded overflow-hidden">
                    <div className="h-full bg-[#F85149]/40 rounded" style={{ width: `${Math.min(100, (level.volume / maxSellVol) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#8B949E]">${formatVolume(level.volume)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#21262D] mx-3" />

          {/* P&L estimate */}
          <div className="px-3 py-2">
            <div className="text-[11px] font-sans text-[#8B949E] mb-1.5">P&L Estimate</div>
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
                  <td className="py-[2px] text-right font-mono text-[#F85149]">-${fees.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans text-[#8B949E]">Slippage ~5%</td>
                  <td className="py-[2px] text-right font-mono text-[#D29922]">~${slippage.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="py-[2px]"><div className="border-t border-[#21262D]" /></td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans font-medium text-[#E6EDF3]">Net profit</td>
                  <td className="py-[2px] text-right text-[13px] font-mono font-medium tabular-nums" style={{ color: netProfit >= 0 ? "#3FB950" : "#F85149" }}>
                    {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px] font-sans text-[#8B949E]">ROI</td>
                  <td className="py-[2px] text-right font-mono tabular-nums" style={{ color: netRoi >= 0 ? "#3FB950" : "#F85149" }}>
                    {netRoi >= 0 ? "+" : ""}{netRoi.toFixed(4)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#21262D] mx-3" />

          {/* Signal metadata */}
          <div className="px-3 py-2">
            <div className="grid grid-cols-2 gap-y-1 text-[10px]">
              <span className="font-sans text-[#8B949E]">Type</span>
              <span className="font-mono text-[#E6EDF3] text-right uppercase">{(signal.type ?? "").replace(/_/g, "-")}</span>
              <span className="font-sans text-[#8B949E]">Spread</span>
              <span className="font-mono text-[#3FB950] text-right">{signalSpread.toFixed(3)}%</span>
              <span className="font-sans text-[#8B949E]">Network</span>
              <span className="font-mono text-[#E6EDF3] text-right">{signal.bestNetwork || "—"}</span>
              <span className="font-sans text-[#8B949E]">Withdraw fee</span>
              <span className="font-mono text-[#E6EDF3] text-right">{(signal.withdrawFee ?? 0) > 0 ? `$${signal.withdrawFee}` : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
