"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { EMBED_SIZES, EMBED_THEMES, type EmbedSize, type EmbedTheme, embedCode, embedUrl } from "@/lib/embed";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://ticka.dev";

// Modal para insertar un contador en otro sitio (iframe) o en OBS (fuente de navegador)
export default function EmbedModal({
  slug,
  title,
  isPro,
  onClose,
}: {
  slug: string;
  title: string;
  isPro: boolean; // plan del dueño del contador: solo Pro puede ocultar la marca
  onClose: () => void;
}) {
  const [theme, setTheme] = useState<EmbedTheme>("oscuro");
  const [size, setSize] = useState<EmbedSize>("mediano");
  const [hideBrand, setHideBrand] = useState(false);
  const [copied, setCopied] = useState<"codigo" | "url" | null>(null);

  const opts = { theme, hideBrand: isPro && hideBrand };
  const src = embedUrl(BASE, slug, opts);
  const code = embedCode(src, title, size, theme);
  const isObs = theme === "transparente";

  function copy(text: string, tipo: "codigo" | "url") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tipo);
      setTimeout(() => setCopied(null), 2000);
      track("embed-copiar", { tema: theme, tipo });
    });
  }

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-outfit font-semibold transition-all border ${
      active ? "bg-purple-500/30 border-purple-400/60 text-white" : "border-white/10 text-gray-400 hover:text-white"
    }`;

  // Portal a <body>: dentro de un panel con backdrop-filter, position: fixed quedaría atrapado en el panel
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-panel bg-[#0f0920]/95 rounded-2xl p-6 w-full max-w-2xl flex flex-col gap-5 my-auto text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-lg font-bold font-outfit text-white">Insertar contador</h3>
            <p className="text-xs text-gray-400 font-inter mt-0.5">
              Ponlo en tu web o blog, o úsalo como overlay en tu stream con OBS.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none" aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Opciones */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider w-16">Tema</span>
            {EMBED_THEMES.map((t) => (
              <button key={t.value} onClick={() => setTheme(t.value)} className={chip(theme === t.value)}>
                {t.label}
              </button>
            ))}
          </div>
          {!isObs && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-outfit font-bold text-gray-400 uppercase tracking-wider w-16">Tamaño</span>
              {EMBED_SIZES.map((s) => (
                <button key={s.value} onClick={() => setSize(s.value)} className={chip(size === s.value)}>
                  {s.label}
                  {s.width > 0 && <span className="text-gray-500 font-normal"> {s.width}×{s.height}</span>}
                </button>
              ))}
            </div>
          )}
          <label className={`flex items-center gap-2 text-sm font-inter ${isPro ? "text-gray-200 cursor-pointer" : "text-gray-500"}`}>
            <input
              type="checkbox"
              checked={isPro && hideBrand}
              disabled={!isPro}
              onChange={(e) => setHideBrand(e.target.checked)}
              className="w-4 h-4 accent-purple-500"
            />
            Ocultar &quot;ticka.dev&quot; del widget
            {!isPro && (
              <Link
                href="/upgrade"
                data-umami-event="hazte-pro"
                data-umami-event-origen="embed"
                className="text-xs text-purple-300 hover:text-purple-200 font-semibold"
              >
                Solo Pro →
              </Link>
            )}
          </label>
        </div>

        {/* Vista previa (mismo widget que verán los demás) */}
        <div
          className="rounded-xl overflow-hidden border border-white/10 aspect-video w-full"
          style={
            isObs
              ? { backgroundImage: "repeating-conic-gradient(#2a2440 0% 25%, #1c1730 0% 50%)", backgroundSize: "24px 24px" }
              : undefined
          }
        >
          <iframe
            key={src}
            src={embedUrl("", slug, opts)}
            title="Vista previa"
            className="w-full h-full border-0"
            style={isObs ? { colorScheme: "normal" } : undefined}
          />
        </div>

        {isObs ? (
          <div className="flex flex-col gap-3">
            <ol className="text-sm text-gray-300 font-inter list-decimal list-inside flex flex-col gap-1">
              <li>En OBS, agrega una fuente: <strong className="text-white">+ → Navegador</strong>.</li>
              <li>Pega esta URL y usa un tamaño de <strong className="text-white">800 × 450</strong>.</li>
              <li>Muévela y ajústala en tu escena. El fondo es transparente.</li>
            </ol>
            <div className="bg-black/40 rounded-xl p-3 font-mono text-xs text-gray-300 break-all border border-white/10">{src}</div>
            <button
              onClick={() => copy(src, "url")}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-2.5 rounded-xl text-sm hover:opacity-95 transition-all"
            >
              {copied === "url" ? "✅ ¡URL copiada!" : "Copiar URL para OBS"}
            </button>
            <button onClick={() => copy(code, "codigo")} className="text-xs text-gray-400 hover:text-white font-inter">
              {copied === "codigo" ? "✅ Código copiado" : "¿Lo quieres transparente en tu web? Copiar código del iframe"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-black/40 rounded-xl p-3 font-mono text-xs text-gray-300 break-all border border-white/10">{code}</div>
            <button
              onClick={() => copy(code, "codigo")}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-2.5 rounded-xl text-sm hover:opacity-95 transition-all"
            >
              {copied === "codigo" ? "✅ ¡Código copiado!" : "Copiar código"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Botón "Insertar" con su modal, para usarlo dentro de páginas del servidor
export function EmbedButton({ slug, title, isPro }: { slug: string; title: string; isPro: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          track("embed-abrir", { origen: "contador" });
        }}
        className="glass-panel bg-white/10 hover:bg-white/20 border-white/20 hover:scale-[1.03] active:scale-[0.98] transition-all font-outfit px-6 py-3 rounded-full text-white font-medium text-sm flex items-center gap-2 cursor-pointer"
      >
        {"</>"} Insertar
      </button>
      {open && <EmbedModal slug={slug} title={title} isPro={isPro} onClose={() => setOpen(false)} />}
    </>
  );
}
