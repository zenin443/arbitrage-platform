import type { ArbitrageOpportunity, PriceTick } from "@/types";
import { connectBinance } from "@/lib/exchanges/binance";
import { connectBybit } from "@/lib/exchanges/bybit";
import { connectOKX } from "@/lib/exchanges/okx";
import { calculateSpread } from "@/lib/engine/spreadCalculator";

const MAX_OPPORTUNITIES = 100;
const EXCHANGE_IDS = ["binance", "bybit", "okx"] as const;

type ExchangeId = (typeof EXCHANGE_IDS)[number];

/**
 * PriceEngine orchestrates all exchange WebSocket connections, maintains an
 * in-memory tick store, runs spread calculations on every incoming tick, and
 * accumulates actionable arbitrage opportunities.
 *
 * Lifecycle:
 *   const engine = new PriceEngine();
 *   engine.start();
 *   // ... later ...
 *   engine.stop();
 *
 * This class is server-side only. Instantiate it in an API route, a server
 * action, or a long-running Node.js process — never in a client component.
 */
export class PriceEngine {
  /** Latest tick per `${exchange}:${symbol}` key */
  private ticks = new Map<string, PriceTick>();

  /** Circular buffer of the last MAX_OPPORTUNITIES opportunities (newest first) */
  private opportunities: ArbitrageOpportunity[] = [];

  /** Cleanup functions returned by each exchange connector */
  private stopFns: Array<() => void> = [];

  private running = false;

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Opens WebSocket connections to all exchanges and starts processing ticks.
   * Idempotent — calling start() on an already-running engine is a no-op.
   */
  start(): void {
    if (this.running) {
      console.warn("[PriceEngine] Already running — ignoring start()");
      return;
    }
    this.running = true;
    console.log("[PriceEngine] Starting — connecting to all exchanges");

    const handleTick = (tick: PriceTick): void => {
      this.upsertTick(tick);
      this.processTick(tick);
    };

    this.stopFns = [
      connectBinance(handleTick),
      connectBybit(handleTick),
      connectOKX(handleTick),
    ];
  }

  /**
   * Closes all exchange connections and clears internal state.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    console.log("[PriceEngine] Stopping — closing all exchange connections");
    this.stopFns.forEach((fn) => fn());
    this.stopFns = [];
  }

  /**
   * Returns a snapshot of all currently held price ticks.
   */
  getPrices(): PriceTick[] {
    return Array.from(this.ticks.values());
  }

  /**
   * Returns the last up-to-100 detected opportunities, newest first.
   */
  getOpportunities(): ArbitrageOpportunity[] {
    return [...this.opportunities];
  }

  /** Whether the engine is currently running */
  get isRunning(): boolean {
    return this.running;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private upsertTick(tick: PriceTick): void {
    this.ticks.set(`${tick.exchangeId}:${tick.symbol}`, tick);
  }

  /**
   * For the updated tick, attempts all directional pairs against every other
   * exchange that has a tick for the same symbol:
   *
   *   updatedExchange → otherExchange  (buy on updated, sell on other)
   *   otherExchange   → updatedExchange  (buy on other, sell on updated)
   */
  private processTick(updatedTick: PriceTick): void {
    const { symbol } = updatedTick;

    const otherExchanges = EXCHANGE_IDS.filter(
      (id) => id !== (updatedTick.exchangeId as ExchangeId)
    );

    for (const otherId of otherExchanges) {
      const otherTick = this.ticks.get(`${otherId}:${symbol}`);
      if (!otherTick) continue;

      // Both directions — either side could be the cheaper buy
      const opp1 = calculateSpread(updatedTick, otherTick, symbol);
      const opp2 = calculateSpread(otherTick, updatedTick, symbol);

      if (opp1) {
        this.pushOpportunity(opp1);
        console.log(
          `[PriceEngine] Opportunity: ${symbol} buy@${opp1.buyExchange} sell@${opp1.sellExchange} ` +
            `net=${opp1.netSpread.toFixed(4)}% profit≈$${opp1.estimatedProfit.toFixed(2)}`
        );
      }
      if (opp2) {
        this.pushOpportunity(opp2);
        console.log(
          `[PriceEngine] Opportunity: ${symbol} buy@${opp2.buyExchange} sell@${opp2.sellExchange} ` +
            `net=${opp2.netSpread.toFixed(4)}% profit≈$${opp2.estimatedProfit.toFixed(2)}`
        );
      }
    }
  }

  /** Prepend opportunity and cap the buffer at MAX_OPPORTUNITIES */
  private pushOpportunity(opp: ArbitrageOpportunity): void {
    this.opportunities = [opp, ...this.opportunities].slice(0, MAX_OPPORTUNITIES);
  }
}

/**
 * Module-level singleton anchored to `globalThis` so that Next.js hot-module
 * replacement in development does not create a fresh instance on every reload.
 * In production each long-lived server process shares the same object.
 */
const _global = globalThis as typeof globalThis & { __priceEngine?: PriceEngine };
if (!_global.__priceEngine) {
  _global.__priceEngine = new PriceEngine();
}
export const priceEngine: PriceEngine = _global.__priceEngine;
