// Capa de acceso a datos PÚBLICOS. Todas las páginas leen desde aquí.
//
// Escalabilidad: cada lectura usa el cliente anon sin cookies (lib/supabase/public.ts) dentro
// de `use cache`, así que miles de visitantes comparten el mismo resultado y Supabase recibe
// una consulta por intervalo de caché. Cuando el panel cambia datos, POST /api/revalidate
// invalida las etiquetas (TAGS) y el siguiente visitante dispara la recarga en segundo plano.
//
// Seguridad: la RLS de anon decide qué se ve (solo propiedades publicadas con imágenes,
// vista agents_public sin email, etc.). Los datos del usuario viven en lib/account.ts.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { adFromRow, type Ad, type AdPlacement } from "./ads";
import { formatPhone, initialsOf, matchingPreset } from "./format";
import { EMPTY_FILTERS, PAGE_SIZE } from "./search-params";
import type { Database } from "./supabase/database.types";
import { createPublicClient } from "./supabase/public";
import { siteContactFrom } from "./team";
import type { Agent, AmenityOption, Canton, FeaturedZone, Property, PropertySummary, SearchFilters, SearchResult, SiteContact } from "./types";

export const TAGS = {
  properties: "properties",
  agents: "agents",
  zones: "zones",
  amenities: "amenities",
  ads: "ads",
  property: (code: string) => `property:${code}`,
} as const;

/** Tope del catálogo que se carga entero (portada, similares, mapa de códigos). */
const CATALOG_LIMIT = 100;
const CODE_RE = /^ISF-\d{4,8}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isPropertyCode = (code: string) => CODE_RE.test(code.toUpperCase());
export const isUuid = (id: string) => UUID_RE.test(id);

type SearchRow = Database["public"]["Functions"]["search_properties"]["Returns"][number];
type SearchArgs = Database["public"]["Functions"]["search_properties"]["Args"];

const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0);

function toSummary(r: SearchRow): PropertySummary {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    operation: r.operation,
    type: r.type,
    featured: r.featured,
    tag: r.tag ?? undefined,
    canton: r.canton,
    zone: r.zone,
    lat: Number(r.lat),
    lng: Number(r.lng),
    price: Number(r.price),
    bedrooms: r.bedrooms ?? 0,
    bathrooms: Number(r.bathrooms ?? 0),
    areaM2: Number(r.area_m2 ?? 0),
    parkingSpaces: r.parking_spaces ?? 0,
    guests: r.guests ?? undefined,
    agentId: r.agent_id,
    images: r.image_urls ?? [],
    daysPublished: daysSince(r.published_at),
  };
}

function fail(what: string, error: { message: string }): never {
  // El detalle va al log del servidor; al usuario le llega la página de error genérica.
  console.error(`[data] ${what}:`, error.message);
  throw new Error(`No se pudo cargar ${what}`);
}

// -----------------------------------------------------------------------------
// Catálogos
// -----------------------------------------------------------------------------

export async function getAmenities(): Promise<AmenityOption[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.amenities);
  const { data, error } = await createPublicClient().from("amenities").select("id, name").order("name");
  if (error) fail("las amenidades", error);
  return data;
}

export async function getFeaturedZones(): Promise<FeaturedZone[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.zones);
  const { data, error } = await createPublicClient()
    .from("featured_zones")
    .select("id, name, label, image_url, position")
    .eq("visible", true)
    .order("position");
  if (error) fail("las zonas destacadas", error);
  return data.map((z) => ({ id: z.id, name: z.name, label: z.label, imageUrl: z.image_url, position: z.position }));
}

/**
 * Anuncios activos y vigentes para un espacio (rpc get_active_ads; sin datos de contacto de la marca).
 * Se invalidan al cambiar en el panel (etiqueta `ads`); además caducan en pocos minutos porque el
 * inicio y el fin de una campaña dependen de la fecha, no de una escritura en la base.
 * La publicidad nunca rompe una página: si falla la lectura, simplemente no hay anuncios.
 */
export async function getActiveAds(placement: AdPlacement, canton?: Canton | null): Promise<Ad[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(TAGS.ads);
  const { data, error } = await createPublicClient().rpc("get_active_ads", { p_placement: placement, ...(canton ? { p_canton: canton } : {}) });
  if (error) {
    console.error("[data] los anuncios:", error.message);
    return [];
  }
  return (data ?? []).map(adFromRow);
}

// -----------------------------------------------------------------------------
// Propiedades
// -----------------------------------------------------------------------------

