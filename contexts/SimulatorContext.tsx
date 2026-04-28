'use client';
/**
 * SimulatorContext — single shared source for /api/simulators data.
 *
 * Purpose: /api/simulators was being fetched by multiple independent components
 * (BotPanel × N, MagnusPage.loadAll, DashboardPage.loadWaterfall) creating
 * duplicate network traffic. This context fetches ONCE per POLL_MS and
 * distributes the array to all consumers.
 *
 * U1: dedup simulators fetches
 * U2: on 401/403 stop polling for the session (reset on login)
 * U4: skip fetch when document is hidden
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';

const POLL_MS = 6_000;

// Minimal shape needed by consumers — extra fields are preserved via index sig
export interface SimBotState {
  id: string;
  totalPnl?: number;
  totalTrades?: number;
  winRate?: number | string;
  capital?: number;
  totalPortfolioValueUsd?: number;
  portfolioValue?: number;
  recentTrades?: Array<{
    symbol?: string;
    netProfit?: number;
    timestamp?: number;
  }>;
  qualityMetrics?: { totalTrades?: number; winRate?: string | number };
  [key: string]: unknown;
}

interface SimulatorContextValue {
  /** Latest parsed array from /api/simulators, never null after first fetch */
  simulators: SimBotState[];
  /** True only during the very first fetch before any data is available */
  initialLoading: boolean;
  /** True if endpoint returned 401/403 — polling is stopped for the session */
  authBlocked: boolean;
}

const SimulatorContext = createContext<SimulatorContextValue>({
  simulators: [],
  initialLoading: true,
  authBlocked: false,
});

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [simulators, setSimulators] = useState<SimBotState[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authBlocked, setAuthBlocked] = useState(false);

  // Refs to avoid stale captures inside interval callback
  const blockedRef = useRef(false);
  const loadedRef  = useRef(false);

  const poll = useCallback(async () => {
    if (blockedRef.current) return;          // U2: permanently stopped on 401/403
    if (typeof document !== 'undefined' && document.hidden) return; // U4: tab invisible

    try {
      const r = await fetch('/api/simulators');
      if (r.status === 401 || r.status === 403) {
        blockedRef.current = true;
        setAuthBlocked(true);
        return;
      }
      if (r.ok) {
        const data: unknown = await r.json();
        if (Array.isArray(data)) {
          setSimulators(data as SimBotState[]);
        }
      }
    } catch {
      /* non-fatal — keep previous values */
    } finally {
      if (!loadedRef.current) {
        loadedRef.current = true;
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void poll();
    const t = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  return (
    <SimulatorContext.Provider value={{ simulators, initialLoading, authBlocked }}>
      {children}
    </SimulatorContext.Provider>
  );
}

/** Use shared /api/simulators data — never triggers a new fetch */
export function useSimulators(): SimulatorContextValue {
  return useContext(SimulatorContext);
}
