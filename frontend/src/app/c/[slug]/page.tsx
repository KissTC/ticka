import { Metadata } from "next";
import Link from "next/link";
import CountdownTimer from "@/components/CountdownTimer";
import GuestBanner from "@/components/GuestBanner";

interface Event {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  views: number;
  timezone: string;
  owner_plan: string;
  is_sponsored: boolean;
  sponsor_label: string;
  description?: string;
  source_url?: string;
}

// 1. Obtener datos del evento en el servidor (para SEO y SSR de Open Graph)
async function getEvent(slug: string): Promise<Event | null> {
  try {
    const apiURL = process.env.API_URL || "http://localhost:8082";
    const res = await fetch(`${apiURL}/api/events/${slug}`, {
      cache: "no-store", // Evita el cache para asegurar conteo de visitas actualizado
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error al obtener el evento:", error);
    return null;
  }
}

function formatTimeRemaining(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return "¡Ya comenzó!";
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 7) return `Faltan ${days} días`;
  if (days > 0) return `Faltan ${days}d ${hours}h`;
  if (hours > 0) return `Faltan ${hours}h ${minutes}min`;
  return `Faltan ${minutes}min`;
}

// 2. Inyección dinámica de etiquetas meta de Open Graph
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEvent(resolvedParams.slug);
  if (!event) {
    return {
      title: "Contador No Encontrado | ticka",
    };
  }

  const timeStr = formatTimeRemaining(event.target_date);
  const ogTitle = `${event.title} · ${timeStr}`;
  const ogDescription = `${timeStr} para ${event.title}. Mira la cuenta regresiva en vivo en ticka.dev`;

  return {
    title: `${event.title} | ticka`,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
      // og:image es generado automáticamente por opengraph-image.tsx
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      // twitter:image es generado automáticamente desde la og:image
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const event = await getEvent(resolvedParams.slug);

  if (!event) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center p-6 text-center">
        <h1 className="text-4xl font-extrabold font-outfit text-white mb-4">404 - Contador No Encontrado</h1>
        <p className="text-gray-400 font-inter mb-8">El contador que estás buscando no existe o fue eliminado.</p>
        <Link href="/" className="glass-panel text-white px-6 py-3 rounded-full hover:bg-white/10 transition-all font-outfit">
          Ir a Inicio
        </Link>
      </main>
    );
  }

  const isPro = event.owner_plan === "pro";
  const isVideo = /\.(mp4|webm|mov)$/i.test(event.image_url);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://ticka.gg";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.target_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    url: `${base}/c/${event.slug}`,
    image: event.image_url,
    organizer: {
      "@type": "Organization",
      name: "ticka",
      url: base,
    },
  };

  return (
    <main className="relative min-h-screen flex flex-col justify-between items-center p-6 overflow-hidden">
      {/* Fondo de pantalla completa — imagen o video según el tipo */}
      {isVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={event.image_url}
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${event.image_url})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Header — oculto en Pro */}
      {!isPro ? (
        <header className="relative z-10 w-full max-w-6xl flex justify-between items-center py-4">
          <Link href="/" className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            ticka
          </Link>
          <Link href="/create" className="glass-panel text-white font-medium text-sm px-5 py-2 rounded-full hover:bg-white/10 transition-all font-outfit">
            Crear Nuevo
          </Link>
        </header>
      ) : (
        <div className="relative z-10 h-14" />
      )}

      {/* Caja de Vidrio del Contador */}
      <div className="relative z-10 my-auto w-full max-w-3xl glass-panel rounded-3xl p-8 md:p-12 text-center flex flex-col justify-center">
        {event.is_sponsored && (
          <span className="inline-block mb-4 text-xs font-outfit font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full uppercase tracking-widest">
            ★ {event.sponsor_label || "OFICIAL"}
          </span>
        )}
        <h2 className="text-3xl md:text-5xl font-extrabold font-outfit text-white mb-8 tracking-tight drop-shadow-md leading-tight">
          {event.title}
        </h2>

        <CountdownTimer targetDate={event.target_date} eventTimezone={event.timezone} slug={event.slug} />

        <div className="mt-6 text-sm text-gray-400 font-inter">
          👁️ {event.views.toLocaleString()} visitas
        </div>

        {(event.description || event.source_url) && (
          <details className="mt-4 group">
            <summary className="cursor-pointer list-none flex items-center justify-center gap-1.5 text-xs text-gray-400 font-inter hover:text-gray-300 transition-colors">
              <span>Detalles</span>
              <svg className="w-3 h-3 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.65a.75.75 0 01-1.08 0l-4.25-4.65a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2 items-center text-center">
              {event.description && (
                <p className="text-sm text-gray-300 font-inter leading-relaxed">{event.description}</p>
              )}
              {event.source_url && (
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-inter transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.657-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                    <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.657 5.656l3-3a4 4 0 00-.225-5.865z" />
                  </svg>
                  {event.is_sponsored ? "Sitio oficial" : "Fuente"}
                </a>
              )}
            </div>
          </details>
        )}
      </div>

      <GuestBanner slug={event.slug} />

      {/* Footer — oculto en Pro */}
      {!isPro && (
        <footer className="relative z-10 w-full max-w-lg flex flex-col items-center gap-4 mb-4">
          <div className="text-xs text-gray-500 font-inter">
            ticka - contadores virales y estéticos
          </div>
        </footer>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
