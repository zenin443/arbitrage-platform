export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const res = await fetch(`http://localhost:3001/alerts?limit=${limit}`, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ alerts: [], stats: null }, { status: 503 })
  }
}
