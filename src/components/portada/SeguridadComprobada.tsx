import Script from 'next/script'

/**
 * «Seguridad comprobada» (kit «confianza y recorrido», 25-oct-2026): lo que dicen de este sitio herramientas públicas e
 * independientes, con la fecha, una captura real del informe y el enlace a la fuente.
 * Componente de SERVIDOR: el texto y el enlace a security.txt se leen sin JavaScript. Las tarjetas las pinta
 * /kit-confianza/sc-seguridad.js con /salud-publica/publico.json (lo escribe el medidor del servidor, SOLO con lo que
 * tiene la calificación más alta, < 45 días y enlace); sin nada publicable, la sección se quita sola.
 * 🔴 Ninguna cifra a mano y nada en línea (CSP). La copia del kit en public/kit-confianza/ no se edita aquí.
 * Trato de usted, como la portada. Colores del Manual de Marca v1.0 (.pc-sc en portada.css).
 */
export default function SeguridadComprobada() {
  // El <Script> va FUERA de la sección: sin mediciones publicables el kit quita la sección del DOM, y React no debe
  // tener un componente suyo dentro de un nodo que ya no existe.
  return (
    <>
      <section id="seguridad-comprobada" className="pc-seccion sc pc-sc" aria-labelledby="seguridad-titulo" data-sc data-sc-quitar>
        <link rel="stylesheet" href="/kit-confianza/sc-seguridad.css?v=1.0.4" precedence="default" />
        <p className="pc-antetitulo">Seguridad comprobada</p>
        <h2 id="seguridad-titulo">No le pedimos que nos crea: compruébelo usted</h2>
        <p className="pc-sc-lead">
          Herramientas públicas e independientes revisan este sitio: el cifrado de la conexión, las protecciones del
          navegador, el código y la accesibilidad. Aquí está lo que dicen, con la fecha de la medición, una captura real del
          informe y el enlace para que lo verifique en la fuente.
        </p>
        <div className="sc-resumen" data-sc-resumen hidden />
        <div data-sc-lista />
        <p className="sc-nota-pie">
          Publicamos aquí solo las verificaciones en las que hoy tenemos la calificación más alta. Se vuelven a medir de forma
          automática; si un resultado deja de cumplir, sale de esta página hasta que lo corregimos. En las capturas se omite
          la dirección del servidor. Para reportar una vulnerabilidad: <a className="pc-enlace" href="/.well-known/security.txt">security.txt</a>.
        </p>
      </section>
      <Script src="/kit-confianza/sc-seguridad.js?v=1.0.4" strategy="afterInteractive" />
    </>
  )
}
