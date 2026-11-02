// Server Action requestVisit: valida todo antes de llamar a la base y no filtra errores internos.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const abuse = vi.hoisted(() => ({ rateLimit: vi.fn(), verifyTurnstile: vi.fn(), clientIp: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("@/lib/abuse", () => abuse);

const { requestVisit } = await import("@/app/actions");
type Input = Parameters<typeof requestVisit>[0];

const PROPERTY = "d0000000-0000-4000-8000-000000000001";
const valid: Input = { propertyId: PROPERTY, agentId: null, date: "2099-01-15", time: "10:00", mode: "Presencial", name: "Ana Prueba", phone: "+506 8888-7777", consent: true, captchaToken: "tok" };

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ error: null });
  abuse.clientIp.mockReset().mockResolvedValue("203.0.113.7");
  abuse.rateLimit.mockReset().mockResolvedValue(true);
  abuse.verifyTurnstile.mockReset().mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("validación (no llega a la base)", () => {
  it.each<[string, Partial<Input>]>([
    ["propiedad no uuid", { propertyId: "1; drop table visits" }],
    ["asesor no uuid", { agentId: "../admin" }],
    ["fecha con formato inválido", { date: "15/01/2099" }],
    ["fecha con inyección", { date: "2099-01-15' or '1'='1" }],
    ["hora fuera de la lista", { time: "03:00" }],
    ["modalidad inválida", { mode: "Teletransporte" as Input["mode"] }],
    ["nombre vacío", { name: "  " }],
    ["nombre de 1 letra", { name: "A" }],
    ["teléfono corto", { phone: "1234" }],
    ["teléfono que no es de CR", { phone: "1234 5678" }],
    ["sin aceptar la política de privacidad", { consent: false }],
  ])("rechaza %s", async (_, patch) => {
    const res = await requestVisit({ ...valid, ...patch });
    expect(res.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("abuso (rate limit por IP y captcha)", () => {
  it("limita por IP y verifica el captcha con la acción 'visit'", async () => {
    expect(await requestVisit(valid)).toEqual({ ok: true });
    expect(abuse.rateLimit).toHaveBeenCalledWith("VISIT_LIMITER", "visit:203.0.113.7");
    expect(abuse.verifyTurnstile).toHaveBeenCalledWith("tok", "203.0.113.7", "visit");
  });

  it("superado el límite no verifica el captcha ni llega a la base", async () => {
    abuse.rateLimit.mockResolvedValue(false);
    const res = await requestVisit(valid);
    expect(res).toEqual({ ok: false, error: expect.stringContaining("Espera un minuto") });
    expect(abuse.verifyTurnstile).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("con captcha inválido no llega a la base", async () => {
    abuse.verifyTurnstile.mockResolvedValue(false);
    const res = await requestVisit(valid);
    expect(res).toEqual({ ok: false, error: expect.stringContaining("robot") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("los datos inválidos se rechazan antes de gastar el límite", async () => {
    await requestVisit({ ...valid, phone: "1234" });
    expect(abuse.rateLimit).not.toHaveBeenCalled();
  });
});

describe("envío", () => {
  it("normaliza el teléfono y recorta el nombre a 120", async () => {
    const res = await requestVisit({ ...valid, name: "  " + "N".repeat(300) + "  " });
    expect(res).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("request_visit", expect.objectContaining({ p_phone: "88887777", p_name: "N".repeat(120), p_property_id: PROPERTY, p_date: "2099-01-15", p_time: "10:00", p_privacy_version: expect.any(String) }));
  });

  it("reunión sin propiedad con un asesor concreto", async () => {
    const agent = "a0000000-0000-4000-8000-000000000002";
    await requestVisit({ ...valid, propertyId: null, agentId: agent });
    expect(rpc).toHaveBeenCalledWith("request_visit", expect.objectContaining({ p_property_id: null, p_agent_id: agent }));
  });

  it("muestra el mensaje de validación del trigger (22023)", async () => {
    rpc.mockResolvedValue({ error: { code: "22023", message: "La fecha y hora de la visita deben ser futuras" } });
    expect(await requestVisit(valid)).toEqual({ ok: false, error: "La fecha y hora de la visita deben ser futuras" });
  });

  it("no expone errores internos de la base", async () => {
    rpc.mockResolvedValue({ error: { code: "XX000", message: "relation public.visits secret detail" } });
    const res = await requestVisit(valid);
    expect(res.ok).toBe(false);
    expect(JSON.stringify(res)).not.toContain("secret detail");
  });
});
