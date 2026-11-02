import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/LegalPage";
import { COMPANY, companyPhone } from "@/lib/legal";

export const metadata: Metadata = { title: "Aviso legal · Thomas Mata S.A.", description: "Identificación de la empresa responsable de este sitio web." };

export default function AvisoLegalPage() {
  return (
    <LegalPage path="/aviso-legal" title="Aviso legal" intro={<p>Este sitio web es operado por la empresa que se identifica a continuación. Aquí encontrará sus datos de identificación y de contacto.</p>}>
      <h2>Identificación del titular</h2>
      <table className="legal-table">
        <tbody>
          <tr><th>Razón social</th><td><Field value={COMPANY.legalName} /></td></tr>
          <tr><th>Nombre comercial</th><td>{COMPANY.tradeName}</td></tr>
          <tr><th>Cédula jurídica</th><td><Field value={COMPANY.legalId} /></td></tr>
          <tr><th>Domicilio social</th><td><Field value={COMPANY.registeredAddress} /></td></tr>
          <tr><th>Ubicación de atención</th><td><Field value={COMPANY.officeAddress} /></td></tr>
          <tr><th>Correo electrónico</th><td><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></td></tr>
          <tr><th>Teléfono y WhatsApp</th><td>+506 {companyPhone()}</td></tr>
          <tr><th>Sitio web</th><td>{COMPANY.website}</td></tr>
          {COMPANY.licenses && <tr><th>Registros y licencias</th><td>{COMPANY.licenses}</td></tr>}
        </tbody>
      </table>

      <h2>Actividad</h2>
      <p>{COMPANY.tradeName} se dedica a la asesoría y comercialización de bienes inmuebles (venta, alquiler, alquiler vacacional y preventa) en la provincia de Cartago, Costa Rica. A través de este sitio publica propiedades, recibe consultas y coordina visitas con las personas interesadas.</p>

      <h2>Contenido del sitio</h2>
      <p>La información de las propiedades tiene carácter informativo y se describe con más detalle en la <a href="/politica-de-publicacion">Política de publicación de propiedades</a>. El uso del sitio se rige por los <a href="/terminos-y-condiciones">Términos y condiciones</a>, y el tratamiento de datos personales por la <a href="/politica-de-privacidad">Política de privacidad</a>.</p>

      <h2>Legislación aplicable</h2>
      <p>Este sitio y sus documentos legales se rigen por las leyes de la República de Costa Rica, en particular la Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales (Ley N.° 8968) y la Ley de Promoción de la Competencia y Defensa Efectiva del Consumidor (Ley N.° 7472) y sus reglamentos.</p>

      <h2>Contacto</h2>
      <p>Para cualquier consulta sobre este sitio puede escribirnos a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> o por WhatsApp al +506 {companyPhone()}.</p>
    </LegalPage>
  );
}
