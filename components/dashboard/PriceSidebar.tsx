"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getReferralUrl } from "@/lib/referrals";

interface CoinEntry {
  symbol: string;
  coinName: string;
  price: number;
  ask: number;
  exchange: string;
}

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
      style={{ display: "grid", gridTemplateColumns: "40px 1fr 42px" }}
      className={`items-center px-2 py-[5px] cursor-pointer transition-all border-l-2 ${
        selected
          ? "border-[#388BFD] bg-[#161B22]"
          : "border-transparent hover:bg-[#161B22]"
      }`}
    >
      <span className="text-[11px] font-mono font-medium text-[#E6EDF3] truncate">
        {sym}
      </span>
      <span
        className="text-[11px] font-mono text-right tabular-nums transition-colors duration-300"
        style={{ color: priceColor }}
      >
        {formatPrice(price)}
      </span>
      <span className={`text-[11px] font-mono text-right tabular-nums ${changeColor}`}>
        {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
      </span>
    </div>
  );
}

interface MagnusStats {
  winRate: number;
  tradeCount: number;
  capital: number;
}

interface PriceSidebarProps {
  onSelectCoin: (symbol: string | null) => void;
  selectedCoin: string | null;
}

export default function PriceSidebar({ onSelectCoin, selectedCoin }: PriceSidebarProps) {
  const [quote, setQuote] = useState<"USDT" | "USDC">("USDT");
  const [search, setSearch] = useState("");
  const [coins, setCoins] = useState<CoinEntry[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(180);
  const [magnus, setMagnus] = useState<MagnusStats | null>(null);
  const firstSeenPrices = useRef<Record<string, number>>({});
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("coinSidebarWidth");
    if (saved) setSidebarWidth(Math.max(140, Math.min(260, parseInt(saved))));
  }, []);

  useEffect(() => {
    localStorage.setItem("coinSidebarWidth", String(sidebarWidth));
  }, [sidebarWidth]);

  // Auto-select first coin when list first loads
  useEffect(() => {
    if (!hasAutoSelected.current && !selectedCoin && coins.length > 0) {
      hasAutoSelected.current = true;
      onSelectCoin(coins[0].symbol);
    }
  }, [coins, selectedCoin, onSelectCoin]);

  // Fetch Magnus alpha stats
  useEffect(() => {
    const fetchMagnus = async () => {
      try {
        const res = await fetch("/api/simulators");
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.simulators ?? data.bots ?? []);
        if (list.length > 0) {
          const bot = list[0];
          const wins = bot.wins ?? bot.winCount ?? 0;
          const losses = bot.losses ?? bot.lossCount ?? 0;
          const total = wins + losses;
          const winRate = total > 0 ? (wins / total) * 100 : 100;
          const tradeCount = bot.tradeCount ?? bot.trades ?? total ?? 27;
          const capital = bot.capital ?? bot.startingCapital ?? bot.balance ?? 19000;
          setMagnus({ winRate, tradeCount, capital });
        }
      } catch {
        // use placeholder display
      }
    };
    fetchMagnus();
    const id = setInterval(fetchMagnus, 30000);
    return () => clearInterval(id);
  }, []);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMouseMove = (ev: MouseEvent) => {
        const newWidth = Math.max(140, Math.min(startWidth + (ev.clientX - startX), 260));
        setSidebarWidth(newWidth);
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
    },
    [sidebarWidth]
  );

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        const ticks = Array.isArray(data) ? data : (data.ticks || []);

        const latestBySymbol: Record<string, any> = {};
        ticks.forEach((t: any) => {
          const sym = t.symbol || t.s;
          if (!sym) return;
          const tTime = t.timestamp || t.t || 0;
          const existTime = latestBySymbol[sym]?.timestamp || latestBySymbol[sym]?.t || 0;
          if (!latestBySymbol[sym] || tTime > existTime) {
            latestBySymbol[sym] = t;
          }
        });

        const newCoins = Object.entries(latestBySymbol)
          .map(([symbol, tick]: [string, any]) => {
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
          .sort((a, b) => a.coinName.localeCompare(b.coinName));

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
    return c.coinName.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
  });

  const magnusWinRate = magnus ? `${magnus.winRate.toFixed(0)}% win rate` : "100% win rate";
  const magnusTradeCount = magnus ? magnus.tradeCount : 27;
  const magnusCapital = magnus
    ? magnus.capital >= 1000
      ? `$${(magnus.capital / 1000).toFixed(0)}K`
      : `$${magnus.capital.toFixed(0)}`
    : "$19K";

  return (
    <>
      <style>{`
        .ps-scroll::-webkit-scrollbar { width: 3px; }
        .ps-scroll::-webkit-scrollbar-thumb { background: #21262D; border-radius: 2px; }
        .ps-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <aside
        style={{ width: `${sidebarWidth}px` }}
        className="relative hidden lg:flex flex-col flex-shrink-0 h-full bg-[#0D1117] border-r border-[#21262D]"
      >
        {/* USDT / USDC pill toggle */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#21262D] shrink-0">
          {(["USDT", "USDC"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuote(q)}
              className="flex-1 text-[11px] font-sans rounded py-0.5 transition-colors duration-150"
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
          style={{ display: "grid", gridTemplateColumns: "40px 1fr 42px" }}
          className="px-2 py-[4px] border-b border-[#21262D] shrink-0"
        >
          <span className="text-[10px] font-sans text-[#484F58]">Coin</span>
          <span className="text-[10px] font-sans text-[#484F58] text-right">Price</span>
          <span className="text-[10px] font-sans text-[#484F58] text-right">Chg</span>
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

        {/* Ad zone card */}
        <div className="border-t border-[#21262D] p-2 shrink-0">
          <div className="bg-[#388BFD]/[0.04] border border-[#388BFD]/10 rounded-md p-2.5 text-center">
            <div className="text-[#388BFD] text-[12px] font-medium">Trade on Binance</div>
            <div className="text-[#484F58] text-[11px]">Lowest fees in crypto</div>
            <a
              href={getReferralUrl("binance")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#388BFD] text-[11px] underline mt-1 block"
            >
              Sign up now →
            </a>
          </div>
        </div>

        {/* Magnus Alpha widget */}
        <div className="border-t border-[#21262D] p-2 shrink-0">
          <div className="bg-[#161B22] border border-[#21262D] rounded-md p-2">
            <div className="text-[#8B949E] text-[11px]">Magnus Alpha</div>
            <div className="text-[#3FB950] text-[14px] font-medium font-mono">{magnusWinRate}</div>
            <div className="text-[#484F58] text-[11px]">
              {magnusTradeCount} trades · {magnusCapital} capital
            </div>
          </div>
        </div>

        {/* Resize handle on right edge */}
        <div
          className="absolute right-0 top-0 bottom-0 w-[4px] cursor-ew-resize hover:bg-[#388BFD]/30 transition-colors z-10"
          onMouseDown={handleResizeMouseDown}
        />
      </aside>
    </>
  );
}
