import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { transformGapList, atLeast } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FREE_DELAY_MS = 15_000;

let freeSnapshot: unknown[] = [];
let freeSnapshotAt = 0;

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  try {
    const now = Date.now();
    const res = await fetch(`${BACKEND_URL}/active-gaps`, { cache: 'no-store' });
    const rawGaps: unknown[] = await res.json();

    if (now - freeSnapshotAt >= FREE_DELAY_MS) {
      freeSnapshot   = rawGaps;
      freeSnapshotAt = now;
    }

    if (!atLeast(plan, 'trader')) {
      const limited = transformGapList(
        freeSnapshot as Record<string, unknown>[],
        'free'
      );
      return Response.json(limited, {
        headers: { 'X-Data-Tier': 'free', 'X-Data-Delayed': 'true' },
      });
    }

    const transformed = transformGapList(rawGaps as Record<string, unknown>[], plan);
    return Response.json(transformed, {
      headers: { 'X-Data-Tier': plan },
    });
  } catch {
    return Response.json([], { status: 503 });
  }
}
