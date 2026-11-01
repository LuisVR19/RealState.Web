// GET /auth/callback: crea la sesión y redirige solo a rutas internas (sin redirecciones abiertas).
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = { exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));

const { GET } = await import("@/app/auth/callback/route");

const SITE = "https://sitio.test";
const call = async (qs: string) => {
  const res = await GET(new NextRequest(`http://interno:3000/auth/callback?${qs}`));
  return { status: res.status, location: res.headers.get("location") ?? "" };
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  auth.verifyOtp.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("redirección segura tras el login", () => {
  it("por defecto va a /para-ti en el origen público (no el host interno)", async () => {
    expect((await call("code=abc")).location).toBe(`${SITE}/para-ti`);
  });

  it("respeta una ruta interna con query y hash", async () => {
    expect((await call(`code=abc&next=${encodeURIComponent("/propiedades?op=Venta#mapa")}`)).location).toBe(`${SITE}/propiedades?op=Venta#mapa`);
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "\t//evil.com",
    "/%09/evil.com",
    "javascript:alert(1)",
    "http://sitio.test.evil.com/",
    "https://sitio.test@evil.com",
    "data:text/html,<script>alert(1)</script>",
  ])("no redirige fuera del sitio con next=%s", async (next) => {
    const { location } = await call(`code=abc&next=${encodeURIComponent(next)}`);
    expect(new URL(location).origin).toBe(SITE);
  });
});

describe("verificación del enlace", () => {
  it("código inválido → /?auth=error, sin seguir next", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "invalid" } });
    expect((await call("code=malo&next=/para-ti")).location).toBe(`${SITE}/?auth=error`);
  });

  it("sin code ni token_hash → error", async () => {
    expect((await call("next=/para-ti")).location).toBe(`${SITE}/?auth=error`);
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("token_hash con un type no permitido no se verifica", async () => {
    expect((await call("token_hash=abc&type=admin")).location).toBe(`${SITE}/?auth=error`);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("token_hash con type=email crea la sesión", async () => {
    expect((await call("token_hash=abc&type=email&next=/para-ti")).location).toBe(`${SITE}/para-ti`);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "email" });
  });
});
