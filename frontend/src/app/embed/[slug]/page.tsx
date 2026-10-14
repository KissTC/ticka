import type { Metadata } from "next";
import EmbedCountdown from "@/components/EmbedCountdown";
import { getEvent, isVideoUrl } from "@/lib/events";
import { parseEmbedOptions, widgetLink } from "@/lib/embed";

export const metadata: Metadata = {
  // El widget vive dentro de otros sitios: Google debe indexar /c/<slug>, no esto
  robots: { index: false, follow: false },
};

// Widget embebible: /embed/<slug>?tema=oscuro|claro|transparente&marca=no
// - transparente: sin fondo, para usarlo como fuente de navegador en OBS
// - marca=no: oculta "ticka.dev" solo si el dueño del contador es Pro
export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tema?: string | string[]; marca?: string | string[] }>;
}) {
  const { slug } = await params;
  const { theme, hideBrand } = parseEmbedOptions(await searchParams);
  const event = await getEvent(slug);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://ticka.dev";

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white font-outfit text-sm">
        Contador no encontrado
      </div>
    );
  }

  const isPro = event.owner_plan === "pro";
  const showBrand = !(isPro && hideBrand);
  const isVideo = isVideoUrl(event.image_url);
  const text = theme === "claro" ? "text-gray-900" : "text-white";
  // En OBS el texto va sobre el juego o la cámara: sombra fuerte para que se lea sobre cualquier fondo
  const shadow = theme === "transparente" ? { textShadow: "0 0.4vmin 1.5vmin rgba(0,0,0,0.85)" } : undefined;

  return (
    <main
      className={`relative h-screen min-h-0 flex flex-col items-center justify-center overflow-hidden ${text} ${
        theme === "claro" ? "bg-gradient-to-br from-white via-purple-50 to-cyan-50" : theme === "oscuro" ? "bg-black" : ""
      }`}
      style={shadow}
    >
      {/* El fondo global del sitio se quita para que OBS (o la página que lo inserta) se vea detrás.
          color-scheme normal: si el iframe usa "dark" y la página que lo inserta no, Chrome le pinta un fondo opaco. */}
      {theme === "transparente" && <style>{`:root{color-scheme:normal!important}html,body{background:transparent!important}`}</style>}

      {theme === "oscuro" && (
        <>
          {isVideo ? (
            <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" src={event.image_url} />
          ) : (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${event.image_url})` }} />
          )}
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center gap-[4vmin] px-[5vmin] text-center w-full">
        {event.is_sponsored && event.sponsor_label && (
          <span className="text-[3vmin] font-outfit font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-[2.5vmin] py-[0.8vmin] rounded-full uppercase tracking-widest">
            ★ {event.sponsor_label}
          </span>
        )}

        <a
          href={widgetLink(base, `/c/${event.slug}`)}
          target="_blank"
          rel="noopener"
          className="text-[7vmin] font-extrabold font-outfit leading-tight line-clamp-2 hover:underline decoration-[0.4vmin] underline-offset-[1vmin]"
        >
          {event.title}
        </a>

        <EmbedCountdown targetDate={event.target_date} theme={theme} />
      </div>

      {showBrand && (
        <a
          href={widgetLink(base, "/")}
          target="_blank"
          rel="noopener"
          className={`absolute bottom-[2.5vmin] right-[3.5vmin] text-[3vmin] font-outfit transition-opacity opacity-60 hover:opacity-100 ${
            theme === "claro" ? "text-purple-700" : "text-white"
          }`}
        >
          ticka.dev
        </a>
      )}
    </main>
  );
}
