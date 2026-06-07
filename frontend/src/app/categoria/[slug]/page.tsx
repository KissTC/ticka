import Link from "next/link";
import type { Metadata } from "next";
import CategoryEventsSearch from "@/components/CategoryEventsSearch";

interface Event {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  thumbnail_url?: string;
  views: number;
}

interface CategoryDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_image_url: string;
  event_count: number;
  events: Event[];
}

async function getCategory(slug: string): Promise<CategoryDetail | null> {
  try {
    const apiURL = process.env.API_URL || "http://localhost:8082";
    const res = await fetch(`${apiURL}/api/categories/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Categoría no encontrada | ticka" };

  return {
    title: `${category.name} | ticka`,
    description: category.description || `Contadores de ${category.name} en ticka.`,
    openGraph: {
      title: `${category.name} | ticka`,
      images: category.cover_image_url ? [{ url: category.cover_image_url }] : [],
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center p-6 text-center">
        <h1 className="text-4xl font-extrabold font-outfit text-white mb-4">
          Categoría no encontrada
        </h1>
        <Link href="/categorias" className="glass-panel text-white px-6 py-3 rounded-full hover:bg-white/10 transition-all font-outfit">
          Ver todas las categorías
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero con imagen de portada */}
      <div className="relative h-72 md:h-96 flex flex-col justify-end overflow-hidden">
        {category.cover_image_url ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${category.cover_image_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-cyan-900" />
        )}

        {/* Nav sobre el hero */}
        <div className="absolute top-0 left-0 right-0 px-6 py-5 flex justify-between items-center z-10">
          <Link href="/" className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            ticka
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/categorias" className="text-sm text-gray-300 hover:text-white font-outfit transition-colors">
              ← Categorías
            </Link>
            <Link href="/create" className="glass-panel text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-white/10 transition-all font-outfit">
              Crear Contador
            </Link>
          </div>
        </div>

        {/* Título de la categoría */}
        <div className="relative z-10 px-6 pb-8 max-w-6xl w-full mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold font-outfit text-white mb-2 tracking-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-gray-300 font-inter text-base max-w-2xl">
              {category.description}
            </p>
          )}
          <p className="text-sm text-purple-300 font-outfit mt-2">
            {category.event_count} {category.event_count === 1 ? "contador" : "contadores"}
          </p>
        </div>
      </div>

      <CategoryEventsSearch events={category.events} categorySlug={category.slug} />
    </main>
  );
}
