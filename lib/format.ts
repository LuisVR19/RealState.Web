import { Constants } from "./supabase/database.types";
import type { Agent, Amenity, Canton, Category, Fuel, Operation, PropertySummary, PropertyType, ServiceRate, Transmission } from "./types";

export const OP_LABEL: Record<Operation, string> = { Venta: "Venta", Alquiler: "Alquiler", Vacacional: "Alquiler vacacional", Preventa: "Preventa", Servicio: "Servicio" };
export const OPERATIONS: readonly Operation[] = Constants.public.Enums.property_operation;
/** Operaciones de inmuebles y vehículos (los servicios usan siempre "Servicio" y se eligen por categoría). */
const LISTING_OPERATIONS: readonly Operation[] = OPERATIONS.filter((o) => o !== "Servicio");
export const TYPES: readonly PropertyType[] = Constants.public.Enums.property_type;
export const TYPE_PLURAL: Record<PropertyType, string> = {
  Apartamento: "Apartamentos", Casa: "Casas", Terreno: "Terrenos", Local: "Locales", Oficina: "Oficinas", Bodega: "Bodegas",
  Carro: "Carros", Moto: "Motos", Pickup: "Pickups", Camión: "Camiones",
  // Los servicios se nombran igual en singular y plural ("Diseño web").
  "Mantenimiento y reparaciones": "Mantenimiento y reparaciones", "Construcción y remodelación": "Construcción y remodelación", Limpieza: "Limpieza",
  "Mudanzas y fletes": "Mudanzas y fletes", Jardinería: "Jardinería", "Legal y notarial": "Legal y notarial", Contabilidad: "Contabilidad",
  "Diseño web": "Diseño web", "Desarrollo de software": "Desarrollo de software", "Marketing digital": "Marketing digital", "Diseño gráfico": "Diseño gráfico",
  "Fotografía y video": "Fotografía y video", "Clases y tutorías": "Clases y tutorías", "Otro servicio": "Otros servicios",
};
export const TYPE_ICON: Record<PropertyType, string> = {
  Apartamento: "ph-buildings", Casa: "ph-house-line", Terreno: "ph-tree-evergreen", Local: "ph-storefront", Oficina: "ph-briefcase", Bodega: "ph-warehouse",
  Carro: "ph-car-profile", Moto: "ph-motorcycle", Pickup: "ph-jeep", Camión: "ph-truck",
  "Mantenimiento y reparaciones": "ph-wrench", "Construcción y remodelación": "ph-hammer", Limpieza: "ph-broom", "Mudanzas y fletes": "ph-truck-trailer",
  Jardinería: "ph-flower", "Legal y notarial": "ph-scales", Contabilidad: "ph-calculator", "Diseño web": "ph-browser", "Desarrollo de software": "ph-code",
  "Marketing digital": "ph-megaphone", "Diseño gráfico": "ph-pen-nib", "Fotografía y video": "ph-camera", "Clases y tutorías": "ph-chalkboard-teacher",
  "Otro servicio": "ph-handshake",
};

// -----------------------------------------------------------------------------
// Categorías (inmueble / vehículo / servicio). Mismas reglas que public.type_category y los CHECK de la base.
// -----------------------------------------------------------------------------
export const CATEGORIES: readonly Category[] = Constants.public.Enums.listing_category;
/** Categorías con preferencias y matching (búsqueda guiada, "Para ti"). Los servicios se buscan en el catálogo. */
export const MATCH_CATEGORIES: readonly Category[] = ["Inmueble", "Vehículo"];
export const CATEGORY_LABEL: Record<Category, string> = { Inmueble: "Inmuebles", Vehículo: "Vehículos", Servicio: "Servicios" };
export const CATEGORY_ICON: Record<Category, string> = { Inmueble: "ph-house-line", Vehículo: "ph-car-profile", Servicio: "ph-handshake" };
/** Valor de ?cat= en la URL (sin tildes). */
export const CATEGORY_SLUG: Record<Category, string> = { Inmueble: "inmuebles", Vehículo: "vehiculos", Servicio: "servicios" };
const VEHICLE_TYPES: readonly PropertyType[] = ["Carro", "Moto", "Pickup", "Camión"];
const SERVICE_TYPES: readonly PropertyType[] = [
  "Mantenimiento y reparaciones", "Construcción y remodelación", "Limpieza", "Mudanzas y fletes", "Jardinería", "Legal y notarial", "Contabilidad",
  "Diseño web", "Desarrollo de software", "Marketing digital", "Diseño gráfico", "Fotografía y video", "Clases y tutorías", "Otro servicio",
];
export const categoryOf = (t: PropertyType): Category => (VEHICLE_TYPES.includes(t) ? "Vehículo" : SERVICE_TYPES.includes(t) ? "Servicio" : "Inmueble");
export const isVehicle = (p: { type: PropertyType }) => categoryOf(p.type) === "Vehículo";
export const isService = (p: { type: PropertyType }) => categoryOf(p.type) === "Servicio";
export const typesOf = (c: Category | null) => (c ? TYPES.filter((t) => categoryOf(t) === c) : TYPES);
/** Tipos de las categorías con matching (sin categoría elegida: inmuebles y vehículos). */
export const matchTypesOf = (c: Category | null) => (c ? typesOf(c) : TYPES.filter((t) => categoryOf(t) !== "Servicio"));
/** Un vehículo solo se publica en venta o alquiler; un servicio siempre es "Servicio". Sin categoría, las de inmuebles y vehículos. */
export const operationsOf = (c: Category | null): readonly Operation[] =>
  c === "Vehículo" ? ["Venta", "Alquiler"] : c === "Servicio" ? ["Servicio"] : LISTING_OPERATIONS;
