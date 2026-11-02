"use client";

// Medición anónima global (lib/track.ts): una vista de página por cada cambio de ruta y los clics de
// contacto en todo el sitio, con un solo listener (no hace falta tocar cada enlace):
//   - [data-track="share"] dentro de "Compartir" → share_click (va primero: su WhatsApp no es un contacto);
//   - enlaces a wa.me → whatsapp_click.
// La propiedad sale del contenedor más cercano con data-property (tarjeta, ficha o diálogo).
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/track";

const propertyOf = (el: Element) => el.closest<HTMLElement>("[data-property]")?.dataset.property ?? null;

export function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view");
  }, [pathname]);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      const share = target.closest("[data-track='share']");
      if (share) return track("share_click", propertyOf(share));
      const wa = target.closest<HTMLAnchorElement>("a[href^='https://wa.me']");
      if (wa) track("whatsapp_click", propertyOf(wa));
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