/** Ejecuta search_properties (sin caché). `extra` permite filtrar por ids o por asesor. */
async function runSearch(f: SearchFilters, extra: Pick<SearchArgs, "p_ids" | "p_agent_id"> = {}, limit = PAGE_SIZE): Promise<SearchResult> {
  const amenityIds = f.amenities.length
    ? (await getAmenities()).filter((a) => f.amenities.includes(a.name)).map((a) => a.id)
    : undefined;
  const args: SearchArgs = {
    p_operation: f.operation === "Todas" ? undefined : f.operation,
    p_types: f.types.length ? f.types : undefined,
    p_cantons: f.cantons.length ? f.cantons : undefined,
    p_price_min: f.priceMin,
    p_price_max: f.priceMax,
    p_min_bedrooms: f.bedrooms || undefined,
    p_min_bathrooms: f.bathrooms || undefined,
    p_min_parking: f.parking || undefined,
    p_min_area_m2: f.areaMin,
    p_max_area_m2: f.areaMax,
    p_amenities: amenityIds,
    p_query: f.q?.replace(/[\\%_]/g, (c) => "\\" + c), // el texto se usa en LIKE: \, % y _ son literales
    p_sort: f.sort,
    p_limit: limit,
    p_offset: (f.page - 1) * limit,
    ...extra,
  };
  const { data, error } = await createPublicClient().rpc("search_properties", args);
  if (error) fail("la búsqueda de propiedades", error);
  return { items: data.map(toSummary), total: Number(data[0]?.total_count ?? 0) };
}

const isCacheable = (f: SearchFilters) =>
  !f.q && f.areaMin === undefined && f.areaMax === undefined &&
  ((f.priceMin === undefined && f.priceMax === undefined) || matchingPreset(f.operation, f.priceMin, f.priceMax) !== null);

async function searchCached(f: SearchFilters): Promise<SearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties);
  return runSearch(f);
}

/**
 * Búsqueda del listado. Solo se cachean combinaciones de un conjunto finito (listas cerradas,
 * contadores 0–10 y rangos de precio de los presets): así nadie puede saltarse la caché ni
 * llenarla variando valores. Texto libre, montos o áreas a mano y `onlyIds` (guardadas del
 * usuario) van por petición.
 */
export async function searchProperties(f: SearchFilters, onlyIds?: string[]): Promise<SearchResult> {
  if (!onlyIds && isCacheable(f)) return searchCached(f);
  await connection(); // Lectura por petición (sin caché): fuera del prerender.
  if (onlyIds) {
    const ids = onlyIds.filter(isUuid);
    return ids.length ? runSearch(f, { p_ids: ids }) : { items: [], total: 0 };
  }
  return runSearch(f);
}

/** Propiedades públicas por id (favoritos, coincidencias, visitas). No se cachea: depende del usuario. */
export async function getPropertiesByIds(ids: string[]): Promise<PropertySummary[]> {
  await connection();
  const valid = ids.filter(isUuid);
  if (!valid.length) return [];
  return (await runSearch(EMPTY_FILTERS, { p_ids: valid }, CATALOG_LIMIT)).items;
}

/** Catálogo publicado completo (hasta CATALOG_LIMIT), del más reciente al más antiguo. */
export async function getPublishedProperties(): Promise<SearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties);
  return runSearch(EMPTY_FILTERS, {}, CATALOG_LIMIT);
}

export async function getPropertiesByAgent(agentId: string): Promise<PropertySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties);
  if (!isUuid(agentId)) return [];
  return (await runSearch(EMPTY_FILTERS, { p_agent_id: agentId }, CATALOG_LIMIT)).items;
}

/**
 * Ficha completa por código (ISF-0001). null si no existe o no es pública.
 * Se valida ANTES de entrar a la caché: códigos inventados no crean entradas ni llegan a la base.
 */
export async function getPropertyByCode(rawCode: string): Promise<Property | null> {
  const code = rawCode.toUpperCase();
  return CODE_RE.test(code) ? getPropertyByCodeCached(code) : null;
}

async function getPropertyByCodeCached(code: string): Promise<Property | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.properties, TAGS.property(code));

  const { data: r, error } = await createPublicClient()
    .from("properties")
    .select(
      "id, code, title, description, operation, type, status, featured, tag, canton, zone, address, lat, lng, price, " +
        "maintenance_fee, bedrooms, bathrooms, area_m2, parking_spaces, year_built, guests, floor, delivery, agent_id, published_at, " +
        "property_images(url, position), property_amenities(amenities(name))",
    )
    .eq("code", code)
    .eq("status", "Publicada")
    .order("position", { referencedTable: "property_images" })
    .maybeSingle<
      Database["public"]["Tables"]["properties"]["Row"] & {
        property_images: { url: string; position: number }[];
        property_amenities: { amenities: { name: string } | null }[];
      }
    >();
  if (error) fail(`la propiedad ${code}`, error);
  if (!r || !r.property_images.length) return null;

  return {
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    operation: r.operation,
    type: r.type,
    status: r.status,
    featured: r.featured,
    tag: r.tag ?? undefined,
    canton: r.canton,
    zone: r.zone,
    address: r.address,
    lat: Number(r.lat),
    lng: Number(r.lng),
    price: Number(r.price),
    maintenanceFee: r.maintenance_fee ? Number(r.maintenance_fee) : undefined,
    bedrooms: r.bedrooms ?? 0,
    bathrooms: Number(r.bathrooms ?? 0),
    areaM2: Number(r.area_m2 ?? 0),
    parkingSpaces: r.parking_spaces,
    yearBuilt: r.year_built ?? undefined,
    guests: r.guests ?? undefined,
    floor: r.floor ?? undefined,
    delivery: r.delivery ?? undefined,
    agentId: r.agent_id,
    images: r.property_images.map((i) => i.url),
    amenities: r.property_amenities.map((pa) => pa.amenities?.name).filter((n): n is string => !!n).sort(),
    daysPublished: daysSince(r.published_at),
  };
}

