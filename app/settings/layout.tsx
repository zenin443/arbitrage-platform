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
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-950 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-200 transition-colors text-xs font-mono group"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </Link>
          <span className="text-gray-800 select-none">|</span>
          <div className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-bold tracking-widest uppercase font-mono text-gray-100">
              Arbitrage Terminal
            </span>
          </div>
          <span className="text-gray-800 select-none">|</span>
          <div className="flex items-center gap-1.5 text-gray-400">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-gray-400">
              Settings
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={clsx(
            "flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold font-mono transition-all duration-200",
            saved
              ? "bg-green-900/60 text-green-300 border border-green-700"
              : "bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white border border-blue-600"
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
