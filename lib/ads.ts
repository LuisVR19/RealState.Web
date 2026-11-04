/*
 * Publicidad de marcas. Los anuncios reales viven en la base (tablas ads + advertisers, migración
 * advertising) y el sitio los lee con getActiveAds (lib/data.ts → rpc get_active_ads). El admin los
 * gestiona en el panel, sección Publicidad.
 *
 * Este módulo no toca la base: tipos y utilidades que usan servidor y navegador por igual.
 */
import type { Database } from "./supabase/database.types";

/** Dónde puede salir un anuncio. Como máximo uno por pantalla y formato (tres en "servicios"). */
export type AdPlacement = Database["public"]["Enums"]["ad_placement"];

export interface Ad {
  id: string;
  placement: AdPlacement;
  /** Nombre de la marca anunciante. */
  brand: string;
  /** Titular corto (máx. 60 caracteres). */
  headline: string;
  /** Texto de apoyo (máx. 120 caracteres). */
  body: string;
  /** Texto del botón (máx. 24 caracteres). */
  cta: string;
  /** Destino del anuncio. Si es externo se abre en otra pestaña con rel="sponsored". */
  href: string;
  /** Color de marca en hex; se usa para el logo y el fondo del creativo. */
  color: string;
  /** Icono Phosphor de respaldo cuando la marca no sube imagen. */
  icon: string;
  /** Logo de la marca (opcional). Sin logo se muestran sus iniciales. */
  logoUrl?: string;
  /** Imagen del creativo (opcional). Sin imagen se usa un fondo con el color de la marca. */
  imageUrl?: string;
}

type AdRow = Database["public"]["Functions"]["get_active_ads"]["Returns"][number];

/** Fila de get_active_ads → Ad. */
export const adFromRow = (r: AdRow): Ad => ({
  id: r.id,
  placement: r.placement,
  brand: r.brand,
  headline: r.headline,
  body: r.body,
  cta: r.cta,
  href: r.href,
  color: r.color,
  icon: r.icon,
  logoUrl: r.logo_url ?? undefined,
  imageUrl: r.image_url ?? undefined,
});

/** Rotación determinista (igual en servidor y navegador): el anuncio que toca según un número, p. ej. la página. */
export function pickAd(ads: readonly Ad[], seed = 0): Ad | null {
  return ads.length ? ads[Math.abs(Math.trunc(seed)) % ads.length] : null;
}

/** Iniciales para el logo de respaldo ("Banco Horizonte" → "BH"). */
export const adInitials = (brand: string) =>
  brand.split(/\s+/).filter((w) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** Atributos del enlace: los externos se marcan como patrocinados y abren en otra pestaña. */
export const adLinkProps = (href: string) =>
  /^https?:\/\//.test(href) ? { href, target: "_blank", rel: "sponsored noopener" } : { href };

/**
 * Ejemplos con marcas ficticias SOLO para las vistas previas de /anunciate (nunca se muestran como
 * publicidad real ni se miden: sus ids no existen en la base).
 */
export const SAMPLE_ADS: Record<AdPlacement, Ad[]> = {
  home_banner: [
    { id: "ejemplo-banco", placement: "home_banner", brand: "Banco Horizonte", headline: "Tu crédito de vivienda, aprobado en 72 horas", body: "Tasa preferencial para compradores en Cartago. Precalifica en línea sin costo y sin compromiso.", cta: "Precalificar", href: "/anunciate", color: "#1d3a5f", icon: "ph-bank" },
  ],
  search_card: [
    { id: "ejemplo-muebles", placement: "search_card", brand: "Muebles Cedro & Co.", headline: "Amuebla tu nuevo hogar con 15% de descuento", body: "Salas, comedores y dormitorios hechos en Costa Rica. Entrega e instalación incluidas.", cta: "Ver catálogo", href: "/anunciate", color: "#6b3f22", icon: "ph-armchair" },
  ],
  detail_services: [
    { id: "ejemplo-banco-s", placement: "detail_services", brand: "Banco Horizonte", headline: "Crédito de vivienda", body: "Precalifica en línea en minutos.", cta: "Precalificar", href: "/anunciate", color: "#1d3a5f", icon: "ph-bank" },
    { id: "ejemplo-mudanzas", placement: "detail_services", brand: "Mudanzas Ruta Verde", headline: "Mudanzas con seguro", body: "Embalaje y traslado en todo el país.", cta: "Cotizar", href: "/anunciate", color: "#2f5b3a", icon: "ph-truck" },
    { id: "ejemplo-seguros", placement: "detail_services", brand: "Seguros Ceiba", headline: "Seguro de hogar", body: "Protege tu casa desde ₡9.900 al mes.", cta: "Cotizar", href: "/anunciate", color: "#5a4a1c", icon: "ph-shield-check" },
  ],
};
