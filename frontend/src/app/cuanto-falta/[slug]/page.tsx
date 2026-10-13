import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CountdownTimer from "@/components/CountdownTimer";
import CreateYourOwnCTA from "@/components/CreateYourOwnCTA";
import FechaCard, { fechasPorCercania } from "@/components/FechaCard";
import {
  FECHAS,
  TZ_MX,
  type FechaEspecial,
  type Ocurrencia,
  getFecha,
  estadoFecha,
  textoFaltan,
  formatoFecha,
  capitalizar,
  tituloFecha,
} from "@/lib/fechas";

// Las fechas se calculan al renderizar: se regenera cada 10 minutos para que "Faltan X días" no quede viejo
export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return FECHAS.map((f) => ({ slug: f.slug }));
}

function ahora(): Date {
  return new Date();
}

// Hora visible solo cuando no es medianoche (ej. el Grito a las 23:00)
function fechaLegible(o: Ocurrencia): string {
  const conHora = o.inicio.getUTCHours() !== 6;
  return capitalizar(formatoFecha(o.inicio, conHora));
}

// Respuesta corta a la pregunta: va en la meta descripción y visible en la página
function respuesta(fecha: FechaEspecial, now: Date): string {
  const { actual, siguiente } = estadoFecha(fecha, now);
  if (actual) return `${fecha.hoy} ${actual.etiqueta ? `${actual.etiqueta}. ` : ""}`.trim();
  if (!siguiente) return `Las próximas fechas de ${fecha.nombre} aún no se anuncian.`;
  const cual = siguiente.etiqueta ? ` (${siguiente.etiqueta})` : "";
  return `${textoFaltan(siguiente.inicio, now)} para ${fecha.nombre}${cual}: ${fechaLegible(siguiente)}.`;
}

// La quincena que cae en fin de semana suele pagarse el viernes anterior
function notaQuincena(o: Ocurrencia): string | null {
  const local = new Date(o.inicio.getTime() - 6 * 3600000);
  const dia = local.getUTCDay();
  if (dia !== 0 && dia !== 6) return null;
  const viernes = new Date(o.inicio.getTime() - (dia === 6 ? 1 : 2) * 86400000);
  return `Esta quincena cae en ${dia === 6 ? "sábado" : "domingo"}: muchas empresas pagan el ${formatoFecha(viernes).replace(/ de \d{4}$/, "")}.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const fecha = getFecha(slug);
  if (!fecha) return {};

  const titulo = tituloFecha(fecha);
  const description = `${respuesta(fecha, ahora())} ${fecha.descripcion}`;

  return {
    title: `${titulo} Cuenta regresiva en vivo | ticka`,
    description,
    alternates: { canonical: `/cuanto-falta/${fecha.slug}` },
    openGraph: { title: titulo, description, type: "website" },
    twitter: { card: "summary_large_image", title: titulo, description },
  };
}

export default async function FechaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fecha = getFecha(slug);
  if (!fecha) notFound();

  const now = ahora();
  const { actual, siguiente } = estadoFecha(fecha, now);
  const nota = fecha.slug === "quincena" && siguiente && !actual ? notaQuincena(siguiente) : null;
  const otras = fechasPorCercania(
    FECHAS.filter((f) => f.slug !== fecha.slug),
    now
  ).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: tituloFecha(fecha), acceptedAnswer: { "@type": "Answer", text: respuesta(fecha, now) } },
      ...fecha.preguntas.map((p) => ({
        "@type": "Question",
        name: p.pregunta,
        acceptedAnswer: { "@type": "Answer", text: p.respuesta },
      })),
    ],
  };

  return (
    <main
      className="relative min-h-screen flex flex-col items-center px-6 pb-10 overflow-hidden"
      style={{ backgroundImage: `linear-gradient(135deg, ${fecha.colores[0]}, ${fecha.colores[1]} 60%, #0a051b)` }}
    >
      <div className="absolute inset-0 bg-black/30" />

      <header className="relative z-10 w-full max-w-6xl flex justify-between items-center py-6">
        <Link href="/" className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          ticka
        </Link>
        <Link href="/cuanto-falta" className="text-sm text-gray-200 hover:text-white font-outfit font-medium transition-colors">
          Más fechas
        </Link>
      </header>

      {/* Contador */}
      <section className="relative z-10 w-full max-w-3xl glass-panel rounded-3xl p-8 md:p-12 text-center flex flex-col items-center mt-4">
        <span className="text-6xl mb-4" aria-hidden>
          {fecha.emoji}
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold font-outfit text-white mb-3 tracking-tight leading-tight">
          {tituloFecha(fecha)}
        </h1>

        {actual ? (
          <>
            <p className="text-2xl md:text-3xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 mb-2">
              🎉 {fecha.hoy}
            </p>
            {actual.etiqueta && <p className="text-gray-300 font-inter mb-2">{actual.etiqueta}</p>}
            {siguiente && (
              <p className="text-sm text-gray-400 font-inter mb-6">
                La siguiente: {fechaLegible(siguiente)}
              </p>
            )}
          </>
        ) : siguiente ? (
          <p className="text-gray-300 font-inter mb-8">
            <strong className="text-white">{textoFaltan(siguiente.inicio, now)}</strong>
            {siguiente.etiqueta ? ` · ${siguiente.etiqueta}` : ""} · {fechaLegible(siguiente)}
          </p>
        ) : (
          <p className="text-gray-300 font-inter mb-2">{respuesta(fecha, now)}</p>
        )}

        {siguiente && <CountdownTimer targetDate={siguiente.inicio.toISOString()} eventTimezone={TZ_MX} />}

        {nota && <p className="mt-6 text-sm text-amber-200/90 font-inter">💡 {nota}</p>}
      </section>

      <CreateYourOwnCTA origen={`fecha-${fecha.slug}`} />

      {/* Información útil */}
      <section className="relative z-10 w-full max-w-3xl glass-panel rounded-3xl p-6 md:p-8 mt-6 flex flex-col gap-5">
        <p className="text-gray-200 font-inter leading-relaxed">{fecha.descripcion}</p>
        {fecha.preguntas.map((p) => (
          <div key={p.pregunta}>
            <h2 className="text-lg font-bold font-outfit text-white mb-1">{p.pregunta}</h2>
            <p className="text-sm text-gray-300 font-inter leading-relaxed">{p.respuesta}</p>
          </div>
        ))}
      </section>

      {/* Otras fechas */}
      <section className="relative z-10 w-full max-w-3xl mt-10">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-xl font-bold font-outfit text-white">Otras fechas</h2>
          <Link href="/cuanto-falta" className="text-sm text-purple-300 hover:text-purple-200 font-inter">
            Ver todas →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {otras.map((f) => (
            <FechaCard key={f.slug} fecha={f} ahora={now} />
          ))}
        </div>
      </section>

      <footer className="relative z-10 mt-10 text-xs text-gray-400 font-inter text-center">
        Horas de la Ciudad de México · ticka - contadores virales y estéticos
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
