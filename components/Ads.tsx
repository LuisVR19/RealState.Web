import Link from "next/link";
import { img } from "@/lib/img";
import type { CSSProperties, ReactNode } from "react";
import { adInitials, adLinkProps, type Ad } from "@/lib/ads";

/*
 * Formatos de publicidad del sitio. Reglas de diseño para que no estorbe:
 *  - siempre rotulada ("Publicidad" / "Patrocinado"), nunca disfrazada de propiedad;
 *  - como máximo un anuncio por formato y pantalla, sin ventanas emergentes, animación ni sonido;
 *  - mismos radios, sombras y tipografía que el resto del sitio; el color de la marca solo en su creativo.
 * Sin estado: sirven en componentes de servidor y de cliente.
 */

/** Variable CSS con el color de la marca (la usan los estilos .ad-*). */
const brandVar = (ad: Ad) => ({ "--ad": ad.color }) as CSSProperties;

/**
 * Enlace del anuncio: <Link> si es interno; <a rel="sponsored"> en otra pestaña si es externo.
 * data-ad (impresión al verse) y data-ad-click (clic) los mide SiteTracker.
 */
function AdLink({ ad, className, children, ariaLabel }: { ad: Ad; className?: string; children: ReactNode; ariaLabel?: string }) {
  const p = adLinkProps(ad.href);
  return "target" in p
    ? <a {...p} className={className} aria-label={ariaLabel} data-ad={ad.id} data-ad-click="">{children}</a>
    : <Link href={p.href} className={className} aria-label={ariaLabel} data-ad={ad.id} data-ad-click="">{children}</Link>;
}

/** Logo de la marca, o sus iniciales sobre su color si no subió logo. */
export function AdLogo({ ad, size = 44 }: { ad: Ad; size?: number }) {
  return (
    <span className="ad-logo" style={{ ...brandVar(ad), width: size, height: size, fontSize: Math.round(size * 0.34) }} aria-hidden>
      {ad.logoUrl ? <img src={img(ad.logoUrl, 160)} alt="" /> : adInitials(ad.brand)}
    </span>
  );
}

/** Rótulo "Publicidad". Con `withLink`, enlace a la página para anunciantes (no usar dentro de otro enlace). */
export function AdLabel({ text = "Publicidad", withLink }: { text?: string; withLink?: boolean }) {
  return (
    <span className="ad-label">
      <span className="ad-label-pill">{text}</span>
      {withLink && <Link href="/anunciate" className="ad-label-link">Anunciar aquí</Link>}
    </span>
  );
}

/** Tarjeta patrocinada del listado: mismo tamaño que una propiedad, pero claramente distinta. */
export function SponsoredCard({ ad }: { ad: Ad }) {
  return (
    <AdLink ad={ad} className="ad-card" ariaLabel={`Publicidad de ${ad.brand}: ${ad.headline}`}>
      <div className="ad-card-media" style={brandVar(ad)}>
        {ad.imageUrl ? <div className="lighten fill"><img src={img(ad.imageUrl, 800)} alt="" loading="lazy" /></div> : <i className={`ph ${ad.icon} ad-card-icon`} aria-hidden />}
        <span className="ad-card-shade" />
        <span className="ad-card-tag">Patrocinado</span>
        <span className="ad-card-headline">{ad.headline}</span>
      </div>
      <div className="ad-card-body">
        <div className="ad-card-brand"><AdLogo ad={ad} size={28} /><span>{ad.brand}</span></div>
        <p className="ad-card-text">{ad.body}</p>
        <span className="arrow-link ad-card-cta">{ad.cta}<i className="ph ph-arrow-right" /></span>
      </div>
    </AdLink>
  );
}

/** Bloque "Servicios para tu nuevo hogar" de la ficha: mosaicos discretos de marcas aliadas. */
export function AdServices({ ads, title = "Servicios para tu nuevo hogar" }: { ads: Ad[]; title?: string }) {
  if (!ads.length) return null;
  return (
    <section className="stack-12" aria-label={`${title} (publicidad)`}>
      <div className="ad-section-head">
        <h2 className="h2-20">{title}</h2>
        <AdLabel withLink />
      </div>
      <div className="ad-services">
        {ads.slice(0, 3).map((ad) => (
          <AdLink key={ad.id} ad={ad} className="ad-service" ariaLabel={`Publicidad de ${ad.brand}: ${ad.headline}`}>
            <AdLogo ad={ad} size={40} />
            <span className="ad-service-text">
              <span className="ad-service-brand">{ad.brand}</span>
              <span className="ad-service-title">{ad.headline}</span>
              <span className="ad-service-sub">{ad.body}</span>
            </span>
            <i className="ph ph-arrow-up-right ad-service-arrow" aria-hidden />
          </AdLink>
        ))}
      </div>
    </section>
  );
}
