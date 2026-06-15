"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const FEATURES = [
  { icon: "🎬", text: "Video de fondo en loop (MP4/WebM)" },
  { icon: "🖼️", text: "Imágenes hasta 20 MB en HD" },
  { icon: "🚫", text: "Sin branding de ticka" },
  { icon: "📊", text: "Analytics: visitas y referrers" },
  { icon: "♾️", text: "Contadores ilimitados" },
  { icon: "⚡", text: "Soporte prioritario" },
];

export default function UpgradePage() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter(); // usado en redirect post sign-in
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);

  const priceMonthly = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
  const priceYearly = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!;

  useEffect(() => {
    if (!isSignedIn) { setCheckingPlan(false); return; }
    getToken().then((token) =>
      fetch("/api/proxy/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => { if (data.plan === "pro") setIsPro(true); })
        .catch(() => {})
        .finally(() => setCheckingPlan(false))
    );
  }, [isSignedIn, getToken]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/proxy/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al abrir portal");
      setPortalLoading(false);
    }
  }

  async function handleSubscribe() {
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/upgrade");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/proxy/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_id: billing === "monthly" ? priceMonthly : priceYearly,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar el pago");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12 flex flex-col items-center">
      {/* Nav */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-16">
        <Link
          href="/"
          className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400"
        >
          ticka
        </Link>
        {isSignedIn ? (
          <Link
            href="/dashboard"
            className="glass-panel text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-white/10 transition-all font-outfit"
          >
            Mi Dashboard
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="glass-panel text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-white/10 transition-all font-outfit"
          >
            Iniciar sesión
          </Link>
        )}
      </header>

      {/* Hero */}
      <div className="text-center mb-10">
        <span className="text-xs font-outfit font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
          Pro
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold font-outfit mt-4 mb-3 tracking-tight">
          Contadores que{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            impactan
          </span>
        </h1>
        <p className="text-gray-400 font-inter text-lg max-w-xl mx-auto">
          Sube al siguiente nivel con video de fondo, analytics y sin límites.
        </p>
      </div>

      {/* Estado: ya es Pro */}
      {!checkingPlan && isPro && (
        <div className="w-full max-w-md glass-panel rounded-2xl p-6 mb-8 text-center flex flex-col items-center gap-4 border border-purple-500/30">
          <span className="text-4xl">✦</span>
          <div>
            <p className="text-lg font-bold font-outfit text-white">Ya eres usuario Pro</p>
            <p className="text-sm text-gray-400 font-inter mt-1">
              Tienes acceso a todas las funcionalidades premium activas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/dashboard"
              className="flex-1 text-center glass-panel text-white font-outfit font-semibold py-3 rounded-xl hover:bg-white/10 transition-all text-sm"
            >
              Ir al Dashboard
            </Link>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-3 rounded-xl hover:opacity-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {portalLoading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Abriendo...</>
              ) : (
                "Gestionar suscripción →"
              )}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400 font-inter">⚠️ {error}</p>
          )}
        </div>
      )}

      {/* Toggle mensual / anual */}
      <div className="flex items-center gap-3 mb-8 glass-panel rounded-full px-2 py-1.5">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-5 py-2 rounded-full text-sm font-outfit font-semibold transition-all ${
            billing === "monthly"
              ? "bg-white/15 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-5 py-2 rounded-full text-sm font-outfit font-semibold transition-all flex items-center gap-2 ${
            billing === "yearly"
              ? "bg-white/15 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Anual
          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full">
            −33%
          </span>
        </button>
      </div>

      {/* Pricing card */}
      <div className="glass-panel rounded-3xl p-8 md:p-10 w-full max-w-md mb-6">
        {/* Precio */}
        <div className="text-center mb-8">
          <div className="flex items-end justify-center gap-1">
            <span className="text-5xl font-extrabold font-outfit text-white">
              {billing === "monthly" ? "$95" : "$760"}
            </span>
            <span className="text-gray-400 font-inter mb-2">
              MXN/{billing === "monthly" ? "mes" : "año"}
            </span>
          </div>
          {billing === "yearly" && (
            <p className="text-sm text-green-400 font-inter mt-1">
              Equivale a $63.33 MXN/mes · Ahorras $380 MXN
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="flex flex-col gap-3 mb-8">
          {FEATURES.map(({ icon, text }) => (
            <li key={text} className="flex items-center gap-3 font-inter text-sm text-gray-200">
              <span className="text-base">{icon}</span>
              {text}
            </li>
          ))}
        </ul>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl font-inter mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit py-4 rounded-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Redirigiendo a Stripe...
            </>
          ) : isSignedIn ? (
            `Suscribirse ${billing === "monthly" ? "Mensual" : "Anual"} →`
          ) : (
            "Iniciar sesión para suscribirse →"
          )}
        </button>

        <p className="text-center text-xs text-gray-500 font-inter mt-4">
          Pago seguro con Stripe · Cancela cuando quieras
        </p>
      </div>

      {/* Comparación Free vs Pro */}
      <div className="w-full max-w-md glass-panel rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3 text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider px-5 py-3 border-b border-white/5">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center text-purple-400">Pro</span>
        </div>
        {[
          ["Contadores", "Máx. 3", "Ilimitados"],
          ["Imagen propia", "✅", "✅"],
          ["Video de fondo", "❌", "✅"],
          ["Sin branding", "❌", "✅"],
          ["Analytics", "❌", "✅"],
        ].map(([feature, free, pro]) => (
          <div
            key={feature}
            className="grid grid-cols-3 px-5 py-3 text-sm font-inter border-b border-white/5 last:border-0"
          >
            <span className="text-gray-300">{feature}</span>
            <span className="text-center text-gray-400">{free}</span>
            <span className="text-center text-white font-semibold">{pro}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
