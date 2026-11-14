// Regresión: el cliente público NO puede ser un singleton de módulo en Cloudflare Workers.
// Ver el comentario de lib/supabase/public.ts (prod caía con "Worker's code had hung").
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

describe("createPublicClient", () => {
  it("crea un cliente nuevo en cada llamada (sin estado compartido entre peticiones)", async () => {
    const { createPublicClient } = await import("@/lib/supabase/public");
    expect(createPublicClient()).not.toBe(createPublicClient());
  });

  it("no usa el cliente de auth: la anon key va sin pasar por auth.getSession()", async () => {
    const { createPublicClient } = await import("@/lib/supabase/public");
    const client = createPublicClient() as unknown as { _getAccessToken(): Promise<string> };
    await expect(client._getAccessToken()).resolves.toBe("anon-key");
  });
});
