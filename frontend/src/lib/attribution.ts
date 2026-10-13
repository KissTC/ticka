// Atribución first-touch: de dónde llegó el visitante la primera vez.
// Se guarda una sola vez en localStorage y se envía al crear un contador y al iniciar sesión.

export interface Attribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  ref: string;
  referrer: string; // solo el host externo, ej. "google.com"
  landing_path: string;
}

const KEY = "ticka_attribution";

// Un referrer desde Ticka (o sus subdominios, como el de Clerk) no es una fuente externa
function isOwnHost(host: string): boolean {
  return host === window.location.hostname || host === "ticka.dev" || host.endsWith(".ticka.dev");
}

export function captureAttribution(): void {
  try {
    if (localStorage.getItem(KEY)) return;

    const params = new URLSearchParams(window.location.search);
    let referrer = "";
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (!isOwnHost(host)) referrer = host;
    }

    const attribution: Attribution = {
      utm_source: params.get("utm_source") ?? "",
      utm_medium: params.get("utm_medium") ?? "",
      utm_campaign: params.get("utm_campaign") ?? "",
      ref: params.get("ref") ?? "",
      referrer,
      landing_path: window.location.pathname,
    };
    localStorage.setItem(KEY, JSON.stringify(attribution));
  } catch {}
}

export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}
