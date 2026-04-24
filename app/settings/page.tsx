"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  ServerIcon,
  CoinsIcon,
  BellIcon,
  DollarSignIcon,
} from "lucide-react";
import ExchangeSelector from "@/components/settings/ExchangeSelector";
import CoinSelector from "@/components/settings/CoinSelector";
import AlertSettings from "@/components/settings/AlertSettings";
import TradeSizeConfig from "@/components/settings/TradeSizeConfig";

type TabId = "exchanges" | "coins" | "alerts" | "tradeSize";

type Tab = {
  id: TabId;
  label: string;
  icon: React.ReactNode;
};

const TABS: Tab[] = [
  {
    id: "exchanges",
    label: "Exchanges",
    icon: <ServerIcon className="h-3.5 w-3.5" />,
  },
  {
    id: "coins",
    label: "Coins",
    icon: <CoinsIcon className="h-3.5 w-3.5" />,
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: <BellIcon className="h-3.5 w-3.5" />,
  },
  {
    id: "tradeSize",
    label: "Trade Size",
    icon: <DollarSignIcon className="h-3.5 w-3.5" />,
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("exchanges");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Tab navigation */}
      <nav className="flex gap-0.5 border-b border-gray-800 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-semibold tracking-wider uppercase transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-blue-500 text-blue-400 bg-blue-950/20"
                : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab panels */}
      <div>
        {activeTab === "exchanges" && <ExchangeSelector />}
        {activeTab === "coins" && <CoinSelector />}
        {activeTab === "alerts" && <AlertSettings />}
        {activeTab === "tradeSize" && <TradeSizeConfig />}
      </div>
    </div>
  );
}
