import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { LEGAL_LINKS, LEGAL_UPDATED } from "@/lib/legal";

/** Marco común de las páginas legales: título, fecha de actualización y navegación entre documentos. */
export function LegalPage({ path, title, intro, children }: { path: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <main className="page-scroll">
      <div className="container legal">
        <nav className="legal-nav" aria-label="Documentos legales">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`legal-nav-link${l.href === path ? " is-on" : ""}`} aria-current={l.href === path ? "page" : undefined}>{l.label}</Link>
          ))}
        </nav>
        <article className="legal-doc">
          <h1>{title}</h1>
          <p className="legal-updated">Última actualización: {LEGAL_UPDATED}</p>
          {intro && <div className="legal-intro">{intro}</div>}
          {children}
        </article>
        <Suspense fallback={null}><LiveFooter /></Suspense>
      </div>
    </main>
  );
}

/**
 * El texto legal es estático, pero el pie muestra el contacto del dueño (teléfono, horario), que cambia
 * desde el panel: se arma en cada visita para no depender de la regeneración en segundo plano (ver app/page.tsx).
 */
async function LiveFooter() {
  await connection();
  return <SiteFooter />;
}

/** Muestra un dato legal; si falta, lo deja resaltado para completarlo antes de publicar. */
export function Field({ value }: { value: string | null | undefined }) {
  return value ? <>{value}</> : <mark className="legal-pending">Dato pendiente</mark>;
}
