import { formatPhone, isValidPhone } from "./format";
import type { Agent, SiteContact } from "./types";

/**
 * Valores que se usan solo si todavía no hay un dueño marcado en la base (agents.is_owner) o si
 * su fila no tiene esos datos. El contacto real se edita en el panel: Mi perfil del dueño.
 */
const FALLBACK = { phone: "40002400", hours: "Lunes a sábado, 8:00 a 18:00", location: "Paraíso, Cartago, Costa Rica" };

/** Columnas de la vista agents_public que dan el contacto del dueño. */
export interface OwnerRow {
  phone: string | null;
  contact_hours: string | null;
  contact_location: string | null;
}

/** Contacto general del sitio a partir de la fila del dueño (o los valores de respaldo). */
export function siteContactFrom(owner: OwnerRow | null): SiteContact {
  const digits = owner?.phone && isValidPhone(owner.phone) ? owner.phone : FALLBACK.phone;
  const phone = formatPhone(digits);
  const whatsapp = "506" + digits;
  return {
    phone,
    whatsapp,
    hours: owner?.contact_hours?.trim() || FALLBACK.hours,
    location: owner?.contact_location?.trim() || FALLBACK.location,
    team: teamAgent(whatsapp, phone),
  };
}

/** "Asesor" genérico del equipo, para cuando no hay un asesor específico (no está en la base). */
const teamAgent = (whatsapp: string, phone: string): Agent => ({
  id: "team",
  isTeam: true,
  name: "Equipo Thomas Mata S.A.",
  firstName: "Un asesor",
  initials: "IF",
  photoUrl: null,
  role: "Asesoría inmobiliaria",
  zones: "",
  languages: "",
  yearsExperience: 0,
  dealsClosed: 0,
  rating: "4,9",
  reviewsCount: 0,
  responseTime: "15 min",
  whatsapp,
  phone,
  bio: "",
  reviews: [],
});
