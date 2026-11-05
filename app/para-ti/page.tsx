import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OpenDialogButton } from "@/components/OpenDialogButton";
import { PropertyCard } from "@/components/PropertyCard";
import { ForYouSkeleton } from "@/components/Skeletons";
import { getClientDashboard } from "@/lib/account";
import { agentResolver } from "@/lib/data";
import { dayParts, OP_LABEL, shortCrc, TYPE_PLURAL } from "@/lib/format";
import type { VisitStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Para ti · Thomas Mata S.A.", robots: { index: false } };

const VST: Record<VisitStatus, [string, string, string]> = {
  Pendiente: ["#f6efe1", "#7a5a12", "Por confirmar"],
  Confirmada: ["var(--color-accent-900)", "var(--color-accent-200)", "Confirmada"],
  Realizada: ["var(--color-neutral-800)", "var(--color-neutral-300)", "Realizada"],
  Cancelada: ["#f7e8e6", "#8a2f24", "Cancelada"],
};

export default function ForYouPage() {
  return (
    <main className="page-scroll">
      <div className="container foryou">
        <Suspense fallback={<ForYouSkeleton />}>
          <ForYou />
        </Suspense>
      </div>
    </main>
  );
}

/** Contenido privado: lee la sesión (cookies) y consulta con la RLS del cliente. Nunca se cachea. */
async function ForYou() {
  const dash = await getClientDashboard(); // lee la sesión: a partir de aquí, por petición
  const agentOf = await agentResolver();

  if (!dash.signedIn) {
    return (
      <div className="no-matches">
        <span style={{ fontSize: 17, fontWeight: 500 }}>Inicia sesión para ver tus coincidencias</span>
        <span style={{ fontSize: 14, color: "var(--color-neutral-400)", maxWidth: 520 }}>Guarda tus preferencias y te mostramos las propiedades que encajan con lo que buscas, junto con tus visitas.</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <OpenDialogButton dialog={{ type: "auth", mode: "login" }} className="btn btn-primary" style={{ height: 40 }}>Iniciar sesión</OpenDialogButton>
          <OpenDialogButton dialog={{ type: "auth", mode: "register" }} className="btn btn-secondary" style={{ height: 40 }}>Crear cuenta</OpenDialogButton>
        </div>
      </div>
    );
  }
  if (!dash.data) {
    return (
      <div className="no-matches">
        <span style={{ fontSize: 17, fontWeight: 500 }}>Esta sección es para clientes</span>
        <span style={{ fontSize: 14, color: "var(--color-neutral-400)", maxWidth: 520 }}>Tu cuenta pertenece al equipo. Los clientes, sus coincidencias y sus visitas se gestionan desde el panel de asesores.</span>
        <Link href="/propiedades" className="btn btn-secondary" style={{ height: 40, alignSelf: "flex-start" }}>Ver propiedades</Link>
      </div>
    );
  }

  const { client: cl, matches, visits } = dash.data;
  const f = cl.preferences;
  const budget = f.budgetMin || f.budgetMax ? `${f.budgetMin ? shortCrc(f.budgetMin) : "₡0"} – ${f.budgetMax ? shortCrc(f.budgetMax) : "sin tope"}` : "Cualquier presupuesto";
  const prefChips = [f.operation === "Todas" ? "Cualquier operación" : OP_LABEL[f.operation]].concat(
    f.propertyTypes.length ? f.propertyTypes.map((t) => TYPE_PLURAL[t]) : ["Cualquier tipo"],
    f.cantons.length ? f.cantons : ["Cualquier ubicación"],
    [budget],
    f.minBedrooms ? [f.minBedrooms + "+ habitaciones"] : [],
    f.minBathrooms ? [f.minBathrooms + "+ baños"] : [],
    f.requiredAmenities,
  );
  const title = matches.length ? `${matches.length} ${matches.length === 1 ? "propiedad coincide" : "propiedades coinciden"} con lo que buscas` : `Hola, ${cl.name.split(" ")[0]}`;

  return (
    <>
      <section className="stack-16">
        <div className="section-head" style={{ gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 640 }}>
            <span className="eyebrow">Para ti</span>
            <h1 className="page-title-40">{title}</h1>
            <p style={{ margin: 0, fontSize: 15, color: "var(--color-neutral-400)", textWrap: "pretty" }}>Ordenadas por coincidencia con tus preferencias. Tu asesor recibe la misma lista y te puede proponer visitas.</p>
          </div>
          <OpenDialogButton dialog={{ type: "prefs" }} className="btn btn-secondary" style={{ height: 40 }}><i className="ph ph-sliders-horizontal" style={{ fontSize: 16 }} />Editar preferencias</OpenDialogButton>
        </div>
        <div className="chip-row">{prefChips.map((l) => <span key={l} className="pref-chip">{l}</span>)}</div>
      </section>

      {matches.length > 0 ? (
        <div className="grid-matches">
          {matches.map(({ property, score }) => (
            <div key={property.id} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              <span className="match-label" style={{ color: score >= 90 ? "var(--color-accent)" : "var(--color-neutral-400)" }}><i className="ph ph-sparkle" style={{ fontSize: 14 }} />{score}% de coincidencia</span>
              <PropertyCard property={property} agent={agentOf(property.agentId)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="no-matches">
          <span style={{ fontSize: 17, fontWeight: 500 }}>Todavía no hay propiedades que coincidan</span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-400)", maxWidth: 520, textWrap: "pretty" }}>Tu asesor ya tiene tus preferencias y te avisará cuando entre algo nuevo. Puedes ampliar el presupuesto o las zonas para ver más opciones.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            <OpenDialogButton dialog={{ type: "prefs" }} className="btn btn-primary" style={{ height: 40 }}>Ajustar preferencias</OpenDialogButton>
            <Link href="/propiedades" className="btn btn-secondary" style={{ height: 40 }}>Ver todas las propiedades</Link>
          </div>
        </div>
      )}

      <section id="visitas" className="stack-12" style={{ maxWidth: 760 }}>
        <h2 className="h2-20">Mis visitas</h2>
        {visits.map((v) => {
          const d = dayParts(v.date), st = VST[v.status], ag = agentOf(v.agentId);
          return (
            <div key={v.id} className="visit-row">
              <div className="date-badge"><span className="date-badge-dow">{d.dow}</span><span className="date-badge-num">{d.num}</span><span className="date-badge-mon">{d.mon}</span></div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>
                  {v.property ? <Link href={`/propiedades/${v.property.code}`}>{v.property.title}</Link> : v.propertyId ? "Propiedad ya no disponible" : "Reunión con un asesor"}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>{v.time} · {v.mode} · con {ag.isTeam ? "un asesor" : ag.firstName}</span>
              </div>
              <span className="tag" style={{ background: st[0], color: st[1] }}>{st[2]}</span>
            </div>
          );
        })}
        {!visits.length && <span style={{ fontSize: 14, color: "var(--color-neutral-400)" }}>Aún no has agendado visitas. Desde cualquier propiedad puedes pedir una.</span>}
      </section>
    </>
  );
}
