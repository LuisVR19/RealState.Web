// Medición anónima de uso del sitio (docs/PLAN-ACTIVIDAD-PANEL.md, Fase 2). Solo navegador.
//
// Sin cookies ni identificadores: cada evento es {e, p?} (tipo y, si aplica, la propiedad). Los eventos
// se juntan unos segundos y se mandan en lote a POST /api/track con sendBeacon (no frena la página y
// se envía aunque la persona cierre la pestaña). Los bots que ejecutan JS se descartan aquí; los que
// no ejecutan JS nunca llegan a contar. Una propiedad cuenta una sola vista por pestaña
// (sessionStorage, que no es una cookie y se borra al cerrarla).

export type TrackEvent = "page_view" | "property_view" | "whatsapp_click" | "share_click" | "search";
/** Eventos de publicidad: se suman por anuncio (rpc track_ad_events), no por propiedad. */
export type AdEvent = "impression" | "click" | "dismiss";

interface Queued {
  e: TrackEvent | `ad_${AdEvent}`;
  p?: string;
  /** Anuncio (solo eventos ad_*). */
  a?: string;
}

const ENDPOINT = "/api/track";
const FLUSH_MS = 2000;
const MAX_BATCH = 20;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|python|curl|wget/i;

let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

/** true si el visitante parece automatizado (no cuenta). */
export function isBot(nav: Pick<Navigator, "userAgent" | "webdriver"> = navigator): boolean {
  return nav.webdriver === true || BOT_UA.test(nav.userAgent);
}

/** true la primera vez que se ve `key` en esta pestaña. Sin sessionStorage (modo privado estricto), cuenta siempre. */
function firstTimeInTab(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage bloqueado: mejor contar de más que romper.
  }
  return true;
}

export function flush(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  while (queue.length) {
    const body = JSON.stringify(queue.splice(0, MAX_BATCH));
    const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    if (!sent) fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  }
}

/** Registra un evento. Nunca lanza: la medición no puede romper la página. */
export function track(e: TrackEvent, propertyId?: string | null): void {
  try {
    if (typeof window === "undefined" || isBot()) return;
    if (e === "property_view" && (!propertyId || !firstTimeInTab(`trk:pv:${propertyId}`))) return;
    enqueue(propertyId ? { e, p: propertyId } : { e });
  } catch {
    // Ignorado a propósito.
  }
}

/** Registra una impresión, un clic o un cierre de un anuncio. Nunca lanza. */
export function trackAd(adId: string | null | undefined, e: AdEvent): void {
  try {
    if (typeof window === "undefined" || !adId || isBot()) return;
    enqueue({ e: `ad_${e}`, a: adId });
  } catch {
    // Ignorado a propósito.
  }
}

function enqueue(item: Queued): void {
  try {
    queue.push(item);
    if (!listening) {
      listening = true;
      // Al ocultar o cerrar la pestaña se manda lo pendiente.
      addEventListener("pagehide", flush);
      document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
    }
    if (queue.length >= MAX_BATCH) flush();
    else timer ??= setTimeout(flush, FLUSH_MS);
  } catch {
    // Ignorado a propósito.
  }
}

/** Solo para pruebas. */
export function _resetForTests(): void {
  queue = [];
  if (timer) clearTimeout(timer);
  timer = null;
  listening = false;
}