export const TRANSMISSIONS: readonly Transmission[] = Constants.public.Enums.vehicle_transmission;
export const FUELS: readonly Fuel[] = Constants.public.Enums.vehicle_fuel;
export const SERVICE_RATES: readonly ServiceRate[] = Constants.public.Enums.service_rate;
/** Filtros de vehículo con valores fijos: así la búsqueda se puede cachear (ver lib/data.ts). */
export const YEAR_PRESETS: readonly number[] = [2010, 2015, 2018, 2020, 2022, 2024];
export const KM_PRESETS: readonly number[] = [30_000, 60_000, 100_000, 150_000];
/** Sustantivo según la categoría: "propiedad" / "vehículo" / "servicio"; sin categoría, "anuncio". */
export const itemNoun = (c?: Category | null, plural = false) =>
  c === "Vehículo" ? (plural ? "vehículos" : "vehículo")
  : c === "Inmueble" ? (plural ? "propiedades" : "propiedad")
  : c === "Servicio" ? (plural ? "servicios" : "servicio")
  : plural ? "anuncios" : "anuncio";
/** "Toyota Hilux SR" o "" si no hay marca ni modelo. */
export const vehicleName = (p: { brand?: string; model?: string }) => [p.brand, p.model].filter(Boolean).join(" ");

/** Icono por nombre de amenidad, equipamiento o detalle de servicio. Las que no estén aquí usan `ph-check`. */
export const AMENITY_ICON: Record<Amenity, string> = {
  Piscina: "ph-swimming-pool", Gimnasio: "ph-barbell", "Seguridad 24h": "ph-shield-check", Jardín: "ph-plant", Terraza: "ph-sun-horizon", Amueblado: "ph-armchair", "Pet friendly": "ph-paw-print", "Área social": "ph-users-three", "Parqueo visitas": "ph-car", "Planta eléctrica": "ph-lightning",
  "Aire acondicionado": "ph-snowflake", "Cámara de retroceso": "ph-video-camera", "Sensores de parqueo": "ph-broadcast", Bluetooth: "ph-bluetooth", "Pantalla táctil": "ph-device-tablet", "Vidrios eléctricos": "ph-arrows-down-up", "Asientos de cuero": "ph-armchair", Sunroof: "ph-sun", "Aros de lujo": "ph-circle-dashed", "Único dueño": "ph-user-check", "Marchamo al día": "ph-seal-check", "RTV al día": "ph-clipboard-text",
  "Factura electrónica": "ph-receipt", Garantía: "ph-seal-check", "A domicilio": "ph-house", "Atención virtual": "ph-video-camera", "Fines de semana": "ph-calendar-check", "Emergencias 24/7": "ph-siren", "Cotización gratis": "ph-calculator", "Materiales incluidos": "ph-package",
};
export const amenityIcon = (a: Amenity) => AMENITY_ICON[a] ?? "ph-check";
export const CANTONS: readonly Canton[] = ["Paraíso", "Cartago", "Oreamuno", "La Unión", "El Guarco", "Alvarado", "Jiménez", "Turrialba"];
export const NAV_OPS: [string, Operation][] = [["Comprar", "Venta"], ["Alquilar", "Alquiler"], ["Vacacional", "Vacacional"], ["Preventa", "Preventa"]];

