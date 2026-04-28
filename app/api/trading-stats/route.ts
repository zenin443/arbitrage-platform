import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';
import { getAuthUser } from '@/lib/auth/middleware';
import { transformTradingStats } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  try {
    const res = await fetch(`${BACKEND_URL}/trading-stats`, { cache: 'no-store' });
    const data = await res.json();
    const filtered = transformTradingStats(data, plan);
    return Response.json(filtered);
  } catch {
    return Response.json({ error: 'Trading stats unavailable' }, { status: 503 });
  }
}
