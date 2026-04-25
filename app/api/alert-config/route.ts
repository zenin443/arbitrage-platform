export async function GET() {
  try {
    const res = await fetch('http://localhost:3001/alert-config', { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await fetch('http://localhost:3001/alert-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
