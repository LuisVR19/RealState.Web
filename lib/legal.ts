/**
 * Datos legales de la empresa, en un solo lugar. Los usan las páginas legales (/aviso-legal,
 * /politica-de-privacidad, /terminos-y-condiciones, /politica-de-cookies, /politica-de-publicacion),
 * el pie de página y los avisos de consentimiento de los formularios.
 *
 * `null` = dato pendiente: la página lo muestra resaltado como "Dato pendiente" para que no pase
 * desapercibido. Completar ANTES de publicar en producción.
 *
 * Si cambia el contenido de la política de privacidad, subir PRIVACY_VERSION: queda registrada
 * junto con cada consentimiento (cuentas nuevas y solicitudes de visita).
 */
export const COMPANY = {
  /** Razón social exacta, como aparece en el Registro Nacional. */
  legalName: "Thomas Mata S.A." as string | null,
  /** Nombre comercial (marca que ve el público). */
  tradeName: "Thomas Mata S.A.",
  /** Cédula jurídica (formato 3-101-XXXXXX). */
  legalId: null as string | null,
  /** Domicilio social inscrito. */
  registeredAddress: null as string | null,
  /** Oficina o ubicación principal de atención. */
  officeAddress: "Paraíso, Cartago, Costa Rica" as string | null,
  email: "thomasmata777@gmail.com",
  /** Teléfono y WhatsApp, formato local de 8 dígitos. */
  phone: "70397278",
  website: "thomasmatasa.com",
  /** Licencias o registros profesionales que correspondan (p. ej. corredor de bienes raíces), si aplica. */
  licenses: null as string | null,
} as const;

/** Fecha de la última actualización de los documentos legales (se muestra en cada página). */
export const LEGAL_UPDATED = "2 de noviembre de 2026";

/** Versión de la política de privacidad que acepta el usuario. */
export const PRIVACY_VERSION = "2026-11-02";

/** Plazos de conservación que se informan en la política de privacidad. */
export const RETENTION = {
  account: "mientras la cuenta esté activa y hasta 24 meses después de la última actividad",
  visits: "24 meses desde la fecha de la visita",
  inquiries: "12 meses desde el último contacto, salvo que exista una negociación en curso",
} as const;

export const LEGAL_LINKS = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/politica-de-privacidad", label: "Privacidad" },
  { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
  { href: "/politica-de-publicacion", label: "Publicación de propiedades" },
  { href: "/politica-de-cookies", label: "Cookies" },
] as const;

/** Teléfono para mostrar: "7039 7278". */
export const companyPhone = () => `${COMPANY.phone.slice(0, 4)} ${COMPANY.phone.slice(4)}`;
