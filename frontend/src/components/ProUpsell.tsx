import Link from "next/link";

// Precio de Pro en un solo lugar para los avisos de conversión (debe coincidir con Stripe y /upgrade).
export const PRO_PRICE = "$95 MXN/mes o $760 MXN/año";

const LIMIT_BENEFITS = [
  { icon: "♾️", text: "Contadores ilimitados" },
  { icon: "🎬", text: "Video de fondo en loop" },
  { icon: "📊", text: "Analytics: visitas por día y de dónde llegan" },
  { icon: "🚫", text: "Sin la marca de ticka" },
];

// Aviso cuando un usuario Free llega al límite de 3 contadores activos.
export function ProLimitCard({ origen }: { origen: string }) {
  return (
    <div className="glass-panel w-full rounded-2xl p-8 flex flex-col gap-5 border border-purple-500/30">
      <div>
        <p className="text-xs font-outfit font-semibold text-purple-400 uppercase tracking-widest">
          Plan gratuito · 3 de 3 contadores
        </p>
        <h2 className="text-xl font-bold font-outfit text-white mt-2">
          Llegaste al límite de contadores gratis
        </h2>
        <p className="text-sm text-gray-400 font-inter mt-1">
          Con Pro creas todos los que quieras, para cada evento que se te ocurra.
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {LIMIT_BENEFITS.map(({ icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm font-inter text-gray-200">
            <span>{icon}</span>
            {text}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <Link
          href="/upgrade"
          data-umami-event="hazte-pro"
          data-umami-event-origen={origen}
          className="w-full text-center bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-3.5 rounded-xl hover:opacity-95 transition-all shadow-lg shadow-purple-500/20"
        >
          Hazte Pro →
        </Link>
        <p className="text-center text-xs text-gray-500 font-inter">{PRO_PRICE} · Cancela cuando quieras</p>
      </div>

      <p className="text-center text-xs text-gray-500 font-inter">
        ¿Prefieres seguir gratis?{" "}
        <Link href="/dashboard" className="text-gray-300 hover:text-white underline underline-offset-2">
          Elimina un contador terminado
        </Link>{" "}
        para liberar espacio.
      </p>
    </div>
  );
}

// Visitas de ejemplo (fijas, para que no cambien en cada render) de la vista bloqueada.
const SAMPLE_VIEWS = [
  2, 0, 3, 1, 4, 2, 5, 3, 2, 6, 4, 8, 5, 3, 7, 9, 6, 4, 11, 8, 6, 13, 10, 7, 15, 12, 18, 14, 22, 19,
];

const SAMPLE_REFERRERS = [
  { source: "WhatsApp", pct: 46 },
  { source: "Instagram", pct: 27 },
  { source: "Directo", pct: 18 },
  { source: "X / Twitter", pct: 9 },
];

function SampleBars({ height = "h-20" }: { height?: string }) {
  const max = Math.max(...SAMPLE_VIEWS);
  return (
    <div className={`flex items-end gap-[3px] ${height}`}>
      {SAMPLE_VIEWS.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm ${
            i === SAMPLE_VIEWS.length - 1 ? "bg-gradient-to-t from-purple-600 to-cyan-400" : "bg-purple-500/70"
          }`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
        />
      ))}
    </div>
  );
}

// Analytics de ejemplo bajo un velo, con el llamado a Pro encima.
export function LockedAnalyticsPreview({
  totalViews,
  origen,
  compact = false,
}: {
  totalViews: number;
  origen: string;
  compact?: boolean;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden">
      <div aria-hidden className="blur-[3px] opacity-60 pointer-events-none select-none flex flex-col gap-4 p-1">
        <SampleBars height={compact ? "h-24" : "h-28"} />
        {!compact && (
          <div className="flex flex-col gap-2">
            {SAMPLE_REFERRERS.map((r) => (
              <div key={r.source} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 font-inter w-24 shrink-0">{r.source}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-xs text-gray-500 font-inter w-10 text-right">{r.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 bg-black/40 p-4">
        <p className="text-sm font-outfit font-semibold text-white">
          🔒 Así verías tus visitas con Pro
        </p>
        {!compact && (
          <p className="text-xs text-gray-300 font-inter max-w-xs">
            {totalViews > 0
              ? `Tu contador ya tiene ${totalViews.toLocaleString("es-MX")} ${totalViews === 1 ? "visita" : "visitas"}. Con Pro ves cuándo llegaron y de dónde: WhatsApp, Instagram, X…`
              : "Con Pro ves cuántas personas abren tu contador cada día y de dónde llegan: WhatsApp, Instagram, X…"}
          </p>
        )}
        <Link
          href="/upgrade"
          data-umami-event="hazte-pro"
          data-umami-event-origen={origen}
          className="mt-1 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-bold font-outfit py-2 px-5 rounded-xl hover:opacity-95 transition-all"
        >
          Ver con Pro →
        </Link>
      </div>
    </div>
  );
}
