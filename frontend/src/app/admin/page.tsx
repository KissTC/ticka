"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const API = "/api/proxy";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_image_url: string;
  event_count: number;
}

interface Event {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  thumbnail_url?: string;
  views: number;
  category_name?: string;
  category_slug?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />;
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  const base = "text-sm p-3 rounded-xl font-inter border";
  const styles =
    type === "success"
      ? `${base} bg-emerald-500/10 border-emerald-500/30 text-emerald-300`
      : `${base} bg-red-500/10 border-red-500/30 text-red-400`;
  return <div className={styles}>{type === "success" ? "✅" : "⚠️"} {msg}</div>;
}

function ImageDropzone({
  preview,
  onChange,
  disabled,
}: {
  preview: string | null;
  onChange: (file: File) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative border-2 border-dashed border-white/10 hover:border-purple-500/40 rounded-xl h-32 flex items-center justify-center overflow-hidden transition-all bg-black/20 cursor-pointer">
      {preview ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} />
      ) : (
        <span className="text-gray-500 text-sm font-inter">📸 Seleccionar imagen</span>
      )}
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [tab, setTab] = useState<"categories" | "events" | "sponsored">("categories");

  // Leer token guardado en sessionStorage al montar
  useEffect(() => {
    setSavedToken(sessionStorage.getItem("adminToken"));
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("adminToken", token);
    setSavedToken(token);
  }

  function handleLogout() {
    sessionStorage.removeItem("adminToken");
    setSavedToken(null);
    setToken("");
  }

  if (!savedToken) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <form onSubmit={handleLogin} className="glass-panel w-full max-w-sm rounded-2xl p-8 flex flex-col gap-5">
          <div className="text-center">
            <Link href="/" className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              ticka
            </Link>
            <p className="text-gray-400 text-sm font-inter mt-1">Panel de administración</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-outfit font-bold text-gray-300">Token de acceso</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••"
              className="glass-input p-3.5 text-base font-inter"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-3 rounded-xl hover:opacity-95 transition-all"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            ticka
          </Link>
          <span className="text-xs font-outfit text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
            admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-400 hover:text-white font-inter transition-colors">
            Ver sitio →
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-400 font-inter transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 glass-panel rounded-xl p-1 w-fit mb-8">
        {(["categories", "events", "sponsored"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-outfit font-semibold transition-all ${
              tab === t
                ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "categories" ? "Categorías" : t === "events" ? "Contadores" : "★ Patrocinados"}
          </button>
        ))}
      </div>

      {tab === "categories" ? (
        <CategoriesTab token={savedToken} />
      ) : tab === "events" ? (
        <EventsTab token={savedToken} />
      ) : (
        <SponsoredTab token={savedToken} />
      )}
    </main>
  );
}

// ─── Tab: Categorías ──────────────────────────────────────────────────────────

