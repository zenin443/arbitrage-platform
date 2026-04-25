"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { clsx } from "clsx";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { AlertFrequency } from "@/store/useSettingsStore";

const SPREAD_PRESETS = [0.05, 0.1, 0.2, 0.5, 1.0];

const FREQUENCIES: { id: AlertFrequency; label: string }[] = [
  { id: "realtime", label: "Real-time" },
  { id: "1min",     label: "Every 1 min" },
  { id: "5min",     label: "Every 5 min" },
  { id: "15min",    label: "Every 15 min" },
];

// ─── Internal sub-components ─────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
      className={clsx(
        "relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 shrink-0",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-th-accent" : "bg-th-border"
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 mt-0.5",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-th-secondary font-mono uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AlertSettings() {
  const {
    minNetSpread, alertFrequency, alertChannels,
    opportunityTypes, quietHours,
    setMinNetSpread, setAlertFrequency,
    setAlertChannels, setOpportunityTypes, setQuietHours,
  } = useSettingsStore();

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [newListings, setNewListings] = useState(true);
  const [spreadInput, setSpreadInput] = useState(String(minNetSpread));
  const spreadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load config from server on mount
  const loadServerConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/alert-config", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;
      // Sync server config to local store
      if (typeof data.minSpreadPercent === "number") setMinNetSpread(data.minSpreadPercent);
      if (data.alertFrequency) setAlertFrequency(data.alertFrequency as AlertFrequency);
      if (data.enabledTypes) {
        setOpportunityTypes({
          cexCex: data.enabledTypes.cexCex ?? true,
          spotFutures: data.enabledTypes.spotFutures ?? true,
          dexCex: data.enabledTypes.dexCex ?? false,
          triangular: data.enabledTypes.triangular ?? false,
          crossChain: data.enabledTypes.crossChain ?? false,
        });
        setNewListings(data.enabledTypes.newListings ?? true);
      }
      if (data.quietHours) {
        setQuietHours({
          enabled: data.quietHours.enabled ?? false,
          start: data.quietHours.start ?? "22:00",
          end: data.quietHours.end ?? "08:00",
        });
      }
    } catch {
      // Fall back to localStorage values already in the store
    }
  }, [setMinNetSpread, setAlertFrequency, setOpportunityTypes, setQuietHours]);

  useEffect(() => {
    loadServerConfig();
  }, [loadServerConfig]);

  // Sync input display value when server config is loaded
  useEffect(() => {
    setSpreadInput(String(minNetSpread));
  }, [minNetSpread]);

  const handleSpreadInputChange = (val: string) => {
    setSpreadInput(val);
    if (spreadDebounceRef.current) clearTimeout(spreadDebounceRef.current);
    spreadDebounceRef.current = setTimeout(() => {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) setMinNetSpread(num);
    }, 500);
  };

  const handleSpreadPreset = (preset: number) => {
    setSpreadInput(String(preset));
    if (spreadDebounceRef.current) clearTimeout(spreadDebounceRef.current);
    setMinNetSpread(preset);
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    const payload = {
      minSpreadPercent: minNetSpread,
      alertFrequency,
      enabledTypes: {
        cexCex: opportunityTypes.cexCex,
        spotFutures: opportunityTypes.spotFutures,
        dexCex: opportunityTypes.dexCex,
        newListings,
        triangular: opportunityTypes.triangular,
        crossChain: opportunityTypes.crossChain,
      },
      quietHours: {
        enabled: quietHours.enabled,
        start: quietHours.start,
        end: quietHours.end,
        timezone: "UTC",
      },
    };
    try {
      const res = await fetch("/api/alert-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Min net spread ── */}
      <section>
        <SectionTitle>Minimum Net Spread</SectionTitle>
        <p className="text-[11px] text-[#8B949E] font-mono mb-4">
          Set your hunting threshold — only gaps above this % are shown
        </p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            step="0.01"
            min="0"
            value={spreadInput}
            placeholder="0.05"
            onChange={(e) => handleSpreadInputChange(e.target.value)}
            className="bg-[#0D1117] border border-[#21262D] rounded px-3 py-2 text-[#E6EDF3] font-mono text-[14px] w-[120px] focus:outline-none focus:border-[#388BFD] transition-colors"
          />
          <span className="text-[#8B949E] font-mono text-[14px]">%</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {SPREAD_PRESETS.map((preset) => {
            const isActive = parseFloat(spreadInput) === preset;
            return (
              <button
                key={preset}
                onClick={() => handleSpreadPreset(preset)}
                className={clsx(
                  "text-[11px] font-mono px-2.5 py-1 rounded border cursor-pointer transition-all",
                  isActive
                    ? "bg-[#388BFD]/10 border-[#388BFD]/40 text-[#388BFD]"
                    : "border-[#21262D] text-[#8B949E] hover:text-[#388BFD] hover:border-[#388BFD]"
                )}
              >
                {preset}%
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#8B949E] font-mono">
          Opportunities below this spread will be hidden from Intelligence and Alerts
        </p>
      </section>

      {/* ── Alert frequency ── */}
      <section>
        <SectionTitle>Alert Frequency</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.id}
              onClick={() => setAlertFrequency(f.id)}
              className={clsx(
                "px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-all",
                alertFrequency === f.id
                  ? "bg-th-accent/15 border-th-accent text-th-accent"
                  : "bg-th-surface border-th-border text-th-secondary hover:border-th-secondary hover:text-th-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Alert channels ── */}
      <section>
        <SectionTitle>Alert Channels</SectionTitle>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-th-primary font-mono">Web Push</p>
              <p className="text-xs text-th-dim font-mono mt-0.5">
                Receive browser notifications
              </p>
            </div>
            <Toggle
              checked={alertChannels.webPush}
              onChange={(v) => setAlertChannels({ webPush: v })}
            />
          </div>
          <div className="flex items-center justify-between py-2 opacity-50">
            <div>
              <p className="text-sm text-th-primary font-mono flex items-center gap-2">
                Telegram
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262D] text-[#8B949E]">
                  Coming soon
                </span>
              </p>
              <p className="text-xs text-th-dim font-mono mt-0.5">
                Forward signals to your Telegram
              </p>
            </div>
            <Toggle
              checked={false}
              onChange={() => {}}
              disabled={true}
            />
          </div>
        </div>
      </section>

      {/* ── Opportunity types ── */}
      <section>
        <SectionTitle>Opportunity Types</SectionTitle>
        <div className="space-y-2">
          {[
            { key: "cexCex",      label: "CEX-CEX Spot",           checked: opportunityTypes.cexCex,      desc: undefined },
            { key: "spotFutures", label: "Spot-Futures Perpetual",  checked: opportunityTypes.spotFutures, desc: undefined },
            { key: "newListings", label: "New Listings",            checked: newListings,                  desc: "Alert when new tokens are listed" },
            { key: "dexCex",      label: "DEX-CEX",                 checked: opportunityTypes.dexCex,      desc: undefined },
            { key: "triangular",  label: "Triangular",              checked: opportunityTypes.triangular,  desc: "Intra-exchange 3-leg routes" },
            { key: "crossChain",  label: "Cross-Chain",             checked: opportunityTypes.crossChain,  desc: "Same token across different blockchains" },
          ].map(({ key, label, checked, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-th-surface border border-th-border"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-th-primary font-mono">{label}</span>
                {desc && (
                  <span className="text-[11px] text-[#8B949E]">{desc}</span>
                )}
              </div>
              <Toggle
                checked={checked}
                onChange={(v) => {
                  if (key === "newListings") {
                    setNewListings(v);
                  } else {
                    setOpportunityTypes({ [key]: v } as Parameters<typeof setOpportunityTypes>[0]);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Quiet hours ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <SectionTitle>Quiet Hours</SectionTitle>
            <p className="text-xs text-th-dim font-mono -mt-2">
              Suppress all alerts during this time window.
            </p>
          </div>
          <Toggle
            checked={quietHours.enabled}
            onChange={(v) => setQuietHours({ enabled: v })}
          />
        </div>
        {quietHours.enabled && (
          <div className="flex items-center gap-3 mt-3 pl-1">
            <span className="text-xs text-th-secondary font-mono">From</span>
            <input
              type="time"
              value={quietHours.start}
              onChange={(e) => setQuietHours({ start: e.target.value })}
              className="bg-th-surface border border-th-border focus:border-th-accent rounded px-2.5 py-1.5 text-xs text-th-primary font-mono outline-none transition-colors"
            />
            <span className="text-xs text-th-secondary font-mono">to</span>
            <input
              type="time"
              value={quietHours.end}
              onChange={(e) => setQuietHours({ end: e.target.value })}
              className="bg-th-surface border border-th-border focus:border-th-accent rounded px-2.5 py-1.5 text-xs text-th-primary font-mono outline-none transition-colors"
            />
          </div>
        )}
      </section>

      {/* ── Save button ── */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className={clsx(
            "px-5 py-2 rounded text-sm font-mono font-semibold border transition-all",
            saveStatus === "saved"
              ? "bg-[#3FB950]/20 border-[#3FB950] text-[#3FB950]"
              : saveStatus === "error"
              ? "bg-[#F85149]/20 border-[#F85149] text-[#F85149]"
              : "bg-th-accent/15 border-th-accent text-th-accent hover:bg-th-accent/25"
          )}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
            ? "✓ Saved"
            : saveStatus === "error"
            ? "✗ Error"
            : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
