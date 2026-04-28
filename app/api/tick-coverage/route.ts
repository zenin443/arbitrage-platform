import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * GET /api/tick-coverage
 *
 * Diagnostic endpoint — proxies /tick-coverage from the price server.
 * Returns per-symbol exchange coverage broken down by quote currency,
 * plus a count of active gaps per quote currency.
 *
 * Use this in the browser to verify USDC/BTC tick data flow:
 *   fetch('/api/tick-coverage').then(r=>r.json()).then(console.log)
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/tick-coverage`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Price server unavailable', detail: String(err) },
      { status: 503 }
    );
  }
}
