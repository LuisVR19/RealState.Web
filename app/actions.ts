"use server";

// Escrituras públicas del sitio. Pasan por el servidor para validar, limitar la frecuencia por IP
// y verificar el captcha (Turnstile) antes de tocar la base. La base vuelve a limitar por teléfono.
import { clientIp, rateLimit, verifyTurnstile } from "@/lib/abuse";
import { isUuid } from "@/lib/data";
import { isValidPhone, normalizePhone, VISIT_TIMES } from "@/lib/format";
import { PRIVACY_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";
import type { VisitMode } from "@/lib/types";

export interface VisitRequest {
  propertyId: string | null;
  agentId: string | null;
  date: string; // YYYY-MM-DD, hora de Costa Rica
  time: string; // HH:mm
  mode: VisitMode;
  name: string;
  phone: string;
  /** Aceptó la política de privacidad (Ley 8968, art. 5): obligatorio para enviar. */
  consent: boolean;
  /** Token de Cloudflare Turnstile (components/ui/Turnstile.tsx). */
  captchaToken: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Solicita una visita (rpc request_visit). Si hay sesión de cliente, la base toma su nombre
 * y teléfono y la asocia a su cuenta; si no, usa los del formulario. El trigger prepare_visit
 * vuelve a validar todo (fecha futura, teléfono, propiedad pública) y fija el asesor.
 */
export async function requestVisit(input: VisitRequest): Promise<ActionResult> {
  const name = String(input.name ?? "").trim().slice(0, 120);
  const phone = normalizePhone(String(input.phone ?? ""));
  if (input.propertyId !== null && !isUuid(String(input.propertyId))) return { ok: false, error: "Propiedad inválida." };
  if (input.agentId !== null && !isUuid(String(input.agentId))) return { ok: false, error: "Asesor inválido." };
  if (!DATE_RE.test(String(input.date)) || !VISIT_TIMES.includes(input.time)) return { ok: false, error: "Elige un día y una hora válidos." };
  if (input.mode !== "Presencial" && input.mode !== "Videollamada") return { ok: false, error: "Modalidad inválida." };
  if (name.length < 2) return { ok: false, error: "Escribe tu nombre." };
  if (!isValidPhone(phone)) return { ok: false, error: "El WhatsApp debe tener 8 dígitos de Costa Rica." };
  if (input.consent !== true) return { ok: false, error: "Debes aceptar la política de privacidad para enviar la solicitud." };

  const ip = await clientIp();
  if (!(await rateLimit("VISIT_LIMITER", `visit:${ip}`))) {
    return { ok: false, error: "Hiciste varias solicitudes seguidas. Espera un minuto e intenta de nuevo." };
  }
  if (!(await verifyTurnstile(input.captchaToken, ip, "visit"))) {
    return { ok: false, error: "No pudimos verificar que no eres un robot. Intenta de nuevo o recarga la página." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_visit", {
    p_property_id: input.propertyId as string,
    p_agent_id: input.agentId ?? undefined,
    p_date: input.date,
    p_time: input.time,
    p_mode: input.mode,
    p_name: name,
    p_phone: phone,
    p_privacy_version: PRIVACY_VERSION,
  });

  if (error) {
    // 22023 = validación del trigger, con mensaje en español pensado para el usuario.
    if (error.code === "22023") return { ok: false, error: error.message };
    console.error("[actions] request_visit:", error.code, error.message);
    return { ok: false, error: "No pudimos registrar la solicitud. Intenta de nuevo o escríbenos por WhatsApp." };
  }
  return { ok: true };
}
