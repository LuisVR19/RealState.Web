// Destino de los enlaces de los correos de Auth (confirmación de cuenta, magic link, cambio de correo).
// Acepta el flujo PKCE (?code=) y el de token_hash (?token_hash=&type=), crea la sesión en cookies
// y redirige a `next` (solo rutas internas, para evitar redirecciones abiertas).
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Origen público del sitio. Detrás de un proxy, request.nextUrl.origin puede ser el host interno,
 * así que se prefiere NEXT_PUBLIC_SITE_URL.
 */
function siteOrigin(request: NextRequest) {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).origin;
  } catch {
    return request.nextUrl.origin;
  }
}

/**
 * Ruta interna segura. Se decide sobre la URL ya parseada (el parser WHATWG ignora tabs y
 * saltos de línea y trata "\" como "/", así que validar el texto no basta).
 */
function safeTarget(next: string | null, origin: string) {
  const fallback = new URL("/para-ti", origin);
  if (!next || /[\x00-\x1f\\]/.test(next)) return fallback;
  try {
    const u = new URL(next, origin);
    return u.origin === origin ? new URL(u.pathname + u.search + u.hash, origin) : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = siteOrigin(request);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  return NextResponse.redirect(ok ? safeTarget(searchParams.get("next"), origin) : new URL("/?auth=error", origin));
}
