# ARBITRANCE — PROJECT MEMORY
> Last updated: 2026-04-30 | Phase: Late Alpha → Beta transition

---

## 1. WHAT IS ARBITRANCE

Real-time crypto arbitrage intelligence terminal. Scans 18 CEX + 3 futures + 3 DEX exchanges every 500ms, calculates net spreads after all fees/withdrawals, and surfaces profitable opportunities through a Bloomberg-style trading UI. Includes Magnus AI — a fleet of 9 paper-trading bots running 15+ strategies.

**Target users:** Crypto traders (retail → institutional), fund managers, quant desks.
**Revenue model:** Tiered SaaS (Free → Trader $29 → Pro $99 → Institutional $499) + crypto payments + white-label licensing.

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript strict, Tailwind CSS |
| State | Zustand (client), React Query, AuthContext, SimulatorContext |
| Backend | Node.js standalone HTTP server (port 3001) + WebSocket (port 3002) |
| Database | PostgreSQL (pg Pool), 7 migrations |
| Auth | JWT (access + refresh), bcrypt, wallet login (SIWE nonces), DEV_AUDIT_MODE bypass |
| Payments | Stripe (checkout + portal + webhooks), on-chain USDC/USDT (multi-chain) |
| Wallet | RainbowKit + wagmi + viem |
| Exchange Data | 24 CEX adapters (18 active), 3 futures adapters, 3 DEX adapters, CCXT for tier-2 |
| Deployment | Hetzner VPS, Nginx, PM2, Git-based deploys |
| Security | Rate limiting (edge + API), CSP headers, ESLint import guards, server-only modules |

---

## 3. ARCHITECTURE OVERVIEW

```
Browser (localhost:3000)
  ├── Next.js App Router (app/)
  │     ├── Pages: intelligence, dashboard, magnus, admin, alerts, etc.
  │     ├── API Routes (80 endpoints under app/api/)
  │     └── Middleware: IP rate limiting, same-origin bypass
  │
  ├── WebSocket Client → ws://localhost:3002
  │     └── JWT auth, plan-based throttling
  │
  └── React Query + Zustand for state

Price Server (localhost:3001)
  ├── 18 CEX spot adapters (Binance, Bybit, OKX, KuCoin + 14 more)
  ├── 3 Futures adapters (Binance, Bybit, OKX perpetuals)
  ├── 3 DEX adapters (Jupiter, Uniswap V3, Hyperliquid)
  ├── Tick Stores: spot, futures, dex (in-memory)
  ├── 500ms recalc loop → spreads, spot-futures, cex-dex
  ├── Strategy Engines (8): triangular, cross-chain, stablecoin, pairs, liquidation, calendar, new-listing, wrapped-token
  ├── Signal Engines: TWAP, orderbook pressure, signal scorer
  ├── Services: alert engine, trading intelligence, orderbook fetcher, paper trader, funding-rate bot
  ├── HTTP API: /health, /prices, /opportunities, /signals/*, /magnus/*, etc.
  └── WebSocket Server (port 3002): broadcast opportunities, ticks, spot-futures, cex-dex

PostgreSQL
  ├── users (id, email, name, role, is_active, tenant_id)
  ├── sessions (JWT refresh)
  ├── subscriptions (plan_tier, stripe IDs)
  ├── payments (crypto on-chain)
  ├── admin_audit_log
  ├── user_preferences
  └── whitelabel_tenants (NEW)
```

---

## 4. FILE INVENTORY

