"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

// ─── Static data ────────────────────────────────────────────────────────────

const ALL_EXCHANGES: { id: string; label: string }[] = [
  { id: "binance", label: "Binance" },
  { id: "bybit", label: "Bybit" },
  { id: "okx", label: "OKX" },
  { id: "kucoin", label: "KuCoin" },
  { id: "gate", label: "Gate.io" },
  { id: "htx", label: "HTX" },
  { id: "mexc", label: "MEXC" },
  { id: "bitget", label: "Bitget" },
  { id: "bingx", label: "BingX" },
  { id: "kraken", label: "Kraken" },
  { id: "bitfinex", label: "Bitfinex" },
  { id: "coinbase", label: "Coinbase" },
];

const ALL_COINS: string[] = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "SHIB", "TRX",
  "LINK", "DOT", "TON", "NEAR", "MATIC", "UNI", "ATOM", "LTC", "BCH", "APT",
  "ICP", "IMX", "FIL", "HBAR", "VET", "ARB", "OP", "INJ", "MKR", "GRT",
  "AAVE", "CRV", "SNX", "COMP", "LDO", "RUNE", "KAVA", "ALGO", "FLOW", "MANA",
  "SAND", "AXS", "THETA", "EOS", "XTZ", "SUI", "TIA", "SEI", "WIF", "PEPE",
];

