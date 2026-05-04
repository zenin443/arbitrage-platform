# Terminal Configurator — Design Spec
**Date:** 2026-05-03  
**Status:** Approved  
**Author:** Brainstorming session with user

---

## Problem

The current `/settings` page is a separate route. Users must navigate away from the dashboard to change which exchanges, coins, or signal types they want to see. This breaks the terminal workflow — screener configuration should be instantly accessible without leaving the live feed.

Additionally, `/settings` conflates two unrelated concerns: real-time screener controls (exchange/coin filters, spread threshold) and platform settings (alerts, billing, security).

---

## Solution

Split into two distinct surfaces:

| Surface | Name | Location | Contents |
|---|---|---|---|
| 1 | **Terminal Configurator** | Slide-in overlay on Dashboard | Exchange selector, Coin selector, Signal types, Min spread, Trade size |
| 2 | **Platform Settings** | `/settings` page (renamed nav to "Account") | Alerts, Account, Security, Billing |

---

## Terminal Configurator

### Trigger
- A ⚙ gear icon added to the right side of `AppHeader`, next to the clock and connection status indicator.
- Clicking it toggles `configuratorOpen` state (Zustand or local React state lifted to dashboard).

### Behavior
- Slides in from the **right edge** of the screen as a **fixed-position overlay**.
- Overlays the `SignalInsightPanel` — does not push or compress any other column.
- A semi-transparent dark backdrop (`bg-black/40`) covers only the right pane area behind the panel.
- Clicking the backdrop or ✕ closes the configurator and restores the signal view.
- Width: `360px` — matches `SignalInsightPanel` width for visual consistency.
- All filter changes apply **live** (no Save button) — state persists via `useSettingsStore`.

### Panel Layout (single scrollable column)

```
⚙ TERMINAL CONFIG                          [✕]
────────────────────────────────────────────
EXCHANGES                        [14 active]
  🔍 Search exchanges...
  ☑ Binance   ☑ OKX    ☑ Bybit   ☑ KuCoin
  ☑ Gate.io   ☑ HTX    ☑ MEXC    ☑ Bitget
  ☑ BingX     ☑ Kraken ☑ Bitfinex ...

PAIRS / COINS                       [All]
  🔍 Search coins...
  ☑ BTC  ☑ ETH  ☑ SOL  ☑ BNB  ☑ XRP ...
  (unified list, no grouping)

SIGNAL TYPES
  ☑ CEX-CEX     ☑ Spot-Futures
  ☑ Triangular  ☑ X-Chain
  ☑ Stable      ☑ Pairs

MIN NET SPREAD
  [━━━━━━●━━━━━━] 0.10%
  (range: 0.00% – 5.00%, step 0.05%)

TRADE SIZE
  [$ 1,000 _____________________ ]
  (used for P&L calculations in signal panel)

────────────────────────────────────────────
              [  Reset to defaults  ]
```

### State Management
All configurator state lives in `useSettingsStore` (Zustand, persisted to localStorage):
- `selectedExchanges: string[]` — empty = all exchanges shown
- `selectedCoins: string[]` — empty = all coins shown
- `selectedTypes: string[]` — empty = all types shown
- `minNetSpread: number` — default `0.10`
- `tradeSize: number` — default `1000`
- `showFilledSignals: boolean` — default `false`

`selectedExchanges` and `selectedCoins` set to `[]` means "no filter applied — show all". This is already the current default.

### Wiring to Dashboard
`OpportunityTable` already consumes `selectedExchanges`, `selectedCoins`, and `minNetSpread` from `useSettingsStore`. After this implementation, `selectedTypes` will also be wired so the type filter pills in the table reflect the configurator selection. Trade size flows to `SignalInsightPanel` for P&L.

---

## Platform Settings (`/settings` page)

### Navigation Change
- Nav link label: "Settings" → "Account"
- Route stays `/settings` (no redirect needed)

### Tabs retained (no structural change)
- **Alerts** — min spread threshold for alerts, alert frequency, quiet hours, notification channels (email/browser push — wired in future phase)
- **Account** — profile, display name, email (future)
- **Security** — password change, 2FA, active sessions (future)
- **Billing** — plan, usage limits (disabled/hidden for beta)

### Tabs removed from `/settings`
- Exchange selector → moved to Terminal Configurator
- Coin selector → moved to Terminal Configurator
- Trade size → moved to Terminal Configurator

---

## Implementation Scope

### Files to create
- `components/dashboard/TerminalConfigurator.tsx` — the slide-in panel component

### Files to modify
- `components/AppHeader.tsx` — add ⚙ gear icon with `onOpenConfigurator` prop
- `app/dashboard/page.tsx` — manage `configuratorOpen` state, wire gear icon, render `TerminalConfigurator`
- `store/useSettingsStore.ts` — add `selectedTypes: string[]` with default `[]`
- `components/dashboard/OpportunityTable.tsx` — wire `selectedTypes` filter
- `app/settings/page.tsx` — remove Exchange and Coin tabs, rename page title

### Files untouched
- `SignalInsightPanel.tsx` — no changes needed
- `CoinDetailPanel.tsx` — no changes needed
- `PriceSidebar.tsx` — no changes needed

---

## Non-Goals (explicit exclusions)
- No backend changes — all filtering is client-side
- No user accounts or auth changes in this phase
- Billing and Security tabs are UI placeholders only — no backend wiring
- No mobile layout for the configurator (dashboard is desktop-only)
