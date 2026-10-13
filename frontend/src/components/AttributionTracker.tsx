"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { captureAttribution, getAttribution } from "@/lib/attribution";

const SENT_KEY = "ticka_attribution_sent";

// Captura el origen de la primera visita y, al iniciar sesión, lo asocia a la cuenta (una vez por usuario).
export default function AttributionTracker() {
  const { isSignedIn, userId, getToken } = useAuth();
  const pathname = usePathname();
  const running = useRef(false);

  useEffect(() => {
    // El widget vive dentro de sitios ajenos: no es una visita a Ticka
    if (pathname?.startsWith("/embed/")) return;
    captureAttribution();
  }, [pathname]);

  useEffect(() => {
    if (!isSignedIn || !userId || running.current) return;
    try {
      if (localStorage.getItem(SENT_KEY) === userId) return;
    } catch {
      return;
    }
    const attribution = getAttribution();
    if (!attribution) return;

    running.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/proxy/api/users/me/attribution", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(attribution),
        });
        if (res.ok) localStorage.setItem(SENT_KEY, userId);
      } catch {
      } finally {
        running.current = false;
      }
    })();
  }, [isSignedIn, userId, getToken]);

  return null;
}
