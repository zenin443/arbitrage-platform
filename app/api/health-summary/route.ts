import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  try {
    const res = await fetch(`${BACKEND_URL}/stats`, { cache: 'no-store' });
    if (!res.ok) {
      return Response.json({ exchanges: 0, symbols: 0 }, { status: 200 });
    }
    const data = await res.json() as {
      total: number;
      byExchange: Record<string, number>;
      bySymbol: Record<string, number>;
    };

    return Response.json({
      exchanges: Object.keys(data.byExchange ?? {}).length,
      symbols: Object.keys(data.bySymbol ?? {}).length,
    });
  } catch {
    return Response.json({ exchanges: 0, symbols: 0 }, { status: 200 });
  }
}
