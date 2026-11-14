// Cliente de Supabase SIN sesión (rol anon) para lecturas públicas cacheadas en el servidor.
// No lee cookies, así que se puede usar dentro de `use cache`: todos los visitantes comparten
// el mismo resultado y la base recibe una consulta por intervalo de caché, no una por visita.
// La RLS de anon sigue aplicando (solo propiedades publicadas, vista agents_public, etc.).
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

//
// IMPORTANTE (Cloudflare Workers): un cliente NUEVO por llamada, nunca un singleton de módulo.
// Un isolate de Workers atiende muchas peticiones a la vez, y una promesa creada en la petición A
// que espera la petición B queda colgada para siempre si A termina antes (el runtime descarta esa
// continuación: "This promise was created by a request that has since ended"). supabase-js guarda
// promesas internas de auth (initializePromise, refresh en curso) y cada consulta las espera vía
// auth.getSession(): con un singleton, una petición cortada envenenaba el isolate entero y TODAS
// las páginas daban 500 ("Worker's code had hung") hasta que Cloudflare lo reciclaba.
//
// `accessToken` hace que supabase-js no use su cliente de auth (GoTrue): devuelve null y cae a la
// anon key, que es justo el rol que queremos aquí. Crear el cliente es barato (solo objetos).
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    accessToken: async () => null,
  });
}
