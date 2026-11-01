// Cliente de Supabase con la sesión del usuario (cookies) para Server Components,
// Route Handlers y Server Actions. Solo para datos privados: nunca dentro de `use cache`.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy (proxy.ts) se encarga de refrescar la sesión.
        }
      },
    },
  });
}

/**
 * Usuario autenticado según el JWT de las cookies (verificado por Supabase), o null.
 * getClaims valida la firma; no confíes en getSession() en el servidor.
 */
export async function getAuthUser() {
  await connection(); // Depende de la petición: nunca se ejecuta durante el prerender.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return { supabase, userId: null as string | null };
  return { supabase, userId: data.claims.sub as string };
}
