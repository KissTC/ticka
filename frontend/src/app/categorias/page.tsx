import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categorías | ticka",
  description: "Explora contadores agrupados por categoría: deportes, música, estrenos y más.",
};

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_image_url: string;
  event_count: number;
}

async function getCategories(): Promise<Category[]> {
  try {
    const apiURL = process.env.API_URL || "http://localhost:8082";
    const res = await fetch(`${apiURL}/api/categories`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function CategoriasPage() {
  const categories = await getCategories();

  return (
    <main className="min-h-screen px-6 py-12 max-w-6xl mx-auto flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center mb-16">
        <Link href="/" className="text-3xl font-extrabold font-outfit tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 neon-text-purple">
          ticka
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/categorias" className="text-sm text-purple-300 font-outfit font-medium">
            Categorías
          </Link>
          <Link href="/create" className="glass-panel text-white font-medium px-6 py-2.5 rounded-full hover:bg-white/10 hover:border-white/20 transition-all font-outfit">
            Crear Contador
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mb-12">
        <h1 className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight mb-4 leading-tight">
          Categorías
        </h1>
        <p className="text-lg text-gray-400 font-inter max-w-2xl">
          Contadores agrupados por tema. Encuentra los eventos que más te interesan.
        </p>
      </section>

      {/* Grid de categorías */}
      {categories.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-gray-400 font-inter flex-1">
          No hay categorías disponibles todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col h-64 group relative"
            >
              {/* Imagen de portada */}
              {cat.cover_image_url ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${cat.cover_image_url})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-cyan-900/40" />
              )}

              {/* Contenido */}
              <div className="relative z-10 p-6 mt-auto flex flex-col justify-end h-full">
                <h2 className="text-xl font-bold font-outfit text-white mb-1 leading-snug">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-xs text-gray-300 font-inter mb-2 line-clamp-2">
                    {cat.description}
                  </p>
                )}
                <span className="text-xs text-purple-300 font-outfit font-semibold">
                  {cat.event_count} {cat.event_count === 1 ? "contador" : "contadores"} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
