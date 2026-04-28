import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';
import { getAuthUser } from '@/lib/auth/middleware';
import { atLeast, upgradeRequired } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  if (!atLeast(plan, 'pro')) return upgradeRequired('pro');

  try {
    const res = await fetch(`${BACKEND_URL}/magnus/rate-harvest`, { cache: 'no-store' });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json(null, { status: 503 });
  }
}
