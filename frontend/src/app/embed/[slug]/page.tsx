import CountdownTimer from "@/components/CountdownTimer";

interface Event {
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  timezone: string;
  is_sponsored: boolean;
  sponsor_label: string;
}

async function getEvent(slug: string): Promise<Event | null> {
  try {
    const apiURL = process.env.API_URL || "http://localhost:8082";
    const res = await fetch(`${apiURL}/api/events/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white font-outfit text-sm">
        Contador no encontrado
      </div>
    );
  }

  const isVideo = /\.(mp4|webm|mov)$/i.test(event.image_url);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* Fondo */}
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
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" />

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center w-full max-w-lg">
        {event.is_sponsored && event.sponsor_label && (
          <span className="text-xs font-outfit font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full uppercase tracking-widest">
            ★ {event.sponsor_label}
          </span>
        )}

        <h1 className="text-2xl md:text-3xl font-extrabold font-outfit text-white leading-tight">
          {event.title}
        </h1>

        <CountdownTimer
          targetDate={event.target_date}
          eventTimezone={event.timezone}
        />
      </div>

      {/* Powered by */}
      <a
        href="https://ticka.gg"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-4 text-xs text-white/30 hover:text-white/60 font-outfit transition-colors"
      >
        ticka.gg
      </a>
    </main>
  );
}
