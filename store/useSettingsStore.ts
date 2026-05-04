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
  selectedTypes: string[];
  minNetSpread: number;
  alertFrequency: AlertFrequency;
  tradeSize: number;
  baseCurrency: BaseCurrency;
  alertChannels: AlertChannels;
  opportunityTypes: OpportunityTypes;
  quietHours: QuietHours;
  showFilledSignals: boolean;
  minTradeSize: number;

  setSelectedExchanges: (exchanges: string[]) => void;
  toggleExchange: (exchange: string) => boolean;
  setSelectedCoins: (coins: string[]) => void;
  toggleCoin: (coin: string) => void;
  setSelectedTypes: (types: string[]) => void;
  setMinNetSpread: (value: number) => void;
  setAlertFrequency: (freq: AlertFrequency) => void;
  setTradeSize: (size: number) => void;
  setBaseCurrency: (currency: BaseCurrency) => void;
  setAlertChannels: (channels: Partial<AlertChannels>) => void;
  setOpportunityTypes: (types: Partial<OpportunityTypes>) => void;
  setQuietHours: (hours: Partial<QuietHours>) => void;
  setShowFilledSignals: (v: boolean) => void;
  setMinTradeSize: (v: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedExchanges: [],
      selectedCoins: [],
      selectedTypes: [],
      minNetSpread: 0.001,
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
      showFilledSignals: false,
      minTradeSize: 100,

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

      setSelectedTypes: (selectedTypes) => set({ selectedTypes }),

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

      setShowFilledSignals: (showFilledSignals) => set({ showFilledSignals }),

      setMinTradeSize: (minTradeSize) => set({ minTradeSize }),
    }),
    {
      name: "arbitrage-settings",
      storage: createJSONStorage(() => localStorage),
      version: 6,
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Record<string, unknown>;
        if (fromVersion < 2) {
          return { ...state, selectedExchanges: [], selectedCoins: [], showFilledSignals: false };
        }
        if (fromVersion < 3) {
          return { ...state, showFilledSignals: false };
        }
        if (fromVersion < 4) {
          return { ...state, selectedTypes: [] };
        }
        if (fromVersion < 5) {
          // Reset minNetSpread — old sessions stored raw slider values (0–5) instead of
          // the divided form (0–0.05), causing the filter to block all signals.
          return { ...state, minNetSpread: 0.001 };
        }
        if (fromVersion < 6) {
          return { ...state, minTradeSize: 100 };
        }
        return persisted as SettingsState;
      },
    }
  )
);
