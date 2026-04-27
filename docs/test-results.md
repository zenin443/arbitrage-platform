# Arbitrance Platform — Integration Test Results

**Test Date:** 2026-04-27  
**Environment:** Local development (`http://localhost:3000`)  
**Next.js version:** 15 (App Router)  
**Test method:** PowerShell `Invoke-WebRequest` against live dev server

---

## Auth Tests

| Test | Expected | Got | Result | Notes |
|---|---|---|---|---|
| Register with valid data | 201 | 201 | ✅ PASS | User created, tokens returned |
| Register with duplicate email | 409 | 409 | ✅ PASS | Correct conflict response |
| Register with short password | 400 | 400 | ✅ PASS | Zod validation: "Password must be at least 8 characters" |
| Register with invalid email (Zod) | 400 | 400 | ✅ PASS | Zod validation: "Must be a valid email address" |
| Login with correct credentials | 200 | 200 | ✅ PASS | JWT + refresh cookie returned |
| Login with wrong password | 401 | 401 | ✅ PASS | Secure generic "Invalid credentials" message |
| `GET /api/auth/me` without token | 401 | 401 | ✅ PASS | Auth middleware working |
| `GET /api/auth/me` with valid token | 200 | 200 | ✅ PASS | User object + plan returned |

---

## Payment Tests

| Test | Expected | Got | Result | Notes |
|---|---|---|---|---|
| `POST /api/payments/create` without auth | 401 | 401 | ✅ PASS | Auth guard working |
| `POST /api/payments/create` with auth (dev) | 200 | 503 | ℹ️ N/A | `SERVER_PAYMENT_WALLET` not set in dev `.env.local`; correct "Payment wallet not configured" 503 response — **not a bug** |
| `GET /api/payments/status` with auth | 200 | 200 | ✅ PASS | Returns empty array when no payments exist |

> **Note on payment create 503:** The route correctly validates all inputs with Zod and guards auth, then returns 503 with `{"error":"Payment wallet not configured. Contact support."}` when `SERVER_PAYMENT_WALLET`/`SERVER_SOLANA_WALLET` env vars are absent. This is the correct production safeguard behavior. Set these vars in `.env.local` to test full payment flow.

---

## Security Tests

| Test | Expected | Got | Result | Notes |
|---|---|---|---|---|
| Login with invalid email format | 400 | 400 | ✅ PASS | Zod returns `{"error":"Validation error","details":"Must be a valid email address"}` |
| SQL injection in email field | 400 | 400 | ✅ PASS | Zod rejects before DB; all DB queries use `$1` parameterized placeholders |
| Rate limit: 6th login attempt in 1 min | 429 | 429 | ✅ PASS | `{"error":"Too many attempts","retryAfter":N}` |
| CORS — allowed origin gets response | 401* | 401 | ✅ PASS | `Access-Control-Allow-Origin` header present with validated origin |

*401 is the expected status for `/api/auth/me` without a token — the point is the request was not rejected by CORS.

---

## Rate Limiting

| Plan | Limit (req/min) | Implementation |
|---|---|---|
| `free` (unauthenticated) | 30 | `lib/api-rate-limit.ts` — in-memory `Map` with IP+userId key |
| `trader` | 120 | Same |
| `pro` | 300 | Same |
| `institutional` | 1000 | Same |
| Auth login | 5/min per IP | `lib/auth/rate-limit.ts` (pre-existing) |
| Auth register | 3/min per IP | `lib/auth/rate-limit.ts` (pre-existing) |

Applied to: `/api/profitable-gaps`, `/api/trading-stats`, `/api/prices`, `/api/magnus/alpha`

---

## Page Load Tests

| Page | Expected | Got | Result |
|---|---|---|---|
| `/login` | 200 | 200 | ✅ PASS |
| `/signup` | 200 | 200 | ✅ PASS |
| `/pricing` | 200 | 200 | ✅ PASS |
| `/dashboard` | 200 | 200 | ✅ PASS |
| `/intelligence` | 200 | 200 | ✅ PASS |
| `/magnus` | 200 | 200 | ✅ PASS |
| `/funding-rates` | 200 | 200 | ✅ PASS |
| `/account` | 200 | 200 | ✅ PASS |

---

## Security Header Verification

Headers added in `next.config.mjs` for all routes (`/(.*)`):

| Header | Value | Status |
|---|---|---|
| `X-Frame-Options` | `DENY` | ✅ Configured |
| `X-Content-Type-Options` | `nosniff` | ✅ Configured |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ Configured |
| `X-XSS-Protection` | `1; mode=block` | ✅ Configured |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ Configured |
| `Strict-Transport-Security` | *(not set — production HTTPS only)* | Deferred |

---

## CORS Configuration

**Price server** (`server/priceServer.ts`): raw Node.js `http` — CORS implemented manually:
- Validates `Origin` header against `ALLOWED_ORIGINS` list
- Responds with the matched origin (not wildcard) when credentials are used
- Server-to-server / no-origin requests allowed
- OPTIONS preflight requests handled with 204
- Headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`, `Vary: Origin`

---

## Database Query Audit

Files audited for SQL injection:

| File | Queries | Safe? |
|---|---|---|
| `app/api/auth/login/route.ts` | 3 | ✅ All `$1`/`$2` parameterized |
| `app/api/auth/register/route.ts` | 5 | ✅ All `$1`/`$2` parameterized |
| `app/api/auth/me/route.ts` | 1 | ✅ Parameterized |
| `app/api/auth/logout/route.ts` | 1 | ✅ Parameterized |
| `app/api/auth/refresh/route.ts` | 2 | ✅ Parameterized |
| `app/api/auth/wallet/route.ts` | 5 | ✅ All `$1`/`$2` parameterized |
| `app/api/payments/create/route.ts` | 1 | ✅ Parameterized |
| `app/api/payments/confirm/route.ts` | 4 | ✅ All parameterized |
| `app/api/payments/status/route.ts` | 2 | ✅ Parameterized |
| `app/api/stripe/checkout/route.ts` | 1 | ✅ Parameterized |
| `app/api/stripe/portal/route.ts` | 1 | ✅ Parameterized |
| `app/api/stripe/webhook/route.ts` | 1 | ✅ Parameterized |

**No string concatenation or template literal interpolation found in any query.** All user input reaches the database only through parameterized placeholders.

---

## Zod Validation Coverage

| Schema | Applied to | Fields validated |
|---|---|---|
| `registerSchema` | `POST /api/auth/register` | email (format, max 254), password (min 8, max 128), name (min 1, max 100) |
| `loginSchema` | `POST /api/auth/login` | email (format), password (min 1) |
| `paymentCreateSchema` | `POST /api/payments/create` | plan (enum), chain (enum), currency (enum), paymentMethod (optional) |
| `paymentConfirmSchema` | `POST /api/payments/confirm` | paymentId (UUID), txHash (min 10), fromAddress (optional) |

Error format: `{"error": "Validation error", "details": "<human-readable message>"}`

---

## TypeScript Check

```
npx tsc --noEmit
Exit code: 0 — zero errors
```

---

## Summary

| Category | Pass | Fail | Notes |
|---|---|---|---|
| Auth tests | 8/8 | 0 | All green |
| Payment tests | 2/3 | 0* | 1 N/A (wallet not configured in dev) |
| Security tests | 4/4 | 0 | Rate limiting, Zod, SQL injection all working |
| Page load tests | 8/8 | 0 | All pages render |
| TypeScript | ✅ | — | Zero errors |

**Overall: 22/22 applicable tests passing. Stage 5 security hardening complete.**
