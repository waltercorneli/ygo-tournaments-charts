import { NextResponse } from "next/server";

type CardEntry = { card_images: { image_url_cropped: string }[] };

function extractUrls(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return (data as CardEntry[])
    .slice(0, 6)
    .map((c) => c.card_images?.[0]?.image_url_cropped)
    .filter(Boolean);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ imageUrls: [] }, { status: 400 });
  }

  // 1. Try by archetype name (returns multiple cards — take up to 6)
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?archetype=${encodeURIComponent(name)}&num=6&offset=0`,
      { next: { revalidate: 86400 } },
    );
    const json = await res.json();
    const imageUrls = extractUrls(json?.data);
    if (imageUrls.length > 0) return NextResponse.json({ imageUrls });
  } catch {
    // fall through
  }

  // 2. Fallback: fuzzy search by card name
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}&num=6&offset=0`,
      { next: { revalidate: 86400 } },
    );
    const json = await res.json();
    const imageUrls = extractUrls(json?.data);
    return NextResponse.json({ imageUrls });
  } catch {
    return NextResponse.json({ imageUrls: [] });
  }
}
