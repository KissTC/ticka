import { NextRequest, NextResponse } from "next/server";

// Unsplash guidelines: trigger a download when a user uses a photo
export async function POST(req: NextRequest) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({}, { status: 204 });

  const { download_location } = await req.json().catch(() => ({}));
  if (!download_location) return NextResponse.json({}, { status: 204 });

  await fetch(download_location, {
    headers: { Authorization: `Client-ID ${key}` },
  }).catch(() => {});

  return NextResponse.json({}, { status: 204 });
}
