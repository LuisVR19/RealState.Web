// Content-Security-Policy del sitio público (auditoría H-04, plan Fase 2). La aplica next.config.ts
// a todas las rutas.
//
// SIN nonce, a propósito: un nonce exige renderizar cada página por petición y es incompatible con
// Partial Prerendering y con la caché `use cache`/KV que hace rápido al sitio (ver la guía de CSP de
// Next en node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md). Por eso
// script-src admite 'unsafe-inline' (los scripts inline de arranque de Next). La protección viene de
// limitar DE DÓNDE se cargan scripts, A DÓNDE se conecta el navegador (connect-src: un XSS no puede
// mandar datos a un servidor ajeno), quién puede incrustar el sitio y a dónde envían los formularios.
//
// img-src admite cualquier https: los admins pueden pegar URLs externas de imágenes en el panel.

/** Paso 2.6 del plan: poner en true cuando los reportes estén limpios (pasa de solo reportar a bloquear). */
export const CSP_ENFORCE: boolean = false;
export const CSP_HEADER = CSP_ENFORCE ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
export const CSP_REPORT_PATH = "/api/csp-report";

const TURNSTILE = "https://challenges.cloudflare.com";
// Cloudflare Web Analytics (lo inyecta Cloudflare en el HTML si está activo para el dominio).
const CF_ANALYTICS_SCRIPT = "https://static.cloudflareinsights.com";
const CF_ANALYTICS_BEACON = "https://cloudflareinsights.com";

/** Origen del proyecto de Supabase (https://<ref>.supabase.co) o el comodín si falta la variable. */
export function supabaseOrigin(url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  try {
    return new URL(url ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
}

export function buildCsp({ dev = process.env.NODE_ENV === "development", supabase = supabaseOrigin() }: { dev?: boolean; supabase?: string } = {}): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir errores del servidor.
    "script-src": ["'self'", "'unsafe-inline'", TURNSTILE, CF_ANALYTICS_SCRIPT, ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    // supabase-js en el navegador (cuenta, favoritos, preferencias), Turnstile y la analítica.
    "connect-src": ["'self'", supabase, supabase.replace(/^https:/, "wss:"), TURNSTILE, CF_ANALYTICS_BEACON],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    "report-uri": [CSP_REPORT_PATH],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // El navegador la ignora (con un aviso en consola) en Report-Only: solo va al aplicar la política.
  if (!dev && CSP_ENFORCE) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
