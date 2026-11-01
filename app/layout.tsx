import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/fill";
import "./styles/ds.css";
import "./globals.css";
import { Suspense } from "react";
import { AuthNotice } from "@/components/AuthNotice";
import { SiteHeader } from "@/components/SiteHeader";
import { UIProvider } from "@/components/ui-provider";
import { getAmenities, getPublishedProperties, getSiteContact } from "@/lib/data";

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist" });

const TITLE = "Thomas Mata S.A. · Bienes raíces en Cartago";
const DESCRIPTION = "Casas, apartamentos, lotes y locales en venta y alquiler en Paraíso, Orosi y toda la provincia de Cartago.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Thomas Mata S.A.",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=630&fit=crop", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ total }, amenities, contact] = await Promise.all([getPublishedProperties(), getAmenities(), getSiteContact()]);
  return (
    <html lang="es" className={geist.variable}>
      <body>
        <UIProvider totalProperties={total} amenities={amenities} contact={contact}>
          {/* SiteHeader lee usePathname(): en rutas que se resuelven al pedirlas (p. ej. un 404 de
              /propiedades/<código inválido>) Next exige un Suspense para no bloquear el prerender. */}
          <Suspense fallback={null}><SiteHeader /></Suspense>
          <Suspense fallback={null}><AuthNotice /></Suspense>
          {children}
        </UIProvider>
      </body>
    </html>
  );
}
