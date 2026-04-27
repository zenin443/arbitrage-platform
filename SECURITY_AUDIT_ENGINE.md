# P2-001 — Security Audit: `lib/engine/` Import Path Lockdown

**Date:** 2026-04-27
**Directive:** SENTINEL (CISO) — Protect proprietary algorithm IP from client bundle exposure
**Status:** IMPLEMENTED — guards active, no violations found

---

## 1. Import Audit Results

### Files in `lib/engine/`

| File | Purpose | Contains IP? |
|---|---|---|
| `lib/engine/spreadCalculator.ts` | Net spread + fee calculation, opportunity construction | **YES** — MIN_NET_SPREAD_PCT, fee model, liquidity scoring formula |
| `lib/engine/opportunityScorer.ts` | Confidence scoring, opportunity ranking | **YES** — scoring weights, confidence tier thresholds |
| `lib/engine/priceEngine.ts` | PriceEngine class (WS orchestrator + tick store) | **YES** — exchange pairing logic, spread invocation |
| `lib/engine/index.ts` | Barrel file (NEW — created by this audit) | Guard only |

### Import Graph: Who imports from `lib/engine/`?

| Importing File | Imports | Context | Risk? |
|---|---|---|---|
| `scripts/testEngine.ts` | `priceEngine` from `@/lib/engine/priceEngine` | CLI test script (Node.js only) | **NONE** — never bundled by webpack |
| `lib/engine/priceEngine.ts` | `calculateSpread` from `@/lib/engine/spreadCalculator` | Internal cross-import | **NONE** — same module |

### Directories scanned with zero `lib/engine` imports found

- `app/` — all pages and API routes: **CLEAN**
- `components/` — all UI components: **CLEAN**
- `hooks/` — `useFeatureGate.ts`, `useFeatureAccess.ts`: **CLEAN**
- `contexts/` — `AuthContext.tsx`: **CLEAN**
- `middleware.ts`: **CLEAN**

> **Conclusion: No client-side imports of `lib/engine/` exist today. No P0 escalation required.**

The word "engine" appears in `app/alerts/page.tsx` and `components/settings/CoinSelector.tsx`
but only as UI display text (e.g. "Alert engine: active"), NOT as import statements.

---

## 2. Guards Implemented

### 2a. Build-time poison pill (`server-only`)

`lib/engine/index.ts` now imports the `server-only` package. If any Client Component
transitively imports from `lib/engine/`, Next.js will **fail the build** with:

```
Error: You're importing a component that imports server-only.
It only works in a Server Component...
```

This is the strongest runtime guard available in the Next.js ecosystem.

### 2b. ESLint `no-restricted-imports` rule

Added to `.eslintrc.json`. Any import matching `**/lib/engine*` or `@/lib/engine*`
will produce an ESLint error with the message:

> SECURITY (P2-001): lib/engine/ contains proprietary algorithm logic (spread
> calculation, scoring, fee models) and MUST NOT be imported in client-side code.
> Use API routes (/api/opportunities, /api/prices) or the WebSocket feed to
> access this data.

The rule is **disabled** for `scripts/**`, `server/**`, and `lib/engine/**` via
ESLint overrides, since those directories legitimately need engine access.

### 2c. Barrel file header comment

`lib/engine/index.ts` contains a prominent multi-line warning block visible to
any developer who opens the file.

---

## 3. `next.config.mjs` Exposure Check

| Check | Result |
|---|---|
| `env:` block exposing algorithm constants | **NOT FOUND** — no `env` key in config |
| `NEXT_PUBLIC_*` variables referencing spread/fee/score values | **NOT FOUND** — no NEXT_PUBLIC vars in config or `.env` files |
| `publicRuntimeConfig` | **NOT FOUND** |

The `next.config.mjs` only contains: webpack cache config, CSP headers, and
security headers. **No algorithm constants are exposed to the client.**

---

## 4. Relocation Recommendation for `lib/engine/`

### Comparison: `lib/engine/` vs `server/engine/`

| Aspect | `lib/engine/` (3 files) | `server/engine/` (6+ files) |
|---|---|---|
| spreadCalculator | Simplified: single-pair, uses `lib/utils/feeData` | Production: multi-pair via TickStore, network-aware fees, MAX_REASONABLE_SPREAD guard, fee audit logging |
| opportunityScorer | 3-factor (spread, liquidity, freshness) | 3-factor (spread, liquidity, transfer speed) + confidence tier assignment |
| priceEngine | Full WS orchestration class | N/A (orchestration is in `priceServer.ts`) |
| Additional modules | — | `tickStore`, `dexTickStore`, `futuresTickStore`, `cexDexCalculator`, `spotFuturesCalculator`, `fundingRateTracker` |
| Import consumers | Only `scripts/testEngine.ts` | `server/priceServer.ts`, `server/services/alert-engine.ts` |

### Recommendation: **(B) — Move to `server/engine-lib/` or `server/tools/`**

Rationale:
1. **`lib/engine/` is a diverged subset of `server/engine/`** — the two implementations
   share the same concepts but have different fee models, different scoring weights,
   and different validation guards. This creates maintenance risk: a fix to production
   (`server/engine/`) may not be backported to `lib/engine/`.

2. **Physical separation is defense-in-depth.** While the `server-only` import and
   ESLint rule are strong guards, moving the directory outside the Next.js app boundary
   (e.g. to `server/engine-lib/`) eliminates the *possibility* of accidental client
   bundling, rather than just *detecting* it.

3. **The only consumer is `scripts/testEngine.ts`**, which can trivially be updated to
   import from a new path.

4. **Do NOT delete `lib/engine/`** — it may serve a purpose for rapid prototyping or
   as a simpler reference implementation. But it should live outside the `lib/` directory
   to avoid ambiguity about what is client-safe.

If the team decides to keep `lib/engine/` in place (option A), the guards implemented
by this audit are sufficient for the current risk level.

---

## 5. Action Items for Human Review

- [ ] Confirm the team is aware of the two parallel engine implementations
- [ ] Decide on relocation (recommendation B) vs keep-in-place (option A)
- [ ] Consider adding a CI check that greps for `lib/engine` imports in PRs touching `app/` or `components/`
- [ ] Schedule periodic audit of client bundle contents (`npx @next/bundle-analyzer`)

---

*Audit performed under P2-001 security directive. No algorithm logic was modified.*
