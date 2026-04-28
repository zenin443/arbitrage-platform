import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/magnus/rate-harvest/reset`, {
      method: 'POST',
      headers: { 'x-internal-token': process.env.INTERNAL_API_TOKEN ?? '' },
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
