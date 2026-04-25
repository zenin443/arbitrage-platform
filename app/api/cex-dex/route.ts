export async function GET() {
  try {
    const res = await fetch("http://localhost:3001/cex-dex", {
      cache: "no-store",
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json([], { status: 503 });
  }
}
