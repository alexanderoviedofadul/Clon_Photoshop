/**
 * sc-seguridad.js — «Seguridad comprobada» (kit «confianza y recorrido», 24-oct-2026). Portado de la vitrina de GPA y
 * LHM Litigios (`acceso_salud.php`, `confianza/_salud.php`, `lhm-confianza.js`) para cualquier proyecto.
 *
 * Pinta lo que dicen de este sitio herramientas PÚBLICAS e independientes (Mozilla Observatory, SSL Labs,
 * securityheaders, PageSpeed, VirusTotal, W3C, WAVE, internet.nl), cada una con su nota, la fecha, una captura real del
 * informe y el enlace para verificarlo en la fuente.
 *
 * Lee `/salud-publica/publico.json` (o `data-sc-url`). Ese fichero lo escribe `publico.py` en el servidor con SOLO lo
 * publicable: la medición cumple su umbral (`ok`), tiene menos de 45 días y lleva enlace https. 🔴 Ninguna cifra se
 * escribe a mano: si el medidor no pudo medir, la tarjeta no aparece.
 *
 * Marcado (lo escribe el generador o la vista de cada proyecto):
 *   <section data-sc [data-sc-url] [data-sc-quitar] id="seguridad-comprobada">… texto sin JS …<div data-sc-lista></div></section>
 * Sin JS se lee el texto y el enlace a security.txt. Sin mediciones publicables, con `data-sc-quitar` la sección se
 * quita (y su entrada del riel y del índice del recorrido); sin él, se queda el texto.
 * 🔴 CSP sin 'unsafe-inline': todo por DOM y delegación; ningún innerHTML con datos.
 * Doc: Configuraciones_Equipos/VPS_Ubuntu_Hostinger/38-confianza-y-recorrido/README.md
 */
