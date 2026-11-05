// Filtros del listado <-> query params de /propiedades. Lo usan el servidor (para consultar)
// y el navegador (para construir enlaces). Todo valor externo se valida contra listas
// cerradas o se acota: así los parámetros arbitrarios no llegan a la base ni a la caché.
import { CANTONS, OPERATIONS, TYPES } from "./format";
import type { Canton, Operation, PropertyType, SearchFilters, SortOrder } from "./types";

export const SORTS: readonly SortOrder[] = ["recientes", "precio_asc", "precio_desc", "area_desc", "destacadas"];
export const PAGE_SIZE = 24;
const MAX_Q = 80;
const MAX_PAGE = 50;

export const EMPTY_FILTERS: SearchFilters = {
  operation: "Todas", types: [], cantons: [], bedrooms: 0, bathrooms: 0, parking: 0, amenities: [], sort: "recientes", saved: false, page: 1,
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (one(v) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
/** Valores permitidos, sin duplicados y en el orden de `allowed` (una sola clave de caché por combinación). */
const pick = <T extends string>(allowed: readonly T[], v: string[]) => allowed.filter((a) => v.includes(a));
const num = (v: string | string[] | undefined, max: number) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : undefined;
};

/** Lee y sanea los query params. Los valores inválidos se ignoran. */
export function parseSearchParams(sp: Raw, amenityNames: readonly string[] = [], locationNames: readonly string[] = CANTONS): SearchFilters {
  const op = one(sp.op);
  const q = one(sp.q)?.trim().slice(0, MAX_Q);
  const sort = one(sp.orden);
  let priceMin = num(sp.pmin, 1e12), priceMax = num(sp.pmax, 1e12);
  if (priceMin && priceMax && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];
  let areaMin = num(sp.amin, 1e7), areaMax = num(sp.amax, 1e7);
  if (areaMin && areaMax && areaMin > areaMax) [areaMin, areaMax] = [areaMax, areaMin];
  return {
    operation: OPERATIONS.includes(op as Operation) ? (op as Operation) : "Todas",
    types: pick<PropertyType>(TYPES, list(sp.tipo)),
    // Solo ubicaciones conocidas (las que tienen propiedades o zona destacada): conjunto finito para la caché.
    cantons: pick<Canton>(locationNames, list(sp.canton)),
    priceMin, priceMax,
    bedrooms: num(sp.hab, 10) ?? 0,
    bathrooms: num(sp.banos, 10) ?? 0,
    parking: num(sp.parqueos, 10) ?? 0,
    areaMin, areaMax,
    amenities: pick(amenityNames, list(sp.amen)),
    q: q || undefined,
    sort: SORTS.includes(sort as SortOrder) ? (sort as SortOrder) : "recientes",
    saved: one(sp.guardadas) === "1",
    page: num(sp.pagina, MAX_PAGE) ?? 1,
  };
}

/** Query string canónico (orden fijo, sin valores por defecto). */
export function toQueryString(f: Partial<SearchFilters>) {
  const sp = new URLSearchParams();
  if (f.operation && f.operation !== "Todas") sp.set("op", f.operation);
  if (f.types?.length) sp.set("tipo", f.types.join(","));
  if (f.cantons?.length) sp.set("canton", f.cantons.join(","));
  if (f.priceMin) sp.set("pmin", String(f.priceMin));
  if (f.priceMax) sp.set("pmax", String(f.priceMax));
  if (f.bedrooms) sp.set("hab", String(f.bedrooms));
  if (f.bathrooms) sp.set("banos", String(f.bathrooms));
  if (f.parking) sp.set("parqueos", String(f.parking));
  if (f.areaMin) sp.set("amin", String(f.areaMin));
  if (f.areaMax) sp.set("amax", String(f.areaMax));
  if (f.amenities?.length) sp.set("amen", f.amenities.join(","));
  if (f.q) sp.set("q", f.q);
  if (f.sort && f.sort !== "recientes") sp.set("orden", f.sort);
  if (f.saved) sp.set("guardadas", "1");
  if (f.page && f.page > 1) sp.set("pagina", String(f.page));
  return sp.toString();
}

/** Cantidad de filtros activos (para el contador del botón "Filtros"). */
export const activeFilterCount = (f: SearchFilters) =>
  [f.operation !== "Todas", f.types.length, f.cantons.length, f.priceMin || f.priceMax, f.bedrooms, f.bathrooms, f.parking, f.areaMin || f.areaMax, f.amenities.length, f.q, f.saved].filter(Boolean).length;
