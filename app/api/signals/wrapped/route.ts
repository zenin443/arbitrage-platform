const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/signals/wrapped`, { cache: 'no-store' })
    if (!res.ok) return Response.json([], { status: res.status })
    return Response.json(await res.json())
  } catch {
    return Response.json([], { status: 503 })
  }
}
