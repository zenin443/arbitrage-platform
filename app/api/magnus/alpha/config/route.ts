export async function GET() {
  try {
    const res = await fetch('http://localhost:3001/magnus/alpha/config', { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const res = await fetch('http://localhost:3001/magnus/alpha/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body || '{}',
    })
    const data = await res.json()
    return Response.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return Response.json({ error: 'Proxy failed' }, { status: 503 })
  }
}
