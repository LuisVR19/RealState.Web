// GET /img/<bucket>/<ruta>?w=<ancho>&f=<webp|jpeg>
// Foto de Supabase Storage redimensionada con Cloudflare Images (binding IMAGES) y guardada en la
// caché de Cloudflare (Cache API) por un año. Ver lib/img.ts para el porqué.
//
// Las rutas de Storage son inmutables (cada subida usa un UUID nuevo), así que la respuesta se marca
// `immutable`. Si falta el binding (desarrollo) o la transformación falla, se entrega el original.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { IMG_FORMATS, parseImgParams, parseImgPath } from "@/lib/img";

const CACHE_CONTROL = "public, max-age=31536000, immutable";
const IMAGE_TYPES = /^image\/(jpeg|png|webp|avif|gif)$/;

type ImagesBinding = {
  input(stream: ReadableStream<Uint8Array>): {
    transform(t: { width: number; fit: "scale-down" }): {
      output(o: { format: string; quality: number }): Promise<{ image(): ReadableStream<Uint8Array>; contentType(): string }>;
    };
  };
};

/** Caché de Cloudflare (solo existe en Workers). */
const edgeCache = () => (globalThis.caches as unknown as { default?: Cache } | undefined)?.default;

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = parseImgPath((await params).path);
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !supabase) return notFound();
  const { w, f } = parseImgParams(request.nextUrl.searchParams);

  // Clave normalizada: otros parámetros no generan variantes nuevas.
  const key = new Request(`${request.nextUrl.origin}/img/${path}?w=${w}&f=${f}`);
  const cache = edgeCache();
  const hit = await cache?.match(key);
  if (hit) return hit;

  const upstream = await fetch(`${supabase.replace(/\/+$/, "")}/storage/v1/object/public/${path}`);
  const sourceType = upstream.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!upstream.ok || !IMAGE_TYPES.test(sourceType)) return notFound();
  const original = await upstream.arrayBuffer();

  let body: BodyInit = original;
  let contentType = sourceType;
  let ctx: { waitUntil(p: Promise<unknown>): void } | undefined;
  try {
    const cf = getCloudflareContext();
    ctx = cf.ctx;
    const images = (cf.env as unknown as { IMAGES?: ImagesBinding }).IMAGES;
    if (images) {
      const out = await images
        .input(new Blob([original]).stream())
        .transform({ width: w, fit: "scale-down" })
        .output({ format: IMG_FORMATS[f], quality: 78 });
      // Se lee completo para poder cachearlo y para caer al original si la transformación falla a mitad.
      body = await new Response(out.image()).arrayBuffer();
      contentType = out.contentType();
    }
  } catch (e) {
    console.warn("[img] transformación fallida, se entrega el original", path, e);
    body = original;
    contentType = sourceType;
  }

  const response = new Response(body, {
    headers: { "Content-Type": contentType, "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" },
  });
  if (cache) {
    const put = cache.put(key, response.clone());
    if (ctx) ctx.waitUntil(put);
    else await put;
  }
  return response;
}
