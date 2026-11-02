import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de cookies · Thomas Mata S.A.", description: "Qué cookies usa este sitio y para qué." };

export default function CookiesPage() {
  return (
    <LegalPage path="/politica-de-cookies" title="Política de cookies"
      intro={<p><b>En resumen:</b> este sitio solo usa las cookies técnicas imprescindibles para que usted pueda iniciar sesión. No usamos cookies de análisis, de publicidad ni de redes sociales, y no le seguimos de una página a otra. Solo llevamos contadores anónimos de uso del sitio, sin cookies ni datos personales (punto 4).</p>}>
      <h2>1. Qué es una cookie</h2>
      <p>Una cookie es un pequeño archivo que un sitio web guarda en su navegador para recordar información entre una página y otra, por ejemplo, que usted ya inició sesión.</p>

      <h2>2. Cookies que usamos</h2>
      <table className="legal-table">
        <thead><tr><th>Cookie</th><th>Tipo</th><th>Para qué sirve</th><th>Duración</th><th>Proveedor</th></tr></thead>
        <tbody>
          <tr><td><code>sb-…-auth-token</code></td><td>Técnica (necesaria)</td><td>Mantener su sesión iniciada de forma segura cuando tiene una cuenta.</td><td>Hasta que cierre sesión (máximo 400 días)</td><td>Propia, gestionada con Supabase</td></tr>
          <tr><td><code>sb-…-auth-token-code-verifier</code></td><td>Técnica (necesaria)</td><td>Proteger el proceso de inicio de sesión y de confirmación de correo.</td><td>Minutos, solo durante ese proceso</td><td>Propia, gestionada con Supabase</td></tr>
        </tbody>
      </table>
      <p>Solo se crean si usted inicia sesión o crea una cuenta. Si navega sin cuenta, el sitio no guarda cookies.</p>
      <p>Al ser estrictamente necesarias para un servicio que usted solicita, estas cookies no requieren su consentimiento y por eso el sitio no muestra un aviso de aceptación.</p>

      <h2>3. Cookies que NO usamos</h2>
      <ul>
        <li><b>Analíticas</b> (por ejemplo, Google Analytics): no usamos herramientas de análisis que instalen cookies o que le identifiquen o le sigan entre visitas.</li>
        <li><b>Publicitarias</b> (por ejemplo, Meta Pixel o Google Ads): no mostramos publicidad personalizada ni compartimos su navegación con redes publicitarias.</li>
        <li><b>De redes sociales:</b> el sitio no incrusta botones ni widgets de redes sociales que instalen cookies.</li>
      </ul>
      <p>Si en el futuro incorporamos cookies analíticas o publicitarias, actualizaremos esta política y le pediremos su consentimiento previo mediante un aviso que le permita aceptarlas, rechazarlas o configurarlas.</p>

      <h2>4. Estadísticas anónimas de uso (sin cookies)</h2>
      <p>Para saber qué propiedades interesan más y mejorar el sitio, contamos de forma anónima cuántas veces se ven las páginas y las propiedades, cuántas veces se tocan los botones de WhatsApp y de compartir, y cuántas búsquedas con filtros se hacen.</p>
      <ul>
        <li>Solo guardamos <b>totales por día</b> (por ejemplo, "la propiedad ISF-0003 se vio 12 veces el lunes"). No guardamos su dirección IP, su ubicación, su dispositivo, el texto que escribe en el buscador ni ningún identificador suyo.</li>
        <li>No se usan cookies. Para no contar dos veces la misma propiedad, su navegador recuerda durante la pestaña abierta qué propiedades ya vio (almacenamiento de sesión, que se borra al cerrarla).</li>
        <li>Como no permite identificar a nadie, no es un dato personal y no requiere su consentimiento.</li>
      </ul>

      <h2>5. Servicios externos</h2>
      <ul>
        <li><b>Mapas:</b> las imágenes del mapa se cargan desde servidores de mapas de terceros (Esri). Al mostrarlas, su navegador se conecta con esos servidores, pero no instalan cookies de seguimiento desde este sitio.</li>
        <li><b>WhatsApp:</b> los botones de WhatsApp solo abren la aplicación cuando usted los toca. Desde ese momento aplica la política de WhatsApp.</li>
      </ul>

      <h2>6. Cómo eliminar o bloquear cookies</h2>
      <p>Puede borrar las cookies cerrando sesión o desde la configuración de su navegador (Chrome, Safari, Firefox, Edge). Si las bloquea, el sitio funciona igual para buscar propiedades, pero no podrá iniciar sesión.</p>

      <h2>7. Contacto</h2>
      <p>Si tiene dudas sobre esta política, escríbanos a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Más información sobre sus datos en la <a href="/politica-de-privacidad">Política de privacidad</a>.</p>
    </LegalPage>
  );
}
