# Security Audit — Arbitrage Platform

**Date:** 2026-04-27  
**Scope:** CORS, rate limiting, Zod input validation, SQL injection audit

---

## 1. CORS Configuration

### Price Server (server/priceServer.ts)

The price server runs as a raw Node.js HTTP server (not Express). CORS is implemented via a custom `setCorsHeaders` / `getCorsOrigin` function applied to every response before routing.

**Allowed origins:**

| Origin | Environment |
|--------|-------------|
| `http://localhost:3000` | Development |
| `http://localhost:3001` | Development (price server self) |
| `https://arbitrance.com` | Production |
| `https://www.arbitrance.com` | Production |
| `process.env.NEXT_PUBLIC_APP_URL` | Configurable |

Any additional `http://localhost:*` origin is permitted in non-production to ease local development.

**Settings:** `Access-Control-Allow-Credentials: true`, methods `GET POST PUT DELETE OPTIONS`, headers `Content-Type Authorization`, `Vary: Origin`.

**npm packages installed:** `cors`, `@types/cors`, `express-rate-limit` (available for future Express middleware integration).

### WebSocket Server (server/feed/wsServer.ts)

Uses `ws` library's built-in `verifyClient` hook. In production, connections from origins not in `ALLOWED_ORIGINS` are rejected with `403 Origin not allowed`. In development, any origin is permitted. All connections additionally require a valid JWT (`?token=<access_token>`).

### Next.js API Routes

CORS for Next.js API routes is governed by the Next.js host server (Vercel / reverse proxy). No separate CORS middleware is applied at the route level because all API routes are same-origin from the frontend.

---

## 2. Rate Limiting

### Architecture

Rate limiting uses an **in-memory `Map`** with key `api:${ip}:${userId|'anon'}`. A cleanup `setInterval` runs every 5 minutes to evict expired windows. No Redis dependency.

### Tier Limits (requests per minute)

| Plan | Limit/min |
|------|-----------|
| `anon` (unauthenticated) | 10 |
| `free` | 30 |
| `trader` | 120 |
| `pro` | 300 |
| `institutional` | 1000 |

### Auth-Endpoint Limits (requests per minute, keyed by IP)

| Endpoint | Limit/min |
|----------|-----------|
| `POST /api/auth/login` | 5 |
| `POST /api/auth/register` | 3 |
| `POST /api/auth/refresh` | 10 |

These are handled by `lib/auth/rate-limit.ts` (pre-existing, not duplicated).

### API Routes Protected by Rate Limiting

| Route | Implementation |
|-------|---------------|
| `GET /api/profitable-gaps` | `applyApiRateLimit` |
| `GET /api/trading-stats` | `applyApiRateLimit` |
| `GET /api/prices` | `applyApiRateLimit` |
| `GET /api/magnus/alpha` | `applyApiRateLimit` |
| `GET /api/magnus/alpha/performance` | `applyApiRateLimit` *(added)* |
| `GET /api/magnus/alpha/rebalances` | `applyApiRateLimit` *(added)* |
| `GET /api/magnus/futures` | `applyApiRateLimit` *(added)* |
| `GET /api/orderbook` | `applyApiRateLimit` *(added)* |
| `GET /api/alert-config` | `applyApiRateLimit` *(added)* |
| `POST /api/alert-config` | `applyApiRateLimit` *(added)* |
| `POST /api/payments/create` | `applyApiRateLimit` *(added)* |
| `POST /api/payments/confirm` | `applyApiRateLimit` *(added)* |
| `GET /api/payments/status` | `applyApiRateLimit` *(added)* |

**Response headers on all rate-limited routes:**
```
X-RateLimit-Limit: <limit>
X-RateLimit-Remaining: <remaining>
X-RateLimit-Reset: <unix-epoch-seconds>
Retry-After: <seconds>  (only on 429)
```

**429 response body:**
```json
{ "error": "rate_limit_exceeded", "retryAfter": <seconds> }
```

### Utility Files

| File | Purpose |
|------|---------|
| `lib/rate-limit.ts` | Core tier-based limiter (`checkRateLimit`, `checkAuthRateLimit`) |
| `lib/api-rate-limit.ts` | `applyApiRateLimit` — direct use in route handlers |
| `lib/api-middleware.ts` | `withRateLimit` HOF — wraps a full route handler function |

