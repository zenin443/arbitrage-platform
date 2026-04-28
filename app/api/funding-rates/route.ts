import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { atLeast, upgradeRequired } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  if (!atLeast(plan, 'trader')) return upgradeRequired('trader');

  try {
    const res = await fetch(`${BACKEND_URL}/funding-rates`, { cache: 'no-store' });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json([], { status: 503 });
  }
}
