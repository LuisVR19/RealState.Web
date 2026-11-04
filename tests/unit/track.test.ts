// Medición anónima: cliente (lib/track.ts) y endpoint (POST /api/track).
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const abuse = vi.hoisted(() => ({ rateLimit: vi.fn(), clientIp: vi.fn(), verifyTurnstile: vi.fn() }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ rpc }) }));
vi.mock("@/lib/abuse", () => abuse);

const { POST } = await import("@/app/api/track/route");
const trackLib = await import("@/lib/track");

const PROP = "d0000000-0000-4000-8000-000000000004";
const AD = "e2000000-0000-4000-8000-000000000001";

/* ------------------------------------------------------------------ endpoint */
describe("POST /api/track", () => {
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    POST(new NextRequest("https://sitio.test/api/track", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/150", ...headers },
    }));

  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ error: null });
    abuse.rateLimit.mockReset().mockResolvedValue(true);
    abuse.clientIp.mockReset().mockResolvedValue("203.0.113.7");
    vi.stubEnv("SITE_TRACK_SECRET", "secreto");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("manda a la base solo los eventos válidos, con el secreto", async () => {
    const res = await post([{ e: "page_view" }, { e: "property_view", p: PROP }, { e: "inventado" }, { e: "whatsapp_click", p: "no-uuid" }, "basura", null]);
    expect(res.status).toBe(204);
    expect(rpc).toHaveBeenCalledWith("track_site_events", { p_secret: "secreto", p_events: [{ e: "page_view" }, { e: "property_view", p: PROP }, { e: "whatsapp_click" }] });
    expect(abuse.rateLimit).toHaveBeenCalledWith("TRACK_LIMITER", "track:203.0.113.7");
  });

  it("como mucho 20 eventos por llamada", async () => {
    await post(Array.from({ length: 50 }, () => ({ e: "page_view" })));
    expect(rpc.mock.calls[0][1].p_events).toHaveLength(20);
  });

  it.each([
    ["sin secreto configurado (medición apagada)", () => vi.stubEnv("SITE_TRACK_SECRET", ""), [{ e: "page_view" }], {}],
    ["un bot por user-agent", () => {}, [{ e: "page_view" }], { "user-agent": "Googlebot/2.1" }],
    ["otro origen", () => {}, [{ e: "page_view" }], { origin: "https://otro.example" }],
    ["un cuerpo que no es lista", () => {}, { e: "page_view" }, {}],
    ["JSON inválido", () => {}, "esto no es json", {}],
    ["un cuerpo enorme", () => {}, [{ e: "page_view" }], { "content-length": "999999" }],
    ["superado el límite por IP", () => abuse.rateLimit.mockResolvedValue(false), [{ e: "page_view" }], {}],
  ])("descarta %s sin llamar a la base y responde 204", async (_, setup, body, headers) => {
    setup();
    const res = await post(body, headers as Record<string, string>);
    expect(res.status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("separa la publicidad: los eventos ad_* van a track_ad_events con el nombre que espera la base", async () => {
    const res = await post([
      { e: "page_view" },
      { e: "ad_impression", a: AD },
      { e: "ad_click", a: AD },
      { e: "ad_dismiss", a: AD },
      { e: "ad_impression", a: "ejemplo-banco" },
      { e: "ad_click" },
      { e: "ad_inventado", a: AD },
      { e: "toString", a: AD },
    ]);
    expect(res.status).toBe(204);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("track_site_events", { p_secret: "secreto", p_events: [{ e: "page_view" }] });
    expect(rpc).toHaveBeenCalledWith("track_ad_events", { p_secret: "secreto", p_events: [{ a: AD, e: "impression" }, { a: AD, e: "click" }, { a: AD, e: "dismiss" }] });
  });

  it("solo publicidad: no llama a track_site_events", async () => {
    await post([{ e: "ad_impression", a: AD }]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("track_ad_events");
  });

  it("solo eventos de anuncio inválidos: no llama a la base", async () => {
    await post([{ e: "ad_click", a: "no-uuid" }, { e: "ad_click" }]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("acepta el mismo origen", async () => {
    await post([{ e: "page_view" }], { origin: "https://sitio.test" });
    expect(rpc).toHaveBeenCalled();
  });

  it("si la base falla igual responde 204 (no rompe la página)", async () => {
    rpc.mockResolvedValue({ error: { code: "42501", message: "No autorizado" } });
    expect((await post([{ e: "page_view" }])).status).toBe(204);
  });
});

/* ------------------------------------------------------------------ cliente */
describe("lib/track", () => {
  const beacon = vi.fn((_url: string, _data?: BodyInit | null) => true);
  const storage = new Map<string, string>();
  const bodies = async () => Promise.all(beacon.mock.calls.map(async ([, b]) => JSON.parse(await (b as Blob).text())));

  beforeEach(() => {
    vi.useFakeTimers();
    trackLib._resetForTests();
    beacon.mockClear();
    storage.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("addEventListener", vi.fn());
    vi.stubGlobal("document", { addEventListener: vi.fn(), visibilityState: "visible" });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Chrome/150", webdriver: false, sendBeacon: beacon });
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("junta los eventos y los manda en un solo lote a /api/track", async () => {
    trackLib.track("page_view");
    trackLib.track("whatsapp_click", PROP);
    expect(beacon).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe("/api/track");
    expect(await bodies()).toEqual([[{ e: "page_view" }, { e: "whatsapp_click", p: PROP }]]);
  });

  it("una propiedad cuenta una sola vista por pestaña", async () => {
    trackLib.track("property_view", PROP);
    trackLib.track("property_view", PROP);
    trackLib.flush();
    expect(await bodies()).toEqual([[{ e: "property_view", p: PROP }]]);
  });

  it("una vista de propiedad sin propiedad no cuenta", () => {
    trackLib.track("property_view");
    trackLib.flush();
    expect(beacon).not.toHaveBeenCalled();
  });

  it.each([
    ["navegador automatizado", { userAgent: "Mozilla/5.0 Chrome/150", webdriver: true }],
    ["bot por user-agent", { userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)", webdriver: false }],
  ])("no cuenta a un %s", (_, nav) => {
    vi.stubGlobal("navigator", { ...nav, sendBeacon: beacon });
    trackLib.track("page_view");
    trackLib.flush();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("sin sendBeacon usa fetch con keepalive", () => {
    const fetchMock = vi.fn(async (_u: string, _i?: RequestInit) => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Chrome/150", webdriver: false });
    trackLib.track("search");
    trackLib.flush();
    expect(fetchMock).toHaveBeenCalledWith("/api/track", expect.objectContaining({ method: "POST", keepalive: true }));
  });

  it("trackAd manda impresiones, clics y cierres en el mismo lote", async () => {
    trackLib.trackAd(AD, "impression");
    trackLib.trackAd(AD, "click");
    trackLib.trackAd(AD, "dismiss");
    trackLib.trackAd(null, "click");
    trackLib.flush();
    expect(await bodies()).toEqual([[{ e: "ad_impression", a: AD }, { e: "ad_click", a: AD }, { e: "ad_dismiss", a: AD }]]);
  });

  it("trackAd no cuenta bots", () => {
    vi.stubGlobal("navigator", { userAgent: "Googlebot/2.1", webdriver: false, sendBeacon: beacon });
    trackLib.trackAd(AD, "impression");
    trackLib.flush();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("nunca lanza aunque el navegador falle", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } });
    expect(() => trackLib.track("property_view", PROP)).not.toThrow();
  });
});
