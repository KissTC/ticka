"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Cierra el embudo en Umami: hazte-pro → suscribirse → pro-activado.
// Se cuenta una vez por sesión de Stripe aunque se recargue la página.
export default function TrackProActivated() {
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "sin-sesion";
    const key = `ticka_pro_activado_${sessionId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    // Umami carga con defer: si aún no está listo, se reintenta un momento después.
    let tries = 0;
    const send = () => {
      const umami = (window as unknown as { umami?: unknown }).umami;
      if (umami || tries >= 10) return track("pro-activado");
      tries++;
      setTimeout(send, 500);
    };
    send();
  }, []);
  return null;
}
