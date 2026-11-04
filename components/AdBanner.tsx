"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { adLinkProps, type Ad } from "@/lib/ads";
import { trackAd } from "@/lib/track";
import { AdLabel, AdLogo } from "./Ads";

const dismissKey = (id: string) => `ad-dismissed:${id}`;

/**
 * Banner horizontal de la portada. Se puede cerrar; queda cerrado durante la sesión del navegador
 * (sessionStorage). El estado inicial es "visible" en servidor y cliente para no romper la hidratación;
 * el cierre guardado se aplica después de montar.
 */
export function AdBanner({ ad, dismissible = true }: { ad: Ad; dismissible?: boolean }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!dismissible) return;
    try { if (sessionStorage.getItem(dismissKey(ad.id))) setHidden(true); } catch { /* almacenamiento bloqueado: se muestra */ }
  }, [ad.id, dismissible]);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    trackAd(ad.id, "dismiss");
    try { sessionStorage.setItem(dismissKey(ad.id), "1"); } catch { /* sin almacenamiento: solo en esta vista */ }
  };
  const link = adLinkProps(ad.href);

  return (
    <aside className="ad-banner" style={{ "--ad": ad.color } as CSSProperties} aria-label={`Publicidad de ${ad.brand}`} data-ad={ad.id}>
      <i className={`ph ${ad.icon} ad-banner-mark`} aria-hidden />
      <AdLogo ad={ad} size={52} />
      <div className="ad-banner-text">
        <AdLabel text={`Publicidad · ${ad.brand}`} />
        <span className="ad-banner-headline">{ad.headline}</span>
        <span className="ad-banner-body">{ad.body}</span>
      </div>
      <div className="ad-banner-actions">
        {"target" in link
          ? <a {...link} className="btn btn-secondary ad-banner-cta" data-ad-click="">{ad.cta}<i className="ph ph-arrow-up-right" /></a>
          : <Link href={link.href} className="btn btn-secondary ad-banner-cta" data-ad-click="">{ad.cta}<i className="ph ph-arrow-right" /></Link>}
        <Link href="/anunciate" className="ad-label-link">Anunciar aquí</Link>
      </div>
      {dismissible && (
        <button type="button" className="ad-banner-close" onClick={dismiss} aria-label={`Ocultar publicidad de ${ad.brand}`} title="Ocultar">
          <i className="ph ph-x" style={{ fontSize: 14 }} />
        </button>
      )}
    </aside>
  );
}
