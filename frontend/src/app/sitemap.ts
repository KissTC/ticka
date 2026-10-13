import type { MetadataRoute } from "next";
import { FECHAS } from "@/lib/fechas";

interface SlugEntry {
  slug: string;
  updated_at: string;
}

interface SitemapData {
  events: SlugEntry[];
  categories: string[];
}

async function getSitemapData(): Promise<SitemapData> {
  try {
    const apiURL = process.env.API_URL || "http://localhost:8082";
    const res = await fetch(`${apiURL}/api/sitemap-data`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { events: [], categories: [] };
    return await res.json();
  } catch {
    return { events: [], categories: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://ticka.dev";
  const data = await getSitemapData();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${base}/create`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/categorias`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
  ];

  const eventPages: MetadataRoute.Sitemap = data.events.map((e) => ({
    url: `${base}/c/${e.slug}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const categoryPages: MetadataRoute.Sitemap = data.categories.map((slug) => ({
    url: `${base}/categoria/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const fechaPages: MetadataRoute.Sitemap = [
    { url: `${base}/cuanto-falta`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    ...FECHAS.map((f) => ({
      url: `${base}/cuanto-falta/${f.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  return [...staticPages, ...fechaPages, ...eventPages, ...categoryPages];
}
