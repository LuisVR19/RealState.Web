// Caché incremental del sitio en Cloudflare Workers (plan gratis, sin KV).
//
// Dos problemas tumbaron producción en noviembre de 2026 y esta caché evita los dos:
//
// 1. Regenerar una página dentro del Worker lo cuelga ("Worker's code had hung", error 1101/500).
//    Con Cache Components cada página se guarda como un esqueleto estático (el "shell": cabecera,
//    menú y los "Cargando…") y los datos llegan después por la parte dinámica. Cuando ese shell se
//    daba por vencido (al guardar en el panel se invalida el tag `properties`, que llevan todas las
//    páginas, o al pasar 24 h del deploy), Next intentaba prerenderizarlo de nuevo en el Worker y
//    ese prerender nunca termina en workerd. Todo el HTML daba 500 hasta el siguiente deploy.
//    Solución: los shells del build se sirven siempre tal cual, nunca vencen ni se regeneran.
//    No llevan datos de anuncios, así que no quedan desactualizados: los datos salen de las
//    entradas de `use cache`, que sí respetan revalidateTag y cacheLife.
//    OJO: por eso los datos de la base deben quedar siempre dentro de un <Suspense> (parte
//    dinámica). Lo que se renderice en el shell queda fijo hasta el siguiente deploy.
//
// 2. KV gratis solo permite 1.000 escrituras al día y cada deploy gastaba ~100.
//    Solución: los shells se leen de los assets estáticos del deploy (no cuesta escrituras) y las
//    entradas de `use cache` se guardan en la Cache API (por data center, sin cuota diaria).
//
// La invalidación de datos sigue en la caché de tags (D1): al guardar en el panel, revalidateTag
// marca el tag y toda entrada de `use cache` más vieja se descarta en todos los data centers.
import type { CacheEntryType, CacheValue, IncrementalCache, WithLastModified } from "@opennextjs/aws/types/overrides.js";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

/** Almacén vacío: lo generado en runtime vive solo en la Cache API que le pone withRegionalCache. */
const noStore: IncrementalCache = {
  name: "no-store",
  async get() {
    return null;
  },
  async set() {},
  async delete() {},
};

/** Entradas de `use cache` y de fetch: Cache API, una hora como cacheLife("hours") en lib/data.ts. */
const runtimeCache = withRegionalCache(noStore, {
  mode: "long-lived",
  defaultLongLivedTtlSec: 3600,
  shouldLazilyUpdateOnCacheHit: false,
  // Siempre se consulta la caché de tags (D1) para respetar revalidateTag desde el panel.
  bypassTagCacheOnCacheHit: false,
});

const edgeIncrementalCache: IncrementalCache = {
  // Mismo nombre que la caché de assets para que el deploy copie ahí las páginas prerenderizadas.
  name: staticAssetsIncrementalCache.name,

  async get<CacheType extends CacheEntryType = "cache">(key: string, cacheType?: CacheType) {
    if (cacheType === "composable" || cacheType === "fetch") return runtimeCache.get(key, cacheType);
    // Página (shell) o ruta prerenderizada: siempre la del build.
    const entry = await staticAssetsIncrementalCache.get(key, cacheType);
    if (!entry?.value) return null;
    return {
      value: entry.value,
      // "Recién generada": Next nunca la ve vencida, así que nunca intenta regenerarla en el Worker.
      lastModified: Date.now(),
      // Tampoco se descarta por tags: el shell no tiene datos que invalidar.
      shouldBypassTagCache: true,
    } as WithLastModified<CacheValue<CacheType>>;
  },

  async set<CacheType extends CacheEntryType = "cache">(key: string, value: CacheValue<CacheType>, cacheType?: CacheType) {
    // Los shells no se reescriben en runtime; solo se guardan datos (`use cache`) y fetch.
    if (cacheType === "composable" || cacheType === "fetch") await runtimeCache.set(key, value, cacheType);
  },

  async delete() {},
};

export default edgeIncrementalCache;
