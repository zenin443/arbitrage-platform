export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.toString()
    const url = q ? `http://localhost:3001/magnus/alpha/voided?${q}` : 'http://localhost:3001/magnus/alpha/voided'
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
