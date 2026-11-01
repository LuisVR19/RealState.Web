import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";
import { getFavoriteIds } from "@/lib/account";
import { getAgents, getAmenities, searchProperties } from "@/lib/data";
import { OP_LABEL, shortCrc, TYPE_PLURAL } from "@/lib/format";
import { searchPath } from "@/lib/routes";
import { parseSearchParams } from "@/lib/search-params";
import type { SearchFilters } from "@/lib/types";

export const metadata: Metadata = { title: "Propiedades en Cartago · Thomas Mata S.A." };

export default function SearchPage({ searchParams }: PageProps<"/propiedades">) {
  return (
    <Suspense fallback={<div className="search"><div className="container empty-state" style={{ paddingTop: 64 }}><span className="muted-14">Buscando propiedades…</span></div></div>}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/propiedades">, "searchParams">) {
  // Primero los query params: lo que sigue ocurre por petición, no durante el prerender.
  const sp = await searchParams;
  const [amenities, agents] = await Promise.all([getAmenities(), getAgents()]);
  const f = parseSearchParams(sp, amenities.map((a) => a.name));
  // Las guardadas dependen del usuario: se leen con su sesión (RLS) y no se cachean.
  const { items, total } = await searchProperties(f, f.saved ? await getFavoriteIds() : undefined);
  // Página fuera de rango (p. ej. tras quitar favoritos): volver a la primera.
  if (!items.length && f.page > 1) redirect(searchPath({ ...f, page: 1 }));

  // Chips de filtros activos: cada uno enlaza a la misma búsqueda sin ese filtro.
  const without = (patch: Partial<SearchFilters>) => searchPath({ ...f, ...patch, page: 1 });
  const range = (min?: number, max?: number, fmt = shortCrc) => (min && max ? `${fmt(min)} – ${fmt(max)}` : min ? `Desde ${fmt(min)}` : `Hasta ${fmt(max!)}`);
  const activeChips = [
    f.saved && { label: "Guardadas", href: without({ saved: false }) },
    f.q && { label: `“${f.q}”`, href: without({ q: undefined }) },
    f.operation !== "Todas" && { label: OP_LABEL[f.operation], href: without({ operation: "Todas" }) },
    ...f.types.map((t) => ({ label: TYPE_PLURAL[t], href: without({ types: f.types.filter((x) => x !== t) }) })),
    ...f.cantons.map((c) => ({ label: c, href: without({ cantons: f.cantons.filter((x) => x !== c) }) })),
    (f.priceMin || f.priceMax) && { label: range(f.priceMin, f.priceMax), href: without({ priceMin: undefined, priceMax: undefined }) },
    f.bedrooms > 0 && { label: `${f.bedrooms}+ hab.`, href: without({ bedrooms: 0 }) },
    f.bathrooms > 0 && { label: `${f.bathrooms}+ baños`, href: without({ bathrooms: 0 }) },
    f.parking > 0 && { label: `${f.parking}+ parqueos`, href: without({ parking: 0 }) },
    (f.areaMin || f.areaMax) && { label: range(f.areaMin, f.areaMax, (n) => `${n} m²`), href: without({ areaMin: undefined, areaMax: undefined }) },
    ...f.amenities.map((a) => ({ label: a, href: without({ amenities: f.amenities.filter((x) => x !== a) }) })),
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <SearchView
      properties={items}
      total={total}
      agents={Object.fromEntries(agents.map((a) => [a.id, a]))}
      filters={f}
      activeChips={activeChips}
    />
  );
}
