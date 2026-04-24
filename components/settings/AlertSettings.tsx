"use client";

import { clsx } from "clsx";
import { LockIcon, ExternalLinkIcon } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { AlertFrequency } from "@/store/useSettingsStore";
import Badge from "@/components/ui/Badge";

const IS_PRO = false;

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

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Min net spread ── */}
      <section>
        <SectionTitle>Minimum Net Spread</SectionTitle>
        <p className="text-xs text-th-dim font-mono mb-4">
          Hide opportunities below this net spread threshold (after all fees).
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0.05}
            max={5}
            step={0.05}
            value={minNetSpread}
            onChange={(e) => setMinNetSpread(parseFloat(e.target.value))}
            className="flex-1 accent-th-accent cursor-pointer"
          />
          <span className="text-sm font-mono font-bold text-th-accent w-14 text-right tabular-nums">
            {minNetSpread.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-th-dim font-mono mt-1">
          <span>0.05%</span>
          <span>5.0%</span>
        </div>
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
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-th-primary font-mono">Telegram</p>
              <p className="text-xs text-th-dim font-mono mt-0.5">
                Forward signals to your Telegram
              </p>
            </div>
            <Toggle
              checked={alertChannels.telegram}
              onChange={(v) => setAlertChannels({ telegram: v })}
            />
          </div>
          {alertChannels.telegram && (
            <a
              href="https://t.me/ArbitrageTerminalBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-th-accent font-mono hover:underline pl-0.5"
            >
              <ExternalLinkIcon className="h-3 w-3 shrink-0" />
              Open @ArbitrageTerminalBot and send /start to connect
            </a>
          )}
        </div>
      </section>

      {/* ── Opportunity types ── */}
      <section>
        <SectionTitle>Opportunity Types</SectionTitle>
        <div className="space-y-2">
          {[
            { key: "cexCex",      label: "CEX-CEX Spot",           checked: opportunityTypes.cexCex,      plan: undefined, locked: false },
            { key: "spotFutures", label: "Spot-Futures Perpetual",  checked: opportunityTypes.spotFutures, plan: undefined, locked: false },
            { key: "dexCex",      label: "DEX-CEX",                 checked: opportunityTypes.dexCex,      plan: "Pro",     locked: !IS_PRO },
            { key: "triangular",  label: "Triangular",              checked: opportunityTypes.triangular,  plan: "Elite",   locked: !IS_PRO },
          ].map(({ key, label, checked, plan, locked }) => (
            <div
              key={key}
              className={clsx(
                "flex items-center justify-between px-4 py-3 rounded-lg bg-th-surface border border-th-border",
                locked && "opacity-60"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-th-primary font-mono">{label}</span>
                {locked && plan && <Badge variant="warning">{plan} Plan</Badge>}
                {locked && <LockIcon className="h-3 w-3 text-th-yellow" />}
              </div>
              <Toggle
                checked={locked ? false : checked}
                onChange={(v) =>
                  setOpportunityTypes({ [key]: v } as Parameters<typeof setOpportunityTypes>[0])
                }
                disabled={locked}
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
    </div>
  );
}