### 4.1 Pages (32 routes)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Redirects to `/intelligence` |
| `/intelligence` | `app/intelligence/page.tsx` | Main intelligence terminal — gap scanner, filters, Magnus card |
| `/dashboard` | `app/dashboard/page.tsx` | Trading dashboard — price sidebar, opportunity table, signal insights |
| `/magnus` | `app/magnus/page.tsx` | Magnus AI product page |
| `/admin` | `app/admin/page.tsx` | Admin overview — stats, plan distribution, health, recent signups |
| `/admin/users` | `app/admin/users/page.tsx` | User list with search, plan/status filters, pagination |
| `/admin/users/[id]` | `app/admin/users/[id]/page.tsx` | User detail — profile editor, plan editor, sessions, actions |
| `/admin/audit` | `app/admin/audit/page.tsx` | Audit log viewer with expandable entries |
| `/admin/health` | `app/admin/health/page.tsx` | Live system health with auto-refresh |
| `/admin/whitelabel` | `app/admin/whitelabel/page.tsx` | White label tenant management + brand preview |
| `/admin/gaps` | `app/admin/gaps/page.tsx` | Admin profitable gaps viewer |
| `/admin/magnus` | `app/admin/magnus/page.tsx` | Admin Magnus inspection |
| `/alerts` | `app/alerts/page.tsx` | User alerts UI |
| `/funding-rates` | `app/funding-rates/page.tsx` | Funding rates display |
| `/new-listings` | `app/new-listings/page.tsx` | New listing signals |
| `/triangular` | `app/triangular/page.tsx` | Triangular arbitrage UI |
| `/cross-chain` | `app/cross-chain/page.tsx` | Cross-chain opportunities |
| `/dex` | `app/dex/page.tsx` | DEX page |
| `/dex-markets` | `app/dex-markets/page.tsx` | DEX markets |
| `/pricing` | `app/pricing/page.tsx` | Plans + payment modal |
| `/login` | `app/login/page.tsx` | Email/password login |
| `/signup` | `app/signup/page.tsx` | Registration |
| `/account` | `app/account/page.tsx` | Account screen |
| `/settings` | `app/settings/page.tsx` | User settings |
| `/concepts/*` | `app/concepts/` (8 pages) | Educational concept diagrams |

### 4.2 API Routes (80 endpoints)

**Auth (6)**
- `POST /api/auth/login` — Email login
- `POST /api/auth/register` — Registration
- `POST /api/auth/logout` — Clear session
- `POST /api/auth/refresh` — JWT refresh
- `GET /api/auth/me` — Current user profile
- `POST /api/auth/wallet` + `GET /api/auth/wallet/nonce` — Wallet login

**Core Data (12)**
- `GET /api/opportunities` — Ranked arbitrage opportunities (tier-filtered)
- `GET /api/profitable-gaps` — Profitable gap list
- `GET /api/active-gaps` — Active gaps
- `GET /api/gap-history` — Historical gaps
- `GET /api/prices` — Price ticks
- `GET /api/trading-stats` — Aggregate trading stats
- `GET /api/orderbook` — Order book depth
- `GET /api/funding-rates` — Funding rates
- `GET /api/dex-prices` — DEX prices
- `GET /api/spot-futures` — Spot-futures opportunities
- `GET /api/cex-dex` — CEX-DEX opportunities
- `GET /api/tick-coverage` — Diagnostic coverage

**Signals (8)**
- `GET /api/signals/scored` — Multi-factor scored signals
- `GET /api/signals/twap` — TWAP deviations
- `GET /api/signals/pairs` — Pairs trading
- `GET /api/signals/calendar` — Calendar spread
- `GET /api/signals/liquidation` — Liquidation cascade
- `GET /api/signals/wrapped` — Wrapped token parity
- `GET /api/triangular` — Triangular routes
- `GET /api/cross-chain` — Cross-chain opportunities
- `GET /api/new-listings` — New listing signals

**Magnus (18)**
- `GET /api/magnus/alpha` + `/alpha/trades` + `/alpha/voided` + `/alpha/rebalances` + `/alpha/performance` + `/alpha/config` + `POST /alpha/reset` + `POST /alpha/config`
- `GET /api/magnus/futures` + `/futures/trades` + `/futures/voided` + `POST /futures/reset`
- `GET /api/magnus/rate-harvest` + `/rate-harvest/trades` + `/rate-harvest/positions` + `POST /rate-harvest/reset`

**Simulators (5)**
- `GET /api/simulators` — All bots (tier-transformed)
- `GET /api/simulator/[id]` + `/[id]/trades` + `/[id]/rebalances` + `/[id]/voided` + `POST /[id]/reset`

**Admin (24)**
- `GET /api/admin/stats` — User/plan/session aggregates
- `GET /api/admin/users` — Paginated user list
- `GET/PATCH /api/admin/users/[id]` — User detail/update
- `PATCH /api/admin/users/[id]/plan` — Change subscription
- `DELETE /api/admin/users/[id]/sessions` — Force logout
- `GET /api/admin/audit-log` — Audit log query
- `GET /api/admin/health` — Backend health proxy
- `GET/POST /api/admin/alert-config` — Alert config
- `GET/POST /api/admin/whitelabel` — White label tenants
- Magnus admin routes: config, performance, trades, voided, rebalances, reset, futures, rate-harvest

