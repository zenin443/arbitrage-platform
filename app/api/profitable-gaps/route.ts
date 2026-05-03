import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';
import { getAuthUser } from '@/lib/auth/middleware';
import { transformGapList, atLeast } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FREE_DELAY_MS = 15_000; // 15-second delayed snapshot for free tier

// Module-level 15s cache — updated on every real fetch, served to free-tier users
let freeSnapshot: unknown[] = [];
let freeSnapshotAt = 0;

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  try {
    const now = Date.now();

    // Always fetch fresh data from price server
    const res = await fetch(`${BACKEND_URL}/profitable-gaps`, { cache: 'no-store' });
    const rawGaps: unknown[] = await res.json();

    // Rotate the free-tier snapshot every FREE_DELAY_MS
    if (now - freeSnapshotAt >= FREE_DELAY_MS) {
      freeSnapshot  = rawGaps;
      freeSnapshotAt = now;
    }

    // Free/anonymous: serve delayed snapshot with minimal fields
    if (!atLeast(plan, 'trader')) {
      const limited = transformGapList(
        freeSnapshot as Record<string, unknown>[],
        'free'
      );
      return Response.json(limited, {
        headers: { 'X-Data-Tier': 'free', 'X-Data-Delayed': 'true' },
      });
    }

    // Trader+: real-time, tier-filtered fields
    const transformed = transformGapList(rawGaps as Record<string, unknown>[], plan);
    return Response.json(transformed, {
      headers: { 'X-Data-Tier': plan },
    });
  } catch {
    return Response.json([], { status: 503 });
  }
}
