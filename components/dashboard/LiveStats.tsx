"use client";

import { useEffect, useState } from "react";
import StatsCard from "./StatsCard";

export default function LiveStats() {
  const [opportunityCount, setOpportunityCount] = useState<number | null>(null);
  const [bestSpread, setBestSpread] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const response = await fetch("/api/opportunities");
        const json = await response.json();
        const opps = Array.isArray(json) ? json : (json.opportunities ?? json.data ?? []);

        if (!active) return;

        setOpportunityCount(opps.length);
        setBestSpread(
          opps.length > 0 ? Math.max(...opps.map((o: { netSpread?: number }) => o.netSpread ?? 0)) : null
        );
      } catch {
        // leave previous values in place on transient errors
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const countDisplay = opportunityCount === null ? "--" : opportunityCount.toString();
  const spreadDisplay =
    bestSpread === null ? "--" : `${bestSpread.toFixed(4)}%`;

  return (
    <>
      <StatsCard
        title="Opportunities Found"
        value={countDisplay}
        subtitle={
          opportunityCount === null
            ? "loading…"
            : opportunityCount === 1
            ? "active signal"
            : "active signals"
        }
        trend={opportunityCount !== null && opportunityCount > 0 ? "up" : "neutral"}
        pulse={opportunityCount !== null && opportunityCount > 0}
      />
      <StatsCard
        title="Best Net Spread"
        value={spreadDisplay}
        subtitle={bestSpread !== null ? "highest net spread" : "No spread detected"}
        trend={bestSpread !== null ? "up" : "neutral"}
        pulse={bestSpread !== null}
      />
    </>
  );
}
