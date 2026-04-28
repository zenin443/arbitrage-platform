import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const rateLimit = applyApiRateLimit(req);
  if (rateLimit) return rateLimit;
  try {
    const res = await fetch(`${BACKEND_URL}/alert-config`, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = applyApiRateLimit(request);
  if (rateLimit) return rateLimit;
  try {
    const body = await request.json()
    const res = await fetch(`${BACKEND_URL}/alert-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
