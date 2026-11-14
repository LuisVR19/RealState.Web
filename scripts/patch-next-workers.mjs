// Parche de Next.js para Cloudflare Workers. Corre en `postinstall` (también en el build de Cloudflare).
//
// Problema: desde Next 16.4, `use cache` deduplica ENTRE peticiones. Si dos visitas piden la misma
// función cacheada a la vez, la segunda se une a la invocación en curso de la primera mediante un
// Map a nivel de módulo (crossRequestPendingCacheInvocations en use-cache-wrapper.js). En Workers,
// un isolate atiende muchas visitas a la vez y una promesa creada en la visita A no puede resolverse
// en la visita B: si A termina antes (navegación cancelada, prefetch abortado, cliente que se va), B
// espera para siempre. Log: "This promise was created by a request that has since ended" y
// "Worker's code had hung". El navegador muestra "This page couldn't load" al navegar.
//
// Solución: saltar la deduplicación entre peticiones (la que Next ya salta para `use cache: private`
// y draft mode). Se mantiene la deduplicación DENTRO de cada petición. Costo: si llegan varias
// visitas en frío a la vez, cada una consulta Supabase una vez; después todas leen la caché.
//
// Si una versión nueva de Next cambia el código, este script FALLA a propósito (en vez de desplegar
// en silencio el bug otra vez): revisar use-cache-wrapper.js y ajustar ORIGINAL.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const ORIGINAL = "const skipCrossRequestDedupe = isPrivate && !process.env.__NEXT_DEV_SERVER || workStore.isDraftMode;";
const PATCHED =
  "const skipCrossRequestDedupe = true; /* patched by scripts/patch-next-workers.mjs (Cloudflare Workers) */";

const require = createRequire(import.meta.url);
const nextDir = dirname(require.resolve("next/package.json"));
const files = ["dist/server/use-cache/use-cache-wrapper.js", "dist/esm/server/use-cache/use-cache-wrapper.js"].map((f) =>
  join(nextDir, f),
);

let failed = false;
for (const file of files) {
  if (!existsSync(file)) {
    console.error(`[patch-next-workers] No existe ${file}`);
    failed = true;
    continue;
  }
  const src = readFileSync(file, "utf8");
  if (src.includes(PATCHED)) {
    console.log(`[patch-next-workers] Ya aplicado: ${file}`);
  } else if (src.includes(ORIGINAL)) {
    writeFileSync(file, src.replace(ORIGINAL, PATCHED));
    console.log(`[patch-next-workers] Aplicado: ${file}`);
  } else {
    console.error(`[patch-next-workers] No se encontró el código a parchear en ${file} (¿cambió la versión de Next?)`);
    failed = true;
  }
}
if (failed) process.exit(1);
