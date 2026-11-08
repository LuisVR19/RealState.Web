import { toQueryString } from "./search-params";
import type { SearchFilters } from "./types";

/** Ruta pública única del inventario: /catalogo (inmuebles y vehículos). */
export const CATALOG_PATH = "/catalogo";
export const propertyPath = (p: { code: string }) => `${CATALOG_PATH}/${p.code}`;
export const agentPath = (id: string) => `/asesores/${id}`;
export const searchPath = (filters?: Partial<SearchFilters>) => {
  const s = filters ? toQueryString(filters) : "";
  return CATALOG_PATH + (s ? "?" + s : "");
};
