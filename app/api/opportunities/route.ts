import { NextResponse } from "next/server";

const PRICE_SERVER_URL = "http://localhost:3001";

/**
 * GET /api/opportunities
 * Proxies to the standalone price server running on port 3001.
 * Query params are forwarded as-is to the price server.
 *
 * Query params:
 *   minNetSpread  — Minimum net spread % filter (default: 0.05)
 *   minSpread     — Alias for minNetSpread
 *   limit         — Max results returned (default: 50, max: 200)
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const upstream = new URL(`${PRICE_SERVER_URL}/opportunities`);
  searchParams.forEach((value, key) => upstream.searchParams.set(key, value));

  if (!upstream.searchParams.has("minNetSpread") && !upstream.searchParams.has("minSpread")) {
    upstream.searchParams.set("minNetSpread", "0.05");
  }

  try {
    const res = await fetch(upstream.toString(), {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(body, { status: res.status });
    }

    const data = await res.json();
    console.log(`[/api/opportunities] Proxied ${data.count ?? 0} opportunity(ies) from price server`);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/opportunities] Failed to reach price server:", err);
    return NextResponse.json(
      { error: "Price server unavailable. Is it running? (npm run server)" },
      { status: 503 }
    );
  }
}