export interface PricePreset { label: string; min?: number; max?: number }
export const PRICE_PRESETS: Record<"sale" | "rent" | "vac" | "carSale" | "carRent" | "service", PricePreset[]> = {
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
  carSale: [
    { label: "Hasta ₡5 M", max: 5_000_000 },
    { label: "₡5 – 10 M", min: 5_000_000, max: 10_000_000 },
    { label: "₡10 – 20 M", min: 10_000_000, max: 20_000_000 },
    { label: "Más de ₡20 M", min: 20_000_000 },
  ],
  carRent: [
    { label: "Hasta ₡300 mil", max: 300_000 },
    { label: "₡300 – 600 mil", min: 300_000, max: 600_000 },
    { label: "Más de ₡600 mil", min: 600_000 },
  ],
  service: [
    { label: "Hasta ₡25 mil", max: 25_000 },
    { label: "₡25 – 100 mil", min: 25_000, max: 100_000 },
    { label: "₡100 – 500 mil", min: 100_000, max: 500_000 },
    { label: "Más de ₡500 mil", min: 500_000 },
  ],
};
export const pricePresetsFor = (op: Operation | "Todas", category: Category | null = null) =>
  category === "Servicio"
    ? PRICE_PRESETS.service
    : category === "Vehículo"
    ? PRICE_PRESETS[op === "Alquiler" ? "carRent" : "carSale"]
    : PRICE_PRESETS[op === "Alquiler" ? "rent" : op === "Vacacional" ? "vac" : "sale"];
/** Preset que coincide exactamente con el rango elegido, si hay uno. */
export const matchingPreset = (op: Operation | "Todas", min?: number, max?: number, category: Category | null = null) =>
  pricePresetsFor(op, category).find((p) => p.min === min && p.max === max) ?? null;

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

/** Servicio sin precio publicado ("A convenir"). */
export const noPrice = (p: Pick<PropertySummary, "serviceRate">) => p.serviceRate === "A convenir";
/** Texto antes del precio: "Desde" en preventa y en servicios cobrados por proyecto. */
export const pricePrefix = (p: Pick<PropertySummary, "operation" | "serviceRate">) =>
  p.operation === "Preventa" || p.serviceRate === "Por proyecto" ? "Desde" : "";
/** Precio principal: "₡1.000" o "A convenir". */
export const priceMain = (p: Pick<PropertySummary, "price" | "serviceRate">) => (noPrice(p) ? "A convenir" : crc(p.price));
/** Precio corto (marcadores del mapa): "₡1,2 M" o "A convenir". */
export const priceShortLabel = (p: Pick<PropertySummary, "price" | "serviceRate">) => (noPrice(p) ? "A convenir" : shortCrc(p.price));
/** Periodo del precio: /mes, /noche o /hora. */
export const pricePeriod = (p: Pick<PropertySummary, "operation" | "serviceRate">) =>
  p.operation === "Alquiler" ? "/mes" : p.operation === "Vacacional" ? "/noche" : p.serviceRate === "Por hora" ? "/hora" : "";
/** Texto que acompaña al precio: el periodo o el precio por m² (solo inmuebles en venta). */
export const priceSuffix = (p: PropertySummary) =>
  pricePeriod(p) || (categoryOf(p.type) === "Inmueble" && p.areaM2 ? shortCrc(p.price / p.areaM2) + "/m²" : "");
/** Precio completo en una línea: "Desde ₡50.000", "₡15.000/hora", "A convenir". */
export const priceLine = (p: PropertySummary) => (noPrice(p) ? "A convenir" : [pricePrefix(p), crc(p.price) + pricePeriod(p)].filter(Boolean).join(" "));

export const specs = (p: PropertySummary) =>
  (isService(p)
    ? [
        { icon: TYPE_ICON[p.type], label: p.type },
        p.serviceRate ? { icon: "ph-receipt", label: p.serviceRate } : null,
      ]
    : isVehicle(p)
    ? [
        p.yearBuilt ? { icon: "ph-calendar-blank", label: String(p.yearBuilt) } : null,
        p.mileageKm != null ? { icon: "ph-gauge", label: `${dots(p.mileageKm)} km` } : null,
        p.transmission ? { icon: "ph-steering-wheel", label: p.transmission } : null,
        p.fuel ? { icon: "ph-gas-pump", label: p.fuel } : null,
      ]
    : [
        p.bedrooms ? { icon: "ph-bed", label: `${p.bedrooms} hab.` } : null,
        p.bathrooms ? { icon: "ph-bathtub", label: decimal(p.bathrooms) + (p.bathrooms === 1 ? " baño" : " baños") } : null,
        p.areaM2 ? { icon: "ph-ruler", label: `${dots(p.areaM2)} m²` } : null,
        p.guests ? { icon: "ph-users", label: `${p.guests} huésp.` } : null,
      ]
  ).filter(Boolean) as { icon: string; label: string }[];

export const waLink = (a: Pick<Agent, "whatsapp">, text: string) => `https://wa.me/${a.whatsapp}?text=${encodeURIComponent(text)}`;
export const waProperty = (a: Agent, p?: PropertySummary | null) =>
  waLink(
    a,
    p
      ? `Hola ${a.firstName}, me interesa ${isService(p) ? "el servicio" : isVehicle(p) ? "el vehículo" : "la propiedad"} "${p.title}" (${p.code}) que vi en Thomas Mata S.A. ¿Sigue disponible?`
      : "Hola, estoy buscando una propiedad, un vehículo o un servicio y me gustaría que un asesor de Thomas Mata S.A. me ayude.",
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
