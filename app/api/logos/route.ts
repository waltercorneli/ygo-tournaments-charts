import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const logosDir = path.join(process.cwd(), "public", "logos");
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(logosDir)
      .filter((f) =>
        [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(
          path.extname(f).toLowerCase(),
        ),
      );
  } catch {
    // directory doesn't exist or unreadable
  }
  return NextResponse.json({ logos: files });
}
