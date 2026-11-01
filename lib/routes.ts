import { toQueryString } from "./search-params";
import type { SearchFilters } from "./types";

export const propertyPath = (p: { code: string }) => `/propiedades/${p.code}`;
export const agentPath = (id: string) => `/asesores/${id}`;
export const searchPath = (filters?: Partial<SearchFilters>) => {
  const s = filters ? toQueryString(filters) : "";
  return "/propiedades" + (s ? "?" + s : "");
};
