"use client";

import { useState, useRef, useCallback } from "react";

interface UnsplashPhoto {
  id: string;
  urls: { thumb: string; small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
  alt_description: string | null;
}

interface Props {
  onSelect: (url: string, thumbUrl: string, downloadLocation: string, authorName: string, authorUrl: string) => void;
  selectedId?: string | null;
  disabled?: boolean;
}

export default function UnsplashPicker({ onSelect, selectedId, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, p: number, append = false) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(q)}&page=${p}`);
      const data = await res.json();
      setPhotos((prev) => append ? [...prev, ...(data.results ?? [])] : (data.results ?? []));
      setTotalPages(data.total_pages ?? 0);
      setSearched(true);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setPhotos([]);
      setSearched(false);
      setPage(1);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setPage(1);
      doSearch(val, 1);
    }, 500);
  };

  const handleSelect = async (photo: UnsplashPhoto) => {
    onSelect(photo.urls.regular, photo.urls.small, photo.links.download_location, photo.user.name, photo.user.links.html);
    // trigger download per Unsplash guidelines (fire-and-forget)
    fetch("/api/unsplash/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ download_location: photo.links.download_location }),
    }).catch(() => {});
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(query, next, true);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="Buscar: playa, montaña, fiesta, ciudad..."
          className="glass-input pl-9 pr-4 py-3 text-sm font-inter w-full"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Results grid */}
      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(photo)}
                className={`relative aspect-video rounded-lg overflow-hidden group transition-all outline-none
                  ${selectedId === photo.id
                    ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-black/80"
                    : "ring-1 ring-white/5 hover:ring-purple-400/50"
                  }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.urls.thumb}
                  alt={photo.alt_description ?? "Unsplash photo"}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {selectedId === photo.id && (
                  <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                    <span className="text-white text-xl drop-shadow">✓</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white/80 truncate">{photo.user.name}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Load more */}
          {page < totalPages && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading || disabled}
              className="text-xs text-purple-400 hover:text-purple-300 font-inter py-1 transition-colors disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Ver más fotos"}
            </button>
          )}

          <p className="text-[10px] text-gray-600 font-inter">
            Fotos de{" "}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-400"
            >
              Unsplash
            </a>
          </p>
        </>
      )}

      {searched && !loading && photos.length === 0 && (
        <p className="text-center text-sm text-gray-500 font-inter py-4">
          Sin resultados para &quot;{query}&quot;
        </p>
      )}

      {!searched && !loading && (
        <p className="text-center text-xs text-gray-600 font-inter py-2">
          Escribe un tema para buscar fotos gratuitas de alta calidad
        </p>
      )}
    </div>
  );
}
