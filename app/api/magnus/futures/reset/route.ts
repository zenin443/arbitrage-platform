const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST() {
  try {
    const res = await fetch(`${BACKEND_URL}/magnus/futures/reset`, { method: 'POST', cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