---

## 3. Zod Input Validation

### Schemas (lib/validation.ts)

| Schema | Fields | Applied To |
|--------|--------|-----------|
| `registerSchema` | `email` (email, max 254), `password` (min 8, max 128), `name` (min 1, max 100) | `POST /api/auth/register` |
| `loginSchema` | `email` (email), `password` (min 1, max 128) | `POST /api/auth/login` |
| `walletAuthSchema` | `address` (`/^0x[a-fA-F0-9]{40}$/`), `signature` (min 10), `message` (min 1) | `POST /api/auth/wallet` *(added)* |
| `paymentCreateSchema` | `plan` (enum), `chain` (enum), `currency` (enum), `paymentMethod` (optional) | `POST /api/payments/create` |
| `paymentConfirmSchema` | `paymentId` (UUID), `txHash` (min 10, max 255), `fromAddress` (optional) | `POST /api/payments/confirm` |

### Helper Functions

- `formatZodError(error)` — joins all Zod issue messages with `; ` for human-readable errors
- `validateRequest(schema, data)` — returns `{success: true, data}` or `{success: false, error}`

### Validation Error Response Format

```json
HTTP 400
{
  "error": "Validation error",
  "details": "<human-readable message>"
}
```

### Routes with Zod Validation Applied

| Route | Schema | Status |
|-------|--------|--------|
| `POST /api/auth/register` | `registerSchema` | Pre-existing |
| `POST /api/auth/login` | `loginSchema` | Pre-existing |
| `POST /api/auth/wallet` | `walletAuthSchema` | Added |
| `POST /api/payments/create` | `paymentCreateSchema` | Pre-existing |
| `POST /api/payments/confirm` | `paymentConfirmSchema` | Pre-existing |

---

## 4. SQL Injection Audit

### Files Audited

**Directory: `app/api/`** (12 files with SQL)

| File | Queries | Parameterized? |
|------|---------|---------------|
| `app/api/auth/register/route.ts` | 6 | ✅ All use `$1`…`$5` |
| `app/api/auth/login/route.ts` | 4 | ✅ All use `$1`, `$2` |
| `app/api/auth/refresh/route.ts` | 2 | ✅ All use `$1`, `$2` |
| `app/api/auth/logout/route.ts` | 1 | ✅ Uses `$1` |
| `app/api/auth/me/route.ts` | 1 | ✅ Uses `$1` |
| `app/api/auth/wallet/route.ts` | 5 | ✅ All use `$1`…`$5` |
| `app/api/payments/create/route.ts` | 1 | ✅ Uses `$1`…`$7` |
| `app/api/payments/confirm/route.ts` | 5 | ✅ All use `$1`…`$5` |
| `app/api/payments/status/route.ts` | 2 | ✅ All use `$1`, `$2` |
| `app/api/stripe/checkout/route.ts` | 2 | ✅ All use `$1`, `$2` |
| `app/api/stripe/portal/route.ts` | 1 | ✅ Uses `$1` |
| `app/api/stripe/webhook/route.ts` | 3 | ✅ All use `$1`…`$4` |

**Directory: `lib/`** — No direct SQL queries found (DB access goes through route handlers).

**Directory: `server/`** — No direct SQL queries found (price server uses in-memory data only).

### Audit Method

Searched all `.ts` files for:
- Template literal SQL: `` `...${variable}...` `` inside `.query(` calls
- String concatenation SQL: `'...' + variable` or `"..." + variable` inside `.query(` calls

**Result: 0 vulnerabilities found.** All 12 files, covering 33 total SQL statements, use PostgreSQL parameterized placeholders exclusively (`$1`, `$2`, …`$n`).

---

## 5. Summary

| Security Layer | Status |
|---------------|--------|
| CORS (price server HTTP) | ✅ Implemented (custom, pre-existing) |
| CORS (WebSocket server) | ✅ Implemented (verifyClient hook, pre-existing) |
| Rate limiting — auth routes | ✅ Implemented (pre-existing) |
| Rate limiting — 13 API routes | ✅ Implemented (8 routes added this audit) |
| Zod validation — 5 POST routes | ✅ Implemented (wallet route added this audit) |
| SQL injection (33 statements) | ✅ Clean — all parameterized |
| In-memory rate limit store | ✅ No Redis required |
