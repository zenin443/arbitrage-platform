export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`http://localhost:3001/simulator/${params.id}/reset`, {
      method: 'POST',
    })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json(null, { status: 503 })
  }
}
