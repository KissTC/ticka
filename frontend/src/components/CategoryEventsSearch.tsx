"use client";

import { useState, useMemo } from "react";
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
}

export default function CategoryEventsSearch({ events, categorySlug }: { events: Event[]; categorySlug: string }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.title.toLowerCase().includes(q));
  }, [query, events]);

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto w-full flex-1">
      {/* Buscador */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <p className="text-sm text-gray-400 font-inter shrink-0">
          {filtered.length} {filtered.length === 1 ? "contador" : "contadores"}
          {query && ` para "${query}"`}
        </p>
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar contadores..."
            className="glass-input w-full pl-8 pr-4 py-2.5 text-sm font-inter rounded-full"
            autoFocus={false}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-gray-400 font-inter">
          {query ? `Sin resultados para "${query}"` : "Esta categoría no tiene contadores todavía."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
              {event.is_sponsored && (
                <span className="absolute top-3 right-3 z-10 text-xs font-outfit font-bold text-amber-300 bg-amber-400/15 border border-amber-400/40 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  ★ {event.sponsor_label || "OFICIAL"}
                </span>
              )}
              <div className="relative z-10 p-6 mt-auto flex flex-col justify-end h-full">
                <h3 className="text-xl font-bold font-outfit text-white mb-2 leading-snug">
                  {event.title}
                </h3>
                <div className="flex justify-between items-center text-xs text-gray-300 font-inter">
                  <span>
                    {new Date(event.target_date).toLocaleDateString("es-ES", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                  <span>👁️ {event.views.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
