// Presentación de una oferta (precio con descuento). Sin hooks: sirve en componentes de servidor y de cliente.
// Sin oferta no renderizan nada, así que se pueden poner siempre junto al precio.
import { hasOffer, offerLabel, priceWas } from "@/lib/format";
import type { PropertySummary } from "@/lib/types";

type Priced = Pick<PropertySummary, "price" | "discountPrice" | "serviceRate">;

/** Precio original tachado. `size` = tamaño de letra en px (por defecto el de la tarjeta). */
export function PriceWas({ p, size = 13 }: { p: Priced; size?: number }) {
  if (!hasOffer(p)) return null;
  const was = priceWas(p);
  return (
    <s className="price-was" style={{ fontSize: size }} aria-label={`Antes ${was}`}>
      {was}
    </s>
  );
}

/** Marca "Oferta −15 %" con el estilo de las etiquetas. */
export function OfferTag({ p }: { p: Priced }) {
  if (!hasOffer(p)) return null;
  return (
    <span className="tag tag-accent-2 offer-tag">
      <i className="ph-fill ph-tag" aria-hidden="true" />
      {offerLabel(p)}
    </span>
  );
}
