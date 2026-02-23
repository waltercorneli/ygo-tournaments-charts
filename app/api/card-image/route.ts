export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || !url.startsWith("https://images.ygoprodeck.com/")) {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    const imageRes = await fetch(url, { next: { revalidate: 86400 } });
    const buffer = await imageRes.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}
