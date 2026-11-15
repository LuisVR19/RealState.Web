// Configuración de OpenNext para Cloudflare Workers.
// El sitio usa `use cache` + cacheTag (lib/data.ts) y /api/revalidate llama a revalidateTag:
//   - incrementalCache (lib/edge-incremental-cache.ts): páginas del build desde assets estáticos y
//     lo regenerado en la Cache API. Antes era KV, pero el plan gratis solo da 1.000 escrituras/día
//     y al agotarse el sitio se caía (2026-11-14). La Cache API no tiene cuota diaria.
//   - tagCache (D1): registra cuándo se invalidó cada tag. Es consistente al instante, así que
//     revalidateTag aplica en todos los data centers aunque cada uno tenga su propia Cache API.
//   - queue (Durable Object): regenera en segundo plano lo que venció por cacheLife.
// Ver https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import edgeIncrementalCache from "./lib/edge-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: edgeIncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
