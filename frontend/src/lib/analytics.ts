// Eventos personalizados de Umami. Si el script no cargó (local, bloqueadores) no hace nada.
type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

export function track(event: string, data?: Record<string, string | number>): void {
  try {
    (window as unknown as { umami?: Umami }).umami?.track(event, data);
  } catch {}
}
