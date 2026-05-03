import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;
  try {
    const res = await fetch(`${BACKEND_URL}/alert-config`, { cache: 'no-store' });
    if (!res.ok) return Response.json(null, { status: res.status });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json(null, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = applyApiRateLimit(request);
  if (rateLimit) return rateLimit;
  try {
    const body = await request.json();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (INTERNAL_SECRET) headers['x-internal-api-key'] = INTERNAL_SECRET;

    const res = await fetch(`${BACKEND_URL}/alert-config`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[alert-config] Backend POST failed: ${res.status} ${text}`);
      return Response.json({ error: 'Failed to save alert config' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error('[alert-config] POST error:', err);
    return Response.json(null, { status: 503 });
  }
}
