// Filtros del listado <-> query params de /catalogo. Lo usan el servidor (para consultar)
// y el navegador (para construir enlaces). Todo valor externo se valida contra listas
// cerradas o se acota: así los parámetros arbitrarios no llegan a la base ni a la caché.
import { CANTONS, CATEGORIES, CATEGORY_SLUG, FUELS, operationsOf, TRANSMISSIONS, typesOf } from "./format";
import type { Canton, Category, Fuel, Operation, PropertyType, SearchFilters, SortOrder, Transmission } from "./types";

export const SORTS: readonly SortOrder[] = ["recientes", "precio_asc", "precio_desc", "area_desc", "anio_desc", "km_asc", "destacadas"];
export const PAGE_SIZE = 24;
const MAX_Q = 80;
const MAX_PAGE = 50;

export const EMPTY_FILTERS: SearchFilters = {
  category: null, operation: "Todas", types: [], cantons: [], bedrooms: 0, bathrooms: 0, parking: 0, amenities: [], brands: [], sort: "recientes", saved: false, page: 1,
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
const oneOf = <T extends string>(allowed: readonly T[], v: string | undefined) => (allowed.includes(v as T) ? (v as T) : undefined);
const categoryFromSlug = (slug: string | undefined): Category | null => CATEGORIES.find((c) => CATEGORY_SLUG[c] === slug) ?? null;

/**
 * Lee y sanea los query params. Los valores inválidos se ignoran.
 * Con una categoría elegida se descartan los filtros que no le aplican (p. ej. habitaciones en vehículos o servicios).
 */
export function parseSearchParams(
  sp: Raw,
  amenityNames: readonly string[] = [],
  locationNames: readonly string[] = CANTONS,
  brandNames: readonly string[] = [],
): SearchFilters {
  const category = categoryFromSlug(one(sp.cat));
  // Filtros de inmueble (habitaciones, área…) y de vehículo (marca, año…): no aplican a las otras categorías.
  const noHome = category === "Vehículo" || category === "Servicio";
  const noVehicle = category === "Inmueble" || category === "Servicio";
  const op = one(sp.op);
  const q = one(sp.q)?.trim().slice(0, MAX_Q);
  const sort = one(sp.orden);
  let priceMin = num(sp.pmin, 1e12), priceMax = num(sp.pmax, 1e12);
  if (priceMin && priceMax && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];
  let areaMin = num(sp.amin, 1e7), areaMax = num(sp.amax, 1e7);
  if (areaMin && areaMax && areaMin > areaMax) [areaMin, areaMax] = [areaMax, areaMin];
  const yearMin = num(sp.anio, 2100);
  return {
    category,
    operation: operationsOf(category).includes(op as Operation) ? (op as Operation) : "Todas",
    types: pick<PropertyType>(typesOf(category), list(sp.tipo)),
    // Solo ubicaciones conocidas (las que tienen anuncios o zona destacada): conjunto finito para la caché.
    cantons: pick<Canton>(locationNames, list(sp.canton)),
    priceMin, priceMax,
    bedrooms: noHome ? 0 : num(sp.hab, 10) ?? 0,
    bathrooms: noHome ? 0 : num(sp.banos, 10) ?? 0,
    parking: noHome ? 0 : num(sp.parqueos, 10) ?? 0,
    areaMin: noHome ? undefined : areaMin,
    areaMax: noHome ? undefined : areaMax,
    amenities: pick(amenityNames, list(sp.amen)),
    brands: noVehicle ? [] : pick(brandNames, list(sp.marca)),
    yearMin: noVehicle || !yearMin || yearMin < 1950 ? undefined : yearMin,
    kmMax: noVehicle ? undefined : num(sp.km, 5_000_000),
    transmission: noVehicle ? undefined : oneOf<Transmission>(TRANSMISSIONS, one(sp.trans)),
    fuel: noVehicle ? undefined : oneOf<Fuel>(FUELS, one(sp.comb)),
    q: q || undefined,
    sort: SORTS.includes(sort as SortOrder) ? (sort as SortOrder) : "recientes",
    saved: one(sp.guardadas) === "1",
    page: num(sp.pagina, MAX_PAGE) ?? 1,
  };
}

/** Query string canónico (orden fijo, sin valores por defecto). */
export function toQueryString(f: Partial<SearchFilters>) {
  const sp = new URLSearchParams();
  if (f.category) sp.set("cat", CATEGORY_SLUG[f.category]);
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
  if (f.brands?.length) sp.set("marca", f.brands.join(","));
  if (f.yearMin) sp.set("anio", String(f.yearMin));
  if (f.kmMax) sp.set("km", String(f.kmMax));
  if (f.transmission) sp.set("trans", f.transmission);
  if (f.fuel) sp.set("comb", f.fuel);
  if (f.q) sp.set("q", f.q);
  if (f.sort && f.sort !== "recientes") sp.set("orden", f.sort);
  if (f.saved) sp.set("guardadas", "1");
  if (f.page && f.page > 1) sp.set("pagina", String(f.page));
  return sp.toString();
}

/** Cantidad de filtros activos (para el contador del botón "Filtros"). La categoría no cuenta: es la pestaña. */
export const activeFilterCount = (f: SearchFilters) =>
  [
    f.operation !== "Todas", f.types.length, f.cantons.length, f.priceMin || f.priceMax, f.bedrooms, f.bathrooms, f.parking,
    f.areaMin || f.areaMax, f.amenities.length, f.brands.length, f.yearMin, f.kmMax, f.transmission, f.fuel, f.q, f.saved,
  ].filter(Boolean).length;
