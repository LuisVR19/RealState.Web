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
/** Eventos de publicidad del cliente → nombre que espera track_ad_events. */
const AD_EVENTS: Record<string, string> = { ad_impression: "impression", ad_click: "click", ad_dismiss: "dismiss" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|python|curl|wget/i;
const MAX_BYTES = 4096;
const MAX_EVENTS = 20;

type Event = { e: string; p?: string };
type AdEvent = { a: string; e: string };

const done = () => new NextResponse(null, { status: 204 });

/** Eventos válidos del cuerpo, separados en uso del sitio y publicidad (los demás se descartan). */
function parseEvents(body: unknown): { site: Event[]; ads: AdEvent[] } {
  const site: Event[] = [];
  const ads: AdEvent[] = [];
  if (!Array.isArray(body)) return { site, ads };
  for (const x of body.slice(0, MAX_EVENTS)) {
    if (!x || typeof x !== "object") continue;
    const { e, p, a } = x as { e?: unknown; p?: unknown; a?: unknown };
    if (typeof e !== "string") continue;
    if (EVENTS.has(e)) site.push(typeof p === "string" && UUID_RE.test(p) ? { e, p } : { e });
    else if (Object.hasOwn(AD_EVENTS, e) && typeof a === "string" && UUID_RE.test(a)) ads.push({ a, e: AD_EVENTS[e] });
  }
  return { site, ads };
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

  let events: ReturnType<typeof parseEvents>;
  try {
    events = parseEvents(JSON.parse((await request.text()).slice(0, MAX_BYTES)));
  } catch {
    return done();
  }
  if (!events.site.length && !events.ads.length) return done();
  if (!(await rateLimit("TRACK_LIMITER", `track:${await clientIp()}`))) return done();

  const db = createPublicClient();
  const [site, ads] = await Promise.all([
    events.site.length ? db.rpc("track_site_events", { p_secret: secret, p_events: events.site }) : null,
    events.ads.length ? db.rpc("track_ad_events", { p_secret: secret, p_events: events.ads }) : null,
  ]);
  if (site?.error) console.warn("[track] no se pudo registrar:", site.error.code, site.error.message);
  if (ads?.error) console.warn("[track] no se pudo registrar la publicidad:", ads.error.code, ads.error.message);
  return done();
}
