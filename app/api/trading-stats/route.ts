export async function GET() {
  try {
    const res = await fetch('http://localhost:3001/trading-stats', { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Trading stats unavailable' }, { status: 503 })
  }
}
