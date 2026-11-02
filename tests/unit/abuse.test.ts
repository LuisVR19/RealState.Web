// lib/abuse.ts: verificación de Turnstile y límite por IP (sin red: fetch y el contexto de Cloudflare se simulan).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cf = vi.hoisted(() => ({ env: {} as Record<string, unknown>, throws: false }));
const hdrs = vi.hoisted(() => ({ map: new Map<string, string>() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    if (cf.throws) throw new Error("fuera del Worker");
    return { env: cf.env };
  },
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => hdrs.map.get(k) ?? null }) }));

const { clientIp, rateLimit, verifyTurnstile } = await import("@/lib/abuse");

const fetchMock = vi.fn();
beforeEach(() => {
  cf.env = {};
  cf.throws = false;
  hdrs.map = new Map();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secreto-de-prueba");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const reply = (body: unknown) => fetchMock.mockResolvedValueOnce({ status: 200, json: async () => body });

describe("verifyTurnstile", () => {
  it("acepta un token válido con la acción esperada y envía secret, token e IP", async () => {
    reply({ success: true, action: "visit" });
    expect(await verifyTurnstile("tok", "203.0.113.7", "visit")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = init.body as URLSearchParams;
    expect([body.get("secret"), body.get("response"), body.get("remoteip")]).toEqual(["secreto-de-prueba", "tok", "203.0.113.7"]);
  });

  it("rechaza un token que Cloudflare marca como inválido", async () => {
    reply({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await verifyTurnstile("tok", "203.0.113.7", "visit")).toBe(false);
  });

  it("rechaza un token emitido para otra acción", async () => {
    reply({ success: true, action: "auth" });
    expect(await verifyTurnstile("tok", "203.0.113.7", "visit")).toBe(false);
  });

  it("acepta la acción vacía de las claves de prueba", async () => {
    reply({ success: true, action: "" });
    expect(await verifyTurnstile("tok", "unknown", "visit")).toBe(true);
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).has("remoteip")).toBe(false);
  });

  it.each([["vacío", ""], ["no string", 123], ["demasiado largo", "x".repeat(3000)]])("rechaza un token %s sin llamar a Cloudflare", async (_, token) => {
    expect(await verifyTurnstile(token, "203.0.113.7", "visit")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si Cloudflare no responde, rechaza (falla cerrado)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect(await verifyTurnstile("tok", "203.0.113.7", "visit")).toBe(false);
  });

  it("sin secreto configurado se omite la verificación (desarrollo)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile("", "203.0.113.7", "visit")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("rateLimit", () => {
  it("usa el binding con la clave dada", async () => {
    const limit = vi.fn(async () => ({ success: false }));
    cf.env = { VISIT_LIMITER: { limit } };
    expect(await rateLimit("VISIT_LIMITER", "visit:1.2.3.4")).toBe(false);
    expect(limit).toHaveBeenCalledWith({ key: "visit:1.2.3.4" });
  });

  it("sin binding o fuera del Worker deja pasar (la base sigue limitando)", async () => {
    expect(await rateLimit("VISIT_LIMITER", "k")).toBe(true);
    cf.throws = true;
    expect(await rateLimit("VISIT_LIMITER", "k")).toBe(true);
  });

  it("si el binding falla deja pasar", async () => {
    cf.env = { VISIT_LIMITER: { limit: async () => { throw new Error("caído"); } } };
    expect(await rateLimit("VISIT_LIMITER", "k")).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefiere cf-connecting-ip, luego el primer salto de x-forwarded-for", async () => {
    hdrs.map = new Map([["cf-connecting-ip", "203.0.113.7"], ["x-forwarded-for", "10.0.0.1"]]);
    expect(await clientIp()).toBe("203.0.113.7");
    hdrs.map = new Map([["x-forwarded-for", "198.51.100.2, 10.0.0.1"]]);
    expect(await clientIp()).toBe("198.51.100.2");
    hdrs.map = new Map();
    expect(await clientIp()).toBe("unknown");
  });
});
