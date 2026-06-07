"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface DayCount {
  date: string;
  count: number;
}

interface Referrer {
  source: string;
  count: number;
}

interface Analytics {
  views_by_day: DayCount[];
  referrers: Referrer[];
  total: number;
}

function BarChart({ data }: { data: DayCount[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm font-inter">
        Sin visitas registradas aún
      </div>
    );
  }

  // Rellenar los últimos 30 días con 0 si no hay datos
  const filled: DayCount[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = data.find((x) => x.date.slice(0, 10) === dateStr);
    filled.push({ date: dateStr, count: found?.count ?? 0 });
  }

  const maxCount = Math.max(...filled.map((d) => d.count), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-[3px] h-32">
        {filled.map((day, i) => {
          const height = Math.max((day.count / maxCount) * 100, day.count > 0 ? 8 : 2);
          const isToday = i === filled.length - 1;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              {day.count > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-inter px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {day.count} vista{day.count !== 1 ? "s" : ""}
                  <div className="text-gray-400">{day.date.slice(5)}</div>
                </div>
              )}
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isToday
                    ? "bg-gradient-to-t from-purple-600 to-cyan-400"
                    : day.count > 0
                    ? "bg-purple-500/70 group-hover:bg-purple-400"
                    : "bg-white/5"
                }`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      {/* Etiquetas de fecha cada 7 días */}
      <div className="flex justify-between mt-2 text-xs text-gray-600 font-inter">
        {[0, 7, 14, 21, 29].map((i) => (
          <span key={i}>{filled[i]?.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsModal({
  slug,
  title,
  totalViews,
  onClose,
}: {
  slug: string;
  title: string;
  totalViews: number;
  onClose: () => void;
}) {
  const { getToken } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`/api/proxy/api/events/${slug}/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
          throw new Error(err.error || "Error al cargar analytics");
        }
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, getToken]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel rounded-2xl p-6 w-full max-w-lg flex flex-col gap-5 my-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold font-outfit text-white">📊 Analytics</h3>
            <p className="text-sm text-gray-400 font-inter mt-0.5 truncate max-w-xs">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none ml-4 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 font-inter bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            ⚠️ {error}
          </div>
        )}

        {data && (
          <>
            {/* KPI total */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-3xl font-extrabold font-outfit text-white">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-gray-400 font-inter mt-1">Visitas totales</p>
              </div>
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-3xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                  {data.total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 font-inter mt-1">Registradas (últimos 30d)</p>
              </div>
            </div>

            {/* Gráfica */}
            <div>
              <p className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider mb-3">
                Visitas por día — últimos 30 días
              </p>
              <BarChart data={data.views_by_day} />
            </div>

            {/* Referrers */}
            {data.referrers.length > 0 && (
              <div>
                <p className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Origen de visitas
                </p>
                <div className="flex flex-col gap-2">
                  {data.referrers.map((ref) => {
                    const pct = data.total > 0 ? Math.round((ref.count / data.total) * 100) : 0;
                    return (
                      <div key={ref.source} className="flex items-center gap-3">
                        <span className="text-sm text-gray-300 font-inter w-28 shrink-0">{ref.source}</span>
                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-inter w-14 text-right shrink-0">
                          {ref.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
