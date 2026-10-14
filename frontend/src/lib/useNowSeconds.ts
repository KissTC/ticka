"use client";

import { useSyncExternalStore } from "react";

// Reloj compartido que avanza cada segundo. En el servidor (y antes de hidratar) vale 0,
// para que el componente muestre guiones en lugar de una hora que no coincidiría.
function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverSeconds = () => 0;

export function useNowSeconds(): number {
  return useSyncExternalStore(subscribe, nowSeconds, serverSeconds);
}

export interface Remaining {
  ready: boolean; // false hasta hidratar
  ended: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function useRemaining(targetDate: string): Remaining {
  const now = useNowSeconds();
  const diff = Math.max(0, Math.floor(new Date(targetDate).getTime() / 1000) - now);
  return {
    ready: now > 0,
    ended: now > 0 && diff === 0,
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
  };
}
