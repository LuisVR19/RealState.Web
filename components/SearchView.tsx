"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import type { Map as LeafletMap } from "leaflet";
import { amenityIcon, crc, dots, matchingPreset, OP_LABEL, pricePresetsFor, priceSuffix, TYPES, TYPE_ICON, TYPE_PLURAL, waProperty } from "@/lib/format";
import { propertyPath, searchPath } from "@/lib/routes";
import type { Ad } from "@/lib/ads";
import { activeFilterCount, PAGE_SIZE } from "@/lib/search-params";
import { track } from "@/lib/track";
import type { Agent, Operation, PropertySummary, SearchFilters, SortOrder } from "@/lib/types";
import { Chip, toggle } from "./Chip";
import { SponsoredCard } from "./Ads";
import { PropertyCard } from "./PropertyCard";
import { MAP_ATTRIBUTION, SearchMap } from "./SearchMap";
import { PropertyGridSkeleton } from "./Skeletons";
import { useUI } from "./ui-provider";

type Op = Operation | "Todas";
type Pop = "op" | "type" | "price" | "beds" | null;

interface Props {
  properties: PropertySummary[];
  total: number;
  agents: Record<string, Agent>;
  filters: SearchFilters;
  /** Chips de filtros activos; cada uno enlaza a la búsqueda sin ese filtro. */
  activeChips: { label: string; href: string }[];
  /** Tarjeta patrocinada de esta página (una como máximo), o null. */
  ad?: Ad | null;
}

const toAmount = (s: string) => {
  const n = Number(s.replace(/\D/g, ""));
  return n > 0 ? n : undefined;
};

/**
 * Listado con mapa. Los filtros viven en la URL: cada cambio navega a la nueva búsqueda
 * (router.replace) y el servidor la resuelve con search_properties.
 */
