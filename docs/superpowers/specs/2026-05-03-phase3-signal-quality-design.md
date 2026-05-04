# Phase 3 — Signal Quality & Reliability
**Date:** 2026-05-03  
**Status:** Approved for implementation  
**Target purity:** 7.5 / 10

---

## Problem Statement

The arbitrage terminal currently emits 875 signals to the dashboard. Of these:
- 82% are non-profitable at standard exchange fees
- 272 have viable trade sizes under $50 (unexecutable)
- 872 of 875 have no confidence data (lost in the normalizer pipeline)
- The confidence filter pill does nothing for CEX-CEX signals
- `enrichProfitSim` marks signals as profitable when all profit curve points are negative
- Min Net Spread filter had a 100× unit mismatch (fixed 2026-05-03)

A power user applying maximum filters sees 0 signals. Default user sees 18 signals all below $100 viable trade size.

---

## Architecture

```
DETECTION LAYER (unchanged)
├── evaluateCexCex()
├── evaluateSpotFutures()
├── evaluateTriangular()
└── evaluateCrossChain()
        ↓
   activeGaps (Map) — raw, unfiltered
        ↓
QUALITY GATE  ← NEW (signalQualityGate.ts)
├── Rule 1: Fix enrichProfitSim — netProfit > 0 at some trade size
├── Rule 2: isProfitable = true (spread beats exchange fee floor)
├── Rule 3: maxTradeableUsd ≥ $100
├── Rule 4: Deduplication — same symbol+buyExchange → best route only
└── Rule 5: Staleness guard — ticker updated within 30s
        ↓
  qualifiedSignals[] — clean, trustworthy
        ↓
/profitable-gaps endpoint
        ↓
UNIFIED NORMALIZER  ← FIX (pass confidence through)
├── normalizeCexCex — add confidence field
├── normalizeSpotFutures — confidence already present
└── normalizeScoredGap — already correct
        ↓
FRONTEND FILTER (Terminal Configurator)
├── Exchange, Coin, Type filters (unchanged)
├── Confidence pill (now works — data present)
├── Min Net Spread slider (fixed 2026-05-03)
└── Min Trade Size ← NEW control
        ↓
    Dashboard Table
```

---

## Sprint Breakdown

### Sprint 1 — Fix the Confidence Pipeline
**Files:** `app/api/signals/unified/route.ts`  
**Changes:**
- `normalizeCexCex()` — add `confidence: s(raw.confidence) || undefined`
- `normalizeSpotFutures()` — already passes confidence correctly
- No backend changes required

**Impact:** Confidence pill becomes functional for all CEX-CEX signals immediately.

---

### Sprint 2 — Backend Quality Gate
**New file:** `server/services/signalQualityGate.ts`  
**Modified:** `server/services/trading-intelligence.ts` (wire gate into `getProfitableGaps()`)

**Gate rules (in order):**

| Rule | Condition | Action |
|---|---|---|
| Fix enrichProfitSim | `depth.profitCurve.some(p => p.netProfit > 0)` | Replace wrong `isProfitable: depth.profitableSize > 0` |
| Profitability gate | `isProfitable === true` | Block if false |
| Minimum size gate | `maxTradeableUsd >= 100` | Block if below $100 |
| Deduplication | Same `symbol + buyExchange` | Keep highest netSpread route only |
| Staleness guard | Ticker `lastSeenAt` within 30s | Block stale tickers |

**Expected output:** ~30–60 clean signals from current 875.

---

### Sprint 3 — Frontend Min Trade Size Filter
**Files:** `components/dashboard/TerminalConfigurator.tsx`, `store/useSettingsStore.ts`, `components/dashboard/OpportunityTable.tsx`  
**Changes:**
- Add `minTradeSize: number` (default: 100) to Zustand store
- Add numeric input in Terminal Configurator under trade size section
- Add filter in OpportunityTable: `g.maxTradeableUsd >= minTradeSize`

---

## Success Criteria

| Metric | Before | Target |
|---|---|---|
| Total signals emitted | 875 | 30–60 |
| isProfitable accuracy | ~18% real | ~100% real |
| Confidence data present | 3 of 875 | All signals |
| Min viable trade size | $0–$10k mixed | All ≥ $100 |
| Power user filter result | 0 signals | 10–30 signals |
| Signal trust score | 2.5 / 10 | 7.5 / 10 |

---

## Sprints Are Independent

Sprint 1 (normalizer) and Sprint 3 (frontend) touch only frontend/API code.  
Sprint 2 (quality gate) touches only backend server code.  
All three can be built in parallel.
