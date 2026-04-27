const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`${BACKEND_URL}/simulator/${params.id}/reset`, {
      method: 'POST',
    })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
