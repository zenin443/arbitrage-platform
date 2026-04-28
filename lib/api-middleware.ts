import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>;

interface RateLimitOptions {
  /** Override the plan tier for limit calculation (e.g. 'anon' to force lowest tier) */
  plan?: string;
}

/**
 * Higher-order function that wraps a Next.js route handler with tier-based rate limiting.
 * On limit exceeded returns 429 with Retry-After and X-RateLimit-* headers.
 */
export function withRateLimit(handler: RouteHandler, options?: RateLimitOptions): RouteHandler {
  return async function rateLimitedHandler(req: NextRequest, ctx?: unknown) {
    const result = checkRateLimit(req, options?.plan);

    const rlHeaders: Record<string, string> = {
      'X-RateLimit-Limit':     String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset':     String(Math.ceil(Date.now() / 1000) + result.resetIn),
    };

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', retryAfter: result.resetIn },
        {
          status: 429,
          headers: { ...rlHeaders, 'Retry-After': String(result.resetIn) },
        }
      );
    }

    const response = await handler(req, ctx);

    // Attach rate limit headers to successful responses when possible
    if (response instanceof NextResponse) {
      Object.entries(rlHeaders).forEach(([k, v]) => response.headers.set(k, v));
    }

    return response;
  };
}