export function SearchView({ properties, total, agents, filters: f, activeChips, ad = null }: Props) {
  const { open, contact, locations } = useUI();
  const TEAM_CONTACT = contact.team;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const mapRef = useRef<LeafletMap | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [mView, setMView] = useState<"list" | "map">("list");
  const [pop, setPop] = useState<Pop>(null);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState(f.q ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawer(false);
      setPop(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Una "búsqueda" por cada combinación de filtros que la persona aplica (no se envía cuáles ni el texto).
  const searchKey = activeFilterCount({ ...f, saved: false }) > 0 ? searchPath({ ...f, page: 1 }) : null;
  useEffect(() => {
    if (searchKey) track("search");
  }, [searchKey]);

  /** Aplica un cambio de filtros (vuelve a la página 1). */
  const apply = (patch: Partial<SearchFilters>) =>
    startTransition(() => router.replace(searchPath({ ...f, ...patch, page: 1 }), { scroll: false }));

  /** Navegación de un <Link> dentro de la misma transición, para que también muestre los skeletons.
   *  Ctrl/Cmd/clic medio siguen abriendo en otra pestaña como un enlace normal. */
  const viaTransition = (href: string, replace = true) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    startTransition(() => (replace ? router.replace(href, { scroll: false }) : router.push(href)));
  };

  const agentOf = (id: string) => agents[id] ?? TEAM_CONTACT;
  const n = properties.length;
  const sel = selId ? properties.find((p) => p.id === selId) : null;
  const teamWa = waProperty(TEAM_CONTACT);
  const presets = pricePresetsFor(f.operation);
  const preset = matchingPreset(f.operation, f.priceMin, f.priceMax);
  const pages = Math.ceil(total / PAGE_SIZE);
  // Una sola tarjeta patrocinada por página, al final de los resultados; rota con el número de página.
  const sponsored = n > 0 ? ad : null;
  const filterCount = activeFilterCount(f);

  const opChips = (["Todas", "Venta", "Alquiler", "Vacacional", "Preventa"] as Op[]).map((k) => (
    <Chip key={k} label={k === "Todas" ? "Todas" : OP_LABEL[k]} icon={f.operation === k ? "ph-check" : "ph-circle"} on={f.operation === k} onClick={() => apply({ operation: k })} />
  ));
  const typeChips = TYPES.map((t) => <Chip key={t} label={TYPE_PLURAL[t]} icon={TYPE_ICON[t]} on={f.types.includes(t)} onClick={() => apply({ types: toggle(f.types, t) })} />);
  const priceChips = presets.map((p) => {
    const on = preset?.label === p.label;
    return <Chip key={p.label} label={p.label} icon="ph-coins" on={on} onClick={() => apply(on ? { priceMin: undefined, priceMax: undefined } : { priceMin: p.min, priceMax: p.max })} />;
  });
  const numChips = (val: number, key: "bedrooms" | "bathrooms" | "parking", arr: number[], icon: string) =>
    arr.map((k) => <Chip key={k} label={k ? k + "+" : "Cualquiera"} icon={icon} on={val === k} onClick={() => apply({ [key]: k })} />);
  // Inputs no controlados: se aplican al salir del campo o con Enter. La key los reinicia si cambia la URL.
  const rangeInputs = (minKey: "priceMin" | "areaMin", maxKey: "priceMax" | "areaMax", labels: [string, string], placeholders: [string, string]) => (
    <div className="grid-2" key={`${f[minKey]}-${f[maxKey]}`}>
      {([[minKey, labels[0], placeholders[0]], [maxKey, labels[1], placeholders[1]]] as const).map(([k, label, ph]) => (
        <div key={k} className="field">
          <label>{label}</label>
          <input className="input" inputMode="numeric" placeholder={ph} defaultValue={f[k] ? dots(f[k]!) : ""}
            onBlur={(e) => { const v = toAmount(e.target.value); if (v !== f[k]) apply({ [k]: v }); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        </div>
      ))}
    </div>
  );
  const priceInputs = rangeInputs("priceMin", "priceMax", ["Mínimo (₡)", "Máximo (₡)"], ["0", "Sin límite"]);

  const quick: { key: Exclude<Pop, null>; label: string; on: boolean; title: string; chips: React.ReactNode; clear: () => void; isPrice?: boolean }[] = [
    { key: "op", label: f.operation === "Todas" ? "Operación" : OP_LABEL[f.operation], on: f.operation !== "Todas", title: "Operación", chips: opChips, clear: () => apply({ operation: "Todas" }) },
    { key: "type", label: f.types.length ? (f.types.length === 1 ? TYPE_PLURAL[f.types[0]] : "Tipo · " + f.types.length) : "Tipo", on: f.types.length > 0, title: "Tipo de propiedad", chips: typeChips, clear: () => apply({ types: [] }) },
    { key: "price", label: preset?.label ?? (f.priceMin || f.priceMax ? "Precio · rango" : "Precio"), on: !!(f.priceMin || f.priceMax), title: "Rango de precio (colones)", chips: priceChips, clear: () => apply({ priceMin: undefined, priceMax: undefined }), isPrice: true },
    { key: "beds", label: f.bedrooms ? f.bedrooms + "+ hab." : "Habitaciones", on: f.bedrooms > 0, title: "Habitaciones", chips: numChips(f.bedrooms, "bedrooms", [0, 1, 2, 3, 4], "ph-bed"), clear: () => apply({ bedrooms: 0 }) },
  ];
  // En pantallas de menos de 1100px los filtros rápidos abren el panel lateral.
  const openQuick = (k: Exclude<Pop, null>) => {
    if (window.matchMedia("(max-width: 1099px)").matches) setDrawer(true);
    else setPop(pop === k ? null : k);
  };

  const drawerGroups: [string, React.ReactNode, boolean?][] = [
    ["Operación", opChips],
    ["Tipo de propiedad", typeChips],
    ["Ubicación", locations.map((c) => <Chip key={c} label={c} icon="ph-map-pin" on={f.cantons.includes(c)} onClick={() => apply({ cantons: toggle(f.cantons, c) })} />)],
    ["Precio (colones)", priceChips, true],
    ["Habitaciones", numChips(f.bedrooms, "bedrooms", [0, 1, 2, 3, 4], "ph-bed")],
    ["Baños", numChips(f.bathrooms, "bathrooms", [0, 1, 2, 3], "ph-bathtub")],
    ["Parqueos", numChips(f.parking, "parking", [0, 1, 2, 3], "ph-car")],
    ["Amenidades", <AmenityChips key="amen" selected={f.amenities} onToggle={(a) => apply({ amenities: toggle(f.amenities, a) })} />],
  ];

  const card = (p: PropertySummary) => <PropertyCard key={p.id} property={p} agent={agentOf(p.agentId)} active={hoverId === p.id || selId === p.id} onHover={setHoverId} />;
  const pageHref = (page: number) => searchPath({ ...f, page });

  return (
    <div className="search" aria-busy={pending}>
      <div className="filter-bar">
        <form className="input-icon filter-search" role="search" onSubmit={(e) => { e.preventDefault(); apply({ q: q.trim().slice(0, 80) || undefined }); }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 15 }} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} aria-label="Buscar por zona, barrio o código" placeholder="Zona, barrio o código" style={{ paddingLeft: 32, height: 38 }} />
        </form>
        <div className="quick-filters">
          {quick.map((qf) => (
            <div key={qf.key} style={{ position: "relative", flex: "none" }}>
              <button onClick={() => openQuick(qf.key)} className={`chip qf-btn${qf.on ? " is-on" : ""}`}>{qf.label}<i className="ph ph-caret-down" style={{ fontSize: 12 }} /></button>
              {pop === qf.key && (
                <div className="popover">
                  <div style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>{qf.title}</div>
                  <div className="chip-row">{qf.chips}</div>
                  {qf.isPrice && priceInputs}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button className="btn btn-ghost" onClick={qf.clear}>Limpiar</button>
                    <button className="btn btn-primary" onClick={() => setPop(null)}>Ver {total}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => { setDrawer(true); setPop(null); }} className="chip qf-btn">
            <i className="ph ph-sliders-horizontal" style={{ fontSize: 15 }} />Filtros
            {filterCount > 0 && <span className="count-badge is-inline">{filterCount}</span>}
          </button>
          <button onClick={() => open({ type: "wizard" })} className="chip qf-btn qf-wizard"><i className="ph ph-magic-wand" style={{ fontSize: 15 }} />Búsqueda personalizada</button>
        </div>
      </div>

      <div className="search-body">
        <div className={`results${mView === "map" ? " is-hidden-mobile" : ""}`}>
          <div className="section-head">
            <div>
              <h1 style={{ fontSize: 22, margin: "0 0 2px" }}>{total} {total === 1 ? "propiedad" : "propiedades"}</h1>
              <div style={{ fontSize: 13, color: "var(--color-neutral-400)" }}>
                {f.saved ? "Tus propiedades guardadas" : f.operation === "Todas" ? "Venta y alquiler" : OP_LABEL[f.operation]}{f.cantons.length ? ` en ${f.cantons.join(", ")}` : ""}
              </div>
            </div>
            <select className="input" aria-label="Ordenar" value={f.sort} onChange={(e) => apply({ sort: e.target.value as SortOrder })} style={{ width: "auto", height: 36, fontSize: 13 }}>
              <option value="recientes">Más recientes</option>
              <option value="destacadas">Destacadas primero</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="area_desc">Mayor área</option>
            </select>
          </div>
          {activeChips.length > 0 && (
            <div className="chip-row" style={{ alignItems: "center" }}>
              {activeChips.map((c) => (
                <Link key={c.label} href={c.href} replace scroll={false} onClick={viaTransition(c.href)} className="tag tag-accent active-chip">{c.label}<i className="ph ph-x" style={{ fontSize: 11 }} /></Link>
              ))}
              <Link href={pathname} replace onClick={viaTransition(pathname)} className="btn btn-ghost" style={{ fontSize: 12 }}>Limpiar todo</Link>
            </div>
          )}
          {/* Mientras llega la nueva búsqueda (filtros, orden, página): skeletons en lugar de tarjetas viejas. */}
          {pending ? <PropertyGridSkeleton count={Math.min(Math.max(n, 1), 4)} className="grid-cards-280" /> : <div className="grid-cards-280">{properties.slice(0, 4).map(card)}</div>}
          {n > 0 && (
            <div className="help-banner">
              <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 500 }}>¿No encuentras lo que buscas?</span>
                <span style={{ fontSize: 13, color: "var(--color-neutral-300)", textWrap: "pretty" }}>Cuéntale a un asesor qué necesitas. Te envía una selección por WhatsApp en menos de 24 horas, incluyendo propiedades que aún no están publicadas.</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a className="btn btn-primary" href={teamWa} target="_blank" rel="noopener" style={{ height: 40 }}><i className="ph ph-whatsapp-logo" style={{ fontSize: 17 }} />WhatsApp</a>
                <button className="btn btn-secondary" onClick={() => open({ type: "visit", agent: TEAM_CONTACT })} style={{ height: 40 }}><i className="ph ph-calendar-check" style={{ fontSize: 17 }} />Agendar asesoría</button>
              </div>
            </div>
          )}
          {pending ? n > 4 && <PropertyGridSkeleton count={n - 4} className="grid-cards-280" /> : (n > 4 || sponsored) && <div className="grid-cards-280">{properties.slice(4).map(card)}{sponsored && <SponsoredCard ad={sponsored} />}</div>}
          {pages > 1 && (
            <nav aria-label="Páginas" style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
              {f.page > 1 && <Link href={pageHref(f.page - 1)} onClick={viaTransition(pageHref(f.page - 1), false)} className="btn btn-secondary"><i className="ph ph-arrow-left" />Anterior</Link>}
              <span className="muted-14">Página {f.page} de {pages}</span>
              {f.page < pages && <Link href={pageHref(f.page + 1)} onClick={viaTransition(pageHref(f.page + 1), false)} className="btn btn-secondary">Siguiente<i className="ph ph-arrow-right" /></Link>}
            </nav>
          )}
          {n === 0 && !pending && (
            <div className="empty-state">
              <i className={`ph ${f.saved ? "ph-heart" : "ph-magnifying-glass"}`} style={{ fontSize: 30, color: "var(--color-neutral-500)" }} />
              <span style={{ fontSize: 18, fontWeight: 500 }}>{f.saved ? "Todavía no has guardado propiedades" : "No hay propiedades con estos filtros"}</span>
              <span style={{ fontSize: 14, color: "var(--color-neutral-400)", maxWidth: 420 }}>{f.saved ? "Toca el corazón de cualquier propiedad para guardarla aquí." : "Prueba ampliar el rango de precio o la zona. También puedes pedirle a un asesor que busque por ti."}</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/propiedades" className="btn btn-secondary">{f.saved ? "Ver propiedades" : "Limpiar filtros"}</Link>
                <a className="btn btn-primary" href={teamWa} target="_blank" rel="noopener"><i className="ph ph-whatsapp-logo" style={{ fontSize: 17 }} />Pedir ayuda a un asesor</a>
              </div>
            </div>
          )}
        </div>

        <div className={`map-pane${mView === "list" ? " is-hidden-mobile" : ""}`}>
          <SearchMap properties={properties} activeId={hoverId ?? selId} onSelect={setSelId} visibleKey={mView} mapRef={mapRef} />
          <div className="map-zoom">
            <button onClick={() => mapRef.current?.zoomIn()} aria-label="Acercar"><i className="ph ph-plus" style={{ fontSize: 16 }} /></button>
            <button onClick={() => mapRef.current?.zoomOut()} aria-label="Alejar"><i className="ph ph-minus" style={{ fontSize: 16 }} /></button>
          </div>
          {sel && (
            <Link href={propertyPath(sel)} className="map-preview">
              <div className="map-preview-img"><img src={sel.images[0]} alt={sel.title} /></div>
              <div className="map-preview-body">
                <span style={{ fontSize: 11, color: "var(--color-accent-300)" }}>{OP_LABEL[sel.operation]} · {sel.type}</span>
                <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em" }}>{crc(sel.price)}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-neutral-400)" }}> {priceSuffix(sel)}</span></span>
                <span style={{ fontSize: 13, color: "var(--color-neutral-200)", lineHeight: 1.3 }}>{sel.title}</span>
                <span className="arrow-link" style={{ marginTop: "auto" }}>Ver detalle<i className="ph ph-arrow-right" /></span>
              </div>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelId(null); }} aria-label="Cerrar" className="map-preview-close"><i className="ph ph-x" style={{ fontSize: 13 }} /></button>
            </Link>
          )}
          <span className="map-credit">{MAP_ATTRIBUTION}</span>
        </div>
      </div>

      <button className="mobile-toggle" onClick={() => setMView(mView === "list" ? "map" : "list")}>
        <i className={mView === "list" ? "ph ph-map-trifold" : "ph ph-list-bullets"} style={{ fontSize: 18, color: "var(--color-accent)" }} />
        {mView === "list" ? "Ver mapa" : "Ver lista"}
      </button>

      {pop && <div className="click-catcher z-pop" onClick={() => setPop(null)} />}

      {drawer && (
        <div className="drawer">
          <div className="drawer-shade" onClick={() => setDrawer(false)} />
          <div className="drawer-panel">
            <div className="drawer-head">
              <span style={{ fontSize: 18, fontWeight: 500 }}>Filtros</span>
              <button className="btn btn-secondary btn-icon" onClick={() => setDrawer(false)} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button>
            </div>
            <div className="drawer-body">
              {drawerGroups.map(([title, chips, isPrice]) => (
                <Fragment key={title}>
                  <div className="chip-group" style={{ gap: 10 }}>
                    <span className="chip-group-title">{title}</span>
                    <div className="chip-row">{chips}</div>
                    {isPrice && priceInputs}
                  </div>
                </Fragment>
              ))}
              <div className="chip-group" style={{ gap: 10 }}>
                <span className="chip-group-title">Espacio (m²)</span>
                {rangeInputs("areaMin", "areaMax", ["Mínimo", "Máximo"], ["Ej. 100", "Sin límite"])}
              </div>
            </div>
            <div className="drawer-foot">
              <Link href={f.saved ? searchPath({ saved: true }) : "/propiedades"} replace className="btn btn-ghost">Limpiar todo</Link>
              <button className="btn btn-primary" onClick={() => setDrawer(false)} style={{ height: 42, padding: "0 20px" }}>Ver {total} propiedades</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Amenidades del catálogo (vienen del layout por el contexto). */
function AmenityChips({ selected, onToggle }: { selected: string[]; onToggle: (name: string) => void }) {
  const { amenities } = useUI();
  return <>{amenities.map((a) => <Chip key={a.id} label={a.name} icon={amenityIcon(a.name)} on={selected.includes(a.name)} onClick={() => onToggle(a.name)} />)}</>;
}
