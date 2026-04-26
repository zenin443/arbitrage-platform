"use client";

import { useState, useCallback } from "react";
import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";

type Tier = "tier1" | "tier2" | "tier3" | "tier4";

const COINS: Record<Tier, string[]> = {
  tier1: [
    "BTC", "ETH", "SOL", "BNB", "XRP",
    "ADA", "DOGE", "AVAX", "DOT", "LINK",
  ],
  tier2: [
    "TRX", "MATIC", "UNI", "NEAR", "LTC",
    "BCH", "APT", "FIL", "ATOM", "ARB",
    "OP", "IMX", "INJ", "SUI", "SEI",
    "STX", "RENDER", "FTM", "ALGO", "HBAR",
  ],
  tier3: [
    "VET", "AAVE", "GRT", "SAND", "MANA",
    "AXS", "THETA", "EOS", "IOTA", "XTZ",
    "FLOW", "CRV", "EGLD", "KAVA", "ROSE",
    "ZIL", "ONE", "ENJ", "CHZ", "LRC",
    "COMP", "SNX", "BAL", "SUSHI", "YFI",
    "DYDX", "GMX", "MKR", "RPL", "SSV",
  ],
  tier4: [
    "PEPE", "SHIB", "WIF", "BONK", "FLOKI",
    "ORDI", "TIA", "WLD", "JUP", "PYTH",
    "W", "STRK", "MEME", "BLUR", "ACE",
    "PIXEL", "PORTAL", "DYM", "ALT", "ONDO",
    "PENDLE", "ENA", "ETHFI", "BOME", "SLERF",
    "MEW", "POPCAT", "TURBO", "NEIRO", "APE",
  ],
};

const TIER_CONFIG: Record<Tier, { label: string; description: string; badge: string }> = {
  tier1: { label: "Top 10",      description: "Majors by market cap (Free)",        badge: "bg-th-green/20 text-th-green" },
  tier2: { label: "Top 11–30",   description: "Large caps (Basic tier)",             badge: "bg-th-accent/20 text-th-accent" },
  tier3: { label: "Top 31–60",   description: "Mid caps & DeFi (Pro tier)",          badge: "bg-th-yellow/20 text-th-yellow" },
  tier4: { label: "Trending",    description: "Memes & new launches (Pro tier)",     badge: "bg-purple-500/20 text-purple-400" },
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function CoinSelector() {
  const [activeTier, setActiveTier] = useState<Tier>("tier1");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { selectedCoins, toggleCoin, setSelectedCoins } = useSettingsStore();

  const coins = COINS[activeTier];
  const selectedInTier = coins.filter((c) => selectedCoins.includes(c));
  const totalSelected = Object.values(COINS).flat().filter(c => selectedCoins.includes(c)).length;
  const totalCoins = Object.values(COINS).flat().length;

  function handleSelectAll() {
    const toAdd = coins.filter((c) => !selectedCoins.includes(c));
    setSelectedCoins([...selectedCoins, ...toAdd]);
  }

  function handleDeselectAll() {
    setSelectedCoins(selectedCoins.filter((c) => !coins.includes(c)));
  }

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/alert-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackedCoins: selectedCoins }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [selectedCoins]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-th-primary font-mono">
          Tracked Coins
        </h2>
        <p className="text-xs text-th-dim mt-1 font-mono">
          Select which coins to trigger alerts for. The price engine tracks all{" "}
          {totalCoins} coins regardless — alerts filter by your selection below.
        </p>
      </div>

      {/* Tier tabs */}
      <div className="flex gap-0.5 border-b border-th-border mb-5 overflow-x-auto">
        {(Object.keys(COINS) as Tier[]).map((tier) => {
          const cfg = TIER_CONFIG[tier];
          const selCount = COINS[tier].filter((c) => selectedCoins.includes(c)).length;
          return (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold tracking-wider uppercase transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTier === tier
                  ? "border-th-accent text-th-accent"
                  : "border-transparent text-th-secondary hover:text-th-primary"
              )}
            >
              {cfg.label}
              {selCount > 0 && (
                <span className={clsx(
                  "text-[10px] px-1 rounded font-mono",
                  activeTier === tier
                    ? "bg-th-accent/20 text-th-accent"
                    : "bg-th-hover text-th-dim"
                )}>
                  {selCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tier description */}
      <p className="text-xs text-th-dim font-mono mb-4">
        {TIER_CONFIG[activeTier].description} · {coins.length} coins
      </p>

      {/* Select / Deselect all */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handleSelectAll}
          className="px-3 py-1 text-xs font-mono bg-th-hover hover:bg-th-border text-th-primary rounded border border-th-border transition-colors"
        >
          Select All
        </button>
        <button
          onClick={handleDeselectAll}
          className="px-3 py-1 text-xs font-mono bg-th-hover hover:bg-th-border text-th-primary rounded border border-th-border transition-colors"
        >
          Deselect All
        </button>
        <span className="ml-auto text-xs text-th-dim font-mono">
          {selectedInTier.length} / {coins.length} selected
        </span>
      </div>

      {/* Coin pills */}
      <div className="flex flex-wrap gap-2">
        {coins.map((coin) => {
          const isSelected = selectedCoins.includes(coin);
          return (
            <button
              key={coin}
              onClick={() => toggleCoin(coin)}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all",
                isSelected
                  ? "bg-th-accent/15 border-th-accent text-th-accent shadow-[0_0_8px_rgba(56,139,253,0.15)]"
                  : "bg-th-surface border-th-border text-th-secondary hover:border-th-secondary hover:text-th-primary"
              )}
            >
              {coin}
            </button>
          );
        })}
      </div>

      {/* Footer — global count + save */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-th-dim font-mono">
          {selectedCoins.length} coin{selectedCoins.length !== 1 ? "s" : ""} selected
          across all tiers
          {selectedCoins.length === 0 && (
            <span className="ml-1 text-th-yellow"> — alerts will fire on ALL {totalCoins} coins</span>
          )}
        </p>
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className={clsx(
            "flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-semibold rounded border transition-all",
            saveStatus === "saved"
              ? "bg-th-green/15 border-th-green text-th-green"
              : saveStatus === "error"
              ? "bg-red-500/15 border-red-500 text-red-400"
              : "bg-th-accent/10 border-th-accent text-th-accent hover:bg-th-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {saveStatus === "saved" && <CheckIcon className="h-3 w-3" />}
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Save Alert Filter"}
        </button>
      </div>
    </div>
  );
}
