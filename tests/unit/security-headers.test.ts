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

  it("solo carga imágenes remotas por https", () => {
    for (const p of config.images?.remotePatterns ?? []) {
      expect(typeof p === "object" && "protocol" in p ? p.protocol : "https").toBe("https");
    }
  });
});