**Payments (3)** + **Stripe (3)**
- `POST /api/payments/create` + `/confirm` + `GET /status`
- `POST /api/stripe/checkout` + `/portal` + `/webhook`

**Alerts (2)**
- `GET /api/alerts` + `GET/POST /api/alert-config`

### 4.3 Components (34 files)

**Shell**
- `AppHeader.tsx` — Sticky nav bar with LIVE badge, page links, admin link (admin-only), auth button
- `MobileNav.tsx` — Bottom tab bar for mobile
- `NavAuthButton.tsx` — Sign-in/account avatar
- `WalletLoginButton.tsx` — RainbowKit connect + SIWE
- `PaymentModal.tsx` — Stripe/crypto payment flow
- `UpgradePrompt.tsx` — Upsell modal
- `AdBanner.tsx` — Conditional ad strip (hidden for paid users)

**Dashboard (`components/dashboard/`)**
- `PriceSidebar.tsx` — Fixed 200px left rail: coin list, prices, change %, collapsible ad/Magnus widgets
- `OpportunityTable.tsx` — Main signals table: sortable, filterable (type, quote, confidence, time detected)
- `SignalDetailPane.tsx` — Slide-out detail for selected signal
- `SignalInsightPanel.tsx` — Right panel: spread direction, synthetic book, stats
- `CoinDetailPanel.tsx` — Coin-level view with gap + price merge
- `LiveStats.tsx` — Polls `/api/opportunities` every 2s for count + best spread
- `StatsCard.tsx` — Small KPI card

**Intelligence (`components/intelligence/`)**
- `MagnusAICard.tsx` — Magnus promo card

**Magnus (`components/magnus/`)**
- `AlgoExplainerCard.tsx` — "How the algo works" with static definitions
- `SignalScoreGauge.tsx` — Radial 0-100 gauge
- `SignalHeatmap.tsx` — Exchange × strategy heatmap
- `StrategyPnlWaterfall.tsx` — Horizontal PnL bars by bot

**Settings (`components/settings/`)**
- `AlertSettings.tsx`, `CoinSelector.tsx`, `ExchangeSelector.tsx`, `TradeSizeConfig.tsx`

**UI Primitives (`components/ui/`)**
- `StatCard.tsx`, `Badge.tsx`, `Spinner.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx`
- `UpgradeGate.tsx`, `InfoCorner.tsx`, `AdZone.tsx`, `ResizableWidget.tsx`, `WidgetSkeleton.tsx`

### 4.4 Server Architecture (60+ files)

**Adapters — CEX (24 files, 18 active at runtime)**
| Tier | Exchanges | Method |
|------|-----------|--------|
| Tier 1 (native WS) | Binance, Bybit, OKX, KuCoin | Direct WebSocket |
| Tier 2 (CCXT REST) | Gate.io, MEXC, Bitget, HTX, BingX, Kraken | Polling via ccxtAdapter |
| Tier 3 (native REST) | Coinbase, Crypto.com, Bitfinex, Upbit, Phemex, WhiteBIT, CoinEx, BitMart | Custom REST adapters |
| Disabled | Bitstamp, LBank, AscendEX, ProBit, BTSE, Deribit, CoinW | Adapter code exists, not started |

**Adapters — Futures (3 active):** Binance, Bybit, OKX perpetuals
**Adapters — DEX (3 active):** Jupiter (Solana), Uniswap V3 (EVM), Hyperliquid

**Core Engine (`server/engine/` — 11 files)**
- `tickStore.ts` — In-memory CEX spot ticks
- `futuresTickStore.ts` — Perpetual ticks + OI
- `dexTickStore.ts` — DEX mid/liquidity
- `spreadCalculator.ts` — All CEX-CEX spreads (net after fees + withdrawal)
- `spotFuturesCalculator.ts` — Spot vs perp basis
- `cexDexCalculator.ts` — CEX vs DEX mispricing
- `opportunityScorer.ts` — Rank/sort spreads
- `signalScorer.ts` — Multi-factor 0-100 score (spread, execution prob, depth, win %, vol)
- `fundingRateTracker.ts` — Polls futures adapters every 60s
- `twapEngine.ts` — 4h TWAP deviation signals
- `orderbookPressure.ts` — Book imbalance heuristic

