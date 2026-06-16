import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cuenta regresiva en ticka";

interface Event {
  title: string;
  target_date: string;
  image_url: string;
  category_name?: string;
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

// Satori solo soporta JPEG y PNG — WebP/GIF crashean el renderer.
// El pipeline de upload convierte todo a JPEG, pero imágenes antiguas pueden ser otro formato.
async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const mime = res.headers.get("content-type") || "";
    if (!mime.includes("jpeg") && !mime.includes("jpg") && !mime.includes("png")) return "";
    const buffer = await res.arrayBuffer();
    return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return "";
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);

  const raw = await readFile(join(process.cwd(), "public/fonts/Outfit-Bold.ttf"));
  const fontData = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  const fonts = [{ name: "Outfit", data: fontData, weight: 700 as const, style: "normal" as const }];

  if (!event) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1a0b36, #0a051b)", fontFamily: "Outfit" }}>
        <span style={{ fontSize: 96, fontWeight: 800, color: "#c084fc" }}>ticka</span>
      </div>,
      { ...size, fonts }
    );
  }

  const imageDataUrl = await toDataUrl(event.image_url);

  const formattedDate = new Date(event.target_date).toLocaleDateString("es-ES", {
    weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

  const timeRemaining = formatTimeRemaining(event.target_date);

  const titleSize = event.title.length > 50 ? 54 : event.title.length > 28 ? 68 : 82;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: "#0a051b", fontFamily: "Outfit" }}>

        {/* Imagen de fondo (solo JPEG/PNG — base64 para Satori) */}
        {imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageDataUrl} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}

        {/* Overlay degradado */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to bottom, rgba(10,5,27,0.15) 0%, rgba(10,5,27,0.55) 40%, rgba(10,5,27,0.96) 100%)" }} />

        {/* Capa de contenido */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: "52px 64px" }}>

          {/* Header: logo + badge de categoría */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: "#c084fc", letterSpacing: "-1px" }}>ticka</span>
            {event.category_name ? (
              <span style={{ display: "flex", fontSize: 18, color: "#c084fc", border: "1.5px solid rgba(192,132,252,0.4)", borderRadius: 99, padding: "5px 18px", backgroundColor: "rgba(168,85,247,0.15)", fontWeight: 700 }}>
                {event.category_name}
              </span>
            ) : null}
          </div>

          {/* Título */}
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, color: "white", lineHeight: 1.08, letterSpacing: "-1.5px" }}>
            {event.title}
          </div>

          {/* Footer: tiempo restante + fecha */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: "#c084fc", letterSpacing: "-0.5px" }}>
              {timeRemaining}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
              {`${formattedDate} · ticka.dev`}
            </div>
          </div>
        </div>

        {/* Barra de acento inferior */}
        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "linear-gradient(to right, #a855f7, #22d3ee)" }} />
      </div>
    ),
    { ...size, fonts }
  );
}
