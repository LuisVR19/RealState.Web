import Link from "next/link";
import { HomeSearch } from "@/components/HomeSearch";
import { OpenDialogButton } from "@/components/OpenDialogButton";
import { PropertyCard } from "@/components/PropertyCard";
import { SiteFooter } from "@/components/SiteFooter";
import { agentResolver, getAgents, getFeaturedProperty, getFeaturedZones, getPublishedProperties, getSiteContact } from "@/lib/data";
import { crc, TYPES, TYPE_ICON, TYPE_PLURAL, waProperty } from "@/lib/format";
import { agentPath, propertyPath, searchPath } from "@/lib/routes";

const STEPS = [
  ["01", "Cuéntanos qué buscas", "Por WhatsApp o en una reunión de 15 minutos. Definimos zona, presupuesto y lo que no es negociable."],
  ["02", "Recibe una selección", "Tu asesor filtra el inventario y te envía solo las opciones que encajan, con precio y condiciones claras."],
  ["03", "Visita acompañado", "Agendamos varias visitas en un mismo día, presenciales o por videollamada."],
  ["04", "Oferta, crédito y firma", "Negociamos por ti, te conectamos con bancos y coordinamos con el notario."],
];

export default async function HomePage() {
  // Todo sale de lecturas cacheadas: la portada se prerenderiza y se sirve igual a todos.
  const [{ items: props }, hero, zones, team, agentOf, contact] = await Promise.all([getPublishedProperties(), getFeaturedProperty(), getFeaturedZones(), getAgents(), agentResolver(), getSiteContact()]);
  const teamContact = contact.team;
  const teamWa = waProperty(teamContact);
  const recent = props.slice(0, 4); // ya vienen de la más reciente a la más antigua

  return (
    <main className="page-scroll">
      <div className="container home">
        <section className="hero">
          <div className="hero-text">
            <span className="eyebrow">Paraíso · Orosi · Cartago · Tres Ríos</span>
            <h1 className="hero-title">Encuentra tu próxima propiedad con un asesor a tu lado.</h1>
            <p className="hero-lead">Casas, apartamentos, locales y bodegas revisados por nuestro equipo. Te acompañamos desde la primera visita hasta la firma.</p>
            <HomeSearch />
            <OpenDialogButton dialog={{ type: "wizard" }} className="link-cta">
              <i className="ph ph-magic-wand" style={{ fontSize: 17 }} />Búsqueda personalizada: dinos qué necesitas, paso a paso
            </OpenDialogButton>
            <div className="hero-note"><i className="ph ph-whatsapp-logo" style={{ fontSize: 16, color: "var(--color-accent)" }} />Respuesta por WhatsApp en menos de 15 minutos, de lunes a sábado.</div>
          </div>
          {hero && <Link href={propertyPath(hero)} className="hero-card">
            <div className="lighten fill"><img src={hero.images[0]} alt={hero.title} /></div>
            <div className="hero-card-info">
              <span className="eyebrow" style={{ fontSize: 11, letterSpacing: ".1em" }}>Destacada</span>
              <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em" }}>{crc(hero.price)}</span>
              <span style={{ fontSize: 13, color: "var(--color-neutral-300)" }}>{hero.title}</span>
              <span className="arrow-link" style={{ marginTop: 4 }}>Ver propiedad<i className="ph ph-arrow-right" /></span>
            </div>
          </Link>}
        </section>

        <section className="section">
          <h2 className="h2">Explora por tipo</h2>
          <div className="grid-categories">
            {TYPES.map((t) => (
              <Link key={t} href={searchPath({ types: [t] })} className="cat-card">
                <i className={`ph ${TYPE_ICON[t]}`} />
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{TYPE_PLURAL[t]}</span>
                  <span style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>{props.filter((p) => p.type === t).length} disponibles</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div><h2 className="h2" style={{ marginBottom: 4 }}>Recién publicadas</h2><div className="muted-14">Propiedades que entraron esta semana al inventario.</div></div>
            <Link href="/propiedades" className="btn btn-ghost">Ver todas en el mapa<i className="ph ph-arrow-right" /></Link>
          </div>
          <div className="grid-cards-270">
            {recent.map((p) => <PropertyCard key={p.id} property={p} agent={agentOf(p.agentId)} />)}
          </div>
        </section>

        <section className="section">
          <h2 className="h2">Zonas más buscadas</h2>
          <div className="grid-zones">
            {zones.map((z) => {
              const c = props.filter((p) => p.canton === z.name).length;
              return (
                <Link key={z.id} href={searchPath({ cantons: [z.name] })} className="zone-card">
                  <div className="lighten fill"><img src={z.imageUrl} alt={z.label} loading="lazy" /></div>
                  <div className="zone-card-shade" />
                  <div className="zone-card-text">
                    <span style={{ fontSize: 19, fontWeight: 500 }}>{z.label}</span>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>{c} {c === 1 ? "propiedad" : "propiedades"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="cta-band">
          <div style={{ maxWidth: 620 }}>
            <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>Así te acompañamos</h2>
            <p style={{ margin: 0, color: "var(--color-neutral-300)", fontSize: 15 }}>Un asesor asignado se encarga de tu búsqueda de principio a fin. Tú decides; nosotros hacemos el trabajo pesado.</p>
          </div>
          <div className="grid-steps">
            {STEPS.map(([n, t, d]) => (
              <div key={n} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, color: "var(--color-accent)" }}>{n}</span>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{t}</span>
                <span style={{ fontSize: 13, color: "var(--color-neutral-400)" }}>{d}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn btn-primary btn-44" href={teamWa} target="_blank" rel="noopener"><i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} />Escribir por WhatsApp</a>
            <OpenDialogButton dialog={{ type: "visit", agent: teamContact }} className="btn btn-secondary btn-44"><i className="ph ph-calendar-check" style={{ fontSize: 18 }} />Agendar asesoría</OpenDialogButton>
          </div>
        </section>

        <section id="equipo" className="section" style={{ scrollMarginTop: 80 }}>
          <div><h2 className="h2" style={{ marginBottom: 4 }}>Nuestro equipo</h2><div className="muted-14">Cada asesor trabaja zonas y tipos de propiedad que conoce a fondo.</div></div>
          <div className="grid-team">
            {team.map((a) => (
              <div key={a.id} className="team-card">
                <Link href={agentPath(a.id)} className="team-card-link" aria-label={`Ver perfil de ${a.name}`} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="avatar avatar-52">{a.initials}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 500 }}>{a.name}</span>
                    <span style={{ fontSize: 12, color: "var(--color-accent-300)" }}>{a.role}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-neutral-400)" }}>{a.zones}</div>
                <div className="rating"><i className="ph-fill ph-star" />{a.rating} · {a.reviewsCount} reseñas</div>
                <div className="team-card-actions">
                  <Link href={agentPath(a.id)} className="btn btn-secondary" style={{ flex: 1, height: 38 }}>Ver perfil</Link>
                  <a className="btn btn-primary btn-icon" href={waProperty(a)} target="_blank" rel="noopener" aria-label="WhatsApp" style={{ width: 38, height: 38 }}><i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} /></a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