(function (w, d) {
  'use strict';

  /* El orden en que se muestran y lo que cada una explica en lenguaje claro (como en GPA). */
  var FUENTES = {
    observatorio: ['escudo', 'Que el navegador de quien entra aplique todas las protecciones de seguridad que el sitio le pide.'],
    ssllabs: ['candado', 'La conexión cifrada: el certificado, los protocolos y la fuerza del cifrado TLS.'],
    securityheaders: ['lista', 'Una segunda revisión independiente de las mismas cabeceras de seguridad.'],
    pagespeed: ['velocimetro', 'Rendimiento, accesibilidad, buenas prácticas y posicionamiento, medidos por Google.'],
    virustotal: ['insecto', 'Que ninguno de los motores antimalware y de reputación del mundo lo marque como peligroso.'],
    w3c: ['codigo', 'Que el código de la página cumpla el estándar HTML, sin errores.'],
    wave: ['accesible', 'Que lo puedan usar personas con discapacidad: accesibilidad WCAG, sin errores ni fallos de contraste.'],
    internetnl: ['globo', 'Estándares modernos de internet: IPv6, firma del dominio, HTTPS y rutas seguras.']
  };
  var TRAZOS = {
    escudo: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z M8.5 12l2.5 2.5 4.5-5',
    candado: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 017 0v3',
    lista: 'M9 6h11 M9 12h11 M9 18h11 M4 6l1 1 2-2 M4 12l1 1 2-2 M4 18l1 1 2-2',
    velocimetro: 'M4 17a8 8 0 1116 0 M12 17l4-5',
    insecto: 'M9 8a3 3 0 016 0 M7 10h10v5a5 5 0 01-10 0v-5z M12 10v10 M3 12h4 M17 12h4 M4 18l3-2 M20 18l-3-2',
    codigo: 'M9 7l-5 5 5 5 M15 7l5 5-5 5',
    accesible: 'M12 5.5a1.5 1.5 0 100-.01 M5 9l7 1 7-1 M12 10v4 M9 21l3-7 3 7',
    globo: 'M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
    lupa: 'M11 4a7 7 0 100 14 7 7 0 000-14z M20 20l-4-4',
    externo: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6'
  };
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, txt) {
    var e = d.createElement(tag);
    if (cls) { e.className = cls; }
    if (txt != null) { e.textContent = txt; }
    return e;
  }
  function icono(nombre) {
    var s = d.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.setAttribute('class', 'sc-ico');
    (TRAZOS[nombre] || TRAZOS.escudo).split(' M').forEach(function (t, i) {
      var p = d.createElementNS(SVGNS, 'path'); p.setAttribute('d', (i ? 'M' : '') + t); s.appendChild(p);
    });
    return s;
  }
  /* «23 de octubre de 2026», en Bogotá (la hora del medidor). El formateador se crea UNA vez (react-doctor, js-hoist-intl;
     lo encontró Cartera360). */
  var FORMATO = null;
  try { FORMATO = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'numeric', year: 'numeric' }); } catch (e) { /* sin Intl */ }
  function fecha(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) { return ''; }
    try {
      var p = FORMATO.formatToParts(new Date(t));
      var v = {}; p.forEach(function (x) { v[x.type] = x.value; });
      return v.day + ' de ' + MESES[(+v.month) - 1] + ' de ' + v.year;
    } catch (e) { var f = new Date(t); return f.getDate() + ' de ' + MESES[f.getMonth()] + ' de ' + f.getFullYear(); }
  }
  function host(u) { try { return new URL(u).hostname; } catch (e) { return ''; } }
  function seguro(u) { return typeof u === 'string' && /^https:\/\//.test(u); }
  function captura(c) {
    return c && typeof c.src === 'string' && /^\/salud-publica\/[a-z0-9_]+\.webp(\?v=\d+)?$/.test(c.src) ? c : null;
  }

  /* El relleno de la proporción de la captura (SVG), para que el <img> diferido no mueva la página ni sea inválido. */
  function relleno(wd, ht) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + wd + '" height="' + ht + '"/>');
  }

  function tarjeta(f, sitio) {
    var li = el('li', 'sc-card');
    li.setAttribute('data-rc-revela', '');
    var cab = el('div', 'sc-cab');
    var ico = el('span', 'sc-icono'); ico.appendChild(icono((FUENTES[f.clave] || [])[0]));
    var tit = el('div');
    tit.appendChild(el('h3', 'sc-fuente', f.fuente || f.clave));
    if (f.mide) { tit.appendChild(el('p', 'sc-mide', f.mide)); }
    var nota = Array.isArray(f.escritorio) ? String(Math.min.apply(null, f.escritorio.map(Number))) : String(f.valor || '');
    var n = el('p', 'sc-nota' + (nota.length > 6 ? ' sc-nota--larga' : ''));
    n.appendChild(el('span', 'sc-sr', 'Resultado: ')); n.appendChild(d.createTextNode(nota));
    cab.appendChild(ico); cab.appendChild(tit); cab.appendChild(n);
    li.appendChild(cab);
    li.appendChild(el('p', 'sc-explica', (FUENTES[f.clave] || [null, ''])[1]));
    if (Array.isArray(f.escritorio) && Array.isArray(f.movil)) {
      var dl = el('dl', 'sc-psi');
      [['Escritorio', f.escritorio], ['Celular', f.movil]].forEach(function (par) {
        var fila = el('div'); fila.appendChild(el('dt', null, par[0]));
        var dd = el('dd');
        ['Rendimiento', 'Accesibilidad', 'Buenas prácticas', 'SEO'].forEach(function (cat, i) {
          var s = el('span', 'sc-psi-v'); s.title = cat;
          s.appendChild(el('b', null, String(parseInt(par[1][i], 10) || 0))); s.appendChild(el('small', null, cat));
          dd.appendChild(s);
        });
        fila.appendChild(dd); dl.appendChild(fila);
      });
      li.appendChild(dl);
    } else if (f.detalle) {
      li.appendChild(el('p', 'sc-detalle', f.detalle));
    }
    var c = captura(f.captura);
    if (c) {
      var b = el('button', 'sc-cap'); b.type = 'button';
      b.setAttribute('data-sc-captura', c.src); b.setAttribute('data-sc-t', f.fuente || f.clave);
      b.setAttribute('data-sc-f', fecha(f.medido)); b.setAttribute('data-sc-u', f.url);
      var img = el('img');
      img.src = relleno(c.w || 1200, c.h || 700); img.setAttribute('data-src', c.src);
      img.width = c.w || 1200; img.height = c.h || 700; img.decoding = 'async';
      img.alt = 'Captura del informe de ' + (f.fuente || f.clave) + ' sobre ' + sitio + ': ' + (f.valor || '') + '.';
      var ver = el('span', 'sc-cap-ver'); ver.appendChild(icono('lupa')); ver.appendChild(d.createTextNode(' Ampliar la captura'));
      b.appendChild(img); b.appendChild(ver); li.appendChild(b);
    }
    var pie = el('p', 'sc-pie');
    pie.appendChild(el('span', null, 'Medido el ' + fecha(f.medido)));
    var a = el('a'); a.href = f.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.appendChild(d.createTextNode('Verificar en ' + host(f.url) + ' ')); a.appendChild(icono('externo'));
    a.appendChild(el('span', 'sc-sr', ' (se abre en otra pestaña)'));
    pie.appendChild(a); li.appendChild(pie);
    return li;
  }

  function diferir(raiz) {
    var imgs = Array.prototype.slice.call(raiz.querySelectorAll('img[data-src]'));
    var poner = function (i) { i.src = i.getAttribute('data-src'); i.removeAttribute('data-src'); };
    if (!('IntersectionObserver' in w)) { imgs.forEach(poner); return; }
    var io = new w.IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { poner(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '600px 0px' });
    imgs.forEach(function (i) { io.observe(i); });
  }

  function quitar(sec) {
    var id = sec.id;
    if (id) {
      Array.prototype.slice.call(d.querySelectorAll('[data-rc-ir="' + id + '"], a[href="#' + id + '"]')).forEach(function (a) {
        var li = a.closest('li'); (li || a).remove();
      });
    }
    sec.remove();
    d.dispatchEvent(new w.CustomEvent('rc:recalcular'));
  }

  function pintar(sec, datos) {
    var fuentes = (datos && Array.isArray(datos.fuentes) ? datos.fuentes : []).filter(function (f) {
      return f && f.ok !== false && seguro(f.url) && f.medido;
    });
    var orden = Object.keys(FUENTES);
    fuentes.sort(function (a, b) { return orden.indexOf(a.clave) - orden.indexOf(b.clave); });
    if (!fuentes.length) { if (sec.hasAttribute('data-sc-quitar')) { quitar(sec); } return; }
    var sitio = datos.sitio || w.location.hostname;
    var res = sec.querySelector('[data-sc-resumen]');
    if (res) {
      res.textContent = '';
      var p1 = el('p', 'sc-resumen-n'); var st = el('strong', null, String(fuentes.length));
      p1.appendChild(st); p1.appendChild(d.createTextNode(fuentes.length === 1 ? ' verificación independiente con la calificación más alta de su herramienta'
                                                                                : ' verificaciones independientes con la calificación más alta de cada herramienta'));
      res.appendChild(p1);
      res.appendChild(el('p', 'sc-resumen-f', 'Medido sobre ' + sitio + (datos.ultima ? ' · última medición: ' + fecha(datos.ultima) : '') + ' · se repite cada semana'));
      res.hidden = false;
    }
    var lista = sec.querySelector('[data-sc-lista]');
    if (!lista) { return; }
    var ul = el('ul', 'sc-grid');
    fuentes.forEach(function (f) { ul.appendChild(tarjeta(f, sitio)); });
    lista.textContent = '';
    lista.appendChild(ul);
    sec.setAttribute('data-sc-listo', String(fuentes.length));
    diferir(lista);
    d.dispatchEvent(new w.CustomEvent('rc:recalcular'));
  }

  /* La captura ampliada, en un <dialog> nativo que se crea una vez. */
  var dlg = null, origen = null;
  function dialogo() {
    if (dlg) { return dlg; }
    dlg = el('dialog', 'sc-dlg');
    dlg.setAttribute('aria-labelledby', 'sc-dlg-t');
    var cab = el('div', 'sc-dlg-cab');
    var h = el('h2', null); h.id = 'sc-dlg-t';
    var x = el('button', 'sc-dlg-cerrar', 'Cerrar'); x.type = 'button'; x.setAttribute('data-sc-cerrar', '');
    cab.appendChild(h); cab.appendChild(x);
    dlg.appendChild(cab); dlg.appendChild(el('div', 'sc-dlg-cuerpo'));
    d.body.appendChild(dlg);
    dlg.addEventListener('close', function () {
      dlg.querySelector('.sc-dlg-cuerpo').textContent = '';
      if (origen && origen.focus && d.contains(origen)) { origen.focus({ preventScroll: true }); }
      origen = null;
    });
    dlg.addEventListener('click', function (e) {
      var r = dlg.getBoundingClientRect();
      var fuera = e.target === dlg && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
      if (fuera || (e.target.closest && e.target.closest('[data-sc-cerrar]'))) { dlg.close(); }
    });
    return dlg;
  }

  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sc-captura]');
    if (!b) { return; }
    var g = dialogo();
    if (typeof g.showModal !== 'function') { return; }
    origen = b;
    g.querySelector('#sc-dlg-t').textContent = 'Informe de ' + b.getAttribute('data-sc-t');
    var cuerpo = g.querySelector('.sc-dlg-cuerpo'); cuerpo.textContent = '';
    var fig = el('figure', 'sc-dlg-fig');
    var img = el('img'); img.src = b.getAttribute('data-sc-captura');
    var pv = b.querySelector('img'); if (pv) { img.width = pv.width; img.height = pv.height; img.alt = pv.alt; }
    var cap = el('figcaption', null, 'Captura real del informe, ' + b.getAttribute('data-sc-f') + '. Se omite la dirección del servidor. ');
    var v = el('a', null, 'Verificar en la fuente'); v.href = b.getAttribute('data-sc-u'); v.target = '_blank'; v.rel = 'noopener noreferrer';
    cap.appendChild(v); fig.appendChild(img); fig.appendChild(cap); cuerpo.appendChild(fig);
    g.showModal();
  });

  /* Idempotente: cada sección se pide una vez. Una SPA que vuelve a pintar la portada llama `RC_SC.arrancar()` y solo se
     atienden las secciones nuevas (lo encontró PixelCV: al volver por la navegación interna no se pintaba). */
  function arrancar() {
    Array.prototype.slice.call(d.querySelectorAll('[data-sc]:not([data-sc-pedido])')).forEach(function (sec) {
      sec.setAttribute('data-sc-pedido', '');
      var url = sec.getAttribute('data-sc-url') || '/salud-publica/publico.json';
      if (!w.fetch) { return; }
      w.fetch(url, { credentials: 'omit', cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { pintar(sec, j); })
        .catch(function () { pintar(sec, null); });
    });
  }
  /* Una SPA que pinta la sección DESPUÉS de cargar (o la vuelve a pintar al volver a la portada): se atiende sola, sin
     que el proyecto tenga que llamar a nada (lo encontraron PixelCV y Cartera360). Un fotograma por ráfaga de cambios. */
  function vigilar() {
    if (!('MutationObserver' in w)) { return; }
    var pendiente = false;
    new w.MutationObserver(function () {
      if (pendiente) { return; }
      pendiente = true;
      (w.requestAnimationFrame || w.setTimeout)(function () { pendiente = false; if (d.querySelector('[data-sc]:not([data-sc-pedido])')) { arrancar(); } });
    }).observe(d.body, { childList: true, subtree: true });
  }
  if (d.readyState === 'loading') { d.addEventListener('DOMContentLoaded', function () { arrancar(); vigilar(); }); } else { arrancar(); vigilar(); }
  w.RC_SC = { arrancar: arrancar };
})(window, document);
