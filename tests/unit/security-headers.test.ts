// Cabeceras de seguridad de next.config.ts (las verifica también el E2E contra el servidor real).
import { describe, expect, it } from "vitest";
import config from "@/next.config";

describe("next.config", () => {
  it("no anuncia el framework (X-Powered-By)", () => {
    expect(config.poweredByHeader).toBe(false);
  });

  it("aplica las cabeceras de seguridad a todas las rutas", async () => {
    const rules = await config.headers!();
    const all = rules.find((r) => r.source === "/:path*");
    const h = Object.fromEntries(all!.headers.map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toMatch(/^(DENY|SAMEORIGIN)$/);
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["strict-transport-security"]).toMatch(/max-age=\d{8,}/);
    expect(h["permissions-policy"]).toContain("camera=()");
  });

  it("envía una Content-Security-Policy acotada (scripts, conexiones, iframes)", async () => {
    const rules = await config.headers!();
    const all = rules.find((r) => r.source === "/:path*")!.headers;
    const csp = all.find((x) => /^content-security-policy/i.test(x.key))?.value ?? "";
    const dir = (name: string) => csp.split("; ").find((d) => d.startsWith(name + " ")) ?? "";
    expect(csp).toBeTruthy();
    expect(dir("object-src")).toBe("object-src 'none'");
    expect(dir("base-uri")).toBe("base-uri 'self'");
    expect(dir("form-action")).toBe("form-action 'self'");
    expect(dir("frame-ancestors")).toBe("frame-ancestors 'self'");
    expect(dir("report-uri")).toBe("report-uri /api/csp-report");
    // Sin comodines: un XSS no puede cargar scripts ni mandar datos a cualquier dominio.
    for (const any of ["*", "https:", "http:", "data:"]) expect(dir("script-src").split(" ")).not.toContain(any);
    expect(dir("connect-src").split(" ").slice(1).every((s) => s === "'self'" || /^(https|wss):\/\/[a-z0-9*.-]+$/.test(s))).toBe(true);
    expect(dir("frame-src")).toBe("frame-src https://challenges.cloudflare.com");
  });

  it("solo carga imágenes remotas por https", () => {
    for (const p of config.images?.remotePatterns ?? []) {
      expect(typeof p === "object" && "protocol" in p ? p.protocol : "https").toBe("https");
    }
  });
});
