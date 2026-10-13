import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FECHAS, getFecha, estadoFecha, textoFaltan, formatoFecha, capitalizar, tituloFecha } from "@/lib/fechas";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cuenta regresiva en ticka";
export const revalidate = 600;

export function generateStaticParams() {
  return FECHAS.map((f) => ({ slug: f.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fecha = getFecha(slug);

  const raw = await readFile(join(process.cwd(), "public/fonts/Outfit-Bold.ttf"));
  const fontData = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  const fonts = [{ name: "Outfit", data: fontData, weight: 700 as const, style: "normal" as const }];

  const now = new Date();
  const estado = fecha ? estadoFecha(fecha, now) : null;
  const linea = !fecha || !estado
    ? ""
    : estado.actual
      ? fecha.hoy
      : estado.siguiente
        ? textoFaltan(estado.siguiente.inicio, now)
        : "Fechas por anunciar";
  const fechaTexto = estado?.siguiente && !estado.actual ? capitalizar(formatoFecha(estado.siguiente.inicio)) : "";
  const [c1, c2] = fecha?.colores ?? ["#1a0b36", "#0a051b"];

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: `linear-gradient(135deg, ${c1}, ${c2} 60%, #0a051b)`, fontFamily: "Outfit" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: "52px 64px" }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: "#c084fc", letterSpacing: "-1px" }}>ticka</span>

          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "white", lineHeight: 1.08, letterSpacing: "-1.5px" }}>
            {fecha ? tituloFecha(fecha) : "Cuenta regresiva"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#e9d5ff", letterSpacing: "-0.5px" }}>{linea}</div>
            <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
              {fechaTexto ? `${fechaTexto} · ticka.dev` : "ticka.dev"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "linear-gradient(to right, #a855f7, #22d3ee)" }} />
      </div>
    ),
    { ...size, fonts }
  );
}
