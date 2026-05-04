"use client";

import { useState, useEffect } from "react";
import { normalizeApiGapList } from "@/lib/response-transformer";

interface RawTick {
  symbol?: string; s?: string;
  exchangeId?: string; exchange?: string; e?: string;
  bid?: number; ask?: number; price?: number;
}

interface PriceTick {
  symbol: string;
  exchange: string;
  exchangeId?: string;
  bid: number;
  ask: number;
  price?: number;
}

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
  /** true when item came from the 4-field free-tier payload */
  _isFreeTier?: boolean;
}

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
  upbit:       "UPB",
  phemex:      "PHE",
  whitebit:    "WBT",
  coinex:      "CEX",
  bitmart:     "BMT",
  jupiter:     "JUP",
  uniswap_v3:  "UNI",
  hyperliquid: "HYP",
};

function shortEx(id: string): string {
  return EXCHANGE_SHORT[id] ?? (id ? id.slice(0, 5).toUpperCase() : "UNK");
}

function formatPrice(p: number): string {
  if (p >= 10000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 100)   return p.toFixed(2);
  if (p >= 10)    return p.toFixed(3);
  if (p >= 1)     return p.toFixed(4);
  return p.toFixed(6);
}

function timeAgoShort(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

interface Props {
  symbol: string | null;
  onSelectSignal: (signal: GapRecord) => void;
  /** Base coins that currently have active signals (e.g. ["BTC", "ETH"]).
   *  When provided and non-empty, the panel shows a placeholder for any
   *  coin not in this list instead of showing price data. */
  signalCoins?: string[];
}

export default function CoinDetailPanel({ symbol, onSelectSignal, signalCoins }: Props) {
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetchData = async () => {
      try {
        const [priceRes, gapRes] = await Promise.all([
          fetch("/api/prices"),
          fetch("/api/profitable-gaps"),
        ]);
        const priceData = await priceRes.json();
        const gapData = await gapRes.json();

        if (!active) return;

        const rawTicks: RawTick[] = priceData.ticks ?? (Array.isArray(priceData) ? priceData : []);
        const allTicks: PriceTick[] = rawTicks.map((t) => ({
          symbol: t.symbol || t.s || "",
          exchange: t.exchangeId || t.exchange || t.e || "unknown",
          bid: t.bid ?? 0,
          ask: t.ask ?? 0,
          price: t.price,
        }));

        const symQuote = symbol.split("/")[1] ?? "USDT";
        const symBase = symbol.split("/")[0];
        const coinTicks = allTicks.filter((t) => {
          if (t.symbol === symbol) return true;
          const tBase = t.symbol?.split("/")[0] ?? "";
          const tQuote = t.symbol?.split("/")[1] ?? "USDT";
          return tBase === symBase && tQuote === symQuote;
        });
        setTicks(coinTicks);

        // Normalize both free-tier (4-field) and trader+ shapes so every
        // GapRecord has safe numeric values (spreadPercent, detectedAt, etc.)
        // and the _isFreeTier flag for conditional rendering.
        const allGaps = normalizeApiGapList(Array.isArray(gapData) ? gapData : []) as unknown as GapRecord[];
        setGaps(allGaps.filter((g) => {
          if (g.symbol === symbol) return true;
          const gBase = g.symbol?.split("/")[0] ?? "";
          const gQuote = g.symbol?.split("/")[1] ?? "USDT";
          return gBase === symBase && gQuote === symQuote;
        }));
      } catch {
        // keep previous data on transient errors
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [symbol]);

  // Empty state when no coin selected
  if (!symbol) {
    return (
      <div className="w-[200px] flex-shrink-0 h-full bg-[#161B22] border-r border-[#21262D] flex flex-col items-center justify-center">
        <div className="text-[11px] font-sans text-[#484F58] text-center px-4 leading-relaxed">
          Select a coin from the watchlist
        </div>
      </div>
    );
  }

  const coinBase = symbol.split("/")[0];
  // If signalCoins has loaded (non-empty) and this coin has no active signal, show placeholder
  const hasActiveSignal =
    !signalCoins || signalCoins.length === 0 || signalCoins.includes(coinBase);

  if (!hasActiveSignal) {
    return (
      <div className="w-[200px] flex-shrink-0 h-full bg-[#161B22] border-r border-[#21262D] flex flex-col">
        <div className="flex items-center px-3 py-2 border-b border-[#21262D] sticky top-0 bg-[#161B22] z-10">
          <span className="text-[13px] font-mono font-medium text-[#8B949E] truncate">{symbol}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-1">
          <div className="text-[11px] font-sans text-[#484F58] text-center leading-relaxed">
            No active signals for {coinBase}
          </div>
          <div className="text-[10px] font-sans text-[#30363D] text-center leading-relaxed mt-1">
            Select a coin from the signal list
          </div>
        </div>
      </div>
    );
  }

  let byExchange: Record<string, PriceTick> = {};
  let exchangeList: PriceTick[] = [];
  let currentPrice = 0;

  try {
    byExchange = ticks.reduce<Record<string, PriceTick>>((acc, t) => {
      if (!acc[t.exchange]) acc[t.exchange] = t;
      return acc;
    }, {});
    exchangeList = Object.values(byExchange).sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0));
    currentPrice = exchangeList[0]?.bid ?? 0;
  } catch (e) {
    console.error("CoinDetailPanel error:", e);
  }

  const priceColor = currentPrice > 0 ? "text-[#3FB950]" : "text-[#8B949E]";
  const coinName = symbol.split("/")[0];

  return (
    <>
      <style>{`
        .cdp-scroll::-webkit-scrollbar { width: 3px; }
        .cdp-scroll::-webkit-scrollbar-thumb { background: #21262D; border-radius: 2px; }
        .cdp-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="w-[200px] flex-shrink-0 h-full overflow-y-auto cdp-scroll bg-[#161B22] border-r border-[#21262D] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262D] sticky top-0 bg-[#161B22] z-10">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="text-[13px] font-mono font-medium text-[#E6EDF3] truncate">{symbol}</span>
            {currentPrice > 0 && (
              <span className={`text-[11px] font-mono ml-1 shrink-0 ${priceColor}`}>
                ${formatPrice(currentPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Price across exchanges */}
        <div className="px-3 pt-3 pb-2">
          <div className="text-[11px] font-sans text-[#8B949E] mb-2">Price across exchanges</div>

          {loading ? (
            <div className="text-[11px] text-[#484F58] font-sans">Loading…</div>
          ) : exchangeList.length === 0 ? (
            <div className="text-[11px] text-[#484F58] font-sans leading-relaxed">
              No live price data.
              <br />
              Start the price server.
            </div>
          ) : (
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="text-[#484F58] text-[11px] font-sans">
                  <th className="text-left pb-1 font-normal">Exch</th>
                  <th className="text-right pb-1 font-normal">Bid</th>
                  <th className="text-right pb-1 font-normal">Ask</th>
                </tr>
              </thead>
              <tbody>
                {exchangeList.map((t) => (
                  <tr key={t.exchange}>
                    <td className="py-[3px] text-[#388BFD]">
                      {shortEx(t.exchange)}
                    </td>
                    <td className="py-[3px] text-right tabular-nums text-[#E6EDF3]">
                      {t.bid ? formatPrice(t.bid) : "—"}
                    </td>
                    <td className="py-[3px] text-right tabular-nums text-[#8B949E]">
                      {t.ask ? formatPrice(t.ask) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-[#21262D] mx-3" />

        {/* Active gaps — capped at 4 visible, rest scrollable */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="text-[11px] font-sans text-[#8B949E] mb-2">
            Active gaps ({gaps.length})
          </div>

          {gaps.length === 0 ? (
            <div className="text-[11px] text-[#484F58] font-sans">
              No active gaps for {coinName}
            </div>
          ) : (
            <div className="cdp-scroll overflow-y-auto" style={{ maxHeight: "248px" }}>
              {gaps.map((gap, i) => (
                <div
                  key={gap.id ?? i}
                  onClick={() => onSelectSignal(gap)}
                  className="bg-[#0D1117] border border-[#21262D] rounded p-2 mb-1.5 cursor-pointer hover:border-[#388BFD]/50 transition-colors"
                >
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[#E6EDF3]">
                      <span className="text-[#388BFD]">{shortEx(gap.buyExchange)}</span>
                      {" → "}
                      <span className="text-[#F85149]">{shortEx(gap.sellExchange)}</span>
                    </span>
                    <span className="text-[#3FB950]">
                      {gap._isFreeTier
                        ? (gap.spreadPercent > 0 ? `~${gap.spreadPercent.toFixed(3)}` : '—')
                        : (gap.spreadPercent?.toFixed(3) ?? '—')}%
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8B949E] font-sans mt-0.5">
                    {gap.type || '—'} ·{" "}
                    {gap._isFreeTier
                      ? <span title="Upgrade for profit data">$— est. profit</span>
                      : `$${((gap.maxTradeableUsd * gap.spreadPercent) / 100).toFixed(2)}`}{" "}
                    ·{" "}
                    {gap._isFreeTier || !gap.detectedAt
                      ? '—'
                      : timeAgoShort(gap.detectedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ad zone — reserved space below gaps */}
        <div className="flex-1 min-h-[60px] mx-3 mb-3 mt-1 border border-dashed border-[#21262D]/40 rounded bg-[#0D1117]" />

      </div>
    </>
  );
}
