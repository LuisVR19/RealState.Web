// Parches de Next.js para Cloudflare Workers. Corre en `postinstall` (también en el build de Cloudflare).
//
// Regla de fondo: en Workers un isolate atiende muchas visitas a la vez, y una promesa creada en la
// visita A NO puede resolverse en la visita B. Si B espera una promesa de A y A termina antes
// (navegación cancelada, prefetch abortado, revalidación en segundo plano tras enviar la respuesta),
// B se cuelga para siempre. Logs: "This promise was created by a request that has since ended" y
// "Worker's code had hung". Next deduplica trabajo ENTRE visitas guardando promesas en Maps de módulo
// o de instancias compartidas; aquí se apagan esas deduplicaciones. Cada visita hace su propio
// trabajo (un poco más de consultas en frío), pero ninguna depende de otra.
//
// 1. `use cache` (use-cache-wrapper.js, Next 16.4+): una visita se unía a la invocación cacheada en
//    curso de otra (crossRequestPendingCacheInvocations). Se salta igual que Next ya hace para
//    `use cache: private` y draft mode. Síntoma: "This page couldn't load" al navegar.
//
// 2. ResponseCache (Batcher): la caché de páginas completas deduplica `get` y `revalidate` por clave
//    con Batcher. Cuando la página cacheada vence (cada hora con cacheLife("hours")), la primera visita
//    la regenera y las siguientes se unen a esa promesa. Se fuerza la clave a null, rama que el propio
//    Batcher trae para "no deduplicar". Síntoma: 500 en cargas completas horas después de desplegar.
//
// Si una versión nueva de Next cambia el código, este script FALLA a propósito (en vez de desplegar
// en silencio el bug otra vez): revisar los archivos indicados y ajustar los patrones.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const nextDir = dirname(require.resolve("next/package.json"));
const MARK = "/*patched-workers*/";

const runtimes = readdirSync(join(nextDir, "dist/compiled/next-server"))
  .filter((f) => f.endsWith(".runtime.prod.js"))
  .map((f) => `dist/compiled/next-server/${f}`);

const PATCHES = [
  {
    name: "use cache: sin deduplicación entre visitas",
    files: ["dist/server/use-cache/use-cache-wrapper.js", "dist/esm/server/use-cache/use-cache-wrapper.js"],
    required: ["dist/server/use-cache/use-cache-wrapper.js", "dist/esm/server/use-cache/use-cache-wrapper.js"],
    from: "const skipCrossRequestDedupe = isPrivate && !process.env.__NEXT_DEV_SERVER || workStore.isDraftMode;",
    to: `const skipCrossRequestDedupe = true; ${MARK}`,
    // Marca de la versión anterior de este script (instalaciones ya parcheadas).
    legacy: "const skipCrossRequestDedupe = true; /* patched by scripts/patch-next-workers.mjs (Cloudflare Workers) */",
  },
  {
    name: "Batcher: sin deduplicación entre visitas (fuente)",
    files: ["dist/lib/batcher.js", "dist/esm/lib/batcher.js"],
    required: ["dist/lib/batcher.js", "dist/esm/lib/batcher.js"],
    from: "const cacheKey = this.cacheKeyFn ? await this.cacheKeyFn(key) : key;",
    to: `const cacheKey = null; ${MARK}`,
  },
  {
    name: "Batcher: sin deduplicación entre visitas (runtimes compilados)",
    files: runtimes,
    // El runtime de App Router es el que usa el sitio; los demás se parchean si traen el patrón.
    required: ["dist/compiled/next-server/app-page.runtime.prod.js", "dist/compiled/next-server/app-route.runtime.prod.js"],
    from: "async batch(e,t){let r=this.cacheKeyFn?await this.cacheKeyFn(e):e;",
    to: `async batch(e,t){let r=null;${MARK}`,
  },
];

let failed = false;
for (const p of PATCHES) {
  for (const rel of p.files) {
    const file = join(nextDir, rel);
    const required = p.required.includes(rel);
    if (!existsSync(file)) {
      if (required) {
        console.error(`[patch-next-workers] ${p.name}: no existe ${rel}`);
        failed = true;
      }
      continue;
    }
    const src = readFileSync(file, "utf8");
    if (src.includes(p.to) || (p.legacy && src.includes(p.legacy))) {
      console.log(`[patch-next-workers] ${p.name}: ya aplicado en ${rel}`);
    } else if (src.includes(p.from)) {
      writeFileSync(file, src.split(p.from).join(p.to));
      console.log(`[patch-next-workers] ${p.name}: aplicado en ${rel}`);
    } else if (required) {
      console.error(`[patch-next-workers] ${p.name}: no se encontró el código en ${rel} (¿cambió la versión de Next?)`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
