"use client";

// Medición anónima global (lib/track.ts): una vista de página por cada cambio de ruta y los clics de
// contacto en todo el sitio, con un solo listener (no hace falta tocar cada enlace):
//   - [data-track="share"] dentro de "Compartir" → share_click (va primero: su WhatsApp no es un contacto);
//   - a[data-ad-click] dentro de [data-ad] → clic en un anuncio (va antes que wa.me: un anuncio puede enlazar a WhatsApp);
//   - enlaces a wa.me → whatsapp_click.
// La propiedad sale del contenedor más cercano con data-property (tarjeta, ficha o diálogo).
//
// Publicidad: un anuncio ([data-ad]) cuenta una impresión cuando al menos la mitad estuvo a la vista
// durante 1 segundo, una vez por elemento (cada vez que una página lo muestra). Los ejemplos de
// /anunciate no tienen un id de la base (no son uuid) y no se miden.
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track, trackAd } from "@/lib/track";

const propertyOf = (el: Element) => el.closest<HTMLElement>("[data-property]")?.dataset.property ?? null;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const adOf = (el: Element) => {
  const id = el.closest<HTMLElement>("[data-ad]")?.dataset.ad;
  return id && UUID_RE.test(id) ? id : null;
};
const VISIBLE_MS = 1000;

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
      const adLink = target.closest("a[data-ad-click]");
      if (adLink) return trackAd(adOf(adLink), "click");
      const wa = target.closest<HTMLAnchorElement>("a[href^='https://wa.me']");
      if (wa) track("whatsapp_click", propertyOf(wa));
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Impresiones de anuncios. Los anuncios llegan en streaming o tras navegar sin recargar, así que
  // un MutationObserver va registrando los [data-ad] nuevos en un solo IntersectionObserver.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return;
    const counted = new WeakSet<Element>();
    const watched = new WeakSet<Element>();
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();

    const io = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting, intersectionRatio } of entries) {
        if (counted.has(target)) continue;
        if (isIntersecting && intersectionRatio >= 0.5) {
          if (timers.has(target)) continue;
          timers.set(target, setTimeout(() => {
            timers.delete(target);
            if (counted.has(target) || !target.isConnected) return;
            counted.add(target);
            io.unobserve(target);
            trackAd(adOf(target), "impression");
          }, VISIBLE_MS));
        } else {
          clearTimeout(timers.get(target));
          timers.delete(target);
        }
      }
    }, { threshold: [0, 0.5] });

    const scan = () => {
      document.querySelectorAll("[data-ad]").forEach((el) => {
        if (watched.has(el) || !adOf(el)) return;
        watched.add(el);
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}
