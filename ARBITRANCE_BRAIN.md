# ARBITRANCE — PROJECT BRAIN
## Master Context Document for Cursor
## Keep this loaded at all times
## Last updated: April 28, 2026 | Maintained by Burac (CTO)

---

## WHAT IS ARBITRANCE

Real-time crypto arbitrage intelligence terminal.
Monitors 18 CEX + 3 futures + 3 DEX exchanges simultaneously.
Detects price gaps across markets. Calculates net-of-fees profitability.
Magnus AI runs 15 strategies across 9 paper trading bots.
Business model: Subscriptions + Ads + Exchange referrals + API (future).
Status: Pre-launch. Auth and payments built. No public users yet.

---

## TECH STACK

```
Frontend:   Next.js 14, React 18, TypeScript strict, Tailwind CSS, shadcn/ui
Backend:    Node.js HTTP server (port 3001), WebSocket price feeds (port 3002)
Database:   PostgreSQL (users, subscriptions, sessions, referrals, ad_slots)
Auth:       JWT (access 15min + refresh 7d in httpOnly cookies)
Payments:   Stripe (wired — checkout 404 pending fix)
Web3:       MetaMask SDK + WalletConnect (partial)
Infra:      Vultr VPS prod (45.32.103.174) + Hetzner VPS dev (178.105.40.21)
Version:    v0.8.0
```

---

## FILE STRUCTURE (critical paths)

```
arbitrage-platform/
├── app/                        ← Next.js pages (FRONTEND — browser)
│   ├── dashboard/page.tsx      ← Main screener (live arb signals)
│   ├── intelligence/page.tsx   ← Deep analysis (heatmap, widgets, gaps)
│   ├── magnus/page.tsx         ← Quant command center (9 bots)
│   ├── pricing/page.tsx        ← 5 tiers: Free/$29/$99/$249/$999
│   ├── login/page.tsx          ← Email + wallet auth
│   ├── signup/page.tsx         ← Registration
│   ├── account/page.tsx        ← Protected — plan + settings
│   ├── live/page.tsx           ← PUBLIC gap feed (PENDING — build this)
│   ├── funding-rates/page.tsx  ← Funding rate arbitrage
│   └── dex-markets/page.tsx    ← Placeholder "Coming in v0.8"
│
├── server/                     ← Backend (SERVER-SIDE ONLY — never import in app/)
│   ├── adapters/
│   │   ├── cex/                ← 18 CEX adapters (binance, bybit, okx etc)
│   │   ├── futures/            ← 3 futures adapters
│   │   └── dex/                ← jupiter, uniswap, hyperliquid
│   ├── engine/                 ← CORE IP — gap detection algorithms
│   │   ├── tickStore.ts        ← Price tick storage
│   │   ├── spreadCalculator.ts ← CEX-CEX gap detection
│   │   ├── cexDexCalculator.ts ← DEX-CEX gap detection
│   │   ├── spotFuturesCalculator.ts
│   │   ├── signalScorer.ts     ← 6-dimension 0-100 score + Kelly sizing
│   │   ├── twapEngine.ts       ← TWAP deviation signal
│   │   └── orderbookPressure.ts← Bid/ask imbalance predictor
│   ├── engines/                ← Strategy-specific engines (CORE IP)
│   │   ├── triangularArbitrage.ts
│   │   ├── pairsTradingEngine.ts
│   │   ├── liquidationEngine.ts
│   │   ├── calendarSpreadEngine.ts
│   │   ├── newListingEngine.ts
│   │   ├── stablecoinArbitrage.ts
│   │   ├── wrappedTokenEngine.ts
│   │   └── crossChainArbitrage.ts
│   ├── services/
│   │   ├── paper-trader.ts     ← 9 bots (3,500+ lines — split pending)
│   │   └── trading-intelligence.ts
│   ├── registry/
│   │   └── exchangeRegistry.ts ← Fee tables (SERVER ONLY — never expose)
│   ├── config/
│   │   └── symbols.ts          ← 128 symbols (USDT/USDC/BTC/ETH)
│   └── priceServer.ts          ← HTTP server + startup
│
├── components/magnus/          ← Magnus UI components (already built)
│   ├── SignalScoreGauge.tsx     ← Radial gauge 0-100
│   ├── AlgoExplainerCard.tsx   ← Collapsible strategy explainer
│   ├── SignalHeatmap.tsx        ← Exchange × Strategy grid
│   └── StrategyPnlWaterfall.tsx← Per-bot PnL bars
│
├── lib/
│   ├── auth/                   ← Auth utilities (server-side)
│   ├── magnus/
│   │   └── botRegistry.ts      ← Bot metadata (IN PROGRESS — Task 1)
│   └── config.ts               ← Environment config validation
│
├── migrations/                 ← PostgreSQL migrations
├── .cursorrules                ← SENTINEL security rules (always active)
└── .env.local                  ← Secrets (NEVER commit)
```

