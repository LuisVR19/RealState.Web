// Invalida la caché pública cuando cambian los datos (lo llama el panel tras guardar, o un
// Database Webhook de Supabase). Protegido con un secreto compartido en Authorization: Bearer.
//
//   POST /api/revalidate
//   Authorization: Bearer <REVALIDATE_SECRET>
//   { "tags": ["properties", "property:ISF-0001"] }   // sin cuerpo = todas las etiquetas públicas
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TAGS } from "@/lib/data";

const ALL_TAGS = [TAGS.properties, TAGS.agents, TAGS.zones, TAGS.amenities, TAGS.ads];
const TAG_RE = /^(properties|agents|zones|amenities|property:ISF-\d{4,8})$/;

function authorized(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 32) return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let tags: string[] = ALL_TAGS;
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags)) tags = body.tags.filter((t): t is string => typeof t === "string" && TAG_RE.test(t)).slice(0, 50);
  } catch {
    // Sin cuerpo JSON: se revalida todo.
  }

  // { expire: 0 }: la siguiente visita recalcula en línea. No se usa 'max' (stale-while-revalidate):
  // en Cloudflare la regeneración en segundo plano de OpenNext se queda colgada y el sitio seguía
  // sirviendo para siempre la versión anterior (p. ej. 0 vehículos en la portada tras publicarlos).
  tags.forEach((t) => revalidateTag(t, { expire: 0 }));
  return NextResponse.json({ revalidated: tags });
}
