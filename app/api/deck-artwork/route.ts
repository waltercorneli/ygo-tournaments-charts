import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }

  // 1. Try by archetype name
  let imageUrl: string | null = null;

  try {
    const archetypeRes = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?archetype=${encodeURIComponent(name)}&num=1&offset=0`,
      { next: { revalidate: 86400 } },
    );
    const archetypeData = await archetypeRes.json();
    imageUrl =
      archetypeData?.data?.[0]?.card_images?.[0]?.image_url_cropped ?? null;
  } catch {
    imageUrl = null;
  }

  // 2. Fallback: fuzzy search by card name
  if (!imageUrl) {
    try {
      const fnameRes = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}&num=1&offset=0`,
        { next: { revalidate: 86400 } },
      );
      const fnameData = await fnameRes.json();
      imageUrl =
        fnameData?.data?.[0]?.card_images?.[0]?.image_url_cropped ?? null;
    } catch {
      imageUrl = null;
    }
  }

  return NextResponse.json({ imageUrl });
}
