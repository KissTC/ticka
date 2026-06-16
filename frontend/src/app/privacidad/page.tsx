import Link from "next/link";

export const metadata = {
  title: "Aviso de Privacidad — ticka",
  description: "Aviso de Privacidad de ticka conforme a la LFPDPPP.",
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <Link
          href="/"
          className="text-2xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400"
        >
          ticka
        </Link>
        <Link href="/" className="text-sm text-gray-300 hover:text-white font-outfit font-medium transition-colors">
          ← Volver a inicio
        </Link>
      </header>

      <h1 className="text-3xl md:text-4xl font-extrabold font-outfit text-white mb-2">Aviso de Privacidad</h1>
      <p className="text-sm text-gray-500 font-inter mb-10">Última actualización: 15 de junio de 2026</p>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">1. Responsable del tratamiento</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            ticka (en adelante, &quot;ticka&quot;, &quot;nosotros&quot; o el &quot;Responsable&quot;), con domicilio en México y
            disponible en <strong className="text-gray-300">ticka.dev</strong>, es el responsable del
            tratamiento de tus datos personales, conforme a lo dispuesto en la Ley Federal de Protección
            de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.
            Puedes contactarnos en{" "}
            <a href="mailto:contacto@ticka.dev" className="text-purple-400 hover:text-purple-300 underline">
              contacto@ticka.dev
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">2. Datos personales recabados</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed mb-3">
            Para prestarte el Servicio, recabamos las siguientes categorías de datos personales:
          </p>
          <ul className="list-disc list-outside pl-5 flex flex-col gap-2 text-gray-400 font-inter text-sm leading-relaxed">
            <li>
              <strong className="text-gray-300">Datos de identificación y contacto:</strong> nombre,
              foto de perfil y correo electrónico, obtenidos a través de tu cuenta de Google al
              iniciar sesión vía Google OAuth.
            </li>
            <li>
              <strong className="text-gray-300">Datos de pago:</strong> información de suscripción
              gestionada por Stripe (proveedor externo de pagos). ticka no almacena directamente
              datos de tarjeta bancaria; estos son procesados y custodiados por Stripe.
            </li>
            <li>
              <strong className="text-gray-300">Contenido subido:</strong> imágenes o videos que
              elijas subir como fondo de tus contadores, almacenados en servidores de DigitalOcean.
            </li>
            <li>
              <strong className="text-gray-300">Datos de uso:</strong> dirección IP (para control
              de límites de uso del Servicio), número de contadores creados y estadísticas de
              visualización de tus contadores.
            </li>
          </ul>
          <p className="text-gray-400 font-inter text-sm leading-relaxed mt-3">
            No recabamos datos personales sensibles en los términos del artículo 3, fracción VI de la LFPDPPP.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">3. Finalidades del tratamiento</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed mb-2">
            <strong className="text-gray-300">Finalidades primarias</strong> (necesarias para la relación
            jurídica contigo):
          </p>
          <ul className="list-disc list-outside pl-5 flex flex-col gap-2 text-gray-400 font-inter text-sm leading-relaxed mb-3">
            <li>Crear y gestionar tu cuenta de usuario en ticka.</li>
            <li>Permitirte crear, editar y compartir contadores regresivos.</li>
            <li>Procesar pagos y gestionar tu suscripción al plan Pro.</li>
            <li>Controlar el cumplimiento de los límites de uso del Servicio.</li>
            <li>Responder a solicitudes de soporte o ejercicio de derechos ARCO.</li>
          </ul>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            <strong className="text-gray-300">Finalidades secundarias:</strong> actualmente ticka no
            utiliza tus datos personales para finalidades secundarias como envío de publicidad,
            boletines o análisis de mercado. En caso de que en el futuro lo hagamos, te notificaremos
            y podrás oponerte a dicho tratamiento.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">4. Transferencias de datos personales</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed mb-3">
            Para operar el Servicio, tus datos pueden ser compartidos con los siguientes terceros, quienes
            actúan como encargados del tratamiento bajo estándares de seguridad adecuados:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-inter text-gray-400 border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-300 font-semibold py-2 pr-4">Tercero</th>
                  <th className="text-left text-gray-300 font-semibold py-2 pr-4">Finalidad</th>
                  <th className="text-left text-gray-300 font-semibold py-2">País</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2 pr-4">Clerk</td>
                  <td className="py-2 pr-4">Autenticación e identidad de usuarios</td>
                  <td className="py-2">EE.UU.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Stripe</td>
                  <td className="py-2 pr-4">Procesamiento de pagos y suscripciones</td>
                  <td className="py-2">EE.UU.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">DigitalOcean</td>
                  <td className="py-2 pr-4">Almacenamiento de archivos multimedia</td>
                  <td className="py-2">EE.UU.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Vercel</td>
                  <td className="py-2 pr-4">Hospedaje del sitio web</td>
                  <td className="py-2">EE.UU.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-400 font-inter text-sm leading-relaxed mt-3">
            Estas transferencias son necesarias para la prestación del Servicio y se realizan sin requerir
            tu consentimiento expreso conforme al artículo 37 de la LFPDPPP. Ninguno de estos terceros
            está autorizado a usar tus datos para fines distintos a los indicados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">5. Cookies y tecnologías similares</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            ticka utiliza únicamente <strong className="text-gray-300">cookies estrictamente necesarias</strong>{" "}
            para el funcionamiento del Servicio, específicamente las cookies de sesión de autenticación
            gestionadas por Clerk. Sin estas cookies, no es posible iniciar sesión ni acceder a las
            funciones de usuario. No utilizamos cookies de análisis, publicidad ni seguimiento de
            comportamiento. Al usar ticka, aceptas el uso de estas cookies esenciales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">6. Derechos ARCO</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed mb-3">
            Tienes derecho a <strong className="text-gray-300">Acceder, Rectificar, Cancelar u Oponerte</strong>{" "}
            (derechos ARCO) al tratamiento de tus datos personales en los términos de la LFPDPPP.
            Para ejercer cualquiera de estos derechos:
          </p>
          <ul className="list-disc list-outside pl-5 flex flex-col gap-2 text-gray-400 font-inter text-sm leading-relaxed">
            <li>
              Envía un correo a{" "}
              <a href="mailto:contacto@ticka.dev" className="text-purple-400 hover:text-purple-300 underline">
                contacto@ticka.dev
              </a>{" "}
              indicando tu nombre, el derecho que deseas ejercer y una descripción clara de los datos
              sobre los que solicitas la acción.
            </li>
            <li>
              Responderemos a tu solicitud en un plazo máximo de <strong className="text-gray-300">20 días hábiles</strong>,
              conforme a lo establecido en el artículo 32 de la LFPDPPP.
            </li>
            <li>
              Puedes revocar en cualquier momento el consentimiento que hayas otorgado para el
              tratamiento de tus datos, en la medida en que no afecte el cumplimiento de
              obligaciones derivadas de la relación jurídica vigente.
            </li>
            <li>
              Si consideras que tu solicitud no fue atendida correctamente, puedes acudir al
              Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos
              Personales (INAI) en{" "}
              <strong className="text-gray-300">inai.org.mx</strong>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">7. Conservación de datos</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            Conservamos tus datos personales mientras tu cuenta esté activa o sea necesario para
            prestarte el Servicio. Los datos de pago se conservan el tiempo que la ley aplicable
            exija para efectos fiscales y de auditoría. Al eliminar tu cuenta, procederemos a
            suprimir o anonimizar tus datos personales, salvo que exista una obligación legal de
            conservarlos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">8. Cambios a este Aviso</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            Podemos actualizar este Aviso de Privacidad ocasionalmente. Cualquier cambio se
            publicará en esta página con una nueva fecha de actualización. Te recomendamos revisarlo
            periódicamente. El uso continuado del Servicio después de una actualización implica la
            aceptación del Aviso modificado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">9. Contacto</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            Para cualquier duda, solicitud o comentario relacionado con este Aviso de Privacidad,
            contáctanos en{" "}
            <a href="mailto:contacto@ticka.dev" className="text-purple-400 hover:text-purple-300 underline">
              contacto@ticka.dev
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
