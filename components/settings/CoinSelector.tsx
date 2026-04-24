"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { LockIcon } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import Badge from "@/components/ui/Badge";

type Category = "major" | "midcap" | "meme";

const COINS: Record<Category, string[]> = {
  major: ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOT", "MATIC", "LINK"],
  midcap: ["DOGE", "SHIB", "LTC", "UNI", "ATOM", "FTM", "NEAR", "APT", "ARB", "OP"],
  meme: ["PEPE", "WIF", "BONK", "FLOKI", "BRETT", "POPCAT", "MOG", "TURBO", "NEIRO", "DOGS"],
};

const CATEGORY_CONFIG: Record<Category, { label: string; description: string; requiresPro: boolean }> = {
  major:  { label: "Major",      description: "Top market cap assets",        requiresPro: false },
  midcap: { label: "Mid Cap",    description: "Mid-tier assets by liquidity",  requiresPro: false },
  meme:   { label: "Meme / DEX", description: "High-volatility meme tokens",   requiresPro: true  },
};

const IS_PRO = false;

export default function CoinSelector() {
  const [activeCategory, setActiveCategory] = useState<Category>("major");
  const { selectedCoins, toggleCoin, setSelectedCoins } = useSettingsStore();

  const isLocked = CATEGORY_CONFIG[activeCategory].requiresPro && !IS_PRO;
  const coins = COINS[activeCategory];
  const selectedInCategory = coins.filter((c) => selectedCoins.includes(c));

  function handleSelectAll() {
    if (isLocked) return;
    const toAdd = coins.filter((c) => !selectedCoins.includes(c));
    setSelectedCoins([...selectedCoins, ...toAdd]);
  }

  function handleDeselectAll() {
    if (isLocked) return;
    setSelectedCoins(selectedCoins.filter((c) => !coins.includes(c)));
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-th-primary font-mono">
          Tracked Coins
        </h2>
        <p className="text-xs text-th-dim mt-1 font-mono">
          Select which coins to monitor. Only pairs involving selected coins
          will appear in your signal feed.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 border-b border-th-border mb-5">
        {(Object.keys(COINS) as Category[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const locked = cfg.requiresPro && !IS_PRO;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold tracking-wider uppercase transition-colors border-b-2 -mb-px",
                activeCategory === cat
                  ? "border-th-accent text-th-accent"
                  : "border-transparent text-th-secondary hover:text-th-primary"
              )}
            >
              {cfg.label}
              {locked && <LockIcon className="h-3 w-3 text-th-yellow" />}
            </button>
          );
        })}
      </div>

      {/* Pro lock banner */}
      {isLocked && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2.5 bg-th-yellow/10 border border-th-yellow/30 rounded-lg text-xs text-th-yellow font-mono">
          <LockIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
            Meme / DEX coins require a{" "}
            <Badge variant="warning">Pro Plan</Badge>
            . Upgrade to unlock access.
          </span>
        </div>
      )}

      {/* Select / Deselect all */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handleSelectAll}
          disabled={isLocked}
          className="px-3 py-1 text-xs font-mono bg-th-hover hover:bg-th-border text-th-primary rounded border border-th-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Select All
        </button>
        <button
          onClick={handleDeselectAll}
          disabled={isLocked}
          className="px-3 py-1 text-xs font-mono bg-th-hover hover:bg-th-border text-th-primary rounded border border-th-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Deselect All
        </button>
        <span className="ml-auto text-xs text-th-dim font-mono">
          {selectedInCategory.length} / {coins.length} selected
        </span>
      </div>

      {/* Coin pills */}
      <div className="flex flex-wrap gap-2">
        {coins.map((coin) => {
          const isSelected = selectedCoins.includes(coin);
          return (
            <button
              key={coin}
              onClick={() => !isLocked && toggleCoin(coin)}
              disabled={isLocked}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all",
                isLocked
                  ? "opacity-40 cursor-not-allowed bg-th-surface border-th-border text-th-secondary"
                  : isSelected
                  ? "bg-th-accent/15 border-th-accent text-th-accent shadow-[0_0_8px_rgba(56,139,253,0.15)]"
                  : "bg-th-surface border-th-border text-th-secondary hover:border-th-secondary hover:text-th-primary"
              )}
            >
              {coin}
            </button>
          );
        })}
      </div>

      {/* Global count */}
      <p className="mt-6 text-xs text-th-dim font-mono">
        {selectedCoins.length} coin{selectedCoins.length !== 1 ? "s" : ""} selected
        across all categories
      </p>
    </div>
  );
}
