import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';

// Requests per minute by plan tier
const PLAN_LIMITS: Record<string, number> = {
  free:          30,
  trader:        120,
  pro:           300,
  institutional: 1000,
};

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (now > win.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

function checkApiLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const win = store.get(key);

  if (!win || now > win.resetAt) {
    const resetAt = now + 60_000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt, retryAfter: 0 };
  }

  if (win.count >= limit) {
    const retryAfter = Math.ceil((win.resetAt - now) / 1000);
    return { allowed: false, limit, remaining: 0, resetAt: win.resetAt, retryAfter };
  }

  win.count += 1;
  return { allowed: true, limit, remaining: limit - win.count, resetAt: win.resetAt, retryAfter: 0 };
}

/**
 * Apply tier-based rate limiting to an API route.
 * Returns a 429 NextResponse if rate limit is exceeded, null otherwise.
 * Always attaches X-RateLimit-* headers to any returned response.
 */
export function applyApiRateLimit(req: NextRequest): NextResponse | null {
  const ip = getClientIp(req);
  const authUser = getAuthUser(req);

  const plan = authUser?.plan ?? 'free';
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // Key = ip + userId (if authenticated) to prevent shared-IP false positives
  const key = `api:${ip}:${authUser?.userId ?? 'anon'}`;
  const result = checkApiLimit(key, limit);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', retryAfter: result.retryAfter },
      { status: 429, headers: { ...headers, 'Retry-After': String(result.retryAfter) } }
    );
  }

  return null;
}
