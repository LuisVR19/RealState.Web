import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { OpenDialogButton } from "@/components/OpenDialogButton";
import { PropertyCard } from "@/components/PropertyCard";
import { AgentProfileSkeleton } from "@/components/Skeletons";
import { getAgent, getAgents, getPropertiesByAgent } from "@/lib/data";
import { waLink } from "@/lib/format";

type Params = Pick<PageProps<"/asesores/[id]">, "params">;

/** Perfiles conocidos al compilar (solo el armazón de la página; el contenido se arma en cada visita). */
export async function generateStaticParams() {
  const agents = await getAgents();
  return agents.length ? agents.map((a) => ({ id: a.id })) : [{ id: "00000000-0000-4000-8000-000000000000" }];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await connection();
  const a = await getAgent((await params).id);
  return a ? { title: `${a.name} · Thomas Mata S.A.`, description: a.bio } : {};
}

export default function AgentPage({ params }: Params) {
  return (
    <Suspense fallback={<AgentProfileSkeleton />}>
      <AgentProfile params={params} />
    </Suspense>
  );
}

// Se arma en cada visita (connection) con lecturas cacheadas por `use cache` (KV + D1, invalidadas por
// etiqueta). No se deja como página prerenderizada entera: en Cloudflare la regeneración en segundo plano
// de OpenNext (cola en Durable Object) se queda colgada y la página seguía sirviendo los datos del build.
async function AgentProfile({ params }: Params) {
  await connection();
  const a = await getAgent((await params).id);
  if (!a) notFound();
  const listings = await getPropertiesByAgent(a.id);
  const wa = waLink(a, `Hola ${a.firstName}, vi tu perfil en Thomas Mata S.A. y me gustaría que me ayudes con mi búsqueda.`);

  return (
    <main className="page-scroll">
      <div className="container agent-page">
        <Link href="/#equipo" className="btn btn-ghost" style={{ alignSelf: "flex-start" }}><i className="ph ph-arrow-left" />Volver al inicio</Link>
        <section className="agent-hero">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <span className="avatar avatar-88">{a.initials}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h1 className="page-title-38">{a.name}</h1>
                <span style={{ fontSize: 14, color: "var(--color-accent-300)" }}>{a.role} · Thomas Mata S.A.</span>
                <span className="rating"><i className="ph-fill ph-star" />{a.rating} · {a.reviewsCount} reseñas verificadas</span>
              </div>
            </div>
            <p className="agent-bio">{a.bio}</p>
            <div className="agent-facts">
              <span style={{ color: "var(--color-neutral-500)" }}>Zonas</span><span>{a.zones}</span>
              <span style={{ color: "var(--color-neutral-500)" }}>Idiomas</span><span>{a.languages}</span>
              <span style={{ color: "var(--color-neutral-500)" }}>Teléfono</span><span>{a.phone}</span>
            </div>
          </div>
          <div className="agent-contact">
            <div className="agent-stats">
              <div><span>{a.yearsExperience}</span><span>años de experiencia</span></div>
              <div><span>{a.dealsClosed}</span><span>operaciones cerradas</span></div>
              <div><span>{a.responseTime}</span><span>tiempo de respuesta</span></div>
            </div>
            <a className="btn btn-primary btn-44" href={wa} target="_blank" rel="noopener"><i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} />Escribir a {a.firstName} por WhatsApp</a>
            <OpenDialogButton dialog={{ type: "visit", agent: a }} className="btn btn-secondary btn-44"><i className="ph ph-calendar-check" style={{ fontSize: 18 }} />Agendar una reunión</OpenDialogButton>
          </div>
        </section>
        <section className="stack-16">
          <h2 className="h2-22">Propiedades de {a.firstName} <span style={{ color: "var(--color-neutral-500)", fontSize: 16 }}>({listings.length})</span></h2>
          <div className="grid-cards-270">{listings.map((p) => <PropertyCard key={p.id} property={p} agent={a} />)}</div>
        </section>
        {a.reviews.length > 0 && <section className="stack-16">
          <h2 className="h2-22">Lo que dicen sus clientes</h2>
          <div className="grid-reviews">
            {a.reviews.map((rv) => (
              <div key={rv.text} className="review">
                <div style={{ display: "flex", gap: 2, color: "var(--color-accent)" }} aria-label={`${rv.rating} de 5 estrellas`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < rv.rating ? "ph-fill ph-star" : "ph ph-star"} />)}</div>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--color-neutral-200)" }}>“{rv.text}”</p>
                <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{rv.author}{rv.meta ? ` · ${rv.meta}` : ""}</span>
              </div>
            ))}
          </div>
        </section>}
      </div>
    </main>
  );
}
