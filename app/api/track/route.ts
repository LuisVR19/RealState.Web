// Recibe los eventos anónimos de uso del sitio (lib/track.ts) y los suma en la base
// (rpc track_site_events, con el secreto SITE_TRACK_SECRET que solo tiene este Worker).
//
// Siempre responde 204: la medición nunca debe fallar de cara al visitante. Se descarta en silencio:
// sin secreto configurado (medición apagada), bots, otro origen, cuerpos inválidos o enormes, y lo que
// supere el límite por IP (binding TRACK_LIMITER). La base vuelve a validar tipos y propiedades.
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/abuse";
import { createPublicClient } from "@/lib/supabase/public";

const EVENTS = new Set(["page_view", "property_view", "whatsapp_click", "share_click", "search"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|python|curl|wget/i;
const MAX_BYTES = 4096;
const MAX_EVENTS = 20;

type Event = { e: string; p?: string };

const done = () => new NextResponse(null, { status: 204 });

/** Eventos válidos del cuerpo (los demás se descartan). */
function parseEvents(body: unknown): Event[] {
  if (!Array.isArray(body)) return [];
  return body.slice(0, MAX_EVENTS).flatMap((x): Event[] => {
    if (!x || typeof x !== "object") return [];
    const { e, p } = x as { e?: unknown; p?: unknown };
    if (typeof e !== "string" || !EVENTS.has(e)) return [];
    return typeof p === "string" && UUID_RE.test(p) ? [{ e, p }] : [{ e }];
  });
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // sendBeacon del mismo origen puede no mandar Origin.
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.SITE_TRACK_SECRET;
  if (!secret) return done();
  if (BOT_UA.test(request.headers.get("user-agent") ?? "") || !sameOrigin(request)) return done();
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return done();

  let events: Event[];
  try {
    events = parseEvents(JSON.parse((await request.text()).slice(0, MAX_BYTES)));
  } catch {
    return done();
  }
  if (!events.length) return done();
  if (!(await rateLimit("TRACK_LIMITER", `track:${await clientIp()}`))) return done();

  const { error } = await createPublicClient().rpc("track_site_events", { p_secret: secret, p_events: events });
  if (error) console.warn("[track] no se pudo registrar:", error.code, error.message);
  return done();
}
