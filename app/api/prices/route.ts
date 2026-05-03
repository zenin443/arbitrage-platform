import { NextRequest, NextResponse } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;

  try {
    const res = await fetch(`${BACKEND_URL}/prices`, { next: { revalidate: 0 } });

    if (!res.ok) {
      throw new Error(`Price server responded with status ${res.status}`);
    }

    const raw = await res.json();
    // Normalise: backend returns a PriceTick[] array.
    // Each tick has `exchangeId` (e.g. "binance") and `source` (transport: "ws"|"rest").
    // We add an explicit `exchange` alias = `exchangeId` so consumers never accidentally
    // read `source` ("ws"/"rest") as the exchange name.
    const ticks: Record<string, unknown>[] = Array.isArray(raw) ? raw : (raw?.ticks ?? []);
    const enriched = ticks.map((t) => ({
      ...t,
      exchange: t['exchangeId'] ?? t['exchange'] ?? '',
    }));
    console.log(`[/api/prices] Proxied ${enriched.length} tick(s) from price server`);
    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[/api/prices] Failed to reach price server:', err);
    return NextResponse.json(
      { error: 'Price server unavailable. Is it running? (npm run server)' },
      { status: 503 }
    );
  }
}
