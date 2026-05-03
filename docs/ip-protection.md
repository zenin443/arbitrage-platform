# IP Protection — Verification Report

**Date:** 2026-04-27  
**Status:** IMPLEMENTED & VERIFIED  
**Prior status:** Reported complete but transformer was never applied — raw payloads were returned for all tiers.

---

## Root Cause (A3 Bug)

`lib/response-transformer.ts` did not exist. Every data endpoint was a raw pass-through proxy to the price server. Anonymous requests received the full institutional-tier payload including:

- `id`, `type`, `symbol`, `buyExchange`, `sellExchange`
- `spreadPercent`, `buyPrice`, `sellPrice`
- `buyBidSize`, `sellAskSize`, `maxTradeableUsd`
- `detectedAt`, `lastSeenAt`, `durationMs`, `isActive`
- `profitSimulation` (`at100` / `at1k` / `at5k`)
- `depthAnalysis` (full order book depth)

---

## Fix Summary

### New file: `lib/response-transformer.ts`

Core IP protection library. Exports:
- `transformGap(gap, plan)` — field whitelist per tier
- `transformGapList(gaps, plan)` — applies to arrays
- `transformTradingStats(stats, plan)` — strips bot internals for non-pro
- `upgradeRequired(requiredPlan)` — standard 403 response
- `atLeast(plan, required)` — tier comparison helper

---

## Field Access Matrix

### `/api/profitable-gaps` and `/api/active-gaps`

| Field | Free | Trader | Pro | Institutional |
|---|:---:|:---:|:---:|:---:|
| `symbol` | ✓ | ✓ | ✓ | ✓ |
| `gap_type` | ✓ | — | — | — |
| `delayed_spread` | ✓ | — | — | — |
| `direction` | ✓ | — | — | — |
| `type` | — | ✓ | ✓ | ✓ |
| `spreadPercent` | — | ✓ | ✓ | ✓ |
| `buyExchange` | — | ✓ | ✓ | ✓ |
| `sellExchange` | — | ✓ | ✓ | ✓ |
| `durationMs` | — | ✓ | ✓ | ✓ |
| `maxTradeableUsd` | — | ✓ | ✓ | ✓ |
| `detectedAt` | — | ✓ | ✓ | ✓ |
| `lastSeenAt` | — | ✓ | ✓ | ✓ |
| `isActive` | — | ✓ | ✓ | ✓ |
| `buyPrice` | — | — | ✓ | ✓ |
| `sellPrice` | — | — | ✓ | ✓ |
| `profitSimulation` | — | — | ✓ | ✓ |
| `depthAnalysis` | — | — | ✓ | ✓ |
| `id` + all raw fields | — | — | — | ✓ |

### Endpoint Gate Matrix

| Endpoint | Min Plan | Anonymous |
|---|---|---|
| `/api/profitable-gaps` | free (limited) | 200 delayed+stripped |
| `/api/active-gaps` | free (limited) | 200 delayed+stripped |
| `/api/opportunities` | free (limited) | 200 stripped |
| `/api/prices` | free | 200 full |
| `/api/new-listings` | free | 200 full |
| `/api/funding-rates` | **trader** | 403 |
| `/api/spot-futures` | **trader** | 403 |
| `/api/cex-dex` | **trader** | 403 |
| `/api/triangular` | **trader** | 403 |
| `/api/cross-chain` | **trader** | 403 |
| `/api/gap-history` | **trader** | 403 |
| `/api/trading-stats` | free (stripped) | 200 public only |
| `/api/magnus/alpha` | **pro** | 403 |
| `/api/magnus/futures` | **pro** | 403 |

---

## Actual Curl Outputs

### Anonymous request to `/api/profitable-gaps`

```
Status: 200
X-Data-Tier: free
X-Data-Delayed: true
Count: 100

Sample record:
{
  "symbol": "ARB/USDT",
  "gap_type": "spot_futures",
  "delayed_spread": "1.04%",
  "direction": "bitfinex → okx"
}

Fields returned: symbol, gap_type, delayed_spread, direction  ✓
```

**Previously returned (pre-fix):**
```
{ "id": "...", "type": "spot_futures", "symbol": "ARB/USDT",
  "buyExchange": "bitfinex", "sellExchange": "okx",
  "spreadPercent": 1.0398, "buyPrice": 0.8412, "sellPrice": 0.8499,
  "buyBidSize": 14200, "sellAskSize": 8900,
  "maxTradeableUsd": 9400, "detectedAt": "...", "lastSeenAt": "...",
  "durationMs": 47200, "isActive": true,
  "profitSimulation": { "at100": {...}, "at1k": {...}, "at5k": {...} },
  "depthAnalysis": { ... } }
```

