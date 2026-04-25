export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`http://localhost:3001/simulator/${params.id}`, { cache: 'no-store' })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
