import type { Metadata } from "next";
import Link from "next/link";
import FechaCard, { fechasPorCercania } from "@/components/FechaCard";
import CreateYourOwnCTA from "@/components/CreateYourOwnCTA";
import { FECHAS } from "@/lib/fechas";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "¿Cuánto falta para…? Fechas importantes de México | ticka",
  description:
    "Cuentas regresivas en vivo para la quincena, el aguinaldo, Navidad, Año Nuevo, El Buen Fin, Día de Muertos, el próximo día festivo y más fechas de México.",
  alternates: { canonical: "/cuanto-falta" },
};

function ahora(): Date {
  return new Date();
}

export default function CuantoFaltaPage() {
  const now = ahora();
  const fechas = fechasPorCercania(FECHAS, now);

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto flex flex-col items-center">
      <header className="w-full flex justify-between items-center mb-12">
        <Link href="/" className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          ticka
        </Link>
        <Link href="/categorias" className="text-sm text-gray-300 hover:text-white font-outfit font-medium transition-colors">
          Categorías
        </Link>
      </header>

      <section className="text-center mb-10">
        <h1 className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight mb-4 leading-tight">
          ¿Cuánto falta para…?
        </h1>
        <p className="text-gray-400 font-inter text-lg max-w-2xl mx-auto">
          Las fechas que todo México está esperando, con su cuenta regresiva en vivo. Ordenadas de la más cercana a la más lejana.
        </p>
      </section>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fechas.map((f) => (
          <FechaCard key={f.slug} fecha={f} ahora={now} />
        ))}
      </div>

      <CreateYourOwnCTA origen="fechas-indice" />
    </main>
  );
}
