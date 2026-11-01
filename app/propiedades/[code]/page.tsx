import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailMap } from "@/components/DetailMap";
import { BottomBar } from "@/components/detail/BottomBar";
import { DetailTopBar } from "@/components/detail/DetailTopBar";
import { Gallery } from "@/components/detail/Gallery";
import { MortgageCalculator } from "@/components/detail/MortgageCalculator";
import { PropertyCard } from "@/components/PropertyCard";
import { VisitScheduler } from "@/components/VisitScheduler";
import { agentResolver, getAgentOrTeam, getPropertyByCode, getPublishedProperties, getSimilarProperties } from "@/lib/data";
import { amenityIcon, crc, decimal, dots, monthlyPayment, OP_LABEL, pricePeriod, priceSuffix, waProperty } from "@/lib/format";
import { agentPath, propertyPath } from "@/lib/routes";

type Params = Pick<PageProps<"/propiedades/[code]">, "params">;

/** Se prerenderizan las publicadas al compilar; las nuevas se generan en la primera visita (ISR). */
export async function generateStaticParams() {
  const { items } = await getPublishedProperties();
  return items.length ? items.map((p) => ({ code: p.code })) : [{ code: "ISF-0000" }];
}

/** Vista previa al compartir el enlace (WhatsApp, Facebook…): foto, título y precio de la propiedad. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getPropertyByCode((await params).code);
  if (!p) return { title: "Propiedad no disponible · Thomas Mata S.A." };
  const title = `${p.title} | Thomas Mata S.A.`;
  const description = `${p.zone}, ${p.canton} · ${crc(p.price)}${pricePeriod(p)}`;
  return {
    title,
    description,
    openGraph: { title: p.title, description, url: propertyPath(p), images: [{ url: p.images[0], width: 1200, height: 630 }] },
  };
}

export default function PropertyPage({ params }: Params) {
  return (
    <Suspense fallback={<div className="detail"><div className="detail-inner"><span className="muted-14" style={{ padding: "64px 0" }}>Cargando propiedad…</span></div></div>}>
      <PropertyDetail params={params} />
    </Suspense>
  );
}

async function PropertyDetail({ params }: Params) {
  const p = await getPropertyByCode((await params).code);
  if (!p) notFound();
  const [a, similar, agentOf] = await Promise.all([getAgentOrTeam(p.agentId), getSimilarProperties(p), agentResolver()]);
  const showCalc = p.operation === "Venta" || p.operation === "Preventa";

  const facts = [
    p.bedrooms ? { icon: "ph-bed", v: p.bedrooms, l: "Habitaciones" } : null,
    p.bathrooms ? { icon: "ph-bathtub", v: decimal(p.bathrooms), l: "Baños" } : null,
    p.areaM2 ? { icon: "ph-ruler", v: dots(p.areaM2) + " m²", l: p.type === "Terreno" ? "Área de lote" : "Construcción" } : null,
    p.parkingSpaces ? { icon: "ph-car", v: p.parkingSpaces, l: "Parqueos" } : null,
    p.guests ? { icon: "ph-users", v: p.guests, l: "Huéspedes" } : null,
    p.delivery ? { icon: "ph-calendar", v: p.delivery.split(" ").at(-1), l: "Entrega" } : null,
    p.yearBuilt ? { icon: "ph-calendar-blank", v: p.yearBuilt, l: "Construcción" } : null,
  ].filter((x) => x !== null);
  const charac = (
    [
      ["Código", p.code],
      ["Tipo", p.type],
      ["Operación", OP_LABEL[p.operation]],
      ["Ubicación", `${p.zone}, ${p.canton}`],
      p.floor ? ["Piso", p.floor] : null,
      p.maintenanceFee ? ["Cuota de mantenimiento", crc(p.maintenanceFee) + "/mes"] : null,
      p.delivery ? ["Entrega estimada", p.delivery] : null,
      ["Publicado", p.daysPublished === 1 ? "hace 1 día" : `hace ${p.daysPublished} días`],
    ] as ([string, string] | null)[]
  ).filter((x) => x !== null);
  const steps = [
    ["1. Agenda la visita", "Elige día y hora. Presencial o por videollamada."],
    ["2. Resuelve dudas", "Planos, estudio registral, cuotas y costos de cierre."],
    ["3. Haz tu oferta", "Tu asesor negocia precio y condiciones con el propietario."],
    ["4. Firma y entrega", "Coordinamos banco, notario y entrega de llaves."],
  ];

  return (
    <div className="detail">
      <DetailTopBar property={p} crumb={`Cartago › ${p.canton} › ${p.zone} · ${p.code}`} />
      <div className="detail-inner">
        <Gallery images={p.images} title={p.title} />

        <div className="detail-cols">
          <div className="detail-main">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="tag tag-neutral">{OP_LABEL[p.operation]}</span>
                <span className="tag tag-neutral">{p.type}</span>
                {p.tag && <span className="tag tag-accent">{p.tag}</span>}
              </div>
              <h1 className="detail-title">{p.title}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--color-neutral-400)" }}><i className="ph ph-map-pin" style={{ fontSize: 16 }} />{p.address}, {p.zone}, {p.canton}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {p.operation === "Preventa" && <span style={{ fontSize: 14, color: "var(--color-neutral-400)" }}>Desde</span>}
                <span className="detail-price">{crc(p.price)}</span>
                <span style={{ fontSize: 14, color: "var(--color-neutral-400)" }}>{priceSuffix(p)}</span>
              </div>
              {showCalc && <span style={{ fontSize: 13, color: "var(--color-accent-300)" }}>Cuota estimada desde {crc(monthlyPayment(p.price, 20, 25, 9).monthly)}/mes</span>}
            </div>

            <div className="grid-facts">
              {facts.map((f) => (
                <div key={f.icon} className="fact">
                  <i className={`ph ${f.icon}`} />
                  <span style={{ fontSize: 18, fontWeight: 500 }}>{f.v}</span>
                  <span style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>{f.l}</span>
                </div>
              ))}
            </div>

            <section className="stack-10">
              <h2 className="h2-20">Descripción</h2>
              <p className="detail-desc">{p.description}</p>
            </section>

            <section className="stack-12">
              <h2 className="h2-20">Características</h2>
              <div className="grid-charac">
                {charac.map(([k, v]) => <div key={k} className="charac-row"><span style={{ color: "var(--color-neutral-400)" }}>{k}</span><span style={{ textAlign: "right" }}>{v}</span></div>)}
              </div>
            </section>

            {p.amenities.length > 0 && (
              <section className="stack-12">
                <h2 className="h2-20">Amenidades</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {p.amenities.map((x) => <span key={x} className="amenity"><i className={`ph ${amenityIcon(x)}`} />{x}</span>)}
                </div>
              </section>
            )}

            <section className="stack-12">
              <h2 className="h2-20">Ubicación</h2>
              <DetailMap lat={p.lat} lng={p.lng} />
              <span style={{ fontSize: 13, color: "var(--color-neutral-500)" }}>Zona aproximada. La dirección exacta se comparte al confirmar la visita.</span>
            </section>

            {showCalc && <MortgageCalculator property={p} agent={a} />}

            <section className="stack-16">
              <h2 className="h2-20">Próximos pasos con {a.firstName}</h2>
              <div className="grid-next-steps">
                {steps.map(([t, d], i) => (
                  <div key={t} className="next-step" style={{ boxShadow: `inset 0 2px 0 ${i === 0 ? "var(--color-accent)" : "var(--color-neutral-700)"}` }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{t}</span>
                    <span style={{ fontSize: 13, color: "var(--color-neutral-400)" }}>{d}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="detail-side">
            <Link href={a.isTeam ? "/#equipo" : agentPath(a.id)} className="side-agent">
              <span className="avatar avatar-52">{a.initials}</span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{a.name}</span>
                <span className="rating" style={{ fontSize: 12, gap: 5, color: "var(--color-neutral-400)" }}><i className="ph-fill ph-star" />{a.rating} · {a.reviewsCount} reseñas</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--color-accent)" }}>Ver perfil</span>
            </Link>
            <div className="online"><span className="online-dot" />En línea ahora · responde en {a.responseTime}</div>
            <a className="btn btn-primary btn-44" href={waProperty(a, p)} target="_blank" rel="noopener"><i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} />Escribir por WhatsApp</a>
            <div className="hr" style={{ margin: 0 }} />
            <VisitScheduler agent={a} property={p} radioName="side" />
          </aside>
        </div>

        <section className="stack-16">
          <h2 className="h2-20">Propiedades similares</h2>
          <div className="grid-cards-260">
            {similar.map((x) => <PropertyCard key={x.id} property={x} agent={agentOf(x.agentId)} />)}
          </div>
        </section>
      </div>
      <BottomBar property={p} agent={a} priceShort={(p.operation === "Preventa" ? "Desde " : "") + crc(p.price) + pricePeriod(p)} />
    </div>
  );
}
