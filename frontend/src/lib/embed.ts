// Opciones del widget embebible (/embed/<slug>) y armado del código para insertarlo.

export type EmbedTheme = "oscuro" | "claro" | "transparente";

export const EMBED_THEMES: { value: EmbedTheme; label: string }[] = [
  { value: "oscuro", label: "Oscuro (con foto)" },
  { value: "claro", label: "Claro" },
  { value: "transparente", label: "Transparente (OBS)" },
];

export const EMBED_SIZES = [
  { value: "chico", label: "Chico", width: 320, height: 180 },
  { value: "mediano", label: "Mediano", width: 480, height: 270 },
  { value: "grande", label: "Grande", width: 640, height: 360 },
  { value: "responsivo", label: "Ancho completo", width: 0, height: 0 }, // 100% de ancho, proporción 16:9
] as const;

export type EmbedSize = (typeof EMBED_SIZES)[number]["value"];

export interface EmbedOptions {
  theme: EmbedTheme;
  hideBrand: boolean; // solo se respeta si el dueño del contador es Pro
}

export function parseEmbedOptions(params: { tema?: string | string[]; marca?: string | string[] }): EmbedOptions {
  const tema = typeof params.tema === "string" ? params.tema : "";
  return {
    theme: tema === "claro" || tema === "transparente" ? tema : "oscuro",
    hideBrand: params.marca === "no",
  };
}

export function embedUrl(base: string, slug: string, opts: EmbedOptions): string {
  const q = new URLSearchParams();
  if (opts.theme !== "oscuro") q.set("tema", opts.theme);
  if (opts.hideBrand) q.set("marca", "no");
  const qs = q.toString();
  return `${base}/embed/${slug}${qs ? `?${qs}` : ""}`;
}

// color-scheme:normal en el iframe transparente: si la página que lo inserta usa un esquema
// distinto al del widget, el navegador le pinta un fondo opaco y deja de ser transparente.
export function embedCode(src: string, title: string, size: EmbedSize, theme: EmbedTheme): string {
  const s = EMBED_SIZES.find((x) => x.value === size) ?? EMBED_SIZES[1];
  const scheme = theme === "transparente" ? ";color-scheme:normal" : "";
  const dims =
    s.value === "responsivo"
      ? `style="width:100%;aspect-ratio:16/9;border:0;border-radius:16px${scheme}"`
      : `width="${s.width}" height="${s.height}" style="border:0;border-radius:16px${scheme}"`;
  const safeTitle = title.replace(/"/g, "&quot;");
  return `<iframe src="${src}" ${dims} title="Cuenta regresiva: ${safeTitle}" loading="lazy" allowtransparency="true"></iframe>`;
}

// Enlaces de vuelta desde el widget: llevan UTM para medir este canal (Tarea 1)
export function widgetLink(base: string, path: string): string {
  return `${base}${path}?utm_source=embed&utm_medium=widget`;
}
