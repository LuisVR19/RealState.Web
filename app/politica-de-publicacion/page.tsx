import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY, companyPhone } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de publicación de propiedades · Thomas Mata S.A.", description: "Cómo se obtiene, verifica y actualiza la información de las propiedades publicadas." };

export default function PublicacionPage() {
  const mail = <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>;
  return (
    <LegalPage path="/politica-de-publicacion" title="Política de publicación de propiedades"
      intro={<p>Queremos que cada anuncio sea claro y veraz. Aquí explicamos de dónde sale la información de las propiedades, cómo la revisamos y qué hacer si encuentra un error, conforme al deber de información y publicidad veraz de la Ley N.° 7472.</p>}>
      <h2>1. Quién proporciona la información</h2>
      <p>La información de cada propiedad (precio, características, medidas, condiciones y fotografías) la proporciona el propietario o su representante, y es recopilada por un asesor de {COMPANY.tradeName}. Cada anuncio tiene un asesor responsable, identificado en la ficha de la propiedad.</p>

      <h2>2. Cómo se verifica</h2>
      <ul>
        <li>El asesor revisa la propiedad y confirma con el propietario los datos principales antes de publicarla.</li>
        <li>Cuando es posible, se contrastan medidas y datos registrales con documentos como el plano catastrado o la certificación del Registro Nacional.</li>
        <li>Las características que no se hayan podido confirmar se omiten o se indican como aproximadas.</li>
      </ul>
      <p>La verificación final de la situación legal y registral del inmueble se realiza durante el proceso de compra o alquiler, con apoyo de un notario o abogado.</p>

      <h2>3. Fotografías</h2>
      <ul>
        <li>Las fotografías corresponden a la propiedad anunciada y se publican con autorización del propietario o de su autor.</li>
        <li>Algunos anuncios usan material promocional (afiches o diseños) con información resumida. Si hay diferencias entre el afiche y la ficha, prevalece la información de la ficha confirmada con el asesor.</li>
        <li>Las fotos reflejan el estado de la propiedad en la fecha en que se tomaron. Usted puede pedir fotos actualizadas o verla en persona antes de decidir.</li>
        <li>Si usted es titular de una imagen publicada sin autorización, escríbanos y la retiraremos.</li>
      </ul>

      <h2>4. Precios</h2>
      <ul>
        <li>Los precios se expresan en colones costarricenses (₡). En alquileres, el precio es mensual; en alquiler vacacional, por noche.</li>
        <li>Salvo que se indique lo contrario, el precio no incluye gastos de traspaso, honorarios notariales, impuestos, cuotas de mantenimiento ni depósitos, que se informan aparte.</li>
        <li>Cuando el propietario cambia el precio, el anuncio se actualiza. Si un precio fue rebajado, puede mostrarse el precio anterior tachado.</li>
        <li>El precio vigente es el que confirme el asesor al momento de su consulta.</li>
      </ul>

      <h2>5. Disponibilidad</h2>
      <ul>
        <li>Cuando una propiedad se vende, se alquila o el propietario la retira, deja de mostrarse en el sitio.</li>
        <li>Una propiedad puede pausarse temporalmente (por ejemplo, durante una negociación avanzada) y volver a publicarse después.</li>
        <li>Hacemos lo posible por actualizar el sitio el mismo día, pero puede haber un breve desfase. Por eso la disponibilidad debe confirmarse siempre con el asesor.</li>
      </ul>

      <h2>6. Ubicación</h2>
      <p>Por seguridad de los propietarios, el mapa muestra una zona aproximada y no la dirección exacta. La dirección completa se comparte al confirmar una visita.</p>

      <h2>7. Errores en los anuncios</h2>
      <p>Si encuentra un dato incorrecto, desactualizado o que pueda inducir a error, avísenos a {mail} o por WhatsApp al +506 {companyPhone()} indicando el código de la propiedad (por ejemplo, ISF-0001). Lo revisaremos y corregiremos el anuncio a la brevedad. Los errores materiales evidentes (por ejemplo, un cero de más en un precio) no obligan a la empresa, y se corregirán apenas se detecten.</p>

      <h2>8. Propietarios que desean publicar</h2>
      <p>Si desea que publiquemos su propiedad, contáctenos. Antes de publicar acordaremos por escrito las condiciones del servicio, la información y las fotografías que se usarán, y usted podrá pedir cambios o el retiro del anuncio en cualquier momento.</p>
    </LegalPage>
  );
}
