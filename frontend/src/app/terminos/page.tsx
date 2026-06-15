import Link from "next/link";

export const metadata = {
  title: "Términos de Uso — ticka",
  description: "Términos y condiciones de uso del Servicio ticka.",
};

export default function TerminosPage() {
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

      <h1 className="text-3xl md:text-4xl font-extrabold font-outfit text-white mb-2">Términos de Uso</h1>
      <p className="text-sm text-gray-500 font-inter mb-10">Última actualización: 14 de junio de 2026</p>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">1. Aceptación de los términos</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            Al acceder o usar ticka (el &quot;Servicio&quot;, disponible en ticka.dev) aceptas estos Términos de Uso.
            Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar el Servicio.
            Podemos actualizar estos términos ocasionalmente; el uso continuado del Servicio después de un
            cambio implica la aceptación de la versión actualizada.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">2. El Servicio</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            ticka permite crear contadores regresivos personalizados con imágenes o videos de fondo, para
            compartirlos públicamente en redes sociales y otros canales. Ofrecemos un plan gratuito (Free) y
            un plan de pago (Pro) con funciones adicionales como video de fondo, analytics y otros beneficios
            descritos en <Link href="/upgrade" className="text-purple-400 hover:text-purple-300 underline">/upgrade</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">3. Contenido subido por usuarios y derechos de autor</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed mb-3">
            Al crear un contador puedes subir imágenes o videos propios, o utilizar fotografías de Unsplash
            integradas en el Servicio. Respecto al contenido que subas:
          </p>
          <ul className="list-disc list-outside pl-5 flex flex-col gap-2 text-gray-400 font-inter text-sm leading-relaxed">
            <li>
              Declaras y garantizas que eres titular de los derechos necesarios (de autor, de imagen, de marca
              u otros) sobre cualquier archivo multimedia que subas, o que cuentas con la autorización
              correspondiente para usarlo.
            </li>
            <li>
              ticka no revisa ni verifica la titularidad del contenido subido por los usuarios y no asume
              ninguna responsabilidad por infracciones de derechos de autor, propiedad intelectual o cualquier
              otro derecho de terceros derivadas de dicho contenido. <strong className="text-gray-300">La
              responsabilidad sobre el contenido multimedia subido es exclusivamente del usuario que lo
              publica.</strong>
            </li>
            <li>
              Eres el único responsable frente a cualquier reclamo de terceros (incluyendo reclamos por
              derechos de autor) relacionado con el contenido que subas a tu contador.
            </li>
            <li>
              ticka se reserva el derecho de eliminar, sin previo aviso, cualquier contador o archivo
              multimedia que infrinja derechos de terceros, sea ilegal u ofensivo, o que reciba un reclamo
              válido al respecto.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">4. Límites de uso</h2>
          <ul className="list-disc list-outside pl-5 flex flex-col gap-2 text-gray-400 font-inter text-sm leading-relaxed">
            <li>Las cuentas del plan Free pueden tener hasta 3 contadores activos a la vez. Para crear más, elimina alguno existente o mejora a Pro.</li>
            <li>La creación de contadores está limitada a un máximo de 5 por hora por dirección IP.</li>
            <li>El video de fondo está disponible únicamente para cuentas Pro.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">5. Pagos y suscripciones</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            El plan Pro se ofrece mediante suscripción mensual o anual, procesada por Stripe. Puedes cancelar
            tu suscripción en cualquier momento desde el portal de gestión de suscripción; la cancelación se
            hace efectiva al finalizar el periodo de facturación ya pagado, momento en el cual tu cuenta vuelve
            automáticamente al plan Free.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">6. Limitación de responsabilidad</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            El Servicio se ofrece &quot;tal cual&quot; y &quot;según disponibilidad&quot;, sin garantías de ningún tipo. En la
            medida permitida por la ley, ticka no será responsable por daños indirectos, incidentales o
            derivados del uso o la imposibilidad de uso del Servicio, incluyendo la pérdida de contadores,
            datos o contenido.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-outfit text-white mb-2">7. Contacto</h2>
          <p className="text-gray-400 font-inter text-sm leading-relaxed">
            Si tienes dudas sobre estos Términos, o quieres reportar contenido que infringe tus derechos,
            contáctanos en <a href="mailto:contacto@ticka.dev" className="text-purple-400 hover:text-purple-300 underline">contacto@ticka.dev</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
