const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url)
    const limit = url.searchParams.get('limit') ?? '50'
    const res = await fetch(
      `${BACKEND_URL}/simulator/${params.id}/trades?limit=${limit}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json([], { status: 503 })
  }
}
