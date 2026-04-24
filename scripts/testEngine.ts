/**
 * Manual integration test for the PriceEngine.
 *
 * Starts the engine, polls every 3 s for 15 s, then stops cleanly.
 *
 * Usage:
 *   npm run test:engine
 */

import { priceEngine } from "@/lib/engine/priceEngine";
import type { PriceTick, ArbitrageOpportunity } from "@/types";

const POLL_INTERVAL_MS = 3_000;
const RUN_DURATION_MS = 15_000;

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(4)}%`;
}

function fmtTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").replace("Z", "");
}

function printDivider(label: string): void {
  const pad = "─".repeat(Math.max(0, 60 - label.length - 4));
  console.log(`\n┌─ ${label} ${pad}┐`);
}

// ── Snapshot printer ──────────────────────────────────────────────────────────

function printSnapshot(elapsed: number): void {
  const ticks = priceEngine.getPrices();
  const opportunities = priceEngine.getOpportunities();
  const now = fmtTimestamp(Date.now());

  printDivider(`T+${elapsed / 1000}s  ${now}`);

  // ── Live ticks summary ────────────────────────────────────────────────────
  console.log(`│  Live ticks in memory : ${ticks.length}`);

  // ── BTC prices per exchange ────────────────────────────────────────────────
  const btcTicks: PriceTick[] = ticks
    .filter((t) => t.symbol === "BTCUSDT")
    .sort((a, b) => a.exchangeId.localeCompare(b.exchangeId));

  if (btcTicks.length === 0) {
    console.log("│  BTC/USDT             : no data yet — waiting for first ticks…");
  } else {
    console.log("│  BTC/USDT prices:");
    for (const t of btcTicks) {
      const ageMs = Date.now() - t.timestamp;
      console.log(
        `│    ${t.exchangeId.padEnd(8)}  bid: ${fmtPrice(t.bid).padEnd(14)}` +
          `ask: ${fmtPrice(t.ask).padEnd(14)}  age: ${ageMs}ms`
      );
    }
  }

  // ── Arbitrage opportunities ────────────────────────────────────────────────
  if (opportunities.length === 0) {
    console.log("│  Opportunities        : none detected yet");
  } else {
    const displayed: ArbitrageOpportunity[] = opportunities.slice(0, 5);
    console.log(`│  Opportunities (showing ${displayed.length} of ${opportunities.length}):`);
    for (const o of displayed) {
      const dir = `${o.buyExchange} → ${o.sellExchange}`;
      console.log(
        `│    ${o.symbol.padEnd(10)}  ${dir.padEnd(20)}` +
          `net: ${fmtPct(o.netSpread).padEnd(10)}` +
          `profit≈ ${fmtPrice(o.estimatedProfit).padEnd(10)}` +
          `conf: ${o.confidence}`
      );
    }
  }

  console.log("└" + "─".repeat(61));
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║         Arbitrage Platform — Price Engine Test           ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`  Duration   : ${RUN_DURATION_MS / 1000}s`);
console.log(`  Poll every : ${POLL_INTERVAL_MS / 1000}s`);
console.log(`  Exchanges  : Binance, Bybit, OKX`);
console.log(`  Symbols    : BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT`);
console.log("");

priceEngine.start();

let elapsed = 0;

const pollTimer = setInterval(() => {
  elapsed += POLL_INTERVAL_MS;
  printSnapshot(elapsed);

  if (elapsed >= RUN_DURATION_MS) {
    clearInterval(pollTimer);

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  15s complete — stopping engine and exiting cleanly      ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");

    priceEngine.stop();

    // Give in-flight close frames a moment to flush before exiting
    setTimeout(() => process.exit(0), 500);
  }
}, POLL_INTERVAL_MS);

// ── Graceful shutdown on Ctrl-C ───────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n[testEngine] SIGINT received — stopping engine…");
  clearInterval(pollTimer);
  priceEngine.stop();
  setTimeout(() => process.exit(0), 500);
});