**Strategy Engines (`server/engines/` — 8 files)**
- `triangularArbitrage.ts` — Intra-exchange USDT→BTC→ALT→USDT
- `crossChainArbitrage.ts` — Same token across chains via DEX ticks
- `stablecoinArbitrage.ts` — Stablecoin pair drift (USDC/USDT, FDUSD, etc.)
- `pairsTradingEngine.ts` — Ratio mean reversion with z-score
- `liquidationEngine.ts` — OI drops + spot vs fair value dislocation
- `calendarSpreadEngine.ts` — Perp vs quarterly basis mispricing
- `newListingEngine.ts` — Detect new symbols, cross-venue gap within 10min
- `wrappedTokenEngine.ts` — WBTC/wETH vs native parity deviation

**Services (`server/services/` — 5 files)**
- `trading-intelligence.ts` — Gap lifecycle, profit simulation at $100/$1k/$5k/$10k, stats
- `alert-engine.ts` — 2s loop evaluating all signal types vs thresholds, WS push
- `orderbook-fetcher.ts` — Real order book depth analysis, executable size vs fees
- `paper-trader.ts` — Magnus paper trading: 9 bots, inventories, rebalancing, PnL
- `funding-rate-bot.ts` — Delta-neutral funding sim (rate harvest)

**Registries**
- `server/registry/exchangeRegistry.ts` — Fees, withdrawal costs, networks, URLs for all exchanges
- `server/registry/coinRegistry.ts` — Coin metadata, categories, min trade, networks

**Other**
- `server/config/symbols.ts` — ~90 tracked pairs across quote currencies
- `server/scanners/new-listing-scanner.ts` — Multi-exchange symbol baseline diffing
- `server/feed/wsServer.ts` — Authenticated WS on port 3002 with plan-based throttling

### 4.5 Lib Modules (31 files)

**Auth** — `middleware.ts` (JWT + admin guard + DEV bypass), `tokens.ts`, `password.ts`, `rate-limit.ts`, `wallet-nonces.ts`
**Admin** — `audit.ts` (fire-and-forget audit log INSERT)
**Engine (server-only)** — `priceEngine.ts`, `spreadCalculator.ts`, `opportunityScorer.ts`, `index.ts`
**Exchanges** — `binance.ts`, `bybit.ts`, `okx.ts`, `kucoin.ts` (WS connectors for lib/engine)
**Features** — `features.ts` (plan × feature matrix), `response-transformer.ts` (tier-based field stripping), `simulator-transformer.ts`
**Payments** — `stripe.ts` (SDK + price IDs), `payments/config.ts` (multi-chain USDC/USDT)
**Wallet** — `wallet/config.ts` (wagmi), `wallet/WalletProvider.tsx`
**Utils** — `db.ts` (pg Pool), `config.ts` (env loader), `validation.ts` (Zod schemas), `exchangeFees.ts`, `utils.ts` (cn + formatters), `formatters.ts`, `utils/feeData.ts` (server-only), `utils/formatters.ts`, `referrals.tsx`, `api-middleware.ts`, `api-rate-limit.ts`, `rate-limit.ts`
**Magnus** — `magnus/botRegistry.ts` (9 bot definitions, strategies, codenames)

### 4.6 Hooks, Contexts, Stores

**Hooks (2):** `useFeatureAccess.ts`, `useFeatureGate.ts` (admin bypass, plan gating)
**Contexts (2):** `AuthContext.tsx` (session, JWT refresh), `SimulatorContext.tsx` (poll /api/simulators)
**Stores (2):** `useArbitrageStore.ts` (Zustand — WS data), `useSettingsStore.ts` (persisted settings)
**App-local:** `app/lib/useWebSocket.ts` (WS connection hook)

### 4.7 Database Migrations (7)

| # | File | Tables/Changes |
|---|------|----------------|
| 001 | `initial_schema.sql` | `users`, `sessions`, `subscriptions`, `user_preferences` |
| 002 | `wallet_address.sql` | Wallet login columns + indexes |
| 003 | `payments.sql` | `payments` table (crypto on-chain) |
| 006 | `add_user_roles.sql` | `users.role` column + index |
| 007 | `admin_audit_log.sql` | `admin_audit_log` table |
| 008 | `quote_currency.sql` | `gap_history.quote_currency` + indexes |
| 009 | `whitelabel_tenants.sql` | `whitelabel_tenants` table + `users.tenant_id` |

### 4.8 Config & Deployment