/** Propiedad destacada de la portada: la destacada más reciente o, si no hay, la más reciente. */
export async function getFeaturedProperty(): Promise<PropertySummary | null> {
  const { items } = await getPublishedProperties();
  return items.find((p) => p.featured) ?? items[0] ?? null;
}

/** Similares: misma operación o tipo, priorizando la misma operación y el precio más cercano. */
export async function getSimilarProperties(p: PropertySummary, limit = 3): Promise<PropertySummary[]> {
  const { items } = await getPublishedProperties();
  return items
    .filter((x) => x.id !== p.id && (x.operation === p.operation || x.type === p.type))
    .sort((x, y) => Number(y.operation === p.operation) - Number(x.operation === p.operation) || Math.abs(x.price - p.price) - Math.abs(y.price - p.price))
    .slice(0, limit);
}

// -----------------------------------------------------------------------------
// Asesores
// -----------------------------------------------------------------------------

/**
 * Contacto general del sitio ("Hablar con un asesor", pie de página, propiedades sin asesor): el
 * teléfono, horario y ubicación del dueño del negocio (agents.is_owner). Se edita en el panel, en
 * Mi perfil del dueño; al guardar, el panel invalida la etiqueta `agents`.
 */
export async function getSiteContact(): Promise<SiteContact> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.agents);
  const { data, error } = await createPublicClient()
    .from("agents_public")
    .select("phone, contact_hours, contact_location")
    .eq("is_owner", true)
    .maybeSingle();
  if (error) fail("el contacto del sitio", error);
  return siteContactFrom(data);
}

/** Asesores activos con sus reseñas (vista agents_public: sin email ni datos internos). */
export async function getAgents(): Promise<Agent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.agents);
  const db = createPublicClient();
  const [agents, reviews, contact] = await Promise.all([
    db.from("agents_public").select("*").order("deals_closed", { ascending: false }),
    db.from("agent_reviews").select("agent_id, author_name, meta, text, rating").order("created_at", { ascending: false }),
    getSiteContact(),
  ]);
  if (agents.error) fail("los asesores", agents.error);
  if (reviews.error) fail("las reseñas", reviews.error);

  return agents.data
    .filter((a) => a.id && a.name)
    .map((a) => {
      const phone = a.phone ?? "";
      const rating = Number(a.rating ?? 0);
      return {
        id: a.id!,
        name: a.name!,
        firstName: a.first_name || a.name!.split(" ")[0],
        initials: initialsOf(a.name!),
        photoUrl: a.photo_url,
        role: a.specialty || "Asesor inmobiliario",
        zones: a.zones ?? "",
        languages: (a.languages ?? []).join(", "),
        yearsExperience: a.years_experience ?? 0,
        dealsClosed: a.deals_closed ?? 0,
        rating: rating.toFixed(1).replace(".", ","),
        reviewsCount: a.reviews_count ?? 0,
        responseTime: a.response_time || "15 min",
        whatsapp: phone ? "506" + phone : contact.whatsapp,
        phone: formatPhone(phone),
        bio: a.bio ?? "",
        reviews: reviews.data
          .filter((r) => r.agent_id === a.id)
          .map((r) => ({ text: r.text, author: r.author_name, meta: r.meta ?? "", rating: r.rating })),
      };
    });
}

export async function getAgent(id: string): Promise<Agent | null> {
  if (!isUuid(id)) return null;
  return (await getAgents()).find((a) => a.id === id) ?? null;
}

/** Asesor de una propiedad, o el contacto general del equipo. */
export async function getAgentOrTeam(id?: string | null): Promise<Agent> {
  return (id && (await getAgent(id))) || (await getSiteContact()).team;
}

/** Resuelve el asesor de cada propiedad (cae en el contacto del equipo si no está activo). */
export async function agentResolver(): Promise<(id: string) => Agent> {
  const [agents, contact] = await Promise.all([getAgents(), getSiteContact()]);
  const byId = new Map(agents.map((a) => [a.id, a]));
  return (id) => byId.get(id) ?? contact.team;
}
