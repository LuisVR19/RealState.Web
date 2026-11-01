// Cliente de Supabase SIN sesión (rol anon) para lecturas públicas cacheadas en el servidor.
// No lee cookies, así que se puede usar dentro de `use cache`: todos los visitantes comparten
// el mismo resultado y la base recibe una consulta por intervalo de caché, no una por visita.
// La RLS de anon sigue aplicando (solo propiedades publicadas, vista agents_public, etc.).
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

let client: ReturnType<typeof createClient<Database>> | null = null;

export function createPublicClient() {
  if (!client) {
    const { url, key } = supabaseEnv();
    client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
