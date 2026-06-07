"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Event {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  thumbnail_url?: string;
  views: number;
  is_sponsored?: boolean;
  sponsor_label?: string;
  is_pinned?: boolean;
  category_slug?: string;
  category_name?: string;
}

const API = "/api/proxy";

export default function EventsWithSearch({ initial }: { initial: Event[] }) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<Event[]>(initial);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim() === "") {
      setEvents(initial);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/events?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, initial]);

  return (
    <section className="mb-20">
      {/* Buscador */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold font-outfit tracking-wide text-gray-300 shrink-0">
          🔥 Contadores más Populares
        </h2>
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contadores..."
            className="glass-input w-full pl-8 pr-4 py-2.5 text-sm font-inter rounded-full"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-purple-500 border-t-transparent" />
            </span>
          )}
        </div>
      </div>

      {/* Resultados */}
      {events.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-gray-400 font-inter">
          {query ? `Sin resultados para "${query}"` : "No hay contadores disponibles. ¡Sé el primero en crear uno!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link
              href={`/c/${event.slug}`}
              key={event.id}
              className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col h-72 group relative"
            >
              {/\.(mp4|webm|mov)$/i.test(event.image_url) ? (
                <>
                  <video
                    src={event.image_url}
                    className="absolute inset-0 w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                  <span className="absolute top-3 left-3 z-10 text-xs font-outfit font-semibold bg-black/60 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    ▶ Video
                  </span>
                </>
              ) : (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${event.thumbnail_url || event.image_url})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
              {event.is_sponsored && (
                <span className="absolute top-3 right-3 z-10 text-xs font-outfit font-bold text-amber-300 bg-amber-400/15 border border-amber-400/40 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  ★ {event.sponsor_label || "OFICIAL"}
                </span>
              )}
              <div className="relative z-10 p-6 mt-auto flex flex-col justify-end h-full">
                {event.category_slug && (
                  <span className="self-start mb-2 text-xs font-outfit font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                    {event.category_name}
                  </span>
                )}
                <h3 className="text-xl font-bold font-outfit text-white mb-2 leading-snug">
                  {event.title}
                </h3>
                <div className="flex justify-between items-center text-xs text-gray-300 font-inter">
                  <span>{new Date(event.target_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span>👁️ {event.views.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
