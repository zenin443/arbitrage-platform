const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/new-listings`, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ listings: [], stats: null }, { status: 503 })
  }
}
