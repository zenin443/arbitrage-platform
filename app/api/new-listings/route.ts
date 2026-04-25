export async function GET() {
  try {
    const res = await fetch('http://localhost:3001/new-listings', { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ listings: [], stats: null }, { status: 503 })
  }
}
