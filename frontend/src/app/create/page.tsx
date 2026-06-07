"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import UnsplashPicker from "@/components/UnsplashPicker";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [allTimezones, setAllTimezones] = useState<string[]>([
    "UTC", "America/Mexico_City", "America/New_York", "America/Los_Angeles",
    "Europe/Madrid", "Europe/London", "Asia/Tokyo",
  ]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageTab, setImageTab] = useState<"upload" | "unsplash">("upload");
  const [unsplashUrl, setUnsplashUrl] = useState<string | null>(null);
  const [unsplashThumbUrl, setUnsplashThumbUrl] = useState<string | null>(null);
  const [unsplashPhotoId, setUnsplashPhotoId] = useState<string | null>(null);
  const [unsplashAuthor, setUnsplashAuthor] = useState<{ name: string; url: string } | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if ("supportedValuesOf" in Intl) {
      setAllTimezones((Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"));
    }
  }, []);

  useEffect(() => {
    fetch("/api/proxy/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isImage && !isVideo) {
        setError("El archivo debe ser una imagen o video.");
        return;
      }
      if (isVideo && !isSignedIn) {
        setError("El video de fondo es exclusivo de usuarios Pro. Inicia sesión para continuar.");
        e.target.value = "";
        return;
      }
      if (isImage && file.size > 20 * 1024 * 1024) {
        setError("La imagen no puede superar los 20 MB.");
        return;
      }
      if (isVideo && file.size > 100 * 1024 * 1024) {
        setError("El video no puede superar los 100 MB.");
        return;
      }
      setError(null);
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      setError("El título debe tener al menos 3 caracteres.");
      return;
    }
    if (trimmedTitle.length > 100) {
      setError("El título no puede superar los 100 caracteres.");
      return;
    }
    if (!targetDate) {
      setError("Por favor selecciona una fecha.");
      return;
    }
    if (new Date(targetDate) <= new Date()) {
      setError("La fecha debe ser en el futuro.");
      return;
    }
    if (!image && !unsplashUrl) {
      setError("Por favor selecciona una imagen, video o foto de Unsplash.");
      return;
    }

    if (image) {
      const isVideo = image.type.startsWith("video/");
      if (isVideo && !isSignedIn) {
        setError("El video de fondo es exclusivo de usuarios Pro. Inicia sesión para continuar.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let imageUrl: string;
      let thumbnailUrl: string | undefined;

      const token = await getToken();

      if (unsplashUrl) {
        // Foto de Unsplash: usar la URL directamente sin subir a Spaces
        imageUrl = unsplashUrl;
        thumbnailUrl = unsplashThumbUrl ?? undefined;
      } else {
        // 1. Subir el archivo (imagen o video Pro)
        const uploadData = new FormData();
        uploadData.append("image", image!);

        const isVideo = image!.type.startsWith("video/");
        const uploadHeaders: Record<string, string> = {};
        if (isVideo && token) uploadHeaders["Authorization"] = `Bearer ${token}`;

        const uploadRes = await fetch("/api/proxy/api/upload", {
          method: "POST",
          headers: uploadHeaders,
          body: uploadData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: "Error al subir el archivo" }));
          throw new Error(err.error || "No se pudo subir el archivo.");
        }

        const { url, thumbnail_url } = await uploadRes.json();
        imageUrl = url;
        thumbnailUrl = thumbnail_url ?? undefined;
      }

      // 2. Registrar el evento en base de datos
      const eventRes = await fetch("/api/proxy/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          target_date: targetDate,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          timezone,
          category_id: categoryId || undefined,
        }),
      });

      if (!eventRes.ok) {
        throw new Error("No se pudo registrar la cuenta regresiva.");
      }

      const event = await eventRes.json();
      
      // 3. Redirigir al contador dinámico recién creado
      router.push(`/c/${event.slug}`);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12 flex flex-col justify-center items-center max-w-xl mx-auto">
      <header className="mb-8 text-center">
        <Link href="/" className="text-3xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          ticka
        </Link>
        <h1 className="text-2xl font-bold font-outfit mt-4 text-white">
          Crea tu Cuenta Regresiva Estética
        </h1>
        <p className="text-sm text-gray-400 font-inter mt-2 max-w-sm mx-auto">
          Dale una imagen, un título y una fecha. En segundos tendrás tu propio contador viral listo para compartir.
        </p>
      </header>

      {/* Beneficios rápidos */}
      <div className="flex gap-4 mb-6 flex-wrap justify-center">
        {[
          { icon: "🔗", text: "URL propia para compartir" },
          { icon: "📱", text: "Vista previa en WhatsApp y redes" },
          { icon: "⚡", text: "Listo en segundos" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-gray-300 font-inter">
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="glass-panel w-full rounded-2xl p-8 flex flex-col gap-6 relative">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl font-inter">
            ⚠️ {error}
          </div>
        )}

        {/* Título del evento */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold font-outfit text-gray-300">Título del Evento</label>
            <span className={`text-xs font-inter ${title.length > 90 ? "text-orange-400" : "text-gray-500"}`}>
              {title.length}/100
            </span>
          </div>
          <input
            type="text"
            placeholder="Ej. Mi Viaje a Japón ✈️"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            maxLength={100}
            className="glass-input p-3.5 text-base font-inter"
            required
          />
        </div>

        {/* Fecha objetivo */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold font-outfit text-gray-300">Fecha y Hora Objetivo</label>
          <input
            type="datetime-local"
            value={targetDate}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            onChange={(e) => setTargetDate(e.target.value)}
            disabled={loading}
            className="glass-input p-3.5 text-base font-inter"
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-inter">🌐 Zona horaria del evento</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={loading}
              className="glass-input p-2.5 text-sm font-inter appearance-none cursor-pointer"
            >
              {allTimezones.map((tz) => (
                <option key={tz} value={tz} style={{ background: "#0a051b" }}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Categoría (opcional, solo si existen) */}
        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold font-outfit text-gray-300">
              Categoría <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loading}
              className="glass-input p-3.5 text-base font-inter appearance-none cursor-pointer"
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

        {/* Imagen o Video de Fondo */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-outfit text-gray-300">Fondo del Contador</label>
            <span className="text-xs font-inter text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              Video ✦ Pro
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => { setImageTab("upload"); setUnsplashUrl(null); setUnsplashThumbUrl(null); setUnsplashPhotoId(null); setUnsplashAuthor(null); }}
              className={`flex-1 text-xs font-inter font-medium py-2 rounded-lg transition-all ${
                imageTab === "upload"
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              📁 Subir archivo
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setImageTab("unsplash"); setImage(null); setImagePreview(null); }}
              className={`flex-1 text-xs font-inter font-medium py-2 rounded-lg transition-all ${
                imageTab === "unsplash"
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              🔍 Galería Unsplash
            </button>
          </div>

          {/* Preview (siempre visible si hay selección) */}
          {(imagePreview || unsplashUrl) && (
            <div className="relative rounded-2xl h-36 overflow-hidden bg-black/20">
              {imagePreview && image?.type.startsWith("video/") ? (
                <video
                  autoPlay muted loop playsInline
                  src={imagePreview}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${unsplashUrl ?? imagePreview ?? ""})` }}
                />
              )}
              {unsplashAuthor && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                  <p className="text-[10px] text-white/70 font-inter">
                    Foto por{" "}
                    <a
                      href={`${unsplashAuthor.url}?utm_source=ticka&utm_medium=referral`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white"
                    >
                      {unsplashAuthor.name}
                    </a>{" "}
                    en{" "}
                    <a
                      href="https://unsplash.com?utm_source=ticka&utm_medium=referral"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white"
                    >
                      Unsplash
                    </a>
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setImage(null); setImagePreview(null);
                  setUnsplashUrl(null); setUnsplashThumbUrl(null); setUnsplashPhotoId(null); setUnsplashAuthor(null);
                }}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Tab: Subir archivo */}
          {imageTab === "upload" && !imagePreview && (
            <div className="relative border-2 border-dashed border-white/10 hover:border-purple-500/40 rounded-2xl h-32 flex flex-col justify-center items-center cursor-pointer transition-all overflow-hidden bg-black/20">
              <div className="flex flex-col items-center justify-center text-center text-gray-400 p-4 font-inter">
                <span className="text-3xl mb-2">🎬</span>
                <span className="text-sm font-semibold text-white">Arrastra o haz clic para subir</span>
                <span className="text-xs text-gray-500 mt-1">Imagen HD · Video MP4/WebM (Pro)</span>
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleImageChange}
                disabled={loading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          )}

          {/* Tab: Unsplash */}
          {imageTab === "unsplash" && (
            <UnsplashPicker
              onSelect={(url, thumbUrl, downloadLocation, authorName, authorUrl) => {
                setUnsplashUrl(url);
                setUnsplashThumbUrl(thumbUrl);
                setUnsplashPhotoId(downloadLocation);
                setUnsplashAuthor({ name: authorName, url: authorUrl });
              }}
              selectedId={unsplashPhotoId}
              disabled={loading}
            />
          )}
        </div>

        {/* Botón de Creación */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-4 rounded-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              {unsplashUrl ? "Creando tu contador..." : "Procesando y Subiendo a Spaces..."}
            </>
          ) : (
            "Generar Mi Contador →"
          )}
        </button>

        <p className="text-center text-xs text-gray-500 font-inter">
          Tu contador tendrá su propia URL para compartir en redes sociales y WhatsApp
        </p>
      </form>
    </main>
  );
}
