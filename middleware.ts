import { NextRequest, NextResponse } from 'next/server';

// Global IP-based rate limiter for all /api/* routes.
// Auth endpoints (/api/auth/*) are excluded — they carry their own stricter limits.
//
// This is the outermost defense layer. It catches:
//   - Scrapers hammering unauthenticated endpoints (gap data, prices, opportunities)
//   - Credential stuffing bots that rotate through auth endpoints before the auth
//     rate limiter engages
//   - DDoS probes at the application layer
//
// Plan-aware tier limits are enforced at the individual route level via applyApiRateLimit().
// This layer only enforces a coarse IP-level ceiling.

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_IP = 120; // per minute — generous enough not to block legit power users

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Purge expired windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (now > win.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// DEV_AUDIT_MODE: disables all rate limiting for raw development auditing.
const DEV_AUDIT_MODE =
  process.env.DEV_AUDIT_MODE === 'true' &&
  process.env.NODE_ENV !== 'production';

export function middleware(req: NextRequest) {
  if (DEV_AUDIT_MODE) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Auth endpoints have their own rate limiting — skip here to avoid double-counting
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Stripe webhook must not be rate-limited (Stripe retries on 429)
  if (pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }

  // Admin routes are authenticated, low-frequency internal calls — exempt from IP rate limiting
  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.next();
  }

  const ip = getIp(req);
  const now = Date.now();
  const existing = store.get(ip);

  if (!existing || now > existing.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (existing.count >= MAX_REQUESTS_PER_IP) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'rate_limit_exceeded', retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_REQUESTS_PER_IP),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(existing.resetAt / 1000)),
        },
      }
    );
  }

  existing.count++;
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
