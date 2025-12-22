export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "frontend",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  )
}
