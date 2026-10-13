import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getEvent, toDataUrl, tiempoRestante, stillImageUrl } from "@/lib/events";

// Imagen vertical 1080×1920 para historias de Instagram, TikTok y estados de WhatsApp.
// Se genera al momento ("Faltan X días" cambia), con caché corta en el CDN.
const size = { width: 1080, height: 1920 };

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return new Response("Contador no encontrado", { status: 404 });

  const raw = await readFile(join(process.cwd(), "public/fonts/Outfit-Bold.ttf"));
  const fontData = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  const fonts = [{ name: "Outfit", data: fontData, weight: 700 as const, style: "normal" as const }];

  const isPro = event.owner_plan === "pro";
  const fondo = await toDataUrl(stillImageUrl(event));
  const restante = tiempoRestante(event.target_date);
  const fecha = new Date(event.target_date).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: event.timezone || "UTC",
  });
  const tituloSize = event.title.length > 60 ? 76 : event.title.length > 30 ? 96 : 116;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", backgroundColor: "#0a051b", fontFamily: "Outfit" }}>
        {fondo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fondo} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(160deg, #3b0764, #0a051b 55%, #083344)" }} />
        )}

        {/* Oscurecer para que el texto se lea sobre cualquier foto */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to bottom, rgba(10,5,27,0.55) 0%, rgba(10,5,27,0.35) 35%, rgba(10,5,27,0.65) 65%, rgba(10,5,27,0.95) 100%)" }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: "140px 90px 150px" }}>
          {/* Arriba: marca (oculta en Pro) y badge de patrocinado */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            {!isPro ? <span style={{ fontSize: 64, color: "#c084fc", letterSpacing: "-1px" }}>ticka</span> : null}
            {event.is_sponsored ? (
              <span style={{ display: "flex", fontSize: 30, color: "#fcd34d", border: "2px solid rgba(252,211,77,0.45)", borderRadius: 99, padding: "8px 28px", backgroundColor: "rgba(251,191,36,0.12)" }}>
                {`★ ${event.sponsor_label || "OFICIAL"}`}
              </span>
            ) : null}
          </div>

          {/* Centro: título y tiempo restante */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", fontSize: tituloSize, color: "white", lineHeight: 1.08, letterSpacing: "-2px", marginBottom: 90 }}>
              {event.title}
            </div>

            {restante ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 44, color: "rgba(255,255,255,0.75)", letterSpacing: "10px" }}>FALTAN</span>
                <span style={{ fontSize: 340, color: "white", lineHeight: 1, letterSpacing: "-12px", marginTop: 10 }}>{restante.valor}</span>
                <span style={{ fontSize: 96, color: "#d8b4fe", lineHeight: 1 }}>{restante.unidad}</span>
                {restante.extra ? (
                  <span style={{ fontSize: 44, color: "rgba(255,255,255,0.7)", marginTop: 24 }}>{restante.extra}</span>
                ) : null}
              </div>
            ) : (
              <span style={{ fontSize: 110, color: "#d8b4fe" }}>¡Ya comenzó! 🎉</span>
            )}

            <span style={{ fontSize: 38, color: "rgba(255,255,255,0.6)", marginTop: 70 }}>{fecha}</span>
          </div>

          {/* Abajo: invitación (oculta en Pro) */}
          {!isPro ? (
            <div style={{ display: "flex", fontSize: 38, color: "white", backgroundColor: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.25)", borderRadius: 99, padding: "20px 44px" }}>
              Crea tu cuenta regresiva en ticka.dev
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>

        {!isPro ? (
          <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, right: 0, height: 12, background: "linear-gradient(to right, #a855f7, #22d3ee)" }} />
        ) : null}
      </div>
    ),
    {
      ...size,
      fonts,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Disposition": `inline; filename="ticka-${event.slug}.png"`,
      },
    }
  );
}
