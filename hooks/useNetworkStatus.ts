"use client";

import { useState, useEffect, useCallback } from "react";

interface NetworkEntry {
  network: string;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  withdrawFee: number;
  minWithdraw: number;
  estimatedTime: number;
}

interface CoinStatus {
  coin: string;
  networks: NetworkEntry[];
  lastUpdated: number;
}

// exchangeId -> list of coin statuses
type NetworkStatusMap = Record<string, CoinStatus[]>;

export type RouteStatus = "ok" | "blocked" | "unknown";

export interface SignalRouteStatus {
  status: RouteStatus;
  reason?: string;
}

function checkRoute(
  map: NetworkStatusMap,
  buyExchange: string,
  sellExchange: string,
  coin: string
): SignalRouteStatus {
  const fromList = map[buyExchange];
  const toList = map[sellExchange];

  if (!fromList || !toList) return { status: "unknown" };

  const STALE_MS = 10 * 60 * 1000;
  const now = Date.now();

  const fromCoin = fromList.find(c => c.coin === coin);
  const toCoin = toList.find(c => c.coin === coin);

  if (!fromCoin || !toCoin) return { status: "unknown" };
  if (now - fromCoin.lastUpdated > STALE_MS || now - toCoin.lastUpdated > STALE_MS) {
    return { status: "unknown" };
  }

  // Find any network where withdrawal from buy exchange AND deposit to sell exchange are both open
  for (const fromNet of fromCoin.networks) {
    if (!fromNet.withdrawEnabled) continue;
    const toNet = toCoin.networks.find(n => n.network === fromNet.network);
    if (toNet && toNet.depositEnabled) {
      return { status: "ok" };
    }
  }

  // We have data for both sides but no open route
  const withdrawBlocked = fromCoin.networks.every(n => !n.withdrawEnabled);
  const depositBlocked = toCoin.networks.every(n => !n.depositEnabled);

  if (withdrawBlocked && depositBlocked) {
    return { status: "blocked", reason: `Withdrawals on ${buyExchange} and deposits on ${sellExchange} suspended` };
  }
  if (withdrawBlocked) {
    return { status: "blocked", reason: `Withdrawals suspended on ${buyExchange}` };
  }
  if (depositBlocked) {
    return { status: "blocked", reason: `Deposits suspended on ${sellExchange}` };
  }

  return { status: "blocked", reason: "No common open transfer network" };
}

export function useNetworkStatus() {
  const [statusMap, setStatusMap] = useState<NetworkStatusMap>({});
  const [lastFetched, setLastFetched] = useState<number>(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/network-status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as NetworkStatusMap;
      setStatusMap(data);
      setLastFetched(Date.now());
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    refresh();
    // Refresh every 5 minutes — matches backend cache refresh rate
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const getRouteStatus = useCallback((
    buyExchange: string,
    sellExchange: string,
    coin: string
  ): SignalRouteStatus => {
    if (Object.keys(statusMap).length === 0) return { status: "unknown" };
    return checkRoute(statusMap, buyExchange, sellExchange, coin);
  }, [statusMap]);

  return { getRouteStatus, lastFetched };
}