---

## THE 9 MAGNUS BOTS (codenames approved by CTO)

| # | Internal ID | Codename | Capital | Primary Strategy | Win Rate |
|---|-------------|----------|---------|------------------|----------|
| 1 | magnusBeta1k | VEGA | $1K | CEX-CEX Spot + TWAP | 94%+ |
| 2 | magnusBeta10k | NEXUS | $10K | CEX-CEX + Triangular | 94%+ |
| 3 | magnusAlpha | HERMES | Flex | DEX-CEX + Wrapped | 88%+ |
| 4 | magnusFutures | KRONOS | $1K | Spot-Futures Basis | 92%+ |
| 5 | magnusRateHarvest | ATLAS | $5K | Funding Rate Harvest | 96%+ |
| 6 | magnusPairs | SIGMA | $10K | Pairs/Cointegration | 78%+ |
| 7 | magnusCascade | ARES | $3K | Liquidation Cascade | 72%+ |
| 8 | magnusCalendar | TEMPUS | $5K | Calendar Spread | 85%+ |
| 9 | magnusListing | SCOUT | $2K | New Listing Arb | 80%+ |

Bot colors: VEGA=#378ADD NEXUS=#4AADE8 HERMES=#7F77DD KRONOS=#EF9F27
           ATLAS=#1D9E75 SIGMA=#5DCAA5 ARES=#E24B4A TEMPUS=#BA7517 SCOUT=#9B59B6

---

## API ENDPOINTS (live status)

```
CONFIRMED WORKING (200):
GET  /api/profitable-gaps     ← live gap data
GET  /api/trading-stats       ← market stats
GET  /api/prices              ← price ticks
GET  /api/simulators          ← returns magnusBeta1k, magnusBeta10k
GET  /api/orderbook           ← 400 without params (correct behavior)
GET  /api/auth/me             ← 401 when not logged in (correct)

BEHIND AUTH (403):
GET  /api/magnus/alpha
GET  /api/magnus/futures
GET  /api/magnus/rate-harvest

MISSING (404 — need building):
POST /api/stripe/create-checkout   ← CRITICAL — Stripe checkout broken
GET  /api/signals/pairs
GET  /api/signals/liquidation
GET  /api/signals/calendar
GET  /api/signals/twap
GET  /api/signals/wrapped
GET  /api/signals/scored

RATE LIMIT ISSUE (429):
All endpoints returning 429 on browser JS calls — rate limiter
too aggressive. Fix: whitelist same-origin or raise dev limit.
```

---

## LIVE METRICS (April 28, 2026)

```
Gaps/hour:        10,000
Live signals:     659 total
  USDT signals:   551 (83.6%) ← strong
  USDC signals:   103 (15.6%) ← Phase 3A delivered
  BTC signals:    4   (0.6%)  ← thin — Phase 3B incomplete
  ETH signals:    0   (0%)    ← Phase 3C not deployed
Tracked symbols:  128
Exchanges:        18 CEX + 3 Futures + 3 DEX = 24 adapters
Avg gap life:     13 seconds
Best spread:      1.054% LRC/USDT
Spread quality:   74% below 0.1% (sub-fee noise)
Magnus trades:    2,534
Magnus win rate:  98.7%
Magnus capital:   $16,000 (paper)
Feed rank:        7/10
Security score:   6.5/10
Product score:    8.2/10
Console errors:   0
```

---

## CURRENT USER / AUTH STATE

```
Test account:
  Email:    test@arbitrance.com
  User ID:  616ef6f1-4b7e-4b65-aa25-376f4db93de4
  Plan:     FREE (should be PRO — fix pending)
  Role:     admin

Fix needed:
  UPDATE subscriptions SET plan_tier='pro', status='active'
  WHERE user_id='616ef6f1-4b7e-4b65-aa25-376f4db93de4';

Admin should bypass ALL feature gates (see institutional tier).
```

---

## PRICING TIERS

