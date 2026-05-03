"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AlertFrequency = "realtime" | "1min" | "5min" | "15min";
export type BaseCurrency = "USDT" | "USDC" | "BTC";

type AlertChannels = {
  webPush: boolean;
  telegram: boolean;
};

type OpportunityTypes = {
  cexCex: boolean;
  spotFutures: boolean;
  dexCex: boolean;
  triangular: boolean;
  crossChain: boolean;
};

type QuietHours = {
  enabled: boolean;
  start: string;
  end: string;
};

type SettingsState = {
  selectedExchanges: string[];
  selectedCoins: string[];
  minNetSpread: number;
  alertFrequency: AlertFrequency;
  tradeSize: number;
  baseCurrency: BaseCurrency;
  alertChannels: AlertChannels;
  opportunityTypes: OpportunityTypes;
  quietHours: QuietHours;

  setSelectedExchanges: (exchanges: string[]) => void;
  toggleExchange: (exchange: string) => boolean;
  setSelectedCoins: (coins: string[]) => void;
  toggleCoin: (coin: string) => void;
  setMinNetSpread: (value: number) => void;
  setAlertFrequency: (freq: AlertFrequency) => void;
  setTradeSize: (size: number) => void;
  setBaseCurrency: (currency: BaseCurrency) => void;
  setAlertChannels: (channels: Partial<AlertChannels>) => void;
  setOpportunityTypes: (types: Partial<OpportunityTypes>) => void;
  setQuietHours: (hours: Partial<QuietHours>) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedExchanges: [],
      selectedCoins: [],
      minNetSpread: 0.05,
      alertFrequency: "realtime",
      tradeSize: 1000,
      baseCurrency: "USDT",
      alertChannels: { webPush: false, telegram: false },
      opportunityTypes: {
        cexCex: true,
        spotFutures: true,
        dexCex: false,
        triangular: false,
        crossChain: false,
      },
      quietHours: { enabled: false, start: "23:00", end: "07:00" },

      setSelectedExchanges: (selectedExchanges) => set({ selectedExchanges }),

      toggleExchange: (exchange) => {
        let blocked = false;
        set((state) => {
          const isSelected = state.selectedExchanges.includes(exchange);
          if (isSelected && state.selectedExchanges.length <= 2) {
            blocked = true;
            return state;
          }
          return {
            selectedExchanges: isSelected
              ? state.selectedExchanges.filter((e) => e !== exchange)
              : [...state.selectedExchanges, exchange],
          };
        });
        return !blocked;
      },

      setSelectedCoins: (selectedCoins) => set({ selectedCoins }),

      toggleCoin: (coin) =>
        set((state) => ({
          selectedCoins: state.selectedCoins.includes(coin)
            ? state.selectedCoins.filter((c) => c !== coin)
            : [...state.selectedCoins, coin],
        })),

      setMinNetSpread: (minNetSpread) =>
        set({ minNetSpread: parseFloat(minNetSpread.toFixed(8)) }),

      setAlertFrequency: (alertFrequency) => set({ alertFrequency }),

      setTradeSize: (tradeSize) =>
        set({ tradeSize: parseFloat(tradeSize.toFixed(8)) }),

      setBaseCurrency: (baseCurrency) => set({ baseCurrency }),

      setAlertChannels: (channels) =>
        set((state) => ({
          alertChannels: { ...state.alertChannels, ...channels },
        })),

      setOpportunityTypes: (types) =>
        set((state) => ({
          opportunityTypes: { ...state.opportunityTypes, ...types },
        })),

      setQuietHours: (hours) =>
        set((state) => ({
          quietHours: { ...state.quietHours, ...hours },
        })),
    }),
    {
      name: "arbitrage-settings",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted: unknown, fromVersion: number) => {
        // v1→v2: reset exchange/coin filters to "show all" (empty = no filter)
        if (fromVersion < 2) {
          const state = persisted as Record<string, unknown>;
          return { ...state, selectedExchanges: [], selectedCoins: [] };
        }
        return persisted as SettingsState;
      },
    }
  )
);
