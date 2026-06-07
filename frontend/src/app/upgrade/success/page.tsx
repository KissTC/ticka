import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¡Bienvenido a Pro! | ticka",
};

export default function UpgradeSuccessPage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-6 text-center">
      {/* Glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.12)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md">
        <div className="text-6xl">🎉</div>

        <h1 className="text-4xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          ¡Ya eres Pro!
        </h1>

        <p className="text-gray-300 font-inter text-lg">
          Tu suscripción está activa. Ahora puedes crear contadores con video de
          fondo, analytics y sin límites.
        </p>

        <div className="glass-panel rounded-2xl p-5 w-full text-left flex flex-col gap-3">
          {[
            "🎬 Video de fondo habilitado",
            "📊 Analytics de visitas activos",
            "🚫 Branding de ticka desactivado",
            "♾️ Contadores ilimitados",
          ].map((item) => (
            <p key={item} className="text-sm font-inter text-gray-200">
              {item}
            </p>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-4 px-10 rounded-xl hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20"
        >
          Ir a mi Dashboard →
        </Link>

        <Link href="/create" className="text-sm text-gray-400 hover:text-white font-inter transition-colors">
          Crear mi primer contador Pro →
        </Link>
      </div>
    </main>
  );
}