const SIGNAL_TYPES: { id: string; label: string }[] = [
  { id: "cex_cex", label: "CEX-CEX" },
  { id: "spot_futures", label: "Spot-Futures" },
  { id: "triangular", label: "Triangular" },
  { id: "cross_chain", label: "X-Chain" },
  { id: "stablecoin", label: "Stablecoin" },
  { id: "pairs_trading", label: "Pairs" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-mono font-semibold tracking-widest text-[#8B949E]">
        {title}
      </span>
      {badge && (
        <span className="text-[10px] font-mono text-[#388BFD] bg-[#388BFD]/10 border border-[#388BFD]/30 rounded px-1">
          {badge}
        </span>
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-[#0D1117] border border-[#21262D] text-[#E6EDF3] rounded px-2 py-1 text-[11px] font-mono w-full focus:outline-none focus:border-[#388BFD] placeholder-[#484F58] mb-2"
    />
  );
}

function TerminalCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer group py-[3px] select-none"
    >
      {/* Hidden native checkbox — label click drives this, no other handlers needed */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {/* Visual checkbox — pointer-events-none so only the label fires */}
      <div
        className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors pointer-events-none ${
          checked
            ? "bg-[#388BFD] border-[#388BFD]"
            : "border-[#484F58] bg-transparent group-hover:border-[#388BFD]"
        }`}
      >
        {checked && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3.5 6L6.5 2"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-[11px] font-mono text-[#E6EDF3] group-hover:text-white transition-colors">
        {label}
      </span>
    </label>
  );
}

// ─── Section: Exchanges ──────────────────────────────────────────────────────

function ExchangesSection() {
  const { selectedExchanges, setSelectedExchanges } = useSettingsStore();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      ALL_EXCHANGES.filter((e) =>
        e.label.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const enabledCount =
    selectedExchanges.length === 0
      ? ALL_EXCHANGES.length
      : selectedExchanges.length;

  const badge =
    selectedExchanges.length === 0 ? "ALL" : `${enabledCount}`;

  function isChecked(id: string) {
    return selectedExchanges.length === 0 || selectedExchanges.includes(id);
  }

  function toggle(id: string) {
    const allIds = ALL_EXCHANGES.map((e) => e.id);
    if (selectedExchanges.length === 0) {
      // Currently all enabled — uncheck one means enable all others
      setSelectedExchanges(allIds.filter((e) => e !== id));
    } else {
      const next = selectedExchanges.includes(id)
        ? selectedExchanges.filter((e) => e !== id)
        : [...selectedExchanges, id];
      // If all are selected, collapse back to empty (= all)
      setSelectedExchanges(next.length === allIds.length ? [] : next);
    }
  }

  return (
    <div className="px-3 py-3 border-b border-[#21262D]">
      <SectionHeader title="EXCHANGES" badge={`[${badge}]`} />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search exchanges…"
      />
      <div className="tc-scroll max-h-[140px] overflow-y-auto pr-1">
        {filtered.map((ex) => (
          <TerminalCheckbox
            key={ex.id}
            id={`ex-${ex.id}`}
            label={ex.label}
            checked={isChecked(ex.id)}
            onChange={() => toggle(ex.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-[10px] font-mono text-[#484F58] py-1">No matches</p>
        )}
      </div>
    </div>
  );
}

// ─── Section: Coins ──────────────────────────────────────────────────────────

function CoinsSection() {
  const { selectedCoins, setSelectedCoins } = useSettingsStore();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      ALL_COINS.filter((c) =>
        c.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const enabledCount =
    selectedCoins.length === 0 ? ALL_COINS.length : selectedCoins.length;

  const badge = selectedCoins.length === 0 ? "ALL" : `${enabledCount}`;

  function isChecked(coin: string) {
    return selectedCoins.length === 0 || selectedCoins.includes(coin);
  }

  function toggle(coin: string) {
    if (selectedCoins.length === 0) {
      setSelectedCoins(ALL_COINS.filter((c) => c !== coin));
    } else {
      const next = selectedCoins.includes(coin)
        ? selectedCoins.filter((c) => c !== coin)
        : [...selectedCoins, coin];
      setSelectedCoins(next.length === ALL_COINS.length ? [] : next);
    }
  }

  return (
    <div className="px-3 py-3 border-b border-[#21262D]">
      <SectionHeader title="PAIRS / COINS" badge={`[${badge}]`} />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search coins…"
      />
      <div className="tc-scroll max-h-[160px] overflow-y-auto pr-1">
        {filtered.map((coin) => (
          <TerminalCheckbox
            key={coin}
            id={`coin-${coin}`}
            label={coin}
            checked={isChecked(coin)}
            onChange={() => toggle(coin)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-[10px] font-mono text-[#484F58] py-1">No matches</p>
        )}
      </div>
    </div>
  );
}

// ─── Section: Signal Types ───────────────────────────────────────────────────

function SignalTypesSection() {
  const { selectedTypes, setSelectedTypes } = useSettingsStore();

  function isChecked(id: string) {
    return selectedTypes.length === 0 || selectedTypes.includes(id);
  }

  function toggle(id: string) {
    const allIds = SIGNAL_TYPES.map((t) => t.id);
    if (selectedTypes.length === 0) {
      setSelectedTypes(allIds.filter((t) => t !== id));
    } else {
      const next = selectedTypes.includes(id)
        ? selectedTypes.filter((t) => t !== id)
        : [...selectedTypes, id];
      setSelectedTypes(next.length === allIds.length ? [] : next);
    }
  }

  return (
    <div className="px-3 py-3 border-b border-[#21262D]">
      <SectionHeader title="SIGNAL TYPES" />
      <div>
        {SIGNAL_TYPES.map((type) => (
          <TerminalCheckbox
            key={type.id}
            id={`type-${type.id}`}
            label={type.label}
            checked={isChecked(type.id)}
            onChange={() => toggle(type.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Section: Min Net Spread ─────────────────────────────────────────────────

function MinNetSpreadSection() {
  const { minNetSpread, setMinNetSpread } = useSettingsStore();
  // Local draft for the text input so user can type freely without each keystroke clamping
  const [draft, setDraft] = useState<string>(() => (minNetSpread * 100).toFixed(2));

  // Sync draft when store value changes externally (e.g. Reset to defaults)
  useEffect(() => {
    setDraft((minNetSpread * 100).toFixed(2));
  }, [minNetSpread]);

  const commitDraft = useCallback((raw: string) => {
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      const clamped = Math.min(5, Math.max(0, num));
      setMinNetSpread(clamped / 100);
      setDraft(clamped.toFixed(2));
    } else {
      setDraft((minNetSpread * 100).toFixed(2));
    }
  }, [minNetSpread, setMinNetSpread]);

  return (
    <div className="px-3 py-3 border-b border-[#21262D]">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="MIN NET SPREAD" />
        {/* Editable value input */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commitDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitDraft(draft); }}
            className="w-[48px] bg-[#161B22] border border-[#21262D] text-[#388BFD] font-mono font-semibold text-[11px] text-right rounded px-1 py-0.5 focus:outline-none focus:border-[#388BFD]"
          />
          <span className="text-[11px] font-mono text-[#388BFD] font-semibold">%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={0.05}
        value={minNetSpread * 100}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setMinNetSpread(v / 100);
          setDraft(v.toFixed(2));
        }}
        className="tc-slider w-full cursor-pointer"
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono text-[#484F58]">0%</span>
        <span className="text-[10px] font-mono text-[#484F58]">5%</span>
      </div>
    </div>
  );
}

// ─── Section: Trade Size ─────────────────────────────────────────────────────

function TradeSizeSection() {
  const { tradeSize, setTradeSize } = useSettingsStore();

  return (
    <div className="px-3 py-3 border-b border-[#21262D]">
      <SectionHeader title="TRADE SIZE" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-mono text-[#8B949E]">$</span>
        <input
          type="number"
          min={100}
          max={1000000}
          step={1}
          value={tradeSize}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) setTradeSize(v);
          }}
          className="bg-[#0D1117] border border-[#21262D] text-[#E6EDF3] rounded px-2 py-1 text-[11px] font-mono w-full focus:outline-none focus:border-[#388BFD]"
        />
      </div>
      <p className="text-[10px] font-mono text-[#484F58] mt-1">
        Used for P&amp;L estimates in signal panel
      </p>
    </div>
  );
}

// ─── Section: Min Trade Size ─────────────────────────────────────────────────

function MinTradeSizeSection() {
  const { minTradeSize, setMinTradeSize } = useSettingsStore();

  return (
    <div className="px-3 py-3 border-b border-[#21262D]">
      <SectionHeader title="MIN TRADE SIZE ($)" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-mono text-[#8B949E]">$</span>
        <input
          type="number"
          min={0}
          step={100}
          value={minTradeSize}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) setMinTradeSize(v);
          }}
          className="bg-[#0D1117] border border-[#21262D] text-[#E6EDF3] rounded px-2 py-1 text-[11px] font-mono w-full focus:outline-none focus:border-[#388BFD]"
        />
      </div>
      <p className="text-[10px] font-mono text-[#484F58] mt-1">
        Hide signals below this trade size
      </p>
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function ConfiguratorFooter() {
  const { setSelectedExchanges, setSelectedCoins, setSelectedTypes, setMinNetSpread, setTradeSize, setMinTradeSize } =
    useSettingsStore();

  function handleReset() {
    setSelectedExchanges([]);
    setSelectedCoins([]);
    setSelectedTypes([]);
    setMinNetSpread(0.001);
    setTradeSize(1000);
    setMinTradeSize(100);
  }

  return (
    <div className="px-3 py-3 flex-shrink-0">
      <button
        onClick={handleReset}
        className="w-full text-[11px] font-mono text-[#8B949E] border border-[#21262D] rounded px-3 py-2 hover:border-[#388BFD] hover:text-[#388BFD] transition-colors bg-transparent"
      >
        Reset to defaults
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface TerminalConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TerminalConfigurator({ isOpen, onClose }: TerminalConfiguratorProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-[360px] z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "#0D1117" }}
        role="dialog"
        aria-modal="true"
        aria-label="Terminal Configurator"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-3 flex-shrink-0 border-b"
          style={{ borderColor: "#21262D" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[#388BFD] text-[13px]">⚙</span>
            <span className="text-[11px] font-mono font-semibold tracking-widest text-[#8B949E]">
              TERMINAL CONFIG
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#484F58] hover:text-[#E6EDF3] transition-colors text-[13px] font-mono leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-[#21262D]"
            aria-label="Close configurator"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="tc-scroll flex-1 overflow-y-auto">
          <ExchangesSection />
          <CoinsSection />
          <SignalTypesSection />
          <MinNetSpreadSection />
          <TradeSizeSection />
          <MinTradeSizeSection />
        </div>

        {/* Footer */}
        <ConfiguratorFooter />
      </div>
    </>
  );
}
