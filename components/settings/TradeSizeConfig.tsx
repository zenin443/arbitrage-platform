"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ShieldAlertIcon } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { BaseCurrency } from "@/store/useSettingsStore";

const PRESETS = [500, 1_000, 5_000, 10_000] as const;
const CURRENCIES: BaseCurrency[] = ["USDT", "USDC", "BTC"];

const MIN_TRADE = 100;
const MAX_TRADE = 1_000_000;

export default function TradeSizeConfig() {
  const { tradeSize, baseCurrency, minNetSpread, setTradeSize, setBaseCurrency } =
    useSettingsStore();

  const [isCustom, setIsCustom] = useState(
    !PRESETS.includes(tradeSize as (typeof PRESETS)[number])
  );
  const [customInput, setCustomInput] = useState(String(tradeSize));
  const [inputError, setInputError] = useState<string | null>(null);

  const estimatedProfit = parseFloat(
    ((tradeSize * minNetSpread) / 100).toFixed(2)
  );

  function handlePreset(size: number) {
    setIsCustom(false);
    setInputError(null);
    setTradeSize(size);
    setCustomInput(String(size));
  }

  function handleCustomChange(value: string) {
    setCustomInput(value);
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      setInputError("Enter a valid number.");
      return;
    }
    if (parsed < MIN_TRADE) {
      setInputError(`Minimum trade size is $${MIN_TRADE.toLocaleString()}.`);
      return;
    }
    if (parsed > MAX_TRADE) {
      setInputError(`Maximum trade size is $${MAX_TRADE.toLocaleString()}.`);
      return;
    }
    setInputError(null);
    setTradeSize(parsed);
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Trade size ── */}
      <section>
        <p className="text-xs font-semibold text-th-secondary font-mono uppercase tracking-wider mb-1">
          Trade Size
        </p>
        <p className="text-xs text-th-dim font-mono mb-4">
          Base notional used for profit estimation.
          Range: ${MIN_TRADE.toLocaleString()} – ${MAX_TRADE.toLocaleString()}.
        </p>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((size) => (
            <button
              key={size}
              onClick={() => handlePreset(size)}
              className={clsx(
                "px-4 py-1.5 rounded text-xs font-mono font-semibold border transition-all",
                tradeSize === size && !isCustom
                  ? "bg-th-accent/15 border-th-accent text-th-accent"
                  : "bg-th-surface border-th-border text-th-secondary hover:border-th-secondary hover:text-th-primary"
              )}
            >
              ${size.toLocaleString()}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={clsx(
              "px-4 py-1.5 rounded text-xs font-mono font-semibold border transition-all",
              isCustom
                ? "bg-th-accent/15 border-th-accent text-th-accent"
                : "bg-th-surface border-th-border text-th-secondary hover:border-th-secondary hover:text-th-primary"
            )}
          >
            Custom
          </button>
        </div>

        {/* Custom input */}
        {isCustom && (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-th-secondary font-mono text-sm">$</span>
              <input
                type="number"
                min={MIN_TRADE}
                max={MAX_TRADE}
                step={100}
                value={customInput}
                onChange={(e) => handleCustomChange(e.target.value)}
                className={clsx(
                  "bg-th-surface rounded px-3 py-1.5 text-sm text-th-primary font-mono w-44 outline-none transition-colors border",
                  inputError
                    ? "border-th-red focus:border-th-red"
                    : "border-th-border focus:border-th-accent"
                )}
                placeholder="Enter amount"
              />
            </div>
            {inputError && (
              <p className="mt-1.5 text-xs text-th-red font-mono">{inputError}</p>
            )}
          </div>
        )}
      </section>

      {/* ── Base currency ── */}
      <section>
        <p className="text-xs font-semibold text-th-secondary font-mono uppercase tracking-wider mb-3">
          Base Currency
        </p>
        <p className="text-xs text-th-dim font-mono mb-3">
          Currency used to denominate profit estimates.
        </p>
        <div className="flex gap-2">
          {CURRENCIES.map((currency) => (
            <button
              key={currency}
              onClick={() => setBaseCurrency(currency)}
              className={clsx(
                "px-5 py-1.5 rounded text-xs font-mono font-semibold border transition-all",
                baseCurrency === currency
                  ? "bg-th-accent/15 border-th-accent text-th-accent"
                  : "bg-th-surface border-th-border text-th-secondary hover:border-th-secondary hover:text-th-primary"
              )}
            >
              {currency}
            </button>
          ))}
        </div>
      </section>

      {/* ── Live preview ── */}
      <section className="bg-th-surface border border-th-border rounded-lg p-5">
        <p className="text-[10px] font-semibold text-th-dim font-mono uppercase tracking-wider mb-3">
          Live Profit Preview
        </p>
        <p className="text-sm text-th-primary font-mono leading-relaxed">
          With a{" "}
          <span className="text-th-accent font-bold">
            ${tradeSize.toLocaleString()} {baseCurrency}
          </span>{" "}
          trade and a{" "}
          <span className="text-th-green font-bold">
            {minNetSpread.toFixed(2)}% net spread
          </span>
          , estimated profit ≈{" "}
          <span className="text-th-yellow font-bold">
            ${estimatedProfit.toFixed(2)} {baseCurrency}
          </span>
        </p>
      </section>

      {/* ── Disclaimer ── */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-th-accent/10 border border-th-accent/25 rounded-lg">
        <ShieldAlertIcon className="h-4 w-4 text-th-accent shrink-0 mt-0.5" />
        <p className="text-xs text-th-accent font-mono leading-relaxed">
          Trade size is used <strong>only</strong> for profit estimation. We never
          execute trades on your behalf or access your exchange accounts or funds.
        </p>
      </div>
    </div>
  );
}
