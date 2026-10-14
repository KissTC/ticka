"use client";

import { useRemaining } from "@/lib/useNowSeconds";
import type { EmbedTheme } from "@/lib/embed";

const pad = (n: number) => String(n).padStart(2, "0");

// Contador compacto del widget. Las medidas van en vmin: dentro de un iframe son relativas
// al iframe, así que se ve proporcionado en cualquier tamaño (incluida una fuente de OBS).
export default function EmbedCountdown({ targetDate, theme }: { targetDate: string; theme: EmbedTheme }) {
  const { ready, ended, days, hours, minutes, seconds } = useRemaining(targetDate);

  const box =
    theme === "claro"
      ? "bg-gray-900/[0.06] border border-gray-900/10"
      : theme === "transparente"
        ? ""
        : "bg-white/10 border border-white/15";
  const label = theme === "claro" ? "text-purple-700" : "text-purple-200";

  if (ended) {
    return <p className="text-[9vmin] font-extrabold font-outfit leading-none">¡Ya comenzó! 🎉</p>;
  }

  const units = [
    ...(days > 0 || !ready ? [{ v: days, l: days === 1 ? "Día" : "Días" }] : []),
    { v: hours, l: "Horas" },
    { v: minutes, l: "Min" },
    { v: seconds, l: "Seg" },
  ];

  return (
    <div className="flex justify-center gap-[2.5vmin]" role="timer" aria-label="Tiempo restante">
      {units.map((u) => (
        <div key={u.l} className={`flex flex-col items-center rounded-[2.5vmin] px-[2.5vmin] py-[2vmin] min-w-[17vmin] ${box}`}>
          <span className="text-[13vmin] font-extrabold font-outfit leading-none tabular-nums">{ready ? pad(u.v) : "--"}</span>
          <span className={`text-[3.2vmin] font-semibold font-inter uppercase tracking-wider mt-[1vmin] ${label}`}>{u.l}</span>
        </div>
      ))}
    </div>
  );
}
