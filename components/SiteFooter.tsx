import { getSiteContact } from "@/lib/data";

/** Pie del sitio: ubicación, horario y teléfono salen del dueño del negocio (Mi perfil en el panel). */
export async function SiteFooter() {
  const contact = await getSiteContact();
  return (
    <footer className="site-footer">
      <span>© 2026 Thomas Mata S.A. · {contact.location}</span>
      <span className="site-footer-right">
        {contact.hours} · {contact.phone}
        {/* El panel de asesores será otra aplicación / ruta protegida. */}
        <a href="/panel" style={{ color: "var(--color-neutral-400)" }}>Acceso asesores</a>
      </span>
    </footer>
  );
}
