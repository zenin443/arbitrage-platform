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
        <p className="text-xs font-semibold text-gray-500 font-mono uppercase tracking-wider mb-1">
          Trade Size
        </p>
        <p className="text-xs text-gray-600 font-mono mb-4">
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
                  ? "bg-blue-900/50 border-blue-600 text-blue-300"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
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
                ? "bg-blue-900/50 border-blue-600 text-blue-300"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
            )}
          >
            Custom
          </button>
        </div>

        {/* Custom input */}
        {isCustom && (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-mono text-sm">$</span>
              <input
                type="number"
                min={MIN_TRADE}
                max={MAX_TRADE}
                step={100}
                value={customInput}
                onChange={(e) => handleCustomChange(e.target.value)}
                className={clsx(
                  "bg-gray-900 rounded px-3 py-1.5 text-sm text-gray-200 font-mono w-44 outline-none transition-colors border",
                  inputError
                    ? "border-red-600 focus:border-red-500"
                    : "border-gray-700 focus:border-blue-500"
                )}
                placeholder="Enter amount"
              />
            </div>
            {inputError && (
              <p className="mt-1.5 text-xs text-red-400 font-mono">{inputError}</p>
            )}
          </div>
        )}
      </section>

      {/* ── Base currency ── */}
      <section>
        <p className="text-xs font-semibold text-gray-500 font-mono uppercase tracking-wider mb-3">
          Base Currency
        </p>
        <p className="text-xs text-gray-600 font-mono mb-3">
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
                  ? "bg-blue-900/50 border-blue-600 text-blue-300"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
              )}
            >
              {currency}
            </button>
          ))}
        </div>
      </section>

      {/* ── Live preview ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <p className="text-[10px] font-semibold text-gray-600 font-mono uppercase tracking-wider mb-3">
          Live Profit Preview
        </p>
        <p className="text-sm text-gray-200 font-mono leading-relaxed">
          With a{" "}
          <span className="text-blue-400 font-bold">
            ${tradeSize.toLocaleString()} {baseCurrency}
          </span>{" "}
          trade and a{" "}
          <span className="text-green-400 font-bold">
            {minNetSpread.toFixed(2)}% net spread
          </span>
          , estimated profit ≈{" "}
          <span className="text-yellow-400 font-bold">
            ${estimatedProfit.toFixed(2)} {baseCurrency}
          </span>
        </p>
      </section>

      {/* ── Disclaimer ── */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-950/30 border border-blue-900/50 rounded-lg">
        <ShieldAlertIcon className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300 font-mono leading-relaxed">
          Trade size is used <strong>only</strong> for profit estimation. We never
          execute trades on your behalf or access your exchange accounts or funds.
        </p>
      </div>
    </div>
  );
}
