// Protección contra abuso de las escrituras públicas (auditoría H-02):
//   - rateLimit: límite por IP con el binding de Workers Rate Limiting (wrangler.jsonc → ratelimits).
//   - verifyTurnstile: verifica en el servidor el token del captcha de Cloudflare Turnstile.
// La última barrera está en la base (request_visit limita por teléfono y en total), así que si el
// binding no existe (desarrollo con `next dev`) o falla, se deja pasar.
import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type LimiterName = "VISIT_LIMITER" | "TRACK_LIMITER";

/** IP del visitante según Cloudflare (o el primer salto de x-forwarded-for fuera de Cloudflare). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** true si la petición está dentro del límite. */
export async function rateLimit(name: LimiterName, key: string): Promise<boolean> {
  let limiter: RateLimiter | undefined;
  try {
    limiter = (getCloudflareContext().env as unknown as Record<string, RateLimiter | undefined>)[name];
  } catch {
    return true; // Fuera del Worker (pruebas, next dev sin bindings).
  }
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch (e) {
    console.warn("[abuse] rate limit no disponible:", (e as Error).message);
    return true;
  }
}

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifica el token de Turnstile. Sin TURNSTILE_SECRET_KEY configurada se omite (para poder desplegar
 * el código antes de crear el widget) y se avisa en el log. Si Cloudflare no responde, se rechaza.
 */
export async function verifyTurnstile(token: unknown, ip: string, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[abuse] TURNSTILE_SECRET_KEY no está configurada: se omite la verificación del captcha");
    return true;
  }
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body, signal: AbortSignal.timeout(5000), cache: "no-store" });
    const data = (await res.json()) as { success?: boolean; action?: string; "error-codes"?: string[] };
    if (!data.success) {
      console.warn("[abuse] captcha rechazado:", data["error-codes"]?.join(",") ?? res.status);
      return false;
    }
    // Las claves de prueba de Turnstile devuelven action vacío.
    return !data.action || data.action === action;
  } catch (e) {
    console.error("[abuse] no se pudo verificar el captcha:", (e as Error).message);
    return false;
  }
}