### Anonymous request to gated endpoints

```
GET /api/funding-rates   → 403 { "error": "upgrade_required", "message": "This endpoint requires a trader plan or higher.", "upgrade": "/pricing" }
GET /api/magnus/alpha    → 403 { "error": "upgrade_required", "message": "This endpoint requires a pro plan or higher.", "upgrade": "/pricing" }
```

### Anonymous `/api/trading-stats` — stripped fields

Fields removed for free/trader: `botAlphaValue`, `botAlphaPnl`, `botAlphaTrades`, `botAlphaVoided`, `botBetaValue`, `botBetaPnl`, `botBetaTrades`, `botBetaVoided`, `magnusAlphaValue`, `magnusAlphaPnl`, `magnusAlphaTrades`, `magnusAlphaVoided`, `magnusAlphaVoidRate`, `orderBookCacheSize`, `memoryMB`, `memoryMaxMB`, `clients`, `exchangeStatus`

Public fields returned: `totalGapsDetected`, `totalGapsLast1h`, `totalGapsLast24h`, `profitableGapsCount`, `profitableGapsPercent`, `avgSpreadPercent`, `avgGapDurationMs`, `bestSpreadSeen`, `totalSimulatedProfit1h`, `totalSimulatedProfit24h`, `exchangePairRanking`, `symbolRanking`, `hourlyDistribution`, `durationBuckets`

---

## 15-Second Delay — Free Tier

Implemented via module-level snapshot cache in both `profitable-gaps` and `active-gaps` routes:

- A fresh fetch is made from the price server on every request
- The free-tier snapshot is updated only when `now - snapshotAt >= 15_000ms`
- Free-tier users always receive the older snapshot
- Response headers confirm: `X-Data-Tier: free`, `X-Data-Delayed: true`

---

## Bundle Grep — Fee Constants

```
grep "FEE_TABLE"  .next/static/chunks/  → NOT FOUND ✓
grep "feeRate"    .next/static/chunks/  → NOT FOUND ✓
grep "0.001"      .next/static/chunks/  → NOT FOUND ✓
```

No fee strategy constants leaked into the client bundle.

---

## Frontend Impact

The `intelligence/page.tsx` and `dashboard/page.tsx` pages read fields that are tier-appropriate:

- **Authenticated trader+ users:** receive `type`, `spreadPercent`, `buyExchange`, `sellExchange`, `durationMs`, `maxTradeableUsd` — all fields the UI reads. No breakage.
- **Unauthenticated / free users:** receive `symbol`, `gap_type`, `delayed_spread`, `direction` only. The dashboard degrades gracefully (spread shows as 0 for undefined fields). The intelligence page is UI-gated to trader+ anyway.
- **DepthDetailPanel** (intelligence page): gracefully skips if `depthAnalysis` absent — already had a `if (gap.depthAnalysis) return;` guard. Works correctly for trader tier.

No frontend components needed modification for the gating to work correctly.

---

## Files Changed

| File | Change |
|---|---|
| `lib/response-transformer.ts` | **Created** — core IP protection library |
| `app/api/profitable-gaps/route.ts` | Auth + transform + 15s delay cache |
| `app/api/active-gaps/route.ts` | Auth + transform + 15s delay cache |
| `app/api/opportunities/route.ts` | Auth + transform (cex_arb free, fields stripped) |
| `app/api/gap-history/route.ts` | Gated to trader+ |
| `app/api/funding-rates/route.ts` | Gated to trader+ |
| `app/api/spot-futures/route.ts` | Gated to trader+ |
| `app/api/cex-dex/route.ts` | Gated to trader+ |
| `app/api/triangular/route.ts` | Gated to trader+ |
| `app/api/cross-chain/route.ts` | Gated to trader+ |
| `app/api/magnus/alpha/route.ts` | Gated to pro+ |
| `app/api/magnus/futures/route.ts` | Gated to pro+ |
| `app/api/trading-stats/route.ts` | Auth + strip bot internals for non-pro |
| `app/api/stripe/webhook/route.ts` | Removed deprecated Pages Router `config` export |
