import Link from "next/link";
import { type FechaEspecial, estadoFecha, textoFaltan, formatoFecha, capitalizar } from "@/lib/fechas";

// Tarjeta de una fecha fija con su próxima ocurrencia (o "¡Hoy!" si está en curso)
export default function FechaCard({ fecha, ahora }: { fecha: FechaEspecial; ahora: Date }) {
  const { actual, siguiente } = estadoFecha(fecha, ahora);
  const proxima = siguiente && formatoFecha(siguiente.inicio);

  return (
    <Link
      href={`/cuanto-falta/${fecha.slug}`}
      className="glass-panel glass-panel-hover rounded-2xl p-4 flex items-center gap-4 transition-all"
      style={{ backgroundImage: `linear-gradient(135deg, ${fecha.colores[0]}66, ${fecha.colores[1]}33)` }}
    >
      <span className="text-3xl shrink-0" aria-hidden>
        {fecha.emoji}
      </span>
      <div className="min-w-0">
        <p className="text-white font-outfit font-bold leading-tight">{capitalizar(fecha.nombre)}</p>
        <p className="text-sm font-inter text-purple-200">
          {actual ? "¡Es hoy!" : siguiente ? textoFaltan(siguiente.inicio, ahora) : "Fecha por anunciar"}
        </p>
        {!actual && proxima && <p className="text-xs font-inter text-gray-400 truncate">{capitalizar(proxima)}</p>}
      </div>
    </Link>
  );
}

// Fechas ordenadas por cercanía (en curso primero, sin fecha anunciada al final)
export function fechasPorCercania(fechas: FechaEspecial[], ahora: Date): FechaEspecial[] {
  const clave = (f: FechaEspecial) => {
    const { actual, siguiente } = estadoFecha(f, ahora);
    if (actual) return -1;
    return siguiente ? siguiente.inicio.getTime() : Number.MAX_SAFE_INTEGER;
  };
  return [...fechas].sort((a, b) => clave(a) - clave(b));
}
