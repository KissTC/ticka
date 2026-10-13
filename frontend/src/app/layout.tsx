import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GuestClaimer from "@/components/GuestClaimer";
import AttributionTracker from "@/components/AttributionTracker";

// Analítica sin cookies (Umami Cloud). Sin la variable no se carga, así local y previews no ensucian los datos.
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: "Ticka | Contadores Estéticos y Virales",
  description: "Crea cuentas regresivas estéticas con fondos premium para compartir en tus redes sociales y volverse virales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.variable} ${inter.variable}`}>
      <body className="antialiased">
        <ClerkProvider afterSignOutUrl="/">
          <GuestClaimer />
          <AttributionTracker />
          {children}
        </ClerkProvider>
      </body>
      {umamiWebsiteId && (
        <Script src="https://cloud.umami.is/script.js" data-website-id={umamiWebsiteId} strategy="afterInteractive" />
      )}
    </html>
  );
}