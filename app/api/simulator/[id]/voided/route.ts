export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url)
    const limit = url.searchParams.get('limit') ?? '30'
    const res = await fetch(
      `http://localhost:3001/simulator/${params.id}/voided?limit=${limit}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json([], { status: 503 })
  }
}
