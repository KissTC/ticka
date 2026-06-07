import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

interface Event {
  id: string;
  slug: string;
  title: string;
  target_date: string;
  image_url: string;
  thumbnail_url?: string;
  views: number;
  timezone: string;
  category_name?: string;
}

interface UserProfile {
  plan: "free" | "pro";
  has_subscription: boolean;
}

async function getUserData(token: string): Promise<{ events: Event[]; profile: UserProfile }> {
  const apiURL = process.env.API_URL || "http://localhost:8082";
  const headers = { Authorization: `Bearer ${token}` };

  const [eventsRes, profileRes] = await Promise.all([
    fetch(`${apiURL}/api/users/me/events`, { headers, cache: "no-store" }),
    fetch(`${apiURL}/api/users/me`, { headers, cache: "no-store" }),
  ]);

  const events = eventsRes.ok ? await eventsRes.json() : [];
  const profile = profileRes.ok ? await profileRes.json() : { plan: "free", has_subscription: false };

  return { events, profile };
}

export default async function DashboardPage() {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const token = await getToken();
  const { events, profile } = token
    ? await getUserData(token)
    : { events: [], profile: { plan: "free" as const, has_subscription: false } };

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            ticka
          </Link>
          <span className="text-xs font-outfit text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
            dashboard
          </span>
          {profile.plan === "pro" && (
            <span className="text-xs font-outfit font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              ✦ Pro
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/create" className="glass-panel text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-white/10 transition-all font-outfit">
            + Nuevo Contador
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Bienvenida */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-outfit text-white">
          Hola, {user?.firstName ?? "usuario"} 👋
        </h1>
        <p className="text-gray-400 font-inter text-sm mt-1">
          {events.length === 0
            ? "Aún no tienes contadores. ¡Crea el primero!"
            : `Tienes ${events.length} ${events.length === 1 ? "contador" : "contadores"}`}
        </p>
      </div>

      {/* Banner de upgrade para usuarios Free */}
      {profile.plan === "free" && (
        <div className="mb-8 glass-panel rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-purple-500/20">
          <div>
            <p className="text-sm font-outfit font-semibold text-white">
              🎬 Desbloquea video de fondo y más con Pro
            </p>
            <p className="text-xs text-gray-400 font-inter mt-0.5">
              Desde $4.99/mes · Cancela cuando quieras
            </p>
          </div>
          <Link
            href="/upgrade"
            className="shrink-0 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-2.5 px-6 rounded-xl hover:opacity-95 transition-all text-sm"
          >
            Ver planes →
          </Link>
        </div>
      )}

      <DashboardClient initialEvents={events} userPlan={profile.plan} />
    </main>
  );
}
