"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

// Al iniciar sesión, asigna a la cuenta los contadores creados como invitado en este navegador.
export default function GuestClaimer() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const running = useRef(false);

  useEffect(() => {
    if (!isSignedIn || running.current) return;

    let claims: Record<string, string>;
    try {
      claims = JSON.parse(localStorage.getItem("ticka_guest_claims") || "{}");
    } catch {
      return;
    }
    const entries = Object.entries(claims);
    if (entries.length === 0) return;

    running.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/proxy/api/users/me/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            claims: entries.map(([slug, claim_token]) => ({ slug, claim_token })),
          }),
        });
        if (!res.ok) return;
        const { claimed = [], invalid = [] }: { claimed?: string[]; invalid?: string[] } = await res.json();

        // Quitar reclamados e inválidos; los over_limit se conservan para reintentar si libera espacio
        const done = new Set([...claimed, ...invalid]);
        const remaining = Object.fromEntries(entries.filter(([slug]) => !done.has(slug)));
        localStorage.setItem("ticka_guest_claims", JSON.stringify(remaining));
        const slugs: string[] = JSON.parse(localStorage.getItem("ticka_guest_slugs") || "[]");
        localStorage.setItem("ticka_guest_slugs", JSON.stringify(slugs.filter((s) => !done.has(s))));

        if (claimed.length > 0) router.refresh();
      } catch {
      } finally {
        running.current = false;
      }
    })();
  }, [isSignedIn, getToken, router]);

  return null;
}
