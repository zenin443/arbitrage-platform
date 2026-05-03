import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { transformGapList } from '@/lib/response-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'free';

  const upstream = new URL(`${BACKEND_URL}/opportunities`);
  const { searchParams } = new URL(req.url);
  searchParams.forEach((value, key) => upstream.searchParams.set(key, value));

  if (!upstream.searchParams.has('minNetSpread') && !upstream.searchParams.has('minSpread')) {
    upstream.searchParams.set('minNetSpread', '0.05');
  }

  try {
    const res = await fetch(upstream.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(body, { status: res.status });
    }

    const data = await res.json();
    const items: Record<string, unknown>[] = data.opportunities ?? data ?? [];
    const transformed = transformGapList(items, plan);
    const count = transformed.length;

    console.log(`[/api/opportunities] Proxied ${count} opportunity(ies) [tier: ${plan}]`);
    return NextResponse.json({ opportunities: transformed, count });
  } catch {
    return NextResponse.json({ error: 'Price server unavailable.' }, { status: 503 });
  }
}