- `package.json` — Next 14, React 18, CCXT, pg, Stripe, wagmi, Zustand, Recharts, Lucide, Zod
- `tsconfig.json` — Strict mode, `@/*` paths
- `tsconfig.scripts.json` — CommonJS for server/scripts
- `next.config.mjs` — Security headers, CSP, ESLint/TS errors ignored in build
- `middleware.ts` — Edge IP rate limiter with same-origin bypass (300 req/min)
- `.eslintrc.json` — `no-restricted-imports` blocking client imports of engine/server/registry IP
- `ecosystem.config.js` — PM2: `arbitrance-web` + `arbitrance-server`
- `tailwind.config.ts` — Custom Arbitrance color system
- `deploy/` — `nginx.conf`, `setup-hetzner.sh`, `.env.hetzner`
- `docs/` — deployment guide, security audit, IP protection, market coverage, test results

---

## 5. SECURITY POSTURE

| Control | Status |
|---------|--------|
| JWT auth (access + refresh) | ✅ Active |
| Admin role guard (`requireAdmin`) | ✅ Active |
| Admin → institutional plan elevation | ✅ Active (server-side) |
| Client admin bypass (`useFeatureGate`) | ✅ Active |
| Edge rate limiter (middleware.ts) | ✅ 300/min, same-origin exempt |
| API rate limiter (per plan tier) | ✅ Active |
| Auth rate limiter (login/register) | ✅ Active |
| ESLint import guards (engine/server IP) | ✅ Active |
| `server-only` on `lib/utils/feeData.ts` | ✅ Active |
| `server-only` on `lib/engine/` | ✅ Active |
| CSP headers | ✅ In next.config.mjs |
| HTTPS | ❌ Not yet (HTTP only on VPS) |
| CORS lockdown | ❌ Not yet |
| Stripe webhook signature verification | ⚠️ Needs audit |

---

## 6. MAGNUS AI — BOT FLEET

9 paper-trading bots, each with unique strategies:

| Codename | Strategy Focus |
|----------|---------------|
| VEGA | Volatility-based spread capture |
| NEXUS | Multi-exchange arbitrage |
| HERMES | Speed-optimized gap execution |
| KRONOS | Time-decay / funding rate |
| ATLAS | Large-cap conservative |
| SIGMA | Statistical arbitrage |
| ARES | Aggressive momentum |
| TEMPUS | Calendar/basis trades |
| SCOUT | New listing / early detection |

All run in paper-trading mode via `server/services/paper-trader.ts`. Rate harvest bot in `server/services/funding-rate-bot.ts`.

---

## 7. WHAT'S BEEN DONE (completed work)

### Core Platform
- [x] 18 CEX + 3 futures + 3 DEX exchange adapters
- [x] 500ms recalculation pipeline
- [x] WebSocket real-time feed with JWT + plan throttling
- [x] 80 API endpoints
- [x] 32 page routes
- [x] PostgreSQL schema (7 migrations)

### Auth & Payments
- [x] JWT auth (access + refresh tokens)
- [x] Email login/register
- [x] Wallet login (SIWE nonces)
- [x] Stripe checkout + portal + webhooks
- [x] Crypto payment (multi-chain USDC/USDT)
- [x] Plan-based feature gating (client + server)

### UI/UX (Recent)
- [x] Dashboard: fixed 200px sidebar, centered columns, collapsible widgets
- [x] Dashboard: Confidence filter + Time Detected filter on signals
- [x] Intelligence: removed drag handles, fixed sidebar widths, cleaned dead code
- [x] Admin panel: 6 pages (overview, users, user detail, audit, health, whitelabel)
- [x] Admin APIs: user management, plan editor, force logout, stats, whitelabel

### Security
- [x] Edge rate limiter with same-origin bypass
- [x] ESLint import guards for engine/server IP
- [x] `server-only` guards on fee data + engine
- [x] Admin role elevation (server-side → institutional)
- [x] Error sanitization on tick-coverage API
- [x] Admin audit logging

### DevOps
- [x] PM2 production config
- [x] Nginx reverse proxy config
- [x] Hetzner setup script
- [x] Live bot data files untracked from Git

---

## 8. WHAT'S PENDING (remaining work)

