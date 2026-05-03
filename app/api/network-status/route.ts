import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  try {
    const res = await fetch(`${BACKEND_URL}/network-status`, { cache: 'no-store' });
    if (!res.ok) return Response.json({}, { status: 200 });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({}, { status: 200 });
  }
}
