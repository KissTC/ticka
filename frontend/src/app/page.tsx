import Link from "next/link";
import EventsWithSearch from "@/components/EventsWithSearch";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

interface Event {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  thumbnail_url?: string;
  views: number;
  category_slug?: string;
  category_name?: string;
}

async function getPopularEvents(): Promise<Event[]> {
  try {
    const apiURL = process.env.API_URL || "http://localhost:8082";
    const res = await fetch(`${apiURL}/api/events`, { 
      cache: "no-store", // Evita el cache para cargar visitas en tiempo real en cada render
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    return [];
  }
}

export default async function HomePage() {
  const events = await getPopularEvents();

  return (
    <main className="min-h-screen px-6 py-12 max-w-6xl mx-auto flex flex-col justify-between">
      {/* Header */}
      <header className="flex justify-between items-center mb-16">
        <Link href="/" className="text-3xl font-extrabold font-outfit tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 neon-text-purple">
          ticka
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/categorias" className="text-sm text-gray-300 hover:text-white font-outfit font-medium transition-colors">
            Categorías
          </Link>
          <Show when="signed-in">
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white font-outfit font-medium transition-colors">
              Mis Contadores
            </Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm text-gray-300 hover:text-white font-outfit font-medium transition-colors">
                Entrar
              </button>
            </SignInButton>
          </Show>
          <Link href="/create" className="glass-panel text-white font-medium px-6 py-2.5 rounded-full hover:bg-white/10 hover:border-white/20 transition-all font-outfit">
            Crear Contador
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center mb-20">
        <h1 className="text-5xl md:text-7xl font-extrabold font-outfit tracking-tight mb-6 leading-tight">
          Cuentas regresivas <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
            virales y estéticas
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-inter">
          Crea un contador personalizado con fondos premium, compártelo en segundos y observa cómo se vuelve viral en tus redes sociales.
        </p>
      </section>

      <EventsWithSearch initial={events} />

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm font-inter border-t border-white/5 pt-8">
        &copy; {new Date().getFullYear()} ticka. Todos los derechos reservados.
        {" · "}
        <Link href="/terminos" className="hover:text-gray-300 transition-colors">
          Términos de Uso
        </Link>
      </footer>
    </main>
  );
}
