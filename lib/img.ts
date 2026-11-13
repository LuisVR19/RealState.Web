// URLs de imágenes servidas por /img (app/img/[...path]/route.ts) en lugar de directo desde Supabase.
//
// Por qué: el "cached egress" de Supabase Storage se cobra por cada descarga desde su CDN. Las fotos
// originales (hasta 5 MB) se mostraban tal cual en tarjetas y miniaturas, y el crawler de Facebook
// pedía el og:image cientos de veces al día. /img las redimensiona con Cloudflare Images y las guarda
// en la caché de Cloudflare por un año: Supabase entrega cada foto una vez por centro de datos.

/** Anchos permitidos (limitan las variantes a cachear y a transformar). */
export const IMG_WIDTHS = [160, 400, 800, 1200, 1600] as const;
export type ImgWidth = (typeof IMG_WIDTHS)[number];
export const IMG_FORMATS = { webp: "image/webp", jpeg: "image/jpeg" } as const;
export type ImgFormat = keyof typeof IMG_FORMATS;

/** Buckets públicos que /img acepta. */
export const IMG_BUCKETS = new Set(["property-images", "zone-images", "ad-images"]);
const PUBLIC_PREFIX = "/storage/v1/object/public/";

/**
 * URL de /img para una foto de Supabase Storage, con el ancho y formato pedidos.
 * Las URLs que no son del Storage del proyecto (Unsplash, enlaces externos) se devuelven igual.
 */
export function img(url: string | null | undefined, w: ImgWidth, f: ImgFormat = "webp", supabase = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  if (!url) return "";
  if (!supabase) return url;
  const prefix = supabase.replace(/\/+$/, "") + PUBLIC_PREFIX;
  if (!url.startsWith(prefix)) return url;
  const path = url.slice(prefix.length).split(/[?#]/)[0];
  return `/img/${path}?w=${w}${f === "webp" ? "" : `&f=${f}`}`;
}

/** Valida la ruta pedida a /img: `<bucket>/<carpetas…>/<archivo>`, sin `..` ni caracteres raros. */
export function parseImgPath(segments: string[]): string | null {
  if (segments.length < 2 || !IMG_BUCKETS.has(segments[0])) return null;
  if (!segments.every((s) => /^[A-Za-z0-9._-]+$/.test(s) && s !== "." && s !== "..")) return null;
  return segments.join("/");
}

/** Ancho y formato válidos a partir de la query (valores fuera de lista → los por defecto). */
export function parseImgParams(params: URLSearchParams): { w: ImgWidth; f: ImgFormat } {
  const n = Number(params.get("w"));
  const w = (IMG_WIDTHS as readonly number[]).includes(n) ? (n as ImgWidth) : 1200;
  const f = params.get("f") === "jpeg" ? "jpeg" : "webp";
  return { w, f };
}
