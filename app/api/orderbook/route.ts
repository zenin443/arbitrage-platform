import { NextRequest } from 'next/server';
import { applyApiRateLimit } from '@/lib/api-rate-limit';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(request: NextRequest): Promise<Response> {
  const rateLimit = applyApiRateLimit(request);
  if (rateLimit) return rateLimit;
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const buyExchange = searchParams.get('buyExchange')
    const sellExchange = searchParams.get('sellExchange')

    if (!symbol || !buyExchange || !sellExchange) {
      return Response.json(
        { error: 'Missing required params: symbol, buyExchange, sellExchange' },
        { status: 400 }
      )
    }

    const res = await fetch(
      `${BACKEND_URL}/orderbook?symbol=${encodeURIComponent(symbol)}&buyExchange=${encodeURIComponent(buyExchange)}&sellExchange=${encodeURIComponent(sellExchange)}`,
      { cache: 'no-store' }
    )
    const data: unknown = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Server unreachable' }, { status: 503 })
  }
}
