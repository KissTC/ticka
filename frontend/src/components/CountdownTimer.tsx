"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ended: boolean;
}

function getTimezoneOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

function getCityName(tz: string): string {
  return tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
}

function formatEventDate(isoDate: string, tz: string): string {
  return new Date(isoDate).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

export default function CountdownTimer({
  targetDate,
  eventTimezone,
  slug,
}: {
  targetDate: string;
  eventTimezone?: string;
  slug?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [synced, setSynced] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Registrar visita con referrer para analytics
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/proxy/api/events/${slug}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer || "" }),
    }).catch(() => {});
  }, [slug]);

  // 1. Obtener hora UTC del backend para sincronizar los relojes y calcular diferencia
  useEffect(() => {
    async function syncTime() {
      try {
        const start = Date.now();
        // Llamada a la API local
        const res = await fetch("/api/proxy/api/time");
        if (res.ok) {
          const { time: serverTimeString } = await res.json();
          const serverTime = new Date(serverTimeString).getTime();
          const end = Date.now();
          const latency = (end - start) / 2;
          
          // Calcular la diferencia: Hora Real Servidor - Hora Local Cliente
          const offset = (serverTime + latency) - end;
          setServerOffset(offset);
        }
      } catch (error) {
        console.error("Error al sincronizar con hora del servidor:", error);
      } finally {
        setSynced(true);
      }
    }
    syncTime();
  }, []);

  // 2. Loop de actualización del cronómetro
  useEffect(() => {
    if (!synced) return;

    const targetTime = new Date(targetDate).getTime();

    const updateTimer = () => {
      // Aplicar el offset del servidor para tener la hora exacta del servidor en local
      const now = Date.now() + serverOffset;
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, ended: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250); // Comprobación cada 250ms es eficiente y fluida

    return () => clearInterval(interval);
  }, [synced, targetDate, serverOffset]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!synced) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (timeLeft.ended) {
    return (
      <div className="text-4xl md:text-5xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 py-12 animate-pulse">
        🎉 ¡El evento ha comenzado! 🎉
      </div>
    );
  }

  const timeUnits = [
    { value: timeLeft.days, label: "Días" },
    { value: timeLeft.hours, label: "Horas" },
    { value: timeLeft.minutes, label: "Minutos" },
    { value: timeLeft.seconds, label: "Segundos" },
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Visualización de dígitos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-2xl justify-center">
        {timeUnits.map((unit, index) => (
          <div key={index} className="glass-panel bg-white/5 rounded-2xl p-4 md:p-6 flex flex-col justify-center items-center min-w-[100px]">
            <span className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight text-white mb-2 leading-none">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="text-xs md:text-sm font-semibold tracking-wider font-inter text-purple-300 uppercase">
              {unit.label}
            </span>
          </div>
        ))}
      </div>

      {/* Botón de Compartir en Vidrio */}
      <button
        onClick={handleCopyLink}
        className="glass-panel bg-white/10 hover:bg-white/20 border-white/20 hover:scale-[1.03] active:scale-[0.98] transition-all font-outfit px-6 py-3 rounded-full text-white font-medium text-sm flex items-center gap-2 mt-4 cursor-pointer"
      >
        {copied ? "✅ ¡Copiado!" : "🔗 Copiar Enlace Viral"}
      </button>

      {/* Fecha en hora local del visitante */}
      {(() => {
        const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const visitorDate = formatEventDate(targetDate, visitorTz);
        const visitorOffset = getTimezoneOffset(visitorTz);

        const eventTz = eventTimezone && eventTimezone !== "UTC" ? eventTimezone : null;
        const sameZone = !eventTz || visitorTz === eventTz;

        return (
          <div className="flex flex-col items-center gap-1 mt-2 text-xs text-gray-400 font-inter text-center">
            <span>🕐 {visitorDate} · <span className="text-gray-500">{visitorOffset}</span></span>
            {!sameZone && (
              <span className="text-gray-500">
                (evento en hora de {getCityName(eventTz!)} · {getTimezoneOffset(eventTz!)})
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
