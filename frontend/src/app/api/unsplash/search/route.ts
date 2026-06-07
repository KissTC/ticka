import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const page = req.nextUrl.searchParams.get("page") ?? "1";
  const key = process.env.UNSPLASH_ACCESS_KEY;

  if (!key) {
    return NextResponse.json({ error: "Unsplash no configurado" }, { status: 503 });
  }
  if (!q.trim()) {
    return NextResponse.json({ results: [], total: 0, total_pages: 0 });
  }

  const url =
    `https://api.unsplash.com/search/photos` +
    `?query=${encodeURIComponent(q)}&per_page=20&page=${page}&orientation=landscape`;

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Error al buscar en Unsplash" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
