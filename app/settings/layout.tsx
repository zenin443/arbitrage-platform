"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, SettingsIcon, ZapIcon } from "lucide-react";
import { clsx } from "clsx";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-th-bg text-th-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-th-bg border-b border-th-border shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-th-secondary hover:text-th-primary transition-colors text-xs font-mono group"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </Link>
          <span className="text-th-dim select-none">|</span>
          <div className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4 text-th-yellow" />
            <span className="text-sm font-bold tracking-widest uppercase font-mono text-th-primary">
              Arbitrage Terminal
            </span>
          </div>
          <span className="text-th-dim select-none">|</span>
          <div className="flex items-center gap-1.5 text-th-secondary">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-th-secondary">
              Settings
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={clsx(
            "flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold font-mono transition-all duration-200",
            saved
              ? "bg-th-green/20 text-th-green border border-th-green/40"
              : "bg-th-accent hover:bg-th-accent/90 active:bg-th-accent/70 text-white border border-th-accent/80"
          )}
        >
          {saved ? (
            <>
              <CheckIcon className="h-3.5 w-3.5" />
              Saved to device
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
