import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/LegalPage";
import { COMPANY, companyPhone } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos y condiciones · Thomas Mata S.A.", description: "Condiciones de uso del sitio web y de la información de las propiedades." };

export default function TerminosPage() {
  return (
    <LegalPage path="/terminos-y-condiciones" title="Términos y condiciones de uso"
      intro={<p>Al usar este sitio usted acepta estos términos. Si no está de acuerdo con ellos, le pedimos no utilizar el sitio.</p>}>
      <h2>1. Identificación de la empresa</h2>
      <p>Este sitio es propiedad de <Field value={COMPANY.legalName} />, cédula jurídica <Field value={COMPANY.legalId} />, nombre comercial {COMPANY.tradeName}. Contacto: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, teléfono +506 {companyPhone()}. Más datos en el <a href="/aviso-legal">Aviso legal</a>.</p>

      <h2>2. Uso del sitio</h2>
      <p>El sitio permite consultar propiedades, guardarlas como favoritas, indicar sus preferencias de búsqueda, contactar a un asesor y solicitar visitas. El uso es gratuito. Usted se compromete a:</p>
      <ul>
        <li>Brindar información veraz y actualizada, en especial su nombre y medio de contacto.</li>
        <li>No suplantar la identidad de otra persona ni registrar datos de terceros sin su autorización.</li>
        <li>Mantener la confidencialidad de su contraseña y avisarnos si sospecha un uso indebido de su cuenta.</li>
        <li>No usar el sitio para fines ilícitos, ni intentar acceder a áreas restringidas, alterar su funcionamiento o extraer información de forma automatizada.</li>
        <li>No copiar ni reutilizar los anuncios para publicarlos en otros medios sin autorización.</li>
      </ul>
      <p>Podemos suspender o cerrar cuentas que incumplan estos términos.</p>

      <h2>3. Información de las propiedades</h2>
      <p><b>La información publicada sobre las propiedades tiene carácter informativo y no constituye por sí misma una oferta contractual definitiva.</b> La disponibilidad, el precio, las características y las condiciones de cada inmueble deben confirmarse directamente con la empresa antes de tomar cualquier decisión.</p>
      <p>Esto no exime a la empresa de su deber de publicar información veraz ni de respetar las ofertas y condiciones que legalmente la vinculen conforme a la Ley N.° 7472. Los detalles sobre cómo se obtiene, verifica y actualiza la información están en la <a href="/politica-de-publicacion">Política de publicación de propiedades</a>.</p>
      <ul>
        <li>Las ubicaciones en el mapa son aproximadas; la dirección exacta se comparte al coordinar la visita.</li>
        <li>Las áreas y medidas son las informadas por el propietario o según planos, y pueden tener diferencias menores con las del Registro Nacional.</li>
        <li>La calculadora de cuota es una estimación referencial y no es una oferta de crédito. Las condiciones reales dependen de la entidad financiera.</li>
      </ul>

      <h2>4. Contacto con asesores y visitas</h2>
      <ul>
        <li>Las solicitudes de visita enviadas por el sitio quedan <b>pendientes de confirmación</b>. Un asesor le contactará por WhatsApp para confirmar fecha, hora y dirección.</li>
        <li>El contacto con asesores es gratuito para quien busca una propiedad. Las comisiones u honorarios de la operación, si los hay, se acuerdan por escrito antes de cualquier compromiso.</li>
        <li>Ningún asesor solicitará pagos, depósitos ni datos bancarios por medio de este sitio. Cualquier pago relacionado con una operación se formaliza por escrito y con los documentos correspondientes.</li>
        <li>Al usar WhatsApp, la conversación se rige también por las condiciones de ese servicio.</li>
      </ul>

      <h2>5. Propiedad intelectual</h2>
      <p>Los textos, el diseño, los logotipos, la marca {COMPANY.tradeName} y las fotografías del sitio pertenecen a la empresa o se usan con autorización de sus titulares (por ejemplo, de los propietarios de los inmuebles). No pueden reproducirse, distribuirse ni modificarse sin autorización previa y por escrito. Compartir el enlace de un anuncio sí está permitido.</p>

      <h2>6. Limitación de responsabilidad</h2>
      <ul>
        <li>Procuramos que la información sea correcta y esté al día, pero pueden existir errores u omisiones involuntarias, que corregiremos en cuanto los detectemos.</li>
        <li>No respondemos por decisiones tomadas únicamente con base en la información del sitio sin haberla confirmado con la empresa.</li>
        <li>No garantizamos que el sitio esté disponible sin interrupciones; puede haber pausas por mantenimiento o fallas técnicas ajenas.</li>
        <li>Los enlaces a sitios de terceros (por ejemplo, WhatsApp o mapas) se rigen por las condiciones de esos terceros.</li>
      </ul>

      <h2>7. Datos personales</h2>
      <p>El tratamiento de sus datos personales se rige por nuestra <a href="/politica-de-privacidad">Política de privacidad</a>, y el uso de cookies por la <a href="/politica-de-cookies">Política de cookies</a>.</p>

      <h2>8. Modificaciones</h2>
      <p>Podemos actualizar estos términos. La versión vigente es siempre la publicada en esta página, con su fecha de actualización. El uso del sitio después de un cambio implica la aceptación de los nuevos términos.</p>

      <h2>9. Legislación aplicable y jurisdicción</h2>
      <p>Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier controversia se someterá a los tribunales competentes de Costa Rica, sin perjuicio de los derechos que la legislación de protección al consumidor otorga a las personas consumidoras.</p>
    </LegalPage>
  );
}
