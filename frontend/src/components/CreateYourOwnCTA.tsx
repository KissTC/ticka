"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

function isGuestOwner(slug?: string): boolean {
  if (!slug) return false;
  try {
    const slugs: string[] = JSON.parse(localStorage.getItem("ticka_guest_slugs") || "[]");
    return slugs.includes(slug);
  } catch {
    return false;
  }
}

const noSubscribe = () => () => {};

// Invita a quien llega a un contador compartido a crear el suyo.
// Se oculta para quien creó el contador como invitado (a esa persona le toca GuestBanner).
export default function CreateYourOwnCTA({ origen, slug }: { origen: string; slug?: string }) {
  const isOwner = useSyncExternalStore(noSubscribe, () => isGuestOwner(slug), () => false);

  if (isOwner) return null;

  return (
    <div className="relative z-10 w-full max-w-3xl mt-6 mb-4">
      <div className="glass-panel rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <p className="text-white font-outfit font-bold">¿Tienes tu propio evento?</p>
          <p className="text-sm text-gray-400 font-inter">
            Crea una cuenta regresiva para tu boda, cumpleaños o viaje en segundos. Gratis y sin registrarte.
          </p>
        </div>
        <Link
          href="/create"
          data-umami-event="crear-contador"
          data-umami-event-origen={origen}
          className="shrink-0 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-all"
        >
          Crear mi contador →
        </Link>
      </div>
    </div>
  );
}
