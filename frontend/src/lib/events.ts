// Lectura de un contador desde el backend (servidor) y utilidades para generar imágenes con next/og.

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  thumbnail_url?: string;
  views: number;
  timezone: string;
  owner_plan: string;
  is_sponsored: boolean;
  sponsor_label: string;
  description?: string;
  source_url?: string;
}

export async function getEvent(slug: string): Promise<PublicEvent | null> {
  try {
    const apiURL = process.env.API_URL || "http://localhost:8082";
    const res = await fetch(`${apiURL}/api/events/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(url);
}

// Satori solo soporta JPEG y PNG: cualquier otro formato (o un video) regresa "" y se usa un degradado.
export async function toDataUrl(url: string): Promise<string> {
  if (!url || isVideoUrl(url)) return "";
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

// Desglose del tiempo restante para la imagen de historia (estático: se genera al momento de descargarla)
export function tiempoRestante(targetDate: string, now: Date = new Date()): { valor: string; unidad: string; extra: string } | null {
  const ms = new Date(targetDate).getTime() - now.getTime();
  if (ms <= 0) return null;
  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  if (dias >= 1) {
    return { valor: String(dias), unidad: dias === 1 ? "día" : "días", extra: horas > 0 ? `y ${horas} ${horas === 1 ? "hora" : "horas"}` : "" };
  }
  if (horas >= 1) {
    return { valor: String(horas), unidad: horas === 1 ? "hora" : "horas", extra: minutos > 0 ? `y ${minutos} min` : "" };
  }
  return { valor: String(Math.max(minutos, 1)), unidad: "min", extra: "" };
}
