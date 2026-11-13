import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";
import { SearchSkeleton } from "@/components/Skeletons";
import { getFavoriteIds } from "@/lib/account";
import { pickAd } from "@/lib/ads";
import { getActiveAds, getAgents, getAmenities, getLocations, getVehicleBrands, searchProperties } from "@/lib/data";
import { CATEGORY_LABEL, dots, OP_LABEL, shortCrc, TYPE_PLURAL } from "@/lib/format";
import { searchPath } from "@/lib/routes";
import { parseSearchParams } from "@/lib/search-params";
import type { SearchFilters } from "@/lib/types";

export const metadata: Metadata = {
  title: "Catálogo · Thomas Mata S.A.",
  description: "Casas, apartamentos, terrenos, carros, motos, pickups y camiones en venta y alquiler, y servicios de empresas y profesionales.",
};

export default function SearchPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/catalogo">, "searchParams">) {
  // Primero los query params: lo que sigue ocurre por petición, no durante el prerender.
  const sp = await searchParams;
  const [amenities, agents, locations, brands] = await Promise.all([getAmenities(), getAgents(), getLocations(), getVehicleBrands()]);
  // Las amenidades válidas dependen de la categoría elegida (inmueble, vehículo o servicio).
  const f0 = parseSearchParams(sp, amenities.map((a) => a.name), locations, brands);
  const f = f0.category ? { ...f0, amenities: f0.amenities.filter((n) => amenities.some((a) => a.name === n && a.category === f0.category)) } : f0;
  // Las guardadas dependen del usuario: se leen con su sesión (RLS) y no se cachean.
  const [{ items, total }, cards] = await Promise.all([
    searchProperties(f, f.saved ? await getFavoriteIds() : undefined),
    // Con un solo cantón filtrado, los anuncios segmentados a ese cantón van primero.
    getActiveAds("search_card", f.cantons.length === 1 ? f.cantons[0] : null),
  ]);
  // Página fuera de rango (p. ej. tras quitar favoritos): volver a la primera.
  if (!items.length && f.page > 1) redirect(searchPath({ ...f, page: 1 }));

  // Chips de filtros activos: cada uno enlaza a la misma búsqueda sin ese filtro.
  const without = (patch: Partial<SearchFilters>) => searchPath({ ...f, ...patch, page: 1 });
  const range = (min?: number, max?: number, fmt = shortCrc) => (min && max ? `${fmt(min)} – ${fmt(max)}` : min ? `Desde ${fmt(min)}` : `Hasta ${fmt(max!)}`);
  const activeChips = [
    f.saved && { label: "Guardadas", href: without({ saved: false }) },
    f.q && { label: `“${f.q}”`, href: without({ q: undefined }) },
    f.category && { label: CATEGORY_LABEL[f.category], href: without({ category: null, types: [], brands: [], yearMin: undefined, kmMax: undefined, transmission: undefined, fuel: undefined, bedrooms: 0, bathrooms: 0, parking: 0, areaMin: undefined, areaMax: undefined, amenities: [] }) },
    f.operation !== "Todas" && { label: OP_LABEL[f.operation], href: without({ operation: "Todas" }) },
    ...f.types.map((t) => ({ label: TYPE_PLURAL[t], href: without({ types: f.types.filter((x) => x !== t) }) })),
    ...f.cantons.map((c) => ({ label: c, href: without({ cantons: f.cantons.filter((x) => x !== c) }) })),
    (f.priceMin || f.priceMax) && { label: range(f.priceMin, f.priceMax), href: without({ priceMin: undefined, priceMax: undefined }) },
    f.bedrooms > 0 && { label: `${f.bedrooms}+ hab.`, href: without({ bedrooms: 0 }) },
    f.bathrooms > 0 && { label: `${f.bathrooms}+ baños`, href: without({ bathrooms: 0 }) },
    f.parking > 0 && { label: `${f.parking}+ parqueos`, href: without({ parking: 0 }) },
    (f.areaMin || f.areaMax) && { label: range(f.areaMin, f.areaMax, (n) => `${n} m²`), href: without({ areaMin: undefined, areaMax: undefined }) },
    ...f.amenities.map((a) => ({ label: a, href: without({ amenities: f.amenities.filter((x) => x !== a) }) })),
    ...f.brands.map((b) => ({ label: b, href: without({ brands: f.brands.filter((x) => x !== b) }) })),
    f.yearMin && { label: `Desde ${f.yearMin}`, href: without({ yearMin: undefined }) },
    f.kmMax && { label: `Hasta ${dots(f.kmMax)} km`, href: without({ kmMax: undefined }) },
    f.transmission && { label: f.transmission, href: without({ transmission: undefined }) },
    f.fuel && { label: f.fuel, href: without({ fuel: undefined }) },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <SearchView
      properties={items}
      total={total}
      agents={Object.fromEntries(agents.map((a) => [a.id, a]))}
      filters={f}
      activeChips={activeChips}
      brands={brands}
      ad={pickAd(cards, f.page - 1)}
    />
  );
}
