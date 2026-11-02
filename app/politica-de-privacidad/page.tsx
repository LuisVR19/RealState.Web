import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/LegalPage";
import { COMPANY, companyPhone, RETENTION } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidad · Thomas Mata S.A.", description: "Cómo recopilamos, usamos y protegemos sus datos personales (Ley N.° 8968)." };

export default function PrivacidadPage() {
  const mail = <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>;
  return (
    <LegalPage path="/politica-de-privacidad" title="Política de privacidad y tratamiento de datos personales"
      intro={<p>En cumplimiento de la Ley N.° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales y su reglamento, le informamos de forma clara qué datos recopilamos, para qué los usamos y cuáles son sus derechos.</p>}>
      <h2>1. Responsable del tratamiento</h2>
      <p>El responsable de la base de datos es <b><Field value={COMPANY.legalName} /></b>, cédula jurídica <Field value={COMPANY.legalId} />, con domicilio en <Field value={COMPANY.registeredAddress} />. Contacto: {mail}, teléfono y WhatsApp +506 {companyPhone()}.</p>

      <h2>2. Qué datos recopilamos</h2>
      <ul>
        <li><b>Al crear una cuenta:</b> nombre completo, correo electrónico, número de WhatsApp (opcional) y contraseña (que se guarda cifrada; nadie del equipo puede verla).</li>
        <li><b>Al solicitar una visita o reunión:</b> nombre, número de WhatsApp, la propiedad de interés, la fecha, la hora y la modalidad (presencial o videollamada).</li>
        <li><b>Preferencias de búsqueda</b> (solo con cuenta): tipo de operación y de propiedad, zonas, presupuesto, habitaciones, baños, parqueos, área, amenidades y las notas que usted escriba.</li>
        <li><b>Favoritos:</b> las propiedades que guarda en su cuenta.</li>
        <li><b>Datos técnicos mínimos</b> necesarios para mantener su sesión iniciada y la seguridad del sitio (ver la <a href="/politica-de-cookies">Política de cookies</a>).</li>
      </ul>
      <p>No solicitamos datos sensibles (origen racial, salud, religión, orientación sexual, etc.) ni datos de tarjetas o cuentas bancarias a través de este sitio.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Atender su consulta y coordinar las visitas o reuniones que solicite.</li>
        <li>Contactarle por WhatsApp, llamada o correo sobre las propiedades que le interesan.</li>
        <li>Recomendarle propiedades que coincidan con las preferencias que nos indicó.</li>
        <li>Administrar su cuenta y mostrarle sus favoritos, coincidencias y visitas.</li>
        <li>Mantener la seguridad del sitio y prevenir usos indebidos.</li>
      </ul>
      <p>No usamos sus datos para fines distintos a los indicados ni los vendemos a terceros. No le enviaremos publicidad masiva sin su consentimiento.</p>

      <h2>4. Base del tratamiento: su consentimiento</h2>
      <p>Tratamos sus datos con base en su consentimiento libre, expreso e informado, que usted otorga al marcar la casilla de aceptación antes de crear su cuenta o de enviar una solicitud de visita. Guardamos la fecha y la versión de esta política que usted aceptó. Brindar sus datos es voluntario, pero sin ellos no podríamos atender su solicitud.</p>

      <h2>5. Quién tiene acceso</h2>
      <ul>
        <li><b>Nuestro equipo:</b> el asesor asignado a su consulta y los administradores de la empresa, únicamente para los fines descritos. Cada asesor ve solo la información necesaria para atenderle.</li>
        <li><b>Proveedores tecnológicos</b> que alojan el sitio y la base de datos por cuenta nuestra (Supabase para la base de datos y la autenticación, Cloudflare para el alojamiento del sitio). Actúan como encargados del tratamiento y pueden almacenar la información en servidores fuera de Costa Rica, con medidas de seguridad acordes.</li>
        <li><b>WhatsApp (Meta):</b> si usted decide escribirnos o le contactamos por WhatsApp, esa conversación se rige además por las políticas de WhatsApp.</li>
        <li><b>Terceros relacionados con una operación</b> (por ejemplo, el propietario del inmueble, una entidad financiera o un notario) solo cuando usted avance en una negociación y con su autorización.</li>
        <li><b>Autoridades</b>, cuando exista una obligación legal o una orden judicial.</li>
      </ul>

      <h2>6. Cuánto tiempo conservamos sus datos</h2>
      <ul>
        <li>Datos de su cuenta y preferencias: {RETENTION.account}.</li>
        <li>Solicitudes de visita: {RETENTION.visits}.</li>
        <li>Consultas sin cuenta: {RETENTION.inquiries}.</li>
      </ul>
      <p>Cumplidos esos plazos, o antes si usted lo solicita, los datos se eliminan o se anonimizan, salvo que una ley nos obligue a conservarlos por más tiempo.</p>

      <h2>7. Sus derechos</h2>
      <p>Usted puede ejercer en cualquier momento, de forma gratuita, sus derechos de:</p>
      <ul>
        <li><b>Acceso:</b> saber qué datos suyos tenemos y para qué los usamos.</li>
        <li><b>Rectificación:</b> corregir o actualizar datos inexactos o incompletos.</li>
        <li><b>Supresión:</b> pedir que eliminemos sus datos cuando ya no sean necesarios o retire su consentimiento.</li>
        <li><b>Revocación del consentimiento:</b> retirar la autorización que nos dio, sin efecto retroactivo.</li>
      </ul>
      <p>Para ejercerlos, escriba a {mail} indicando su nombre, el derecho que desea ejercer y un medio de contacto. Podremos pedirle que verifique su identidad. Responderemos en un plazo máximo de cinco días hábiles. Usted puede corregir parte de su información directamente desde su cuenta (preferencias) y pedirnos el cierre de la cuenta por el mismo correo.</p>
      <p>Si considera que sus derechos no fueron atendidos, puede acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).</p>

      <h2>8. Cómo protegemos su información</h2>
      <ul>
        <li>Conexión cifrada (HTTPS) en todo el sitio.</li>
        <li>Contraseñas almacenadas con cifrado; nunca en texto legible.</li>
        <li>Control de acceso por roles: cada miembro del equipo ve solo lo que necesita, y los clientes solo su propia información.</li>
        <li>Notas internas del equipo separadas y nunca visibles para otros usuarios.</li>
        <li>Revisión periódica de accesos y retiro inmediato de cuentas del personal que deja la empresa.</li>
      </ul>

      <h2>9. Menores de edad</h2>
      <p>Este sitio está dirigido a personas mayores de 18 años. No recopilamos a sabiendas datos de menores de edad.</p>

      <h2>10. Cambios a esta política</h2>
      <p>Si modificamos esta política publicaremos la nueva versión en esta página con su fecha de actualización. Si el cambio afecta de forma importante el uso de sus datos, se lo informaremos y, cuando corresponda, le pediremos de nuevo su consentimiento.</p>
    </LegalPage>
  );
}
