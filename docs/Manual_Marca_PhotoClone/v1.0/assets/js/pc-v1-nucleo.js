/* ═══════════════════════════════════════════════════════════════════════════
   PhotoClone · Manual de Marca v1.0 — Núcleo del recorrido inmersivo
   Copiado del Manual Isabella EA v2.0 (Maloca v2.0 → ENKI v2.0 → KANSA v6.0); sin banda sonora:
   · Atajos SOLO sin Cmd/Ctrl/Alt y fuera de campos/botones (v5 secuestraba
     Cmd+F, Cmd+P…). Espacio nunca se intercepta: el scroll es nativo.
   · Índice como diálogo: trampa de foco, inert en el resto, Esc, devuelve foco.
   · textContent en todo lo que pinta datos; nada de innerHTML dinámico.
   · Un solo reloj de animación (PC.bucle sobre el ticker de GSAP).
   · El scroller es #k6-viewport (necesario para el paralaje CSS): ScrollTrigger
     y ScrollToPlugin se configuran contra él.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (w, d) {
  'use strict';
  var K = w.PC = w.PC || {};
  var V6 = w.PC_V1 = { listo: false, version: '1.0.0' };
  var raiz = d.documentElement;
  var vista = d.getElementById('k6-viewport');
  var reducido = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var escenas = Array.prototype.slice.call(d.querySelectorAll('.escena'));
  var toastT = null;

  function qs(s, c) { return (c || d).querySelector(s); }
  function qsa(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  function aviso(txt) {
    var t = qs('.toast');
    t.textContent = txt; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 2200);
  }

  /* ── Navegación ───────────────────────────────────────────────────────── */
  function ir(id) {
    var destino = d.getElementById(id);
    if (!destino) { return; }
    if (w.gsap && w.ScrollToPlugin && !reducido) {
      w.gsap.to(vista, { duration: 0.9, ease: 'power2.inOut', scrollTo: { y: destino, offsetY: 0 } });
    } else {
      vista.scrollTop = destino.offsetTop;
    }
    var foco = destino.querySelector('h2, [data-titulo]');
    if (foco) { foco.setAttribute('tabindex', '-1'); setTimeout(function () { foco.focus({ preventScroll: true }); }, reducido ? 0 : 950); }
  }

  function indiceActual() {
    var y = vista.scrollTop + vista.clientHeight * 0.35, idx = 0;
    escenas.forEach(function (e, i) { if (e.offsetTop <= y) { idx = i; } });
    return idx;
  }

  function marcarEscena() {
    var e = escenas[indiceActual()];
    if (!e) { return; }
    qs('[data-escena-num]').textContent = e.dataset.escena;
    qs('[data-escena-tit]').textContent = e.dataset.tituloEscena;
    qsa('.rail a').forEach(function (a) {
      if (a.dataset.ir === e.id) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
    });
    if (w.history && w.history.replaceState && location.hash !== '#' + e.id) {
      try { w.history.replaceState(null, '', '#' + e.id); } catch (err) { /* file:// en algunos navegadores */ }
    }
  }

  function progreso() {
    var max = vista.scrollHeight - vista.clientHeight;
    qs('[data-progreso]').style.width = (max > 0 ? (vista.scrollTop / max) * 100 : 0) + '%';
  }

  var pendiente = false;
  vista.addEventListener('scroll', function () {
    if (pendiente) { return; }
    pendiente = true;
    setTimeout(function () { pendiente = false; progreso(); marcarEscena(); }, 80);
  }, { passive: true });

  d.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ir], .indice a[href^="#cap-"]');
    if (!a) { return; }
    e.preventDefault();
    var id = a.dataset.ir || a.getAttribute('href').slice(1);
    cerrarIndice();
    ir(id);
  });

  /* ── Índice (diálogo modal accesible) ─────────────────────────────────── */
  var modal = d.getElementById('indice');
  var devolver = null;
  var fondo = [qs('.cab'), qs('.rail'), vista];

  function abrirIndice() {
    if (!modal.hidden) { return; }
    devolver = d.activeElement;
    modal.hidden = false;
    fondo.forEach(function (n) { if (n) { n.inert = true; n.setAttribute('aria-hidden', 'true'); } });
    var primero = modal.querySelector('a, button');
    if (primero) { primero.focus(); }
  }

  function cerrarIndice() {
    if (modal.hidden) { return; }
    modal.hidden = true;
    fondo.forEach(function (n) { if (n) { n.inert = false; n.removeAttribute('aria-hidden'); } });
    if (devolver && devolver.focus) { devolver.focus(); }
  }

  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') { return; }
    var f = qsa('a[href], button:not([disabled])', modal);
    var i = f.indexOf(d.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) { cerrarIndice(); } });
  qsa('[data-abrir-indice]').forEach(function (b) { b.addEventListener('click', abrirIndice); });
  qsa('[data-cerrar-indice]').forEach(function (b) { b.addEventListener('click', cerrarIndice); });

  /* ── Copiar tokens de color ───────────────────────────────────────────── */
  qsa('[data-copiar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.copiar;
      var hecho = function () { aviso('Copiado ' + v); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(hecho, function () { aviso(v); });
      } else { aviso(v); }
    });
  });

  /* ── Teclado ──────────────────────────────────────────────────────────── */
  d.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    if (e.key === 'Escape') { cerrarIndice(); return; }
    var t = e.target;
    if (t.closest && t.closest('input, textarea, select, [contenteditable], button, a, [role="button"]') && e.key !== 'Escape') {
      if (e.key.length !== 1) { return; }
    }
    if (!modal.hidden) { return; }
    var k = e.key.toLowerCase();
    if (k === 'i') { e.preventDefault(); abrirIndice(); }
    else if (k === 'j' || k === 'k') {
      e.preventDefault();
      var i = indiceActual() + (k === 'j' ? 1 : -1);
      if (escenas[i]) { ir(escenas[i].id); }
    }
  });

  /* ── Animación (GSAP) ─────────────────────────────────────────────────── */
  function animar() {
    if (reducido || !w.gsap || !w.ScrollTrigger) { return; }
    w.gsap.registerPlugin(w.ScrollTrigger, w.ScrollToPlugin);
    if (w.SplitText) { w.gsap.registerPlugin(w.SplitText); }
    w.ScrollTrigger.defaults({ scroller: vista });
    raiz.classList.add('anim');
    w.ScrollTrigger.batch('[data-revelar]', {
      start: 'top 92%',
      once: true,
      onEnter: function (lote) {
        w.gsap.to(lote, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.06, overwrite: true });
      }
    });
    qsa('[data-titulo]').forEach(function (h) {
      if (!w.SplitText) { return; }
      var s = new w.SplitText(h, { type: 'lines', mask: 'lines' });
      w.gsap.from(s.lines, {
        yPercent: 105, duration: 0.9, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: h, start: 'top 85%', once: true }
      });
    });
    w.addEventListener('load', function () { w.ScrollTrigger.refresh(); });
  }

  /* ── Arranque ─────────────────────────────────────────────────────────── */
  function iniciar() {
    animar();
    if (K.escaneo) { K.escaneo.iniciar(); }
    if (!raiz.dataset.escaneo) { raiz.dataset.escaneo = 'estatico'; }
    var h = location.hash.slice(1);
    if (h && d.getElementById(h)) { vista.scrollTop = d.getElementById(h).offsetTop; }
    progreso(); marcarEscena();
    V6.listo = true;
  }

  if (d.readyState === 'loading') { d.addEventListener('DOMContentLoaded', iniciar); } else { iniciar(); }
})(window, document);
