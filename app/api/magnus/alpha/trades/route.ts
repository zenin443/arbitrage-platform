const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.toString()
    const url = q
      ? `${BACKEND_URL}/magnus/alpha/trades?${q}`
      : `${BACKEND_URL}/magnus/alpha/trades`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
