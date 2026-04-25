export async function POST() {
  try {
    const res = await fetch('http://localhost:3001/magnus/alpha/reset', { method: 'POST' })
    const data = await res.json()
    return Response.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return Response.json({ error: 'Proxy failed' }, { status: 503 })
  }
}