| Tier | Price | Key Feature |
|------|-------|-------------|
| Explorer | $0 | 5 coins, 15s delay, CEX only, ads shown |
| Trader | $29/mo | All coins, real-time, all markets, no ads |
| Pro | $99/mo | Signal scoring, 8 strategies, triangular arb |
| Magnus | $249/mo | All 15 strategies, 9 bots, Kelly sizing |
| Institutional | $999/mo | Raw WebSocket, webhooks, white-label, API |

Stripe: NOT connected yet (/api/stripe/create-checkout → 404)

---

## AD SYSTEM (designed — not built)

8 ad slots exist in UI (hardcoded exchange referral links currently).
Need to make dynamic via database.

Slots:
- intel-top-banner (Intelligence, top, 728x90)
- intel-left-1 (Intelligence, left sidebar)
- intel-left-2 (Intelligence, left sidebar)
- intel-right-bottom (Intelligence, right sidebar)
- dash-top-banner (Dashboard, top, 728x90)
- dash-left-sidebar (Dashboard, left sidebar)
- intel-native (Intelligence, content mid — "Powered by")
- dash-native (Dashboard, content mid — "Powered by")

Three modes per slot: referral | network (Coinzilla) | direct (advertiser)
Free tier: sees ads. Paid tier: no ads.

---

## ACTIVE BUILDER SPRINTS (do these NOW)

### SPRINT 1 — Magnus Fleet Identity (4 days, Sonnet)
Prompt file: /mnt/user-data/outputs/magnus-bot-fleet-identity-prompt.md
Tasks:
  1. Create lib/magnus/botRegistry.ts (9 bot definitions)
  2. Update tab labels → CODENAME · CAPITAL format
  3. Build bot detail panel (3-column layout)
  4. Add FLEET overview tab (bot grid + PnlWaterfall + SignalHeatmap)
  5. Nav "9 bots live" indicator update

### SPRINT 2 — Intelligence UI/UX Redesign (4.5 days, Sonnet)
Prompt file: /mnt/user-data/outputs/intelligence-uiux-redesign-prompt.md
Goal: Make Intelligence LOOK AND FEEL like Dashboard
Tasks:
  1. Stat cards: 6→4, match Dashboard style exactly
  2. Left sidebar: remove PULSE/ROUTES/TYPES/BIAS tabs, match Dashboard
  3. Main layout: heatmap+spread+typeprofit → single horizontal row
  4. Right sidebar: Magnus card = identical to Dashboard Magnus card
  5. Nav bar: identical on both pages
  6. Typography + spacing: match Dashboard exactly

---

## PENDING BUILD TASKS (priority order)

### IMMEDIATE (do today)
- [ ] Fix: UPDATE subscriptions SET plan_tier='pro' for test account
- [ ] Fix: Admin role bypasses all feature gates
- [ ] Fix: 429 rate limiter blocking same-origin calls
- [ ] Fix: Stripe checkout /api/stripe/create-checkout → 404

### SECURITY (before launch)
- [ ] P2-001: lib/engine/ + lib/engines/ import audit (USE OPUS)
      Verify NO server/engine/ files imported in /app or /components
      This protects our algorithm from browser bundle exposure
- [ ] P2-003: Error sanitization sweep — no stack traces in prod responses
- [ ] P2-002: Redis rate limiting (post-launch, not urgent)
- [ ] P2-004: Magnus config to PostgreSQL (post-launch)

