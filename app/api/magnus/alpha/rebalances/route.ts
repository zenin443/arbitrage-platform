import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.toString()
    const url = q
      ? `${BACKEND_URL}/magnus/alpha/rebalances?${q}`
      : `${BACKEND_URL}/magnus/alpha/rebalances`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
