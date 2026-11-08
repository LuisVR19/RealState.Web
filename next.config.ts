import type { NextConfig } from "next";
import { buildCsp, CSP_HEADER } from "./lib/csp";

// Cabeceras de seguridad para todas las rutas. El sitio no se incrusta en iframes de terceros.
const securityHeaders = [
  { key: CSP_HEADER, value: buildCsp() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Cache Components: las lecturas públicas se cachean con `use cache` + cacheTag
  // y la sesión solo se lee dentro de <Suspense> (ver lib/data.ts y app/para-ti).
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // OBLIGATORIO en Cloudflare Workers. Al completar una página prerenderizada (PPR), Next descomprime
    // su estado con zlib.inflateSync limitando la salida a 5 × este valor. Con el valor por defecto
    // (100 MB → 500 MB) el zlib de Workers lanza RangeError (su máximo es 128 MB): la parte dinámica
    // no se renderiza en el servidor, el log dice "Failed to parse postponed state" y el navegador
    // muestra la página en blanco o la rearma (React #419). 10 MB → 50 MB; el estado real pesa KB.
    maxPostponedStateSize: "10 MB",
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (bucket de imágenes de propiedades)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // El inventario pasó de /propiedades a /catalogo (inmuebles y vehículos). 308 permanente: los enlaces
  // ya compartidos y los buscadores llegan a la ruta nueva conservando los query params.
  async redirects() {
    return [
      { source: "/propiedades", destination: "/catalogo", permanent: true },
      { source: "/propiedades/:code", destination: "/catalogo/:code", permanent: true },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