### PHASE A — Growth Infrastructure (7-8 days)
- [ ] A1: HTTPS/SSL Nginx config + security headers
- [ ] A2: CORS lockdown (after 429 fix)
- [ ] A3: Server-side gap calc audit (after P2-001)
- [ ] A4: Public /live gap feed page (ATLAS says = #1 marketing asset)
      Read-only, 15s delayed, no auth required, SEO optimized
      Accepts ?ref=CODE for referral attribution
- [ ] A5: Referral system + activation gate
      Track gaps_viewed per user, unlock referral at 5 gaps viewed
      Anti-fraud + product activation in one mechanism
- [ ] A6: Shareable gap card generator
      POST /api/share/gap-card → PNG image via satori
      Twitter card sized (1200x630), bot color, referral link embedded
      Share button on every gap table row
- [ ] A7: Dynamic ad slot system
      Replace hardcoded exchange links with DB-driven AdSlot component
      Three modes: referral | network | direct
      Impression + click tracking
      Sandbox third-party ad scripts in iframes
- [ ] A8: Admin panel (/admin)
      User list + plan management
      Ad slot mode toggles
      System health dashboard

### PHASE B — Payments + Wallets (7-10 days)
- [ ] B1: Stripe checkout — wire /api/stripe/create-checkout
      Products: Trader $29, Pro $99, Magnus $249, Institutional $999
      Webhooks: checkout.session.completed, subscription.updated/deleted
      Portal: /api/stripe/portal
- [ ] B2: Wallet connect completion
      Fix MetaMask SDK @react-native-async-storage warning
      /api/auth/wallet — verify signature, create/find user
- [ ] B3: Crypto payments (Coinbase Commerce — USDC/USDT)
      Or: "Coming soon" placeholder
- [ ] B4: Exchange API key architecture
      Encrypted storage (AES-256-GCM) in exchange_connections table
      Read-only permissions only

### PHASE C — Compliance + Hardening (5-7 days)
- [ ] C1: Legal pages — /terms, /privacy, /disclaimer
- [ ] C2: CSP headers + ad tag sandboxing
- [ ] C3: Performance (lazy loading, bundle analysis, caching)
- [ ] C4: Final QA (25-point checklist)

---

## QUANT ROADMAP (parallel to builder)

### Phase 3A (2 weeks) — DONE ✅
- [x] USDC/USDT normalized price store
- [x] 103 USDC signals live
- [ ] Exchange Health Monitor (still pending alongside 3A)
- [ ] Split paper-trader.ts into per-bot files (3,500 lines → 9 files)

### Phase 3B (3 weeks) — IN PROGRESS
- [ ] Cross-exchange triangular via BTC pairs
      Currently only 4 BTC signals — threshold too tight or not wired
- [ ] Gap deduplication (prevent same gap firing in multiple strategies)
- [ ] Signal rate limiter (max signals/second to prevent queue overflow)
- [ ] PostgreSQL trading schema (bot_trades, trade_legs, risk_events)

### Phase 3C (2 weeks) — PENDING
- [ ] ETH base pair expansion (+12 pairs: XRP/ETH, ADA/ETH, etc.)
      Currently 0 ETH signals — not deployed
- [ ] /health endpoint with memory stats + exchange status
- [ ] Integration tests for all 15 signal sources

### Phase 4 — Real Money Execution (Q3 2026)
Gate: 90%+ win rate over 30 days confirmed
- [ ] Order execution adapter (Binance + OKX first)
- [ ] SENTINEL must audit execution code before ANY real money

---

## FOUNDER'S LEGAL / COMPLIANCE (parallel)
- [ ] VARA compliance (UAE virtual asset regulation)
- [ ] Regional license research
- [ ] KYC/AML readiness

---

## R&D BACKLOG (post-launch — do NOT build before launch)

Intelligence:
- 3-pane layout (analytics dock approved by founder)
- Historical gap analysis
- Custom alert builder
- Push notifications

Magnus:
- Phase 4 real-money execution
- ML gap duration prediction
- Options Put-Call Parity (Deribit)

Platform:
- Mobile responsive / PWA
- API product (external, after quality proven)
- Self-serve advertiser portal
- SOC 2 certification

---

## SECURITY RULES (ALWAYS APPLY — from SENTINEL)

```
1. NEVER import from server/engine/, server/engines/, server/services/
   in any file under /app or /components. Algorithm is CORE IP.

2. ALL SQL queries use parameterized queries ($1, $2). 
   NEVER string concatenation in SQL.

3. ALL secrets in .env.local. NEVER in source code.

4. Third-party ad scripts run in sandboxed iframes ONLY.
   sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"

5. JWT tokens: httpOnly cookies, NOT localStorage.

6. Passwords: bcrypt 12+ rounds. NEVER SHA or plaintext.

7. CORS: explicit origin whitelist. NEVER Access-Control-Allow-Origin: *

8. API responses: tier-filtered. Fee tables NEVER in responses.

9. Error messages: generic in production. NO stack traces.

10. botRegistry.ts: display metadata ONLY. Zero algorithm parameters.
```

---

## CSS SAFETY RULES (ALWAYS APPLY)

```
DO NOT MODIFY:
- tailwind.config.js / tailwind.config.ts
- globals.css
- postcss.config.js
- package.json CSS-related entries

USE FOR BOT COLORS: inline styles (color comes from botRegistry)
USE FOR LAYOUT: existing Tailwind utility classes
```

---

## MODEL USAGE (cost-optimal)

```
Tab completion:  Free — autocomplete, variable names, micro-edits
Sonnet 4.6:     75% of work — components, APIs, DB, UI, bugs, refactors
Opus 4.6:       ONLY for: security audits, encryption, multi-file arch,
                algorithm protection, P2-001 engine import audit

TASK → MODEL:
Security audit of engine/ imports   → Opus
AES-256 encryption implementation   → Opus
CSP headers                         → Opus
Wallet signature verification        → Opus
New React component                 → Sonnet
API route                           → Sonnet
Database query                      → Sonnet
Bug fix                             → Sonnet
UI styling                          → Sonnet
```

---

## AGENT FLEET

```
BURAC (CTO/Cofounder):
  → Strategy, architecture, code review, product decisions
  → Lives in main Claude.ai conversation

BUILDER AGENT (Cursor + Sonnet 4.6):
  → Code execution, all frontend + backend implementation
  → Has this BRAIN document + .cursorrules (SENTINEL rules)

QUANT TRADER:
  → Magnus strategies, signal engines, trading algorithms
  → Reports to Burac for architecture decisions

ATLAS (Head of Growth):
  → Marketing strategy, content, ad agency outreach
  → Prompt: /mnt/user-data/outputs/atlas-growth-agent-prompt.md
  → Use in separate Claude conversation

SENTINEL (CISO):
  → Security audits, vulnerability reviews
  → Paused — returns at launch phase
  → Full prompt: /mnt/user-data/outputs/sentinel-security-agent-prompt.md
  → Rules embedded in .cursorrules (always active)
```

---

## EXCHANGE LIST (24 adapters)

CEX (18): Binance, Bybit, OKX, KuCoin, Coinbase, Crypto.com, Bitfinex,
          Upbit, WhiteBit, Phemex, CoinEx, BitMart, Gate.io, BingX,
          MEXC, HTX, Bitget, (CCXT factory)

Futures (3): Binance Futures, Bybit Futures, OKX Futures

DEX (3): Jupiter (Solana), Uniswap v3 (Ethereum), Hyperliquid

Top coverage: GATE(66), MEXC(64), OKX(62), BIN(62), BTG(54)

---

## PRODUCT PAGES (10 live)

| Route | Page | Auth | Notes |
|-------|------|------|-------|
| / | → redirects to /intelligence | No | |
| /dashboard | Screener | No | Main arb signal table |
| /intelligence | Deep analysis | No | Widgets + gap table |
| /magnus | Quant command center | No | 9 bots dashboard |
| /pricing | Plan selection | No | 5 tiers |
| /login | Sign in | No | Email + wallet |
| /signup | Registration | No | Email + wallet |
| /account | Account settings | YES → /login | Protected route |
| /funding-rates | Funding rates | No | Separate v0.5.2 |
| /dex-markets | DEX markets | No | "Coming in v0.8" |
| /live | Public gap feed | No | PENDING BUILD |
| /admin | Admin panel | Admin role | PENDING BUILD |

---

## REVENUE MODEL STATUS

| Stream | Status | Notes |
|--------|--------|-------|
| Subscriptions | UI only | Stripe not wired |
| Ad network | Slots built | Not dynamic yet |
| Direct ads | Designed | Not built |
| Exchange referrals | Live | Links in product |
| API | Internal only | Not for sale yet |

---

## CRITICAL PATH TO LAUNCH

```
TODAY:
  Fix test account plan (SQL — 5 min)
  Fix 429 rate limiter (builder — 1 hour)
  
THIS WEEK:
  Stripe checkout fix (1 day)
  P2-001 engine audit (1 day — Opus)
  P2-003 error sanitization (0.5 day)
  Magnus fleet identity UI (4 days — in progress)
  Intelligence UI redesign (4.5 days — ready to start)

NEXT 3 WEEKS:
  Phase A: Security + growth infra (7-8 days)
  Phase B: Wallet + payments (7-10 days)
  Quant Phase 3B + 3C (parallel)
  Founder: legal + compliance (parallel)

FINAL WEEK BEFORE LAUNCH:
  Phase C: Legal + hardening (5-7 days)
  Full QA (25-point checklist)
  SENTINEL returns for security audit

→ STAGE 9: PUBLIC LAUNCH
```

---

*Arbitrance Project Brain v1.0*
*Maintained by Burac — CTO & Cofounder*
*April 28, 2026*
*Keep this file loaded in Cursor at all times*
*Update after every major sprint completion*
