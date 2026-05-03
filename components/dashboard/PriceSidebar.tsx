"use client";

import { useState, useEffect, useRef } from "react";

interface RawPriceTick {
  symbol?: string; s?: string;
  exchangeId?: string; exchange?: string; e?: string;
  bid?: number; ask?: number; price?: number; p?: number;
  timestamp?: number; t?: number;
}

interface CoinEntry {
  symbol: string;
  coinName: string;
  price: number;
  ask: number;
  exchange: string;
}

const MARKET_CAP_RANK: Record<string, number> = {
  BTC: 1, ETH: 2, USDT: 3, BNB: 4, SOL: 5,
  USDC: 6, XRP: 7, DOGE: 8, TON: 9, ADA: 10,
  SHIB: 11, AVAX: 12, LINK: 13, BCH: 14, DOT: 15,
  NEAR: 16, UNI: 17, LEO: 18, LTC: 19, KAS: 20,
  ICP: 21, PEPE: 22, APT: 23, ETC: 24, FET: 25,
  XMR: 26, STX: 27, WIF: 28, MNT: 29, CRO: 30,
  FIL: 31, RNDR: 32, IMX: 33, OP: 34, INJ: 35,
  ARB: 36, ATOM: 37, HBAR: 38, MKR: 39, VET: 40,
  GRT: 41, FLOKI: 42, BONK: 43, SUI: 44, TIA: 45,
  RUNE: 46, SEI: 47, ALGO: 48, FLOW: 49, MANA: 50,
  SAND: 51, AXS: 52, THETA: 53, EOS: 54, XTZ: 55,
  KAVA: 56, CFX: 57, AAVE: 58, QNT: 59, EGLD: 60,
  IOTA: 61, XEC: 62, GALA: 63, ROSE: 64, ZIL: 65,
  ONE: 66, ENJ: 67, CHZ: 68, CRV: 69, SNX: 70,
  LDO: 71, RPL: 72, GMX: 73, DYDX: 74, APE: 75,
  MAGIC: 76, HFT: 77, BLUR: 78, SSV: 79, JOE: 80,
  WOO: 81, PERP: 82, OCEAN: 83, BAND: 84, ZRX: 85,
  BAT: 86, ANKR: 87, SKL: 88, STORJ: 89, COTI: 90,
  CELR: 91, DENT: 92, MTL: 93, OGN: 94, REQ: 95,
  RLC: 96, LOOM: 97, TNT: 98, POLY: 99, ACH: 100,
};

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (p >= 10)   return p.toFixed(2);
  if (p >= 1)    return p.toFixed(4);
  return p.toFixed(4);
}

interface CoinRowProps {
  sym: string;
  price: number;
  changePercent: number;
  selected: boolean;
  onClick: () => void;
}

