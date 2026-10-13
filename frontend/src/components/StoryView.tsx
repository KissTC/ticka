"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

// Reloj compartido: notifica cada segundo; en el servidor es 0 (se muestran guiones hasta hidratar)
function subscribeClock(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverSeconds = () => 0;

const pad = (n: number) => String(n).padStart(2, "0");

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  slug: string;
  title: string;
  targetDate: string;
  timezone: string;
  imageUrl: string;
  isVideo: boolean;
  isPro: boolean;
  sponsorLabel?: string;
}

// Vista vertical 9:16 de un contador, pensada para captura de pantalla o para descargar como imagen
export default function StoryView({ slug, title, targetDate, timezone, imageUrl, isVideo, isPro, sponsorLabel }: Props) {
  const now = useSyncExternalStore(subscribeClock, nowSeconds, serverSeconds);
  const [showControls, setShowControls] = useState(true);
  // La imagen se prepara al abrir la vista: Chrome en Android solo permite navigator.share()
  // unos segundos después del toque, y generarla en ese momento tarda más que eso.
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);

  const loadImage = useCallback(async () => {
    const res = await fetch(`/c/${slug}/historia/imagen`);
    if (!res.ok) throw new Error("imagen");
    return new File([await res.blob()], `ticka-${slug}.png`, { type: "image/png" });
  }, [slug]);

  useEffect(() => {
    let alive = true;
    loadImage()
      .then((f) => alive && setFile(f))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [loadImage]);

  const diff = Math.max(0, Math.floor(new Date(targetDate).getTime() / 1000) - now);
  const ready = now > 0;
  const ended = ready && diff === 0;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const fecha = new Date(targetDate).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone || "UTC",
  });

  function handleImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (!file) {
      if (failed) {
        setFailed(false);
        loadImage().then(setFile).catch(() => setFailed(true));
      }
      return;
    }

    // En el celular, compartir directo a Instagram/WhatsApp; si no se puede (o el navegador lo rechaza), descargar
    if (navigator.canShare?.({ files: [file] })) {
      navigator
        .share({ files: [file], title })
        .then(() => track("historia-imagen", { modo: "compartir" }))
        .catch((err: Error) => {
          if (err.name === "AbortError") return;
          downloadFile(file);
          track("historia-imagen", { modo: "descarga" });
        });
    } else {
      downloadFile(file);
      track("historia-imagen", { modo: "descarga" });
    }
  }

  const buttonLabel = (ready: string) => (file ? ready : failed ? "↻ Reintentar imagen" : "Preparando imagen…");

  return (
    <main className="min-h-[100dvh] bg-[#05020f] flex flex-col items-center justify-center md:py-6 md:gap-4">
      {/* Marco 9:16: en el celular ocupa toda la pantalla; tocarlo oculta o muestra los botones */}
      <div
        onClick={() => setShowControls((v) => !v)}
        className="relative w-full h-[100dvh] md:w-auto md:h-[88vh] md:aspect-[9/16] md:rounded-3xl overflow-hidden cursor-pointer select-none"
      >
        {isVideo ? (
          <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" src={imageUrl} />
        ) : (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/90" />

        <div className="relative h-full flex flex-col items-center justify-between text-center px-8 pt-[12%] pb-[13%]">
          <div className="flex flex-col items-center gap-3">
            {!isPro && (
              <span className="text-3xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                ticka
              </span>
            )}
            {sponsorLabel && (
              <span className="text-xs font-outfit font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full uppercase tracking-widest">
                ★ {sponsorLabel}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-extrabold font-outfit text-white leading-tight tracking-tight drop-shadow-md mb-10">{title}</h1>

            {ended ? (
              <p className="text-5xl font-extrabold font-outfit text-purple-200">¡Ya comenzó! 🎉</p>
            ) : (
              <>
                <span className="text-sm font-outfit font-semibold tracking-[0.4em] text-white/75">FALTAN</span>
                <span className="text-[7.5rem] leading-none font-extrabold font-outfit text-white tracking-tighter">{ready ? days : "--"}</span>
                <span className="text-3xl font-bold font-outfit text-purple-200 -mt-1">{days === 1 ? "día" : "días"}</span>
                <span className="mt-6 text-3xl font-bold font-outfit text-white/90 tabular-nums tracking-wide">
                  {ready ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : "--:--:--"}
                </span>
                <span className="text-[0.65rem] font-inter text-white/50 tracking-[0.3em] mt-1">HORAS · MIN · SEG</span>
              </>
            )}

            <p className="mt-8 text-sm font-inter text-white/60 first-letter:uppercase">{fecha}</p>
          </div>

          {!isPro ? (
            <span className="text-sm font-outfit text-white bg-white/10 border border-white/20 rounded-full px-5 py-2">
              Crea tu cuenta regresiva en ticka.dev
            </span>
          ) : (
            <span />
          )}
        </div>

        {/* Botones sobre la imagen en el celular */}
        {showControls && (
          <div className="md:hidden absolute top-0 inset-x-0 p-4 flex justify-between items-start gap-2 bg-gradient-to-b from-black/70 to-transparent">
            <Link href={`/c/${slug}`} onClick={(e) => e.stopPropagation()} className="glass-panel text-white text-xs font-outfit px-3 py-2 rounded-full">
              ← Volver
            </Link>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleImage}
                disabled={!file && !failed}
                className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold font-outfit px-4 py-2 rounded-full disabled:opacity-60"
              >
                {buttonLabel("📲 Compartir imagen")}
              </button>
              <span className="text-[0.65rem] text-white/70 font-inter">Toca la pantalla para ocultar los botones</span>
              {failed && <span className="text-[0.65rem] text-red-300 font-inter">No se pudo generar la imagen.</span>}
            </div>
          </div>
        )}
      </div>

      {/* Botones debajo del marco en escritorio */}
      <div className="hidden md:flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/c/${slug}`} className="glass-panel text-white text-sm font-outfit px-5 py-2.5 rounded-full hover:bg-white/10 transition-all">
            ← Volver al contador
          </Link>
          <button
            onClick={handleImage}
            disabled={!file && !failed}
            className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-bold font-outfit px-6 py-2.5 rounded-full hover:opacity-95 transition-all disabled:opacity-60"
          >
            {buttonLabel("⬇️ Descargar imagen (1080×1920)")}
          </button>
        </div>
        {failed && <span className="text-xs text-red-300 font-inter">No se pudo generar la imagen.</span>}
      </div>
    </main>
  );
}
