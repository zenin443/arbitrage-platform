import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';

// ── Plan limits (requests per minute) ────────────────────────────────────────

const PLAN_LIMITS: Record<string, number> = {
  anon:          10,
  free:          30,
  trader:        120,
  pro:           300,
  institutional: 1000,
};

// Auth-specific limits (requests per minute)
const AUTH_LIMITS: Record<string, number> = {
  login:    5,
  register: 3,
  refresh:  10,
};

// ── In-memory store ──────────────────────────────────────────────────────────

interface RateWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateWindow>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (now > win.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

// ── Core check ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetIn: number;
}

function check(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const win = store.get(key);

  if (!win || now > win.resetAt) {
    const resetAt = now + 60_000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetIn: 60 };
  }

  const resetIn = Math.ceil((win.resetAt - now) / 1000);

  if (win.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetIn };
  }

  win.count += 1;
  return { allowed: true, limit, remaining: limit - win.count, resetIn };
}

// ── Public API ───────────────────────────────────────────────────────────────

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Tier-based rate limit for general API routes.
 * Unauthenticated = anon (10/min). Authenticated = plan tier.
 * Key format: `${ip}:${userId || 'anon'}`.
 *
 * Returns an "always allowed" result in development — localhost has no
 * x-forwarded-for so all requests share one bucket and trigger false 429s.
 */
export function checkRateLimit(req: NextRequest, plan?: string): RateLimitResult {
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true, limit: 9999, remaining: 9999, resetIn: 60 };
  }
  const ip = getIp(req);
  const authUser = getAuthUser(req);
  const userId = authUser?.userId ?? 'anon';
  const tier = plan ?? authUser?.plan ?? (authUser ? 'free' : 'anon');
  const limit = PLAN_LIMITS[tier] ?? PLAN_LIMITS.anon;
  return check(`api:${ip}:${userId}`, limit);
}

/**
 * Auth-endpoint-specific rate limit (login / register / refresh).
 * Keyed by IP only so account enumeration is capped regardless of which account is targeted.
 */
export function checkAuthRateLimit(
  req: NextRequest,
  endpoint: 'login' | 'register' | 'refresh'
): RateLimitResult {
  const ip = getIp(req);
  const limit = AUTH_LIMITS[endpoint];
  return check(`auth:${endpoint}:${ip}`, limit);
}
