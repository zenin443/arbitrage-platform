export async function POST() {
  try {
    const res = await fetch('http://localhost:3001/magnus/futures/reset', { method: 'POST', cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
