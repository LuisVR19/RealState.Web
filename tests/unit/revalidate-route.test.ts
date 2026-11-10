// POST /api/revalidate: solo con el secreto compartido, y solo etiquetas conocidas.
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", async (orig) => ({ ...(await orig<typeof import("next/cache")>()), revalidateTag }));

const { POST } = await import("@/app/api/revalidate/route");

const SECRET = "s".repeat(40);
const req = (opts: { auth?: string; body?: unknown } = {}) =>
  new NextRequest("http://localhost:3000/api/revalidate", {
    method: "POST",
    headers: { ...(opts.auth !== undefined && { authorization: opts.auth }), "content-type": "application/json" },
    body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });

beforeEach(() => {
  vi.stubEnv("REVALIDATE_SECRET", SECRET);
  revalidateTag.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("autorización", () => {
  it.each([
    ["sin cabecera", undefined],
    ["vacía", ""],
    ["secreto incorrecto", `Bearer ${"x".repeat(40)}`],
    ["prefijo del secreto", `Bearer ${SECRET.slice(0, 20)}`],
    ["secreto más largo", `Bearer ${SECRET}x`],
    ["otro esquema", `Basic ${SECRET}`],
  ])("401 %s", async (_, auth) => {
    const res = await POST(req({ auth, body: { tags: ["properties"] } }));
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("401 si el servidor no tiene secreto configurado (nunca acepta vacío)", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    const res = await POST(req({ auth: "Bearer ", body: {} }));
    expect(res.status).toBe(401);
  });

  it("401 si el secreto configurado es corto (< 32), aunque coincida", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "corto");
    const res = await POST(req({ auth: "Bearer corto", body: {} }));
    expect(res.status).toBe(401);
  });

  it("200 con el secreto correcto (Bearer sin distinguir mayúsculas)", async () => {
    const res = await POST(req({ auth: `bearer ${SECRET}`, body: { tags: ["properties"] } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ["properties"] });
  });
});

describe("etiquetas", () => {
  const auth = `Bearer ${SECRET}`;

  it("sin cuerpo revalida todas las etiquetas públicas", async () => {
    const res = await POST(req({ auth }));
    expect((await res.json()).revalidated).toEqual(["properties", "agents", "zones", "amenities", "ads"]);
    expect(revalidateTag).toHaveBeenCalledTimes(5);
  });

  it("JSON inválido equivale a sin cuerpo", async () => {
    const res = await POST(req({ auth, body: "{no json" }));
    expect((await res.json()).revalidated).toHaveLength(5);
  });

  it("descarta etiquetas desconocidas o con formato inválido", async () => {
    const res = await POST(req({ auth, body: { tags: ["properties", "property:ISF-0001", "property:../../x", "users", "property:ISF-1", 42, null, "PROPERTIES"] } }));
    expect((await res.json()).revalidated).toEqual(["properties", "property:ISF-0001"]);
    expect(revalidateTag).toHaveBeenCalledWith("property:ISF-0001", { expire: 0 });
  });

  it("limita a 50 etiquetas por petición", async () => {
    const tags = Array.from({ length: 200 }, (_, i) => `property:ISF-${String(i).padStart(4, "0")}`);
    const res = await POST(req({ auth, body: { tags } }));
    expect((await res.json()).revalidated).toHaveLength(50);
  });
});
