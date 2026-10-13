import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StoryView from "@/components/StoryView";
import { getEvent, isVideoUrl } from "@/lib/events";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Contador No Encontrado | ticka" };
  return {
    title: `${event.title} · Historia | ticka`,
    // Es una vista alterna del contador: Google debe indexar /c/<slug>, no esta
    robots: { index: false, follow: true },
    alternates: { canonical: `/c/${event.slug}` },
  };
}

export default async function HistoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <StoryView
      slug={event.slug}
      title={event.title}
      targetDate={event.target_date}
      timezone={event.timezone}
      imageUrl={event.image_url}
      isVideo={isVideoUrl(event.image_url)}
      isPro={event.owner_plan === "pro"}
      sponsorLabel={event.is_sponsored ? event.sponsor_label || "OFICIAL" : undefined}
    />
  );
}
