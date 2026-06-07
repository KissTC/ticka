"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import AnalyticsModal from "@/components/AnalyticsModal";

interface Event {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  thumbnail_url?: string;
  views: number;
  timezone: string;
  category_name?: string;
}

function ConfirmDialog({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4">
        <h3 className="text-lg font-bold font-outfit text-white">¿Eliminar contador?</h3>
        <p className="text-sm text-gray-400 font-inter">
          <span className="text-white font-semibold">"{title}"</span> será eliminado permanentemente.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 glass-panel text-gray-300 font-outfit font-semibold py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-outfit font-semibold py-2.5 rounded-xl transition-all text-sm"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  event,
  onSave,
  onCancel,
}: {
  event: Event;
  onSave: (slug: string, title: string, targetDate: string, timezone: string) => Promise<void>;
  onCancel: () => void;
}) {
  const initialDate = new Date(event.target_date)
    .toLocaleString("sv-SE", { timeZone: event.timezone || "UTC" })
    .slice(0, 16);

  const [title, setTitle] = useState(event.title);
  const [targetDate, setTargetDate] = useState(initialDate);
  const [timezone] = useState(event.timezone || "UTC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) { setError("Mínimo 3 caracteres"); return; }
    if (new Date(targetDate) <= new Date()) { setError("La fecha debe ser en el futuro"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(event.slug, title.trim(), targetDate, timezone);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 max-w-md w-full flex flex-col gap-4">
        <h3 className="text-lg font-bold font-outfit text-white">Editar contador</h3>

        {error && (
          <p className="text-sm text-red-400 font-inter bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            ⚠️ {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={saving}
            className="glass-input p-3 text-sm font-inter"
            autoFocus
          />
          <span className="text-xs text-gray-600 font-inter text-right">{title.length}/100</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">
            Fecha y hora · <span className="text-gray-500 normal-case">{timezone}</span>
          </label>
          <input
            type="datetime-local"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            disabled={saving}
            className="glass-input p-3 text-sm font-inter"
          />
        </div>

        <div className="flex gap-3 mt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 glass-panel text-gray-300 font-outfit font-semibold py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-outfit font-semibold py-2.5 rounded-xl hover:opacity-95 transition-all text-sm flex items-center justify-center gap-2"
          >
            {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</> : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DashboardClient({
  initialEvents,
  userPlan = "free",
}: {
  initialEvents: Event[];
  userPlan?: "free" | "pro";
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [analyticsEvent, setAnalyticsEvent] = useState<Event | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/proxy/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al abrir portal");
      setPortalLoading(false);
    }
  }

  async function parseError(res: Response): Promise<string> {
    try {
      const data = await res.json();
      return data.error || `Error ${res.status}`;
    } catch {
      return `Error ${res.status}: ${res.statusText || "respuesta inesperada del servidor"}`;
    }
  }

  async function handleDelete(event: Event) {
    setActionLoading(event.slug);
    try {
      const token = await getToken();
      const res = await fetch(`/api/proxy/api/events/${event.slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await parseError(res));
      setEvents((prev) => prev.filter((e) => e.slug !== event.slug));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setActionLoading(null);
      setDeletingEvent(null);
    }
  }

  async function handleSave(slug: string, title: string, targetDate: string, timezone: string) {
    const token = await getToken();
    const res = await fetch(`/api/proxy/api/events/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, target_date: targetDate, timezone }),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const updated = await res.json();
    setEvents((prev) =>
      prev.map((e) =>
        e.slug === slug ? { ...e, title: updated.title, target_date: updated.target_date } : e
      )
    );
    setEditingEvent(null);
    router.refresh();
  }

  if (events.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-16 text-center flex flex-col items-center gap-4">
        <span className="text-5xl">⏳</span>
        <p className="text-gray-300 font-outfit font-semibold text-lg">Sin contadores todavía</p>
        <p className="text-gray-500 font-inter text-sm max-w-sm">
          Crea tu primer contador, compártelo en redes y observa cómo crece.
        </p>
        <Link
          href="/create"
          className="mt-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-3 px-8 rounded-xl hover:opacity-95 transition-all"
        >
          Crear mi primer contador →
        </Link>
      </div>
    );
  }

  return (
    <>
      {analyticsEvent && (
        <AnalyticsModal
          slug={analyticsEvent.slug}
          title={analyticsEvent.title}
          totalViews={analyticsEvent.views}
          onClose={() => setAnalyticsEvent(null)}
        />
      )}
      {deletingEvent && (
        <ConfirmDialog
          title={deletingEvent.title}
          onConfirm={() => handleDelete(deletingEvent)}
          onCancel={() => setDeletingEvent(null)}
        />
      )}
      {editingEvent && (
        <EditModal
          event={editingEvent}
          onSave={handleSave}
          onCancel={() => setEditingEvent(null)}
        />
      )}

      {userPlan === "pro" && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="glass-panel text-sm font-outfit font-medium text-gray-300 hover:text-white px-4 py-2 rounded-full hover:bg-white/10 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {portalLoading ? (
              <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white" /> Abriendo portal...</>
            ) : (
              "⚙️ Gestionar suscripción"
            )}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((event) => (
          <div key={event.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col h-64 relative group">
            {/* Fondo — imagen o video según el tipo */}
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

            {/* Botones de acción — aparecen en hover */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => setAnalyticsEvent(event)}
                title="Analytics"
                className="bg-black/60 hover:bg-cyan-500/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-all backdrop-blur-sm"
              >
                📊
              </button>
              <button
                onClick={() => setEditingEvent(event)}
                title="Editar"
                className="bg-black/60 hover:bg-purple-500/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-all backdrop-blur-sm"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeletingEvent(event)}
                disabled={actionLoading === event.slug}
                title="Eliminar"
                className="bg-black/60 hover:bg-red-500/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-all backdrop-blur-sm disabled:opacity-50"
              >
                🗑️
              </button>
            </div>

            {/* Contenido */}
            <Link href={`/c/${event.slug}`} className="relative z-10 p-5 mt-auto flex flex-col">
              {event.category_name && (
                <span className="text-xs font-outfit font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full mb-1.5 inline-block w-fit">
                  {event.category_name}
                </span>
              )}
              <h3 className="text-lg font-bold font-outfit text-white leading-snug mb-1">
                {event.title}
              </h3>
              <div className="flex justify-between text-xs text-gray-400 font-inter">
                <span>
                  {new Date(event.target_date).toLocaleDateString("es-ES", {
                    day: "numeric", month: "short", year: "numeric",
                    timeZone: event.timezone || "UTC",
                  })}
                </span>
                <span>👁️ {event.views.toLocaleString()}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
