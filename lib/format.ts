import { Constants } from "./supabase/database.types";
import type { Agent, Amenity, Canton, Operation, PropertySummary, PropertyType } from "./types";

export const OP_LABEL: Record<Operation, string> = { Venta: "Venta", Alquiler: "Alquiler", Vacacional: "Alquiler vacacional", Preventa: "Preventa" };
export const OPERATIONS: readonly Operation[] = Constants.public.Enums.property_operation;
export const TYPES: readonly PropertyType[] = Constants.public.Enums.property_type;
export const TYPE_PLURAL: Record<PropertyType, string> = { Apartamento: "Apartamentos", Casa: "Casas", Terreno: "Terrenos", Local: "Locales", Oficina: "Oficinas", Bodega: "Bodegas" };
export const TYPE_ICON: Record<PropertyType, string> = { Apartamento: "ph-buildings", Casa: "ph-house-line", Terreno: "ph-tree-evergreen", Local: "ph-storefront", Oficina: "ph-briefcase", Bodega: "ph-warehouse" };
/** Icono por nombre de amenidad. Las que no estén aquí usan `ph-check`. */
export const AMENITY_ICON: Record<Amenity, string> = { Piscina: "ph-swimming-pool", Gimnasio: "ph-barbell", "Seguridad 24h": "ph-shield-check", Jardín: "ph-plant", Terraza: "ph-sun-horizon", Amueblado: "ph-armchair", "Pet friendly": "ph-paw-print", "Área social": "ph-users-three", "Parqueo visitas": "ph-car", "Planta eléctrica": "ph-lightning" };
export const amenityIcon = (a: Amenity) => AMENITY_ICON[a] ?? "ph-check";
export const CANTONS: readonly Canton[] = ["Paraíso", "Cartago", "Oreamuno", "La Unión", "El Guarco", "Alvarado", "Jiménez", "Turrialba"];
export const NAV_OPS: [string, Operation][] = [["Comprar", "Venta"], ["Alquilar", "Alquiler"], ["Vacacional", "Vacacional"], ["Preventa", "Preventa"]];

export interface PricePreset { label: string; min?: number; max?: number }
export const PRICE_PRESETS: Record<"sale" | "rent" | "vac", PricePreset[]> = {
  sale: [
    { label: "Hasta ₡100 M", max: 100_000_000 },
    { label: "₡100 – 200 M", min: 100_000_000, max: 200_000_000 },
    { label: "₡200 – 400 M", min: 200_000_000, max: 400_000_000 },
    { label: "Más de ₡400 M", min: 400_000_000 },
  ],
  rent: [
    { label: "Hasta ₡400 mil", max: 400_000 },
    { label: "₡400 mil – 1 M", min: 400_000, max: 1_000_000 },
    { label: "Más de ₡1 M", min: 1_000_000 },
  ],
  vac: [
    { label: "Hasta ₡80 mil/noche", max: 80_000 },
    { label: "Más de ₡80 mil/noche", min: 80_000 },
  ],
};
export const pricePresetsFor = (op: Operation | "Todas") => PRICE_PRESETS[op === "Alquiler" ? "rent" : op === "Vacacional" ? "vac" : "sale"];
/** Preset que coincide exactamente con el rango elegido, si hay uno. */
export const matchingPreset = (op: Operation | "Todas", min?: number, max?: number) =>
  pricePresetsFor(op).find((p) => p.min === min && p.max === max) ?? null;

export const dots = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const crc = (n: number) => "₡" + dots(n);
export const shortCrc = (n: number) => {
  if (n >= 1e6) {
    const v = n / 1e6;
    return "₡" + (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(".", ",") + " M";
  }
  return "₡" + Math.round(n / 1000) + " mil";
};
export const decimal = (n: number) => String(n).replace(".", ",");

/** Texto que acompaña al precio: /mes, /noche o precio por m². */
export const priceSuffix = (p: PropertySummary) =>
  p.operation === "Alquiler" ? "/mes" : p.operation === "Vacacional" ? "/noche" : p.areaM2 ? shortCrc(p.price / p.areaM2) + "/m²" : "";
export const pricePeriod = (p: PropertySummary) => (p.operation === "Alquiler" ? "/mes" : p.operation === "Vacacional" ? "/noche" : "");

export const specs = (p: PropertySummary) =>
  [
    p.bedrooms ? { icon: "ph-bed", label: `${p.bedrooms} hab.` } : null,
    p.bathrooms ? { icon: "ph-bathtub", label: decimal(p.bathrooms) + (p.bathrooms === 1 ? " baño" : " baños") } : null,
    p.areaM2 ? { icon: "ph-ruler", label: `${dots(p.areaM2)} m²` } : null,
    p.guests ? { icon: "ph-users", label: `${p.guests} huésp.` } : null,
  ].filter(Boolean) as { icon: string; label: string }[];

export const waLink = (a: Pick<Agent, "whatsapp">, text: string) => `https://wa.me/${a.whatsapp}?text=${encodeURIComponent(text)}`;
export const waProperty = (a: Agent, p?: PropertySummary | null) =>
  waLink(
    a,
    p
      ? `Hola ${a.firstName}, me interesa la propiedad "${p.title}" (${p.code}) que vi en Thomas Mata S.A. ¿Sigue disponible?`
      : "Hola, estoy buscando propiedad en Cartago y me gustaría que un asesor de Thomas Mata S.A. me ayude.",
  );

export const initialsOf = (n: string) =>
  n.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("") || "?";

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const dayParts = (iso: string) => {
  const d = new Date(iso + "T12:00:00Z");
  return { dow: DOW[d.getUTCDay()], num: d.getUTCDate(), mon: MON[d.getUTCMonth()] };
};

/** Próximos 6 días hábiles (sin domingos) para el agendador de visitas, en hora de Costa Rica
 *  (así el servidor y el navegador calculan las mismas fechas). */
export const nextVisitDays = (from = new Date()) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(from);
  const d = new Date(today + "T12:00:00Z");
  const out: { iso: string; dow: string; num: number; mon: string }[] = [];
  while (out.length < 6) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === 0) continue;
    const iso = d.toISOString().slice(0, 10);
    out.push({ iso, ...dayParts(iso) });
  }
  return out;
};
export const VISIT_TIMES = ["08:30", "10:00", "11:30", "14:00", "15:30", "17:00"];

/** Cuota mensual de un préstamo a tasa fija. */
export const monthlyPayment = (price: number, down: number, years: number, rate: number) => {
  const loan = price * (1 - down / 100), r = rate / 100 / 12, n = years * 12;
  return { loan, monthly: (loan * r) / (1 - Math.pow(1 + r, -n)) };
};

/** Teléfono de Costa Rica: solo dígitos, sin el 506 inicial si viene con código de país. */
export const normalizePhone = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("506") ? d.slice(3) : d;
};
export const isValidPhone = (digits: string) => /^[245678]\d{7}$/.test(digits);
export const formatPhone = (digits: string) => (digits.length === 8 ? `+506 ${digits.slice(0, 4)} ${digits.slice(4)}` : digits);
