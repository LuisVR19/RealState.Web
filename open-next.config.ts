// Configuración de OpenNext para Cloudflare Workers.
// El sitio usa `use cache` + cacheTag (lib/data.ts) y /api/revalidate llama a revalidateTag,
// así que la caché tiene que ser compartida entre todas las instancias del Worker:
//   - incrementalCache (KV): guarda las entradas de `use cache` y las páginas prerenderizadas.
//     Se usa KV y no R2 porque R2 exige tarjeta. Plan gratis de KV: 1.000 escrituras/día, por eso
//     lib/data.ts usa cacheLife("hours"): la frescura la da el panel invalidando tags al guardar.
//   - tagCache (D1): registra cuándo se invalidó cada tag. Es consistente al instante, así que
//     revalidateTag aplica en todas partes aunque KV tarde en propagar.
//   - queue (Durable Object): regenera en segundo plano lo que venció por cacheLife.
// Ver https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
