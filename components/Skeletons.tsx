import type { CSSProperties, ReactNode } from "react";
import { TYPES } from "@/lib/format";

/*
 * Pantallas de carga (skeletons). Imitan la estructura real de cada vista con las mismas clases de
 * layout, para que al llegar los datos el contenido ocupe el mismo lugar y no "salte".
 * Sin estado ni efectos: sirven igual como fallback de <Suspense> en el servidor o en un componente cliente.
 */

type Len = number | string;

/** Bloque gris con brillo animado. `w`/`h` en px (número) o cualquier unidad CSS (texto). */
export function Sk({ w = "100%", h = 14, r, className = "", style }: { w?: Len; h?: Len; r?: Len; className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`sk sk-block ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Contenedor accesible: anuncia "cargando" a lectores de pantalla y oculta los bloques. */
function Loading({ label, children, className, style }: { label: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div role="status" aria-busy="true" className={className} style={style}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Párrafo de varias líneas; la última más corta, como un texto real. */
function Lines({ n, h = 14, gap = 8, last = "60%" }: { n: number; h?: number; gap?: number; last?: Len }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {range(n).map((i) => <Sk key={i} h={h} w={i === n - 1 ? last : "100%"} />)}
    </div>
  );
}

/* — tarjeta de propiedad — */

export function PropertyCardSkeleton() {
  return (
    <div className="pcard" aria-hidden style={{ cursor: "default" }}>
      <div className="pcard-media sk" />
      <div className="pcard-body">
        <Sk w="46%" h={22} />
        <Sk w="92%" h={13} />
        <Sk w="64%" h={13} />
        <Sk w="40%" h={11} style={{ marginTop: 2 }} />
        <div style={{ display: "flex", gap: 14, marginTop: 2 }}><Sk w={54} h={12} /><Sk w={54} h={12} /><Sk w={64} h={12} /></div>
        <div className="pcard-foot">
          <Sk w={28} h={28} r="50%" style={{ flex: "none" }} />
          <Sk w="38%" h={12} style={{ flex: "1 1 auto" }} />
          <Sk w={36} h={36} r="var(--radius-md)" style={{ flex: "none" }} />
          <Sk w={92} h={36} r="var(--radius-md)" style={{ flex: "none" }} />
        </div>
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count, className }: { count: number; className: string }) {
  return <div className={className}>{range(count).map((i) => <PropertyCardSkeleton key={i} />)}</div>;
}

/* — portada — */

export function HomeSkeleton() {
  return (
    <Loading label="Cargando la portada…" className="page-scroll">
      <div className="container home">
        <section className="hero">
          <div className="hero-text">
            <Sk w={260} h={12} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Sk w="95%" h={46} r="var(--radius-md)" />
              <Sk w="85%" h={46} r="var(--radius-md)" />
              <Sk w="55%" h={46} r="var(--radius-md)" />
            </div>
            <Lines n={2} h={15} last="70%" />
            <div className="home-search" aria-hidden>
              <div style={{ display: "flex", gap: 14, paddingTop: 12 }}>{[64, 72, 86, 72].map((w, i) => <Sk key={i} w={w} h={14} />)}</div>
              <div className="home-search-row"><Sk w="100%" h={42} r="var(--radius-md)" style={{ flex: "1 1 200px" }} /><Sk w={120} h={42} r="var(--radius-md)" /></div>
            </div>
            <Sk w={340} h={14} style={{ maxWidth: "100%" }} />
          </div>
          <div className="hero-card sk" aria-hidden />
        </section>

        <section className="section">
          <Sk w={190} h={26} />
          <div className="grid-categories">
            {TYPES.map((t) => (
              <div key={t} className="cat-card" aria-hidden>
                <Sk w={26} h={26} r="var(--radius-sm)" />
                <Sk w="70%" h={14} />
                <Sk w="50%" h={11} />
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Sk w={210} h={26} /><Sk w={300} h={13} style={{ maxWidth: "100%" }} /></div>
            <Sk w={170} h={36} r="var(--radius-md)" />
          </div>
          <PropertyGridSkeleton count={4} className="grid-cards-270" />
        </section>

        <section className="section">
          <Sk w={230} h={26} />
          <div className="grid-zones">{range(4).map((i) => <div key={i} className="zone-card sk" aria-hidden />)}</div>
        </section>

        <section className="section">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Sk w={200} h={26} /><Sk w={360} h={13} style={{ maxWidth: "100%" }} /></div>
          <div className="grid-team">{range(4).map((i) => <TeamCardSkeleton key={i} />)}</div>
        </section>
      </div>
    </Loading>
  );
}

function TeamCardSkeleton() {
  return (
    <div className="team-card" aria-hidden>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Sk w={52} h={52} r="50%" style={{ flex: "none" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}><Sk w="70%" h={15} /><Sk w="45%" h={11} /></div>
      </div>
      <Sk w="80%" h={12} />
      <Sk w="50%" h={12} />
      <div className="team-card-actions"><Sk h={38} r="var(--radius-md)" style={{ flex: 1 }} /><Sk w={38} h={38} r="var(--radius-md)" style={{ flex: "none" }} /></div>
    </div>
  );
}

/* — búsqueda con mapa — */

export function SearchSkeleton() {
  return (
    <Loading label="Buscando anuncios…" className="search">
      <div className="filter-bar" aria-hidden>
        <Sk h={38} r="var(--radius-md)" className="filter-search" />
        <div className="quick-filters" style={{ overflow: "hidden" }}>
          {[96, 74, 82, 116, 84, 190].map((w, i) => <Sk key={i} w={w} h={38} r="var(--radius-md)" style={{ flex: "none" }} />)}
        </div>
      </div>
      <div className="search-body">
        <div className="results">
          <div className="section-head">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Sk w={170} h={24} /><Sk w={240} h={12} /></div>
            <Sk w={150} h={36} r="var(--radius-md)" />
          </div>
          <PropertyGridSkeleton count={4} className="grid-cards-280" />
        </div>
        <div className="map-pane sk is-hidden-mobile" aria-hidden style={{ borderRadius: 0 }} />
      </div>
    </Loading>
  );
}

/* — ficha de propiedad — */

export function PropertyDetailSkeleton() {
  return (
    <Loading label="Cargando anuncio…" className="detail">
      <div className="detail-bar" aria-hidden>
        <Sk w={96} h={38} r="var(--radius-md)" style={{ flex: "none" }} />
        <Sk w={260} h={12} style={{ marginLeft: 6, minWidth: 0 }} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><Sk w={38} h={38} r="var(--radius-md)" /><Sk w={38} h={38} r="var(--radius-md)" /></div>
      </div>
      <div className="detail-inner">
        <div className="gallery-desk" aria-hidden>
          <div className="sk gallery-main" style={{ borderRadius: 0 }} />
          <div className="sk" style={{ borderRadius: 0 }} />
          <div className="sk" style={{ borderRadius: 0 }} />
        </div>
        <div className="gallery-mob sk" aria-hidden style={{ borderRadius: 0 }} />

        <div className="detail-cols">
          <div className="detail-main">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 6 }}><Sk w={64} h={22} r="var(--radius-sm)" /><Sk w={56} h={22} r="var(--radius-sm)" /></div>
              <Sk w="90%" h={32} r="var(--radius-md)" />
              <Sk w="55%" h={32} r="var(--radius-md)" />
              <Sk w="62%" h={14} />
              <Sk w={220} h={34} r="var(--radius-md)" style={{ marginTop: 4 }} />
            </div>
            <div className="grid-facts">
              {range(4).map((i) => (
                <div key={i} className="fact" aria-hidden><Sk w={22} h={22} r="var(--radius-sm)" /><Sk w="50%" h={18} /><Sk w="70%" h={11} /></div>
              ))}
            </div>
            <section className="stack-10"><Sk w={130} h={20} /><Lines n={5} h={14} gap={10} last="45%" /></section>
            <section className="stack-12">
              <Sk w={160} h={20} />
              <div className="grid-charac">
                {range(6).map((i) => <div key={i} className="charac-row"><Sk w="35%" h={13} /><Sk w="30%" h={13} /></div>)}
              </div>
            </section>
            <section className="stack-12"><Sk w={120} h={20} /><div className="detail-map sk" aria-hidden /></section>
          </div>

          <aside className="detail-side" aria-hidden>
            <div className="side-agent">
              <Sk w={52} h={52} r="50%" style={{ flex: "none" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}><Sk w="70%" h={15} /><Sk w="50%" h={11} /></div>
            </div>
            <Sk w="65%" h={12} />
            <Sk h={44} r="var(--radius-md)" />
            <div className="hr" style={{ margin: 0 }} />
            <Sk w="45%" h={13} />
            <div className="sched-days">{range(6).map((i) => <Sk key={i} h={50} r="var(--radius-md)" />)}</div>
            <div className="sched-times">{range(6).map((i) => <Sk key={i} h={36} r="var(--radius-md)" />)}</div>
            <Sk h={42} r="var(--radius-md)" />
            <Sk h={42} r="var(--radius-md)" />
            <Sk h={42} r="var(--radius-md)" />
          </aside>
        </div>

        <section className="stack-16">
          <Sk w={220} h={20} />
          <PropertyGridSkeleton count={4} className="grid-cards-260" />
        </section>
      </div>
    </Loading>
  );
}

/* — perfil del asesor — */

export function AgentProfileSkeleton() {
  return (
    <Loading label="Cargando perfil…" className="page-scroll">
      <div className="container agent-page">
        <Sk w={150} h={36} r="var(--radius-md)" />
        <section className="agent-hero">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <Sk w={88} h={88} r="50%" style={{ flex: "none" }} />
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 10 }}>
                <Sk w="75%" h={34} r="var(--radius-md)" />
                <Sk w="55%" h={13} />
                <Sk w="45%" h={13} />
              </div>
            </div>
            <div style={{ maxWidth: 600 }}><Lines n={4} h={15} gap={10} /></div>
            <div className="agent-facts">
              {range(3).map((i) => [<Sk key={`k${i}`} w={64} h={13} />, <Sk key={`v${i}`} w={i === 0 ? "80%" : "45%"} h={13} />])}
            </div>
          </div>
          <div className="agent-contact" aria-hidden>
            <div className="agent-stats">
              {range(3).map((i) => <div key={i} style={{ gap: 8 }}><Sk w="50%" h={26} /><Sk w="85%" h={11} /></div>)}
            </div>
            <Sk h={44} r="var(--radius-md)" />
            <Sk h={44} r="var(--radius-md)" />
          </div>
        </section>
        <section className="stack-16">
          <Sk w={260} h={24} />
          <PropertyGridSkeleton count={3} className="grid-cards-270" />
        </section>
      </div>
    </Loading>
  );
}

/* — para ti — */

export function ForYouSkeleton() {
  return (
    <Loading label="Cargando tus coincidencias…" style={{ display: "contents" }}>
      <section className="stack-16">
        <div className="section-head" style={{ gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 320px", maxWidth: 640 }}>
            <Sk w={70} h={12} />
            <Sk w="90%" h={38} r="var(--radius-md)" />
            <Sk w="100%" h={14} />
            <Sk w="60%" h={14} />
          </div>
          <Sk w={170} h={40} r="var(--radius-md)" />
        </div>
        <div className="chip-row">{[120, 96, 110, 150, 120].map((w, i) => <Sk key={i} w={w} h={30} r="var(--radius-md)" />)}</div>
      </section>
      <div className="grid-matches">
        {range(3).map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <Sk w={130} h={12} />
            <PropertyCardSkeleton />
          </div>
        ))}
      </div>
      <section className="stack-12" style={{ maxWidth: 760 }}>
        <Sk w={120} h={20} />
        {range(2).map((i) => (
          <div key={i} className="visit-row" aria-hidden>
            <Sk w={52} h={54} r="var(--radius-md)" style={{ flex: "none" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}><Sk w="70%" h={14} /><Sk w="45%" h={11} /></div>
            <Sk w={90} h={22} r="var(--radius-sm)" />
          </div>
        ))}
      </section>
    </Loading>
  );
}

/* — diálogo de preferencias — */

export function PreferencesSkeleton() {
  const group = (title: number, chips: number[]) => (
    <div className="chip-group">
      <Sk w={title} h={13} />
      <div className="chip-row">{chips.map((w, i) => <Sk key={i} w={w} h={36} r="var(--radius-md)" />)}</div>
    </div>
  );
  return (
    <Loading label="Cargando tus preferencias…" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {group(80, [70, 80, 140, 84, 96])}
      {group(130, [74, 110, 90, 92, 80, 96])}
      {group(150, [80, 76, 100, 70, 90, 84])}
      <div className="chip-group">
        <Sk w={110} h={13} />
        <div className="grid-2"><Sk h={40} r="var(--radius-md)" /><Sk h={40} r="var(--radius-md)" /></div>
      </div>
      {group(100, [96, 44, 44, 44, 44])}
      {group(60, [96, 44, 44, 44])}
    </Loading>
  );
}