function CategoriesTab({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTimed = useCallback((f: typeof feedback) => {
    setFeedback(f);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      let coverUrl = "";

      // 1. Subir imagen si se seleccionó
      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        const uploadRes = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
        if (!uploadRes.ok) throw new Error("Error subiendo la imagen de portada");
        const { url } = await uploadRes.json();
        coverUrl = url;
      }

      // 2. Crear categoría
      const res = await fetch(`${API}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), cover_image_url: coverUrl }),
      });

      if (res.status === 401) throw new Error("Token inválido — cierra sesión y vuelve a entrar");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear la categoría");
      }

      const created = await res.json();
      setTimed({ type: "success", msg: `Categoría "${name}" creada. Slug: /${created.slug}` });
      setName(""); setDescription(""); setImageFile(null); setImagePreview(null);
      loadCategories();
    } catch (err: unknown) {
      setTimed({ type: "error", msg: err instanceof Error ? err.message : "Error inesperado" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold font-outfit text-white">Nueva Categoría</h2>

        {feedback && <Toast msg={feedback.msg} type={feedback.type} />}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Mundial 2026"
            className="glass-input p-3 text-sm font-inter"
            required
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve de la categoría"
            rows={2}
            disabled={loading}
            className="glass-input p-3 text-sm font-inter resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Imagen de portada</label>
          <ImageDropzone
            preview={imagePreview}
            onChange={(f) => { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-3 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <><Spinner /> Creando...</> : "Crear Categoría"}
        </button>
      </form>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold font-outfit text-white">
          Categorías existentes <span className="text-gray-500 font-normal text-sm">({categories.length})</span>
        </h2>

        {categories.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-center text-gray-500 text-sm font-inter">
            Sin categorías todavía
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="glass-panel rounded-xl p-4 flex items-center gap-4">
                {cat.cover_image_url ? (
                  <div
                    className="w-12 h-12 rounded-lg bg-cover bg-center flex-shrink-0"
                    style={{ backgroundImage: `url(${cat.cover_image_url})` }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                    🗂️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold font-outfit text-white truncate">{cat.name}</p>
                  <p className="text-xs text-gray-500 font-inter">/{cat.slug} · {cat.event_count} contadores</p>
                </div>
                <Link
                  href={`/categoria/${cat.slug}`}
                  target="_blank"
                  className="text-xs text-purple-400 hover:text-purple-300 font-outfit transition-colors flex-shrink-0"
                >
                  ver →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Contadores ──────────────────────────────────────────────────────────

function EventsTab({ token }: { token: string }) {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [lastSlug, setLastSlug] = useState<string | null>(null);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTimed = useCallback((f: typeof feedback) => {
    setFeedback(f);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 5000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [catRes, evRes] = await Promise.all([
        fetch(`${API}/api/categories`),
        fetch(`${API}/api/events`),
      ]);
      const catData = await catRes.json();
      const evData = await evRes.json();
      setCategories(Array.isArray(catData) ? catData : []);
      setEvents(Array.isArray(evData) ? evData : []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !targetDate || !imageFile) {
      setTimed({ type: "error", msg: "Título, fecha e imagen son obligatorios" });
      return;
    }
    setLoading(true);

    try {
      // 1. Subir imagen
      const fd = new FormData();
      fd.append("image", imageFile);
      const uploadRes = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error("Error subiendo la imagen");
      const { url: imageUrl } = await uploadRes.json();

      // 2. Crear evento
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const evRes = await fetch(`${API}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          target_date: targetDate,
          image_url: imageUrl,
          timezone,
          category_id: categoryId || undefined,
        }),
      });

      if (!evRes.ok) {
        const err = await evRes.json();
        throw new Error(err.error || "Error al crear el contador");
      }

      const ev = await evRes.json();
      setLastSlug(ev.slug);
      setTimed({ type: "success", msg: `"${title}" creado → /c/${ev.slug}` });

      // Resetear solo título, fecha e imagen — mantener categoría para crear varios seguidos
      setTitle(""); setTargetDate(""); setImageFile(null); setImagePreview(null);
      loadData();
    } catch (err: unknown) {
      setTimed({ type: "error", msg: err instanceof Error ? err.message : "Error inesperado" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold font-outfit text-white">Nuevo Contador</h2>
          <p className="text-xs text-gray-500 font-inter mt-0.5">
            La categoría se mantiene al crear varios seguidos
          </p>
        </div>

        {feedback && (
          <div className="flex flex-col gap-2">
            <Toast msg={feedback.msg} type={feedback.type} />
            {feedback.type === "success" && lastSlug && (
              <Link
                href={`/c/${lastSlug}`}
                target="_blank"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-inter transition-colors"
              >
                Abrir contador creado →
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. España vs Marruecos · Grupo B"
            className="glass-input p-3 text-sm font-inter"
            required
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Fecha y hora *</label>
          <input
            type="datetime-local"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="glass-input p-3 text-sm font-inter"
            required
            disabled={loading}
          />
          <p className="text-xs text-gray-600 font-inter">
            Zona horaria: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loading}
              className="glass-input p-3 text-sm font-inter appearance-none cursor-pointer"
            >
              <option value="" style={{ background: "#0a051b" }}>Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} style={{ background: "#0a051b" }}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Imagen de fondo *</label>
          <ImageDropzone
            preview={imagePreview}
            onChange={(f) => { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !title || !targetDate || !imageFile}
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-3 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <><Spinner /> Subiendo imagen...</> : "Crear Contador"}
        </button>
      </form>

      {/* Lista de eventos recientes */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold font-outfit text-white">
          Recientes <span className="text-gray-500 font-normal text-sm">({events.length})</span>
        </h2>

        {events.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-center text-gray-500 text-sm font-inter">
            Sin contadores todavía
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
            {events.map((ev) => (
              <div key={ev.id} className="glass-panel rounded-xl p-3 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${ev.thumbnail_url || ev.image_url})` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold font-outfit text-white truncate">{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ev.category_name && (
                      <span className="text-xs text-purple-300 font-outfit">{ev.category_name}</span>
                    )}
                    <span className="text-xs text-gray-500 font-inter">
                      {new Date(ev.target_date).toLocaleDateString("es-ES", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-gray-600 font-inter">👁️ {ev.views}</span>
                  </div>
                </div>
                <Link
                  href={`/c/${ev.slug}`}
                  target="_blank"
                  className="text-xs text-purple-400 hover:text-purple-300 font-outfit transition-colors flex-shrink-0"
                >
                  ver →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Patrocinados ────────────────────────────────────────────────────────

function SponsoredTab({ token }: { token: string }) {
  const [slug, setSlug] = useState("");
  const [isSponsored, setIsSponsored] = useState(true);
  const [sponsorLabel, setSponsorLabel] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTimed = useCallback((f: typeof feedback) => {
    setFeedback(f);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 5000);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/admin/events/${slug.trim()}/sponsor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_sponsored: isSponsored, sponsor_label: sponsorLabel.trim(), is_pinned: isPinned }),
      });

      if (res.status === 401) throw new Error("Token inválido");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }

      setTimed({ type: "success", msg: `"${slug}" actualizado correctamente` });
      setSlug("");
      setSponsorLabel("");
      setIsSponsored(true);
      setIsPinned(false);
    } catch (err: unknown) {
      setTimed({ type: "error", msg: err instanceof Error ? err.message : "Error inesperado" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold font-outfit text-white">Gestionar Patrocinado</h2>
          <p className="text-xs text-gray-500 font-inter mt-0.5">
            Marca un contador existente como patrocinado y/o fijado en la homepage.
          </p>
        </div>

        {feedback && <Toast msg={feedback.msg} type={feedback.type} />}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Slug del contador *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Ej. mexico-vs-south-africa-88072"
            className="glass-input p-3 text-sm font-inter"
            required
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-gray-600 font-inter">Lo encuentras en la URL: /c/<strong>slug</strong></p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider">Label del patrocinador</label>
          <input
            type="text"
            value={sponsorLabel}
            onChange={(e) => setSponsorLabel(e.target.value)}
            placeholder="Ej. Oficial EA Sports · FIFA 26"
            maxLength={100}
            className="glass-input p-3 text-sm font-inter"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSponsored}
              onChange={(e) => setIsSponsored(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 accent-purple-500"
            />
            <span className="text-sm font-inter text-gray-200">Marcar como patrocinado (badge ★ OFICIAL)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 accent-cyan-500"
            />
            <span className="text-sm font-inter text-gray-200">Fijar en el top de la homepage</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !slug.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-3 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <><Spinner /> Guardando...</> : "Actualizar contador"}
        </button>
      </form>

      {/* Info embed */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold font-outfit text-white">Código de embed</h2>
        <p className="text-sm text-gray-400 font-inter">
          Una vez patrocinado, el cliente puede embeber este iframe en su web:
        </p>
        <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-gray-300 break-all border border-white/10 whitespace-pre">
          {`<iframe\n  src="https://ticka.gg/embed/${slug || "SLUG"}" \n  width="500" height="300"\n  frameborder="0"\n></iframe>`}
        </div>
        <p className="text-xs text-gray-500 font-inter">
          Funciona con imagen o video de fondo. Incluye "Powered by ticka.gg".
        </p>
      </div>
    </div>
  );
}
