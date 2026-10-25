/**
 * rc-recorrido.js — el recorrido INMERSIVO común a los proyectos del VPS (kit «confianza y recorrido», 24-oct-2026).
 *
 * Portado del recorrido de LHM Litigios (`lhm-inmersivo.js`, 3-oct-2026) y del modo Mapa de GPA (`gpa_recorrido.js`),
 * sin Bootstrap, sin vídeos y sin nada en línea, para que valga en cualquier proyecto (PHP, Vite, Next) con una CSP sin
 * 'unsafe-inline'. La página la escribe `generar-conozca.mjs` a partir del `conozca.json` de cada proyecto.
 *
 * La página se lee entera SIN este fichero. Aquí solo se añade:
 *   - el MODO: «escenas» (se desplaza la página; por defecto), «diapositivas» (un momento por pantalla, para proyectar)
 *     y «mapa» (todos los capítulos de un vistazo). Botones, teclas D y M, o `?modo=`; se recuerda el lineal.
 *   - el MOVIMIENTO, con GSAP y `gsap.matchMedia()`: a ≥ 992 px el momento «Cómo» queda fijo mientras el marco de la
 *     pantalla se endereza y la captura se recorre hasta la marca de cada paso; en el celular, revelados al entrar.
 *     🔴 Con «reducir movimiento» NO se anima nada: todo queda visible y los saltos son instantáneos.
 *   - la NAVEGACIÓN: riel de capítulos, índice (<dialog>), ← → (RePág/AvPág), I, D, M, F, el enlace a cada capítulo
 *     (`#cap-<clave>`) y «Continuar donde iba».
 *
 * 🔴 Todo `localStorage` dentro de try: en una ventana privada tocarlo LANZA, y la página tiene que funcionar igual.
 * 🔴 `matchMedia` con condiciones llama a la función solo si ALGUNA casa: sin `estrecho`, en el celular no se montaba nada.
 * 🔴 Las teclas son del recorrido solo si no se escribe ni hay un <dialog> abierto.
 * Doc: Configuraciones_Equipos/VPS_Ubuntu_Hostinger/38-confianza-y-recorrido/README.md
 */
