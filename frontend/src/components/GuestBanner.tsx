"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function GuestBanner({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const slugs: string[] = JSON.parse(localStorage.getItem("ticka_guest_slugs") || "[]");
      setShow(slugs.includes(slug));
    } catch {}
  }, [slug]);

  if (!show) return null;

  return (
    <div className="relative z-10 w-full max-w-3xl">
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-inter">
        <p className="text-gray-300 text-center sm:text-left">
          Este contador es temporal y solo visible desde este navegador.
        </p>
        <Link
          href="/sign-up"
          className="shrink-0 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold font-outfit px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-all"
        >
          Guardar mi contador →
        </Link>
      </div>
    </div>
  );
}
