// Tipos de dominio del sitio (camelCase). La capa de datos (lib/data.ts) los arma
// desde las filas de Supabase (snake_case, ver lib/supabase/database.types.ts).
import type { Database } from "./supabase/database.types";

type Enums = Database["public"]["Enums"];

export type Operation = Enums["property_operation"];
export type PropertyType = Enums["property_type"];
export type PropertyStatus = Enums["property_status"];
/** Ciudad / cantón / municipio (texto libre: cualquier país). */
export type Canton = string;
/** Nombre de la amenidad tal como está en el catálogo (`amenities.name`). */
export type Amenity = string;

export interface AmenityOption {
  id: string;
  name: string;
}

export interface AgentReview {
  text: string;
  author: string;
  meta: string;
  rating: number;
}

export interface Agent {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  photoUrl: string | null;
  role: string; // especialidad visible, ej. "Residencial premium"
  zones: string;
  languages: string;
  yearsExperience: number;
  dealsClosed: number;
  rating: string; // ya formateado, ej. "4,9"
  reviewsCount: number;
  responseTime: string; // ej. "15 min"
  whatsapp: string; // con código de país, ej. "50687014410"
  phone: string; // formateado, ej. "+506 8701 4410"
  bio: string;
  reviews: AgentReview[];
  /** true para el contacto general del equipo (no es un asesor real). */
  isTeam?: boolean;
}

/** Contacto general del sitio: sale del dueño del negocio (agents.is_owner). */
export interface SiteContact {
  phone: string; // formateado, ej. "+506 4000 2400"
  whatsapp: string; // con código de país, ej. "50640002400"
  hours: string;
  location: string;
  /** El dueño presentado como "asesor" genérico del equipo (botones de WhatsApp y agendar). */
  team: Agent;
}

/** Datos de una propiedad suficientes para tarjetas, mapa y diálogos. */
export interface PropertySummary {
  id: string;
  code: string; // ej. "ISF-0001"
  title: string;
  operation: Operation;
  type: PropertyType;
  featured: boolean;
  tag?: string;
  canton: Canton;
  zone: string;
  lat: number;
  lng: number;
  price: number; // CRC. Mensual si es alquiler, por noche si es vacacional
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  parkingSpaces: number;
  guests?: number;
  agentId: string;
  images: string[]; // URLs completas; la primera es la portada
  daysPublished: number;
}

/** Ficha completa de una propiedad. */
export interface Property extends PropertySummary {
  description: string;
  status: PropertyStatus;
  /** País (por defecto Costa Rica). */
  country: string;
  /** Provincia, estado o región ("" si no se indicó). */
  province: string;
  address: string;
  maintenanceFee?: number;
  floor?: string;
  yearBuilt?: number;
  delivery?: string; // preventa, ej. "Diciembre 2027"
  amenities: Amenity[];
}

export interface FeaturedZone {
  id: string;
  name: Canton; // valor del filtro de cantón
  label: string; // texto visible
  imageUrl: string;
  position: number;
}

export type ClientStatus = Enums["client_status"];

export interface ClientPreferences {
  operation: Operation | "Todas";
  propertyTypes: PropertyType[];
  cantons: Canton[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms: number;
  minBathrooms: number;
  minParking: number;
  minAreaM2?: number;
  maxAreaM2?: number;
  requiredAmenities: Amenity[];
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedAgentId: string | null;
  status: ClientStatus;
  preferences: ClientPreferences;
}

export type VisitStatus = Enums["visit_status"];
export type VisitMode = Enums["visit_mode"];

export interface Visit {
  id: string;
  propertyId: string | null;
  agentId: string;
  date: string; // YYYY-MM-DD (hora de Costa Rica)
  time: string; // HH:mm
  mode: VisitMode;
  status: VisitStatus;
}

export type SortOrder = "recientes" | "precio_asc" | "precio_desc" | "area_desc" | "destacadas";

/** Filtros del listado. Se reflejan en los query params de /propiedades (ver lib/search-params.ts). */
export interface SearchFilters {
  operation: Operation | "Todas";
  types: PropertyType[];
  cantons: Canton[];
  priceMin?: number;
  priceMax?: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  areaMin?: number;
  areaMax?: number;
  amenities: Amenity[];
  q?: string;
  sort: SortOrder;
  saved: boolean;
  page: number;
}

export interface SearchResult {
  items: PropertySummary[];
  total: number;
}
