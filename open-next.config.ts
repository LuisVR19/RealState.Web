// Configuración de OpenNext para Cloudflare Workers.
// El sitio usa `use cache` + cacheTag (lib/data.ts) y /api/revalidate llama a revalidateTag,
// así que la caché tiene que ser compartida entre todas las instancias del Worker:
//   - incrementalCache (R2): guarda las entradas de `use cache` y las páginas prerenderizadas.
//   - tagCache (D1): registra cuándo se invalidó cada tag, para que revalidateTag aplique en todas partes.
//   - queue (Durable Object): regenera en segundo plano lo que venció por cacheLife.
// Ver https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
