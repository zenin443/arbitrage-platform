import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { atLeast, upgradeRequired } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  if (!atLeast(plan, 'trader')) return upgradeRequired('trader');

  try {
    const res = await fetch(`${BACKEND_URL}/triangular`, { next: { revalidate: 0 } });
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Price server unavailable.' }, { status: 503 });
  }
}
