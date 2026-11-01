// Cliente de Supabase para componentes del navegador ("use client"). Una sola instancia por pestaña:
// guarda la sesión en cookies (las lee el servidor en /para-ti) y refresca el token sola.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return client;
}