(function (w, d) {
  'use strict';

  var raiz = null, escenas = null, momentos = [], actual = 0, modo = 'escenas', previo = 'escenas';
  var gs = null, mm = null, observador = null, vigia = null, animando = false, pasoManual = 0, limpiezas = [];
  var CLAVE = 'rc', POSICION = '', MODO = '';

  /* ── Almacenamiento (comodidad de quien mira) ──────────────────────────────────────────────────────────────── */
  function leer(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function poner(k, v) { try { w.localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento: no se recuerda */ } }
  function posicionGuardada() {
    try { var p = JSON.parse(leer(POSICION) || 'null'); return p && typeof p.id === 'string' ? p : null; } catch (e) { return null; }
  }

  function reducido() { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function escribiendo(el) { return !!(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))); }
  function todos(sel, ctx) { return Array.prototype.slice.call((ctx || raiz).querySelectorAll(sel)); }
  function escenaDe(el) { return el ? el.closest('[data-rc-escena]') : null; }
  function medir() { momentos = todos('[data-rc-escenas] [data-momento]'); }

  /* ── Dónde se está ─────────────────────────────────────────────────────────────────────────────────────────── */
  function indiceDe(id) {
    var s = id ? d.getElementById(id) : null;
    if (!s || !raiz.contains(s)) { return -1; }
    var m = s.matches('[data-momento]') ? s : s.querySelector('[data-momento]');
    return momentos.indexOf(m);
  }

  function anunciar(i) {
    actual = i;
    var m = momentos[i];
    if (!m) { return; }
    var s = escenaDe(m) || m, id = s.id, total = raiz.getAttribute('data-total') || '';
    var esCap = s.hasAttribute('data-capitulo');
    var texto = id === 'inicio' ? 'Portada' : (id === 'fin' ? 'Final'
              : (s.hasAttribute('data-numero') ? s.getAttribute('data-numero') + ' · ' : '') + (s.getAttribute('data-titulo') || ''));
    var a = raiz.querySelector('[data-rc-actual]');
    if (a) { a.textContent = texto; }
    var pos = raiz.querySelector('[data-rc-posicion]');
    if (pos) { pos.textContent = esCap ? s.getAttribute('data-numero') + ' de ' + total : texto; }
    todos('[data-rc-riel] [data-rc-ir], [data-rc-indice-item]').forEach(function (r) {
      if (r.getAttribute('data-rc-ir') === id) { r.setAttribute('aria-current', 'step'); } else { r.removeAttribute('aria-current'); }
    });
    if (w.history && w.history.replaceState && ('#' + id) !== w.location.hash) {
      w.history.replaceState(w.history.state, '', w.location.pathname + w.location.search + '#' + id);
    }
    if (modo === 'diapositivas') { progreso(momentos.length > 1 ? i / (momentos.length - 1) : 0); }
    poner(POSICION, JSON.stringify({ id: id, i: i }));
  }

  function progreso(f) {
    var b = raiz.querySelector('[data-rc-progreso]');
    if (b) { b.style.transform = 'scaleX(' + (Math.round(Math.max(0, Math.min(1, f)) * 1000) / 1000) + ')'; }
  }

  function enfocar(m) {
    var s = escenaDe(m);
    if (s && (s.classList.contains('rc-cap') || s.classList.contains('rc-extra'))) { s.focus({ preventScroll: true }); }
  }

  /* ── Ir a un momento ───────────────────────────────────────────────────────────────────────────────────────── */
  function ir(i, instantaneo) {
    if (modo === 'mapa') { return; }
    i = Math.max(0, Math.min(momentos.length - 1, i));
    if (modo === 'diapositivas') { mostrarDiapositiva(i, i >= actual ? 1 : -1, instantaneo); return; }
    var m = momentos[i];
    if (!m) { return; }
    var y = Math.max(0, m.getBoundingClientRect().top + w.pageYOffset);
    if (gs && w.ScrollToPlugin && !reducido() && !instantaneo) {
      gs.to(w, { duration: 0.9, ease: 'power2.inOut', scrollTo: { y: y, autoKill: true }, overwrite: 'auto' });
    } else {
      w.scrollTo(0, y);
    }
    anunciar(i);
    enfocar(m);
  }
  function irA(id) {
    if (modo === 'mapa') { if (indiceDe(id) >= 0) { cambiarModo(previo, id); } return; }
    var i = indiceDe(id);
    if (i >= 0) { ir(i); }
  }

  /* En diapositivas, dentro de «Cómo», la flecha recorre primero sus pasos: así se presenta, paso a paso. */
  function pasoRelativo(dir) {
    var m = momentos[actual];
    if (modo !== 'diapositivas' || !m || m.getAttribute('data-momento') !== 'como') { return false; }
    var cap = m.closest('.rc-cap'), pasos = todos('.rc-pasos [data-rc-paso]', cap);
    var k = pasos.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; });
    var nuevo = k + dir;
    if (nuevo < 0 || nuevo >= pasos.length) { return false; }
    activarPaso(cap, pasos[nuevo].getAttribute('data-rc-paso'));
    return true;
  }
  function siguiente() { if (!pasoRelativo(1)) { ir(actual + 1); } }
  function anterior() { if (!pasoRelativo(-1)) { ir(actual - 1); } }

  /* ── Los pasos de «Cómo»: la marca sobre la captura, el marco al frente y la captura recorrida ─────────────── */
  function alFrente(cap, k) {
    var marcos = todos('[data-rc-marco]', cap);
    if (marcos.length < 2) { return; }
    var orden = [k].concat(marcos.map(function (m) { return m.getAttribute('data-rc-marco'); }).filter(function (x) { return x !== k; }));
    marcos.forEach(function (m) {
      var p = orden.indexOf(m.getAttribute('data-rc-marco'));
      m.classList.toggle('rc-marco-frente', p === 0);
      if (p > 0) { m.setAttribute('data-orden', String(Math.min(p, 2))); } else { m.removeAttribute('data-orden'); }
    });
  }

  function activarPaso(cap, ref) {
    if (!cap || !ref) { return; }
    var k = ref.split('-')[0], boton = null;
    todos('.rc-pasos [data-rc-paso]', cap).forEach(function (b) {
      var si = b.getAttribute('data-rc-paso') === ref;
      b.setAttribute('aria-pressed', si ? 'true' : 'false');
      if (si) { boton = b; }
    });
    todos('[data-rc-marca]', cap).forEach(function (m) { m.classList.toggle('rc-marca-activa', m.getAttribute('data-rc-marca') === ref); });
    alFrente(cap, k);
    cap.setAttribute('data-rc-paso-actual', ref);
    /* La captura se recorre hasta que la marca quede en el centro de la vista (sin marca, se queda donde está). */
    var marco = cap.querySelector('[data-rc-marco="' + k + '"]');
    var vista = marco && marco.querySelector('[data-rc-vista]'), lienzo = marco && marco.querySelector('[data-rc-lienzo]');
    var marca = cap.querySelector('[data-rc-marca="' + ref + '"]');
    if (vista && lienzo && marca) {
      var max = Math.max(0, lienzo.offsetHeight - vista.clientHeight);
      var y = Math.max(0, Math.min(max, marca.offsetTop + marca.offsetHeight / 2 - vista.clientHeight / 2));
      if (gs && !reducido()) { gs.to(lienzo, { y: -y, duration: 0.8, ease: 'power2.inOut', overwrite: 'auto' }); }
      else { lienzo.style.transform = 'translateY(' + (-y) + 'px)'; }
    }
    var boc = cap.querySelector('[data-rc-bocadillo]');
    if (boc && boton) { boc.textContent = boton.textContent.replace(/\s+/g, ' ').trim(); boc.hidden = false; }
  }

  function primerPaso(cap) {
    var p = cap.querySelector('.rc-pasos [data-rc-paso]');
    if (p) { activarPaso(cap, p.getAttribute('data-rc-paso')); }
  }

  /* ── Modo escenas ──────────────────────────────────────────────────────────────────────────────────────────── */
  function vigilar() {
    if (!('IntersectionObserver' in w)) { return; }
    vigia = new w.IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        var i = momentos.indexOf(e.target);
        if (i >= 0 && i !== actual) { anunciar(i); }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    momentos.forEach(function (m) { vigia.observe(m); });
    var alDesplazar = function () {
      var alto = d.documentElement.scrollHeight - w.innerHeight;
      progreso(alto > 0 ? w.pageYOffset / alto : 0);
    };
    w.addEventListener('scroll', alDesplazar, { passive: true });
    limpiezas.push(function () { w.removeEventListener('scroll', alDesplazar); });
    alDesplazar();
  }

  function portada(amplio) {
    var p = d.getElementById('inicio');
    if (!p) { return; }
    var titulo = p.querySelector('[data-rc-partir]');
    if (titulo && w.SplitText) {
      w.SplitText.create(titulo, { type: 'lines', mask: 'lines', autoSplit: true, aria: 'none',
        onSplit: function (self) { return gs.from(self.lines, { yPercent: 105, duration: 0.9, stagger: 0.09, ease: 'power3.out' }); } });
    }
    gs.from(todos('.rc-antetitulo, .rc-sub, .rc-cta, .rc-teclas', p), { y: 24, opacity: 0, duration: 0.8, stagger: 0.1, delay: 0.25, ease: 'power2.out' });
    gs.fromTo(todos('.rc-flotante', p), { opacity: 0, y: 90, rotationX: 28 },
              { opacity: 0.9, y: 0, rotationX: 0, duration: 1.4, stagger: 0.12, delay: 0.2, ease: 'power3.out' });
    todos('[data-rc-prof]', p).forEach(function (el) {
      var f = parseFloat(el.getAttribute('data-rc-prof')) || 0.3;
      gs.to(el, { yPercent: -70 * f, ease: 'none', scrollTrigger: { trigger: p, start: 'top top', end: 'bottom top', scrub: true } });
    });
    var capas = p.querySelector('.rc-capas');
    if (amplio && capas && w.matchMedia('(pointer: fine)').matches) {
      var rx = gs.quickTo(capas, 'rotationX', { duration: 0.9, ease: 'power3' });
      var ry = gs.quickTo(capas, 'rotationY', { duration: 0.9, ease: 'power3' });
      var mover = function (ev) {
        var r = p.getBoundingClientRect();
        ry(((ev.clientX - r.left) / r.width - 0.5) * 8);
        rx(-((ev.clientY - r.top) / r.height - 0.5) * 6);
      };
      p.addEventListener('pointermove', mover);
      limpiezas.push(function () { p.removeEventListener('pointermove', mover); gs.set(capas, { clearProps: 'transform' }); });
    }
  }

  function porProgreso(cap, pasos, f) {
    if (!pasos.length || Date.now() - pasoManual < 1500) { return; }
    var idx = f < 0.3 ? 0 : Math.min(pasos.length - 1, Math.floor((f - 0.3) / 0.7 * pasos.length));
    var ref = pasos[idx].getAttribute('data-rc-paso');
    if (cap.getAttribute('data-rc-paso-actual') !== ref) { activarPaso(cap, ref); }
  }

  function capitulo(cap, amplio) {
    var nec = cap.querySelector('.rc-necesidad'), num = cap.querySelector('.rc-numero');
    if (num && nec) {
      gs.fromTo(num, { yPercent: -35 }, { yPercent: 35, ease: 'none', scrollTrigger: { trigger: nec, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    if (nec) {
      gs.from(todos('.rc-etiqueta, .rc-cap-titulo', nec), { y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: nec, start: 'top 70%' } });
    }
    /* La necesidad se ILUMINA palabra a palabra. 🔴 `aria: 'none'`: SplitText pone `aria-label` en lo que parte, y en
       un <p> está prohibido (axe, aria-prohibited-attr). Las palabras siguen siendo texto: el lector las lee igual. */
    var p = cap.querySelector('[data-rc-iluminar]');
    if (p && w.SplitText) {
      w.SplitText.create(p, { type: 'words', autoSplit: true, aria: 'none',
        onSplit: function (self) {
          return gs.fromTo(self.words, { opacity: 0.18 }, { opacity: 1, stagger: 0.04, ease: 'none',
            scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true } });
        } });
    }
    var como = cap.querySelector('.rc-como'), mazo = cap.querySelector('[data-rc-mazo]');
    var pasos = todos('.rc-pasos [data-rc-paso]', cap);
    if (como && mazo) {
      if (amplio) {
        gs.timeline({ scrollTrigger: { trigger: como, start: 'top top', end: 'bottom bottom', scrub: 0.6,
                                       onUpdate: function (st) { porProgreso(cap, pasos, st.progress); } } })
          .fromTo(mazo, { rotationX: 24, rotationY: -18, rotationZ: 3, scale: 0.84, yPercent: 8, transformOrigin: '50% 60%' },
                        { rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, yPercent: 0, ease: 'power2.out', duration: 0.28 })
          .to({}, { duration: 0.72 });
        gs.from(cap.querySelector('.rc-como-texto'), { x: -40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: como, start: 'top 60%' } });
      } else {
        gs.from(mazo, { y: 50, opacity: 0, rotationX: 14, transformPerspective: 900, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: mazo, start: 'top 85%' } });
      }
    }
    var gana = cap.querySelector('.rc-gana');
    if (gana) {
      gs.from(todos('.rc-gana-texto > *', gana), { y: 30, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: gana, start: 'top 70%' } });
    }
  }

  /* Las escenas que no son capítulos (Seguridad comprobada…): cada momento entra con su título y luego sus piezas. */
  function extra(sec) {
    todos('[data-momento]', sec).forEach(function (m) {
      var cab = todos('.rc-antetitulo, .rc-cap-titulo, .sc-lead', m);
      if (cab.length) { gs.from(cab, { y: 30, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: m, start: 'top 75%' } }); }
      var piezas = todos('[data-rc-revela]', m);
      if (piezas.length) {
        gs.from(piezas, { y: 36, opacity: 0, rotationX: 8, transformPerspective: 900, duration: 0.7, stagger: 0.05, ease: 'power2.out',
          scrollTrigger: { trigger: m, start: 'top 65%' } });
      }
    });
  }

  function montarEscenas() {
    raiz.setAttribute('data-modo', 'escenas');
    d.documentElement.classList.remove('rc-sin-scroll');
    vigilar();
    if (!gs || !w.ScrollTrigger) { return; }
    mm = gs.matchMedia();
    mm.add({ amplio: '(min-width: 992px)', estrecho: '(max-width: 991.98px)', quieto: '(prefers-reduced-motion: reduce)' }, function (ctx) {
      var c = ctx.conditions;
      if (c.quieto) { return; }
      if (c.amplio) { raiz.classList.add('rc-anim'); }
      portada(c.amplio);
      todos('section.rc-cap').forEach(function (cap) { capitulo(cap, c.amplio); });
      todos('section.rc-extra').forEach(extra);
      w.ScrollTrigger.refresh();
      return function () { raiz.classList.remove('rc-anim'); };
    });
  }

  /* ── Modo diapositivas ─────────────────────────────────────────────────────────────────────────────────────── */
  function avanzarSiPuede(dir) {
    if (animando) { return; }
    var m = momentos[actual];
    /* Una diapositiva más alta que la pantalla (el celular) se desplaza por dentro: solo en su borde se cambia. */
    if (m && m.scrollHeight > m.clientHeight + 4) {
      if (dir > 0 && m.scrollTop + m.clientHeight < m.scrollHeight - 4) { return; }
      if (dir < 0 && m.scrollTop > 4) { return; }
    }
    if (dir > 0) { siguiente(); } else { anterior(); }
  }

  function entrarDiapositiva(m) {
    if (!m) { return; }
    var cap = m.closest('.rc-cap');
    if (cap && m.getAttribute('data-momento') === 'como') {
      var mazo = m.querySelector('[data-rc-mazo]');
      if (gs && mazo && !reducido()) { gs.fromTo(mazo, { rotationX: 20, rotationY: -16, scale: 0.88 }, { rotationX: 0, rotationY: 0, scale: 1, duration: 1, ease: 'power3.out' }); }
      primerPaso(cap);
    }
    if (gs && !reducido() && m.closest('.rc-extra')) {
      gs.from(todos('[data-rc-revela]', m), { y: 24, opacity: 0, stagger: 0.04, duration: 0.5, ease: 'power2.out', clearProps: 'transform,opacity' });
    }
  }

  function mostrarDiapositiva(i, dir, instantaneo) {
    var de = momentos[actual], a = momentos[i];
    if (!a) { return; }
    if (de === a) { a.classList.add('rc-activa'); anunciar(i); if (instantaneo) { entrarDiapositiva(a); } return; }
    if (animando) { return; }
    var mismaEscena = escenaDe(de) === escenaDe(a);
    a.classList.add('rc-activa');
    a.scrollTop = 0;
    anunciar(i);
    var fin = function () {
      if (de) { de.classList.remove('rc-activa'); }
      if (gs) { gs.set([de, a].filter(Boolean), { clearProps: 'transform,opacity,transformOrigin' }); }
      animando = false;
      entrarDiapositiva(a);
      enfocar(a);
    };
    if (!gs || instantaneo || !de) { fin(); return; }
    animando = true;
    if (reducido()) { gs.fromTo(a, { opacity: 0 }, { opacity: 1, duration: 0.2, onComplete: fin }); return; }
    var tl = gs.timeline({ onComplete: fin });
    if (mismaEscena) {
      tl.to(de, { z: -420, opacity: 0, rotationY: -12 * dir, duration: 0.65, ease: 'power2.in' }, 0)
        .fromTo(a, { z: 420, opacity: 0, rotationY: 12 * dir }, { z: 0, opacity: 1, rotationY: 0, duration: 0.8, ease: 'power3.out' }, 0.22);
    } else {
      tl.to(de, { rotationY: -90 * dir, xPercent: -50 * dir, transformOrigin: dir > 0 ? '100% 50%' : '0% 50%', opacity: 0.25, duration: 0.9, ease: 'power2.inOut' }, 0)
        .fromTo(a, { rotationY: 90 * dir, xPercent: 50 * dir, transformOrigin: dir > 0 ? '0% 50%' : '100% 50%', opacity: 0.25 },
                   { rotationY: 0, xPercent: 0, opacity: 1, duration: 0.9, ease: 'power2.inOut' }, 0);
    }
  }

  function montarDiapositivas() {
    raiz.setAttribute('data-modo', 'diapositivas');
    d.documentElement.classList.add('rc-sin-scroll');
    momentos.forEach(function (m, i) { m.classList.toggle('rc-activa', i === actual); });
    if (gs && w.Observer) {
      /* Rueda y dedo; no el arrastre del ratón, que es para seleccionar texto. */
      observador = w.Observer.create({ target: escenas, type: 'wheel,touch', wheelSpeed: -1, tolerance: 12, preventDefault: false,
        onUp: function () { avanzarSiPuede(1); }, onDown: function () { avanzarSiPuede(-1); } });
    }
    progreso(momentos.length > 1 ? actual / (momentos.length - 1) : 0);
  }

  /* ── Modo mapa: todos los capítulos de un vistazo (el bloque lo escribe el generador; aquí solo se muestra) ── */
  function montarMapa() {
    raiz.setAttribute('data-modo', 'mapa');
    var mapa = raiz.querySelector('[data-rc-mapa]');
    if (mapa) {
      mapa.hidden = false;
      var cur = escenaDe(momentos[actual]);
      var t = cur && mapa.querySelector('[data-rc-ir="' + cur.id + '"]');
      w.scrollTo(0, 0);
      (t || mapa).focus({ preventScroll: true });
      if (gs && !reducido()) {
        gs.fromTo(todos('.rc-mapa-tarjeta', mapa), { opacity: 0, y: 30, rotationX: -14 },
                  { opacity: 1, y: 0, rotationX: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' });
      }
    }
    var a = raiz.querySelector('[data-rc-actual]');
    if (a) { a.textContent = 'Mapa'; }
  }

  /* ── Cambiar de modo, conservando dónde se estaba ──────────────────────────────────────────────────────────── */
  function desmontar() {
    if (mm) { mm.revert(); mm = null; }
    if (observador) { observador.kill(); observador = null; }
    if (vigia) { vigia.disconnect(); vigia = null; }
    limpiezas.forEach(function (f) { f(); });
    limpiezas = [];
    momentos.forEach(function (m) { m.classList.remove('rc-activa'); m.style.transform = ''; m.style.opacity = ''; });
    var mapa = raiz.querySelector('[data-rc-mapa]');
    if (mapa) { mapa.hidden = true; }
    raiz.classList.remove('rc-anim');
    d.documentElement.classList.remove('rc-sin-scroll');
  }

  function pintarModo() {
    todos('[data-rc-modo-btn]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-rc-modo-btn') === modo ? 'true' : 'false'); });
  }

  function montar() {
    if (modo === 'mapa') { montarMapa(); } else if (modo === 'diapositivas') { montarDiapositivas(); } else { montarEscenas(); }
  }

  function cambiarModo(nuevo, hacia) {
    nuevo = (nuevo === 'diapositivas' || nuevo === 'mapa') ? nuevo : 'escenas';
    if (nuevo === modo) { return; }
    var i = actual, j = hacia ? indiceDe(hacia) : -1;
    if (j >= 0) { i = j; }
    if (modo !== 'mapa') { previo = modo; }
    desmontar();
    modo = nuevo;
    if (modo !== 'mapa') { poner(MODO, modo); }   // el mapa es para consultar, no para seguir: no se recuerda
    pintarModo();
    montar();
    if (modo !== 'mapa') {
      ir(i, true);
      if (modo === 'diapositivas') { entrarDiapositiva(momentos[i]); }
    }
    if (w.history && w.history.replaceState) {
      var u = new URL(w.location.href);
      if (modo === 'escenas') { u.searchParams.delete('modo'); } else { u.searchParams.set('modo', modo); }
      w.history.replaceState(w.history.state, '', u);
    }
  }

  /* ── El índice y la pantalla completa ──────────────────────────────────────────────────────────────────────── */
  function abrirIndice() {
    var dlg = d.getElementById('rc-indice');
    if (!dlg || typeof dlg.showModal !== 'function' || dlg.open) { return; }
    dlg.showModal();
    if (gs && !reducido()) {
      gs.fromTo(todos('.rc-tarjeta', dlg), { opacity: 0, y: 30, rotationX: -18 },
                { opacity: 1, y: 0, rotationX: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' });
    }
    var cur = dlg.querySelector('[aria-current]');
    if (cur) { cur.scrollIntoView({ block: 'nearest' }); }
  }

  function pantallaCompleta() {
    var fs = d.fullscreenElement || d.webkitFullscreenElement, el = d.documentElement;
    try {
      if (fs) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
      else if (el.requestFullscreen) { el.requestFullscreen().catch(function () {}); }
      else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); }
    } catch (e) { /* el navegador no la ofrece: no pasa nada */ }
  }

  /* ── Eventos (todos por delegación: la CSP no admite `onclick`) ────────────────────────────────────────────── */
  d.addEventListener('click', function (ev) {
    if (!raiz) { return; }
    var t = ev.target, a;
    if ((a = t.closest('[data-rc-ir]')) && raiz.contains(a)) {
      ev.preventDefault();
      var destino = a.getAttribute('data-rc-ir'), dlg = a.closest('dialog');
      if (dlg && dlg.open) { dlg.close(); }
      irA(destino);
      return;
    }
    if (t.closest('[data-rc-indice-abrir]')) { abrirIndice(); return; }
    if (t.closest('[data-rc-cerrar]')) { var c = t.closest('dialog'); if (c) { c.close(); } return; }
    if ((a = t.closest('[data-rc-modo-btn]'))) {
      var pedido = a.getAttribute('data-rc-modo-btn');
      cambiarModo(pedido === modo && modo === 'mapa' ? previo : pedido);
      return;
    }
    if (t.closest('[data-rc-pantalla]')) { pantallaCompleta(); return; }
    if (t.closest('[data-rc-anterior]')) { anterior(); return; }
    if (t.closest('[data-rc-siguiente]')) { siguiente(); return; }
    if ((a = t.closest('[data-rc-paso]'))) { pasoManual = Date.now(); activarPaso(a.closest('.rc-cap'), a.getAttribute('data-rc-paso')); return; }
    if ((a = t.closest('[data-rc-continuar]'))) {
      ev.preventDefault();
      var p = posicionGuardada();
      if (p) { irA(p.id); }
    }
  });

  /* Un clic en el fondo del índice (fuera de la caja) lo cierra; Escape lo cierra el navegador. */
  d.addEventListener('click', function (ev) {
    var dlg = ev.target;
    if (!dlg || dlg.tagName !== 'DIALOG' || !dlg.open) { return; }
    var r = dlg.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) { dlg.close(); }
  });

  d.addEventListener('fullscreenchange', function () {
    var b = raiz && raiz.querySelector('[data-rc-pantalla]');
    if (b) { b.setAttribute('aria-pressed', d.fullscreenElement ? 'true' : 'false'); }
  });

  d.addEventListener('keydown', function (ev) {
    if (!raiz || ev.ctrlKey || ev.metaKey || ev.altKey || escribiendo(ev.target)) { return; }
    if (d.querySelector('dialog[open]')) { return; }
    var k = ev.key, diapo = modo === 'diapositivas', enMapa = modo === 'mapa';
    if (k === 'm' || k === 'M') { ev.preventDefault(); cambiarModo(enMapa ? previo : 'mapa'); return; }
    if (k === ' ' && ev.target.closest && ev.target.closest('button, a')) { return; }
    if (!enMapa && (k === 'ArrowRight' || k === 'PageDown' || (diapo && (k === 'ArrowDown' || k === ' ')))) { ev.preventDefault(); siguiente(); }
    else if (!enMapa && (k === 'ArrowLeft' || k === 'PageUp' || (diapo && k === 'ArrowUp'))) { ev.preventDefault(); anterior(); }
    else if (diapo && k === 'Home') { ev.preventDefault(); ir(0); }
    else if (diapo && k === 'End') { ev.preventDefault(); ir(momentos.length - 1); }
    else if (k === 'i' || k === 'I') { ev.preventDefault(); abrirIndice(); }
    else if (k === 'd' || k === 'D') { ev.preventDefault(); cambiarModo(diapo ? 'escenas' : 'diapositivas'); }
    else if (k === 'f' || k === 'F') { ev.preventDefault(); pantallaCompleta(); }
  });

  /* «Seguridad comprobada» quita su escena si no hay mediciones publicables: se vuelven a contar los momentos. */
  d.addEventListener('rc:recalcular', function () {
    if (!raiz) { return; }
    var id = (escenaDe(momentos[actual]) || {}).id;
    medir();
    if (vigia) { vigia.disconnect(); vigia = null; if (modo === 'escenas') { vigilar(); } }
    var i = indiceDe(id);
    actual = i >= 0 ? i : Math.min(actual, momentos.length - 1);
    if (w.ScrollTrigger) { w.ScrollTrigger.refresh(); }
  });

  /* ── Arranque ──────────────────────────────────────────────────────────────────────────────────────────────── */
  function arrancar() {
    raiz = d.querySelector('[data-rc]');
    if (!raiz) { return; }
    CLAVE = (raiz.getAttribute('data-rc-clave') || 'rc').replace(/[^a-z0-9-]/g, '');
    POSICION = CLAVE + '-recorrido-posicion';
    MODO = CLAVE + '-recorrido-modo';
    escenas = raiz.querySelector('[data-rc-escenas]');
    medir();
    gs = w.gsap || null;
    if (gs) {
      [w.ScrollTrigger, w.ScrollToPlugin, w.Observer, w.SplitText].forEach(function (p) { if (p) { gs.registerPlugin(p); } });
      if (w.ScrollTrigger) { w.ScrollTrigger.config({ ignoreMobileResize: true }); }
    }
    /* `rc-sin-js` deja quieto y visible lo que GSAP haría entrar; se quita solo si de verdad va a animarse. */
    if (gs && w.ScrollTrigger && !reducido()) { d.documentElement.classList.remove('rc-sin-js'); }
    var u = new URL(w.location.href);
    var pm = u.searchParams.get('modo');
    modo = (pm === 'diapositivas' || pm === 'escenas' || pm === 'mapa') ? pm : (leer(MODO) === 'diapositivas' ? 'diapositivas' : 'escenas');
    previo = modo === 'mapa' ? 'escenas' : modo;
    pintarModo();

    var destino = w.location.hash ? indiceDe(w.location.hash.slice(1)) : -1;
    actual = destino >= 0 ? destino : 0;
    todos('section.rc-cap').forEach(primerPaso);
    montar();

    var guardada = posicionGuardada(), seguir = raiz.querySelector('[data-rc-continuar]');
    if (seguir && guardada && guardada.id !== 'inicio' && indiceDe(guardada.id) > 0 && destino < 0) {
      seguir.hidden = false;
      seguir.setAttribute('href', '#' + guardada.id);
    }
    if (modo !== 'mapa') {
      if (destino >= 0) { ir(destino, true); } else { anunciar(actual); }
      if (modo === 'diapositivas') { entrarDiapositiva(momentos[actual]); }
    }
    /* Las imágenes cambian el alto de lo que miden los disparadores: se vuelve a medir al terminar de cargar. */
    w.addEventListener('load', function () {
      if (w.ScrollTrigger) { w.ScrollTrigger.refresh(); }
      if (destino >= 0 && modo === 'escenas') { ir(destino, true); }
    });
    raiz.setAttribute('data-rc-listo', '1');
  }
  if (d.readyState === 'loading') { d.addEventListener('DOMContentLoaded', arrancar); } else { arrancar(); }

  w.RC = w.RC || {};
  w.RC.recorrido = { modo: function () { return modo; }, cambiarModo: cambiarModo, reducido: reducido };
})(window, document);
