"use client";

import { useState, useEffect } from "react";
import { ExchangeLink, getReferralUrl, getCommission } from "@/lib/referrals";
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
}

export default function CoinDetailPanel({ symbol, onSelectSignal }: Props) {
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

        const symBase = symbol.split("/")[0].replace("USDT", "").replace("USDC", "");
        const coinTicks = allTicks.filter((t) => {
          if (t.symbol === symbol) return true;
          const base = t.symbol?.split("/")[0]?.replace("USDT", "")?.replace("USDC", "");
          return base === symBase;
        });
        setTicks(coinTicks);

        // Normalize both free-tier (4-field) and trader+ shapes so every
        // GapRecord has safe numeric values (spreadPercent, detectedAt, etc.)
        // and the _isFreeTier flag for conditional rendering.
        const allGaps = normalizeApiGapList(Array.isArray(gapData) ? gapData : []) as unknown as GapRecord[];
        setGaps(allGaps.filter((g) => g.symbol === symbol || g.symbol?.split("/")[0] === symBase));
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

  let byExchange: Record<string, PriceTick> = {};
  let exchangeList: PriceTick[] = [];
  let highestBidEntry: PriceTick | undefined;
  let lowestAskEntry: PriceTick | undefined;
  let currentPrice = 0;
  let bestSpread = 0;
  let estProfit = 0;

  try {
    byExchange = ticks.reduce<Record<string, PriceTick>>((acc, t) => {
      if (!acc[t.exchange]) acc[t.exchange] = t;
      return acc;
    }, {});
    exchangeList = Object.values(byExchange).sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0));
    highestBidEntry = exchangeList[0];
    lowestAskEntry = [...exchangeList].sort((a, b) => (a.ask ?? Infinity) - (b.ask ?? Infinity))[0];
    currentPrice = highestBidEntry?.bid ?? 0;
    bestSpread =
      highestBidEntry && lowestAskEntry && highestBidEntry.exchange !== lowestAskEntry.exchange
        ? ((highestBidEntry.bid - lowestAskEntry.ask) / lowestAskEntry.ask) * 100
        : 0;
    estProfit = (10000 * bestSpread) / 100;
  } catch (e) {
    console.error("CoinDetailPanel error:", e);
  }

  const priceColor = currentPrice > 0 ? "text-[#3FB950]" : "text-[#8B949E]";
  const coinName = symbol.split("/")[0];
  const topExchange = highestBidEntry?.exchange ?? "binance";

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
                {exchangeList.map((t) => {
                  const isBestBid = t.exchange === highestBidEntry?.exchange;
                  const isBestAsk = t.exchange === lowestAskEntry?.exchange;
                  return (
                    <tr key={t.exchange}>
                      <td className="py-[3px]">
                        <ExchangeLink exchangeId={t.exchange} className="text-[#388BFD]">
                          {shortEx(t.exchange)}
                        </ExchangeLink>
                      </td>
                      <td
                        className={`py-[3px] text-right tabular-nums ${
                          isBestBid ? "text-[#3FB950] font-medium" : "text-[#E6EDF3]"
                        }`}
                      >
                        {t.bid ? formatPrice(t.bid) : "—"}
                      </td>
                      <td
                        className={`py-[3px] text-right tabular-nums ${
                          isBestAsk ? "text-[#3FB950] font-medium" : "text-[#8B949E]"
                        }`}
                      >
                        {t.ask ? formatPrice(t.ask) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Best arbitrage highlight */}
        {bestSpread > 0 && highestBidEntry && lowestAskEntry && (
          <div className="mx-3 my-2 p-2 bg-[#3FB950]/5 border border-[#3FB950]/20 rounded-md">
            <div className="text-[11px] font-mono text-[#3FB950] font-medium">
              {shortEx(lowestAskEntry.exchange)} → {shortEx(highestBidEntry.exchange)}
              <span className="ml-2">{bestSpread.toFixed(3)}%</span>
            </div>
            <div className="text-[11px] font-sans text-[#8B949E] mt-0.5">
              Est. profit: ${estProfit.toFixed(2)} on $10K
            </div>
          </div>
        )}

        <div className="border-t border-[#21262D] mx-3" />

        {/* Active gaps */}
        <div className="px-3 pt-3 pb-2 flex-1">
          <div className="text-[11px] font-sans text-[#8B949E] mb-2">
            Active gaps ({gaps.length})
          </div>

          {gaps.length === 0 ? (
            <div className="text-[11px] text-[#484F58] font-sans">
              No active gaps for {coinName}
            </div>
          ) : (
            gaps.map((gap, i) => (
              <div
                key={gap.id ?? i}
                onClick={() => onSelectSignal(gap)}
                className="bg-[#0D1117] border border-[#21262D] rounded p-2 mb-1.5 cursor-pointer hover:border-[#388BFD]/50 transition-colors"
              >
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-[#E6EDF3]">
                    <ExchangeLink exchangeId={gap.buyExchange} className="text-[#388BFD]">
                      {gap.buyExchange}
                    </ExchangeLink>
                    {" → "}
                    <ExchangeLink exchangeId={gap.sellExchange} className="text-[#F85149]">
                      {gap.sellExchange}
                    </ExchangeLink>
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
            ))
          )}
        </div>

        {/* Contextual ad at bottom */}
        <div className="mt-auto p-2 border-t border-[#21262D] shrink-0">
          <a
            href={getReferralUrl(topExchange)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3FB950] text-[11px] block text-center hover:opacity-80 transition-opacity"
          >
            Trade {coinName} on {topExchange.charAt(0).toUpperCase() + topExchange.slice(1)} — {getCommission(topExchange) || "low fees"} →
          </a>
        </div>
      </div>
    </>
  );
}
