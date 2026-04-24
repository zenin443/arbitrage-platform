"use client";

import { create } from "zustand";
import type { ArbitrageOpportunity, PriceTick, AlertConfig } from "@/types";

interface ArbitrageState {
  opportunities: ArbitrageOpportunity[];
  latestTicks: PriceTick[];
  alertConfig: AlertConfig | null;
  isConnected: boolean;

  setOpportunities: (opportunities: ArbitrageOpportunity[]) => void;
  addOpportunity: (opportunity: ArbitrageOpportunity) => void;
  setLatestTicks: (ticks: PriceTick[]) => void;
  upsertTick: (tick: PriceTick) => void;
  setAlertConfig: (config: AlertConfig) => void;
  setConnected: (connected: boolean) => void;
  clearOpportunities: () => void;
}

export const useArbitrageStore = create<ArbitrageState>((set) => ({
  opportunities: [],
  latestTicks: [],
  alertConfig: null,
  isConnected: false,

  setOpportunities: (opportunities) => set({ opportunities }),

  addOpportunity: (opportunity) =>
    set((state) => ({
      opportunities: [opportunity, ...state.opportunities].slice(0, 100),
    })),

  setLatestTicks: (ticks) => set({ latestTicks: ticks }),

  upsertTick: (tick) =>
    set((state) => {
      const existing = state.latestTicks.findIndex(
        (t) => t.exchangeId === tick.exchangeId && t.symbol === tick.symbol
      );
      if (existing >= 0) {
        const updated = [...state.latestTicks];
        updated[existing] = tick;
        return { latestTicks: updated };
      }
      return { latestTicks: [...state.latestTicks, tick] };
    }),

  setAlertConfig: (alertConfig) => set({ alertConfig }),

  setConnected: (isConnected) => set({ isConnected }),

  clearOpportunities: () => set({ opportunities: [] }),
}));
