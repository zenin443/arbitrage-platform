import { NextResponse } from "next/server";

const PRICE_SERVER_URL = "http://localhost:3001";

/**
 * GET /api/prices
 * Proxies to the standalone price server running on port 3001.
 * The price server maintains persistent WebSocket connections to exchanges.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch(`${PRICE_SERVER_URL}/prices`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Price server responded with status ${res.status}`);
    }

    const data = await res.json();
    console.log(`[/api/prices] Proxied ${data.ticks?.length ?? 0} tick(s) from price server`);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/prices] Failed to reach price server:", err);
    return NextResponse.json(
      { error: "Price server unavailable. Is it running? (npm run server)" },
      { status: 503 }
    );
  }
}