### Critical / High Priority
- [ ] HTTPS/SSL on VPS (Nginx + Let's Encrypt)
- [ ] CORS lockdown
- [ ] Stripe end-to-end test
- [ ] Stripe webhook signature verification audit

### UI/UX Polish
- [ ] Intelligence page remaining polish (stat cards 6→4, left sidebar tab removal, single horizontal row layout, nav typography)
- [ ] Magnus FLEET overview tab
- [ ] Mobile responsive audit

### Quant Engineering
- [ ] Split `paper-trader.ts` (massive file)
- [ ] Exchange health monitor
- [ ] BTC triangular arb expansion
- [ ] Gap deduplication
- [ ] Signal rate limiter
- [ ] PostgreSQL trading schema
- [ ] ETH base pair expansion
- [ ] `/health` endpoint improvements
- [ ] Integration tests

### Growth Infrastructure
- [ ] Public `/live` gap feed
- [ ] Referral system
- [ ] Shareable gap card
- [ ] Dynamic ad slot system

### Admin Panel Phase 2
- [ ] Session manager (per-session revoke)
- [ ] Rate limit overrides per user
- [ ] Ad slot manager
- [ ] Magnus controls from admin
- [ ] Stripe sync dashboard

### Payments Phase 2 (BLOCKED — company formation)
- [ ] MetaMask SDK fix + `/api/auth/wallet` improvements
- [ ] Exchange API key encrypted storage

### Legal / Compliance (BLOCKED — company formation)
- [ ] Legal pages (Terms, Privacy, Disclaimer)
- [ ] Full QA pass
- [ ] SENTINEL security audit
- [ ] VARA compliance
- [ ] KYC/AML readiness

### White Label
- [ ] Migration 009 deployed to VPS
- [ ] Tenant-scoped user experience
- [ ] Custom domain routing
- [ ] Tenant config CRUD (edit/delete)
- [ ] Tenant billing integration

---

## 9. ENVIRONMENT

### Local Dev
- **Frontend:** `npm run dev` → localhost:3000
- **Backend:** `npx ts-node --project tsconfig.scripts.json server/priceServer.ts` → localhost:3001 + WS 3002
- **DB:** PostgreSQL with `DATABASE_URL` in env
- **Env:** `.env.local` with `DEV_AUDIT_MODE=true`, `NEXT_PUBLIC_DEV_AUDIT_MODE=true`

### VPS (Production)
- **Server:** Hetzner VPS at `178.105.40.21`
- **SSH:** `root@178.105.40.21`
- **Path:** `/opt/arbitrance`
- **PM2 processes:** `arb-frontend` (Next.js), `arb-server` (price server)
- **Deploy:** `cd /opt/arbitrance && git pull && pm2 restart all`
- **DB:** `sudo -u postgres psql -d arbitrance`

---

## 10. KEY DESIGN DECISIONS

1. **Standalone backend** — Price server runs as separate Node.js process (not Next.js API route) for performance and WebSocket support
2. **In-memory tick stores** — No DB for real-time price data; PostgreSQL only for users/sessions/payments
3. **500ms recalc loop** — Balance between freshness and CPU; broadcasts to WS clients
4. **Tier-based data stripping** — Free users see limited fields; server transforms responses before sending
5. **DEV_AUDIT_MODE** — Bypasses all auth in development for rapid iteration
6. **Server-only guards** — `lib/engine/` and `lib/utils/feeData.ts` use `import "server-only"` to prevent client bundling
7. **ESLint import fences** — Hard-block client imports of `server/engine/`, `server/engines/`, `server/services/`, `server/registry/`
8. **Admin role = institutional** — Server-side admin users automatically get institutional plan access
9. **Fire-and-forget audit** — Admin actions logged but never block the response
10. **Paper trading only** — Magnus bots simulate trades; no real exchange API keys or execution

---

## 11. GIT COMMIT HISTORY (recent significant)

| Hash | Description |
|------|-------------|
| `e26ff14` | Dashboard + Intelligence UI/UX improvements (fixed widths, filters, cleanup) |
| `15a542a` | Admin role bypass (client + server), subscription upsert |
| `d5d1fec` | Security hardening: ESLint import guards, server-only feeData, error sanitization |
| `a1a753a` | Rate limiter fix: same-origin bypass for browser polling |
| `f12f201` | tick-coverage error sanitization |

---

## 12. FILE COUNT SUMMARY

| Category | Count |
|----------|-------|
| Page routes (`page.tsx`) | 32 |
| API routes (`route.ts`) | 80 |
| Components (`.tsx`) | 34 |
| Lib modules (`.ts/.tsx`) | 33 |
| Server files (`.ts`) | 60+ |
| Hooks | 2 |
| Contexts | 2 |
| Stores | 2 |
| Migrations | 7 |
| **Total source files** | **~250+** |