function CoinRow({ sym, price, changePercent, selected, onClick }: CoinRowProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef(price);

  useEffect(() => {
    if (price !== prevPrice.current) {
      setFlash(price > prevPrice.current ? "up" : "down");
      prevPrice.current = price;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [price]);

  const priceColor =
    flash === "up"     ? "#3FB950" :
    flash === "down"   ? "#F85149" :
    changePercent >= 0 ? "#3FB950" : "#F85149";

  const changeColor = changePercent >= 0 ? "text-[#3FB950]" : "text-[#F85149]";

  return (
    <div
      onClick={onClick}
      style={{ display: "grid", gridTemplateColumns: "44px 1fr 46px" }}
      className={`items-center px-2 py-[5px] cursor-pointer transition-all border-l-2 ${
        selected
          ? "border-[#388BFD] bg-[#161B22]"
          : "border-transparent hover:bg-[#161B22]"
      }`}
    >
      <span className="text-[11px] font-mono font-medium text-[#E6EDF3] truncate text-center">
        {sym}
      </span>
      <span
        className="text-[11px] font-mono text-center tabular-nums transition-colors duration-300"
        style={{ color: priceColor }}
      >
        {formatPrice(price)}
      </span>
      <span className={`text-[11px] font-mono text-center tabular-nums ${changeColor}`}>
        {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
      </span>
    </div>
  );
}

interface PriceSidebarProps {
  onSelectCoin: (symbol: string | null) => void;
  selectedCoin: string | null;
}

export default function PriceSidebar({ onSelectCoin, selectedCoin }: PriceSidebarProps) {
  const [quote, setQuote] = useState<"USDT" | "USDC" | "BTC" | "ETH">("USDT");
  const [search, setSearch] = useState("");
  const [coins, setCoins] = useState<CoinEntry[]>([]);
  const firstSeenPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        const ticks = Array.isArray(data) ? data : (data.ticks || []);

        const latestBySymbol: Record<string, RawPriceTick> = {};
        ticks.forEach((t: RawPriceTick) => {
          const sym = t.symbol || t.s;
          if (!sym) return;
          const tTime = t.timestamp || t.t || 0;
          const existTime = latestBySymbol[sym]?.timestamp || latestBySymbol[sym]?.t || 0;
          if (!latestBySymbol[sym] || tTime > existTime) {
            latestBySymbol[sym] = t;
          }
        });

        const newCoins = Object.entries(latestBySymbol)
          .map(([symbol, tick]: [string, RawPriceTick]) => {
            const price = tick.bid || tick.price || tick.p || 0;
            if (price > 0 && !(symbol in firstSeenPrices.current)) {
              firstSeenPrices.current[symbol] = price;
            }
            return {
              symbol,
              coinName: symbol.split("/")[0] || symbol.replace("USDT", "").replace("USDC", ""),
              price,
              ask: tick.ask || 0,
              exchange: tick.exchangeId || tick.exchange || tick.e || "",
            };
          })
          .filter((c) => c.price > 0)
          .sort((a, b) => {
            const rankA = MARKET_CAP_RANK[a.coinName] ?? 999;
            const rankB = MARKET_CAP_RANK[b.coinName] ?? 999;
            if (rankA !== rankB) return rankA - rankB;
            return a.coinName.localeCompare(b.coinName);
          });

        setCoins(newCoins);
      } catch (e) {
        console.error("Price fetch error:", e);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = coins.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = c.coinName.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
    const symbolQuote = c.symbol.split('/')[1] ?? 'USDT';
    const matchesQuote = symbolQuote === quote;
    return matchesSearch && matchesQuote;
  });

  return (
    <>
      <style>{`
        .ps-scroll::-webkit-scrollbar { width: 3px; }
        .ps-scroll::-webkit-scrollbar-thumb { background: #21262D; border-radius: 2px; }
        .ps-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <aside
        style={{ width: '200px' }}
        className="hidden lg:flex flex-col flex-shrink-0 h-full bg-[#0D1117] border-r border-[#21262D]"
      >
        {/* USDT / USDC / BTC pill toggle */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#21262D] shrink-0">
          {(["USDT", "USDC", "BTC", "ETH"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuote(q)}
              className="flex-1 text-[10px] font-mono rounded py-0.5 transition-colors duration-150"
              style={{
                background: quote === q ? "#388BFD22" : "transparent",
                color:      quote === q ? "#388BFD"   : "#484F58",
                border:     quote === q ? "1px solid #388BFD44" : "1px solid transparent",
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-2 py-1.5 border-b border-[#21262D] shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#161B22] border border-[#21262D] rounded px-2 py-[3px] text-[11px] font-sans text-[#E6EDF3] placeholder-[#484F58] outline-none focus:border-[#388BFD]/50 transition-colors"
          />
        </div>

        {/* Column headers */}
        <div
          style={{ display: "grid", gridTemplateColumns: "44px 1fr 46px" }}
          className="px-2 py-[4px] border-b border-[#21262D] shrink-0"
        >
          <span className="text-[10px] font-sans text-[#484F58] text-center">Coin</span>
          <span className="text-[10px] font-sans text-[#484F58] text-center">Price</span>
          <span className="text-[10px] font-sans text-[#484F58] text-center">Chg</span>
        </div>

        {/* Coin scroller — fixed max height, independent scroll */}
        <div className="ps-scroll overflow-y-auto shrink-0" style={{ maxHeight: "300px" }}>
          {coins.length === 0 && (
            <div className="px-2 py-3 text-[11px] font-sans text-[#484F58] text-center">
              Connecting…
            </div>
          )}
          {filtered.map((coin) => {
            const firstPrice = firstSeenPrices.current[coin.symbol] ?? coin.price;
            const changePercent = firstPrice > 0 ? ((coin.price - firstPrice) / firstPrice) * 100 : 0;
            return (
              <CoinRow
                key={coin.symbol}
                sym={coin.coinName}
                price={coin.price}
                changePercent={changePercent}
                selected={selectedCoin === coin.symbol}
                onClick={() => onSelectCoin(selectedCoin === coin.symbol ? null : coin.symbol)}
              />
            );
          })}
          {coins.length > 0 && filtered.length === 0 && (
            <div className="px-2 py-3 text-[11px] font-sans text-[#484F58] text-center">
              No coins found
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
