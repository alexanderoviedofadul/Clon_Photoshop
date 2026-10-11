/* AuditorTecnicoIA · Manual de Marca v1.0 — Bucle de animación ÚNICO (copiado de Isabella EA v2.0 ← Maloca v2.0 ← KANSA v6.0).
   En v5 dos requestAnimationFrame pintaban el mismo lienzo. Aquí todo lo que
   anima por fotograma se suscribe a un solo reloj: el ticker de GSAP (que ya
   existe por ScrollTrigger), o un rAF propio si GSAP no está. El reloj se
   duerme cuando no hay suscriptores activos o la pestaña está oculta. */
(function (w, d) {
  'use strict';
  var K = w.PC = w.PC || {};
  var subs = {};
  var corriendo = false;
  var rafId = null;

  function activos() {
    for (var k in subs) { if (subs[k].activo) { return true; } }
    return false;
  }

  function tick(t) {
    var ms = typeof t === 'number' ? t * (w.gsap ? 1000 : 1) : performance.now();
    for (var k in subs) { if (subs[k].activo) { subs[k].fn(ms); } }
  }

  function rafLoop(t) { tick(t); rafId = w.requestAnimationFrame(rafLoop); }

  function arrancar() {
    if (corriendo || d.hidden || !activos()) { return; }
    corriendo = true;
    if (w.gsap) { w.gsap.ticker.add(tick); } else { rafId = w.requestAnimationFrame(rafLoop); }
  }

  function parar() {
    if (!corriendo) { return; }
    corriendo = false;
    if (w.gsap) { w.gsap.ticker.remove(tick); } else if (rafId) { w.cancelAnimationFrame(rafId); rafId = null; }
  }

  function revisar() { if (activos() && !d.hidden) { arrancar(); } else { parar(); } }

  K.bucle = {
    registrar: function (id, fn) { subs[id] = { fn: fn, activo: false }; },
    activar: function (id, si) { if (subs[id]) { subs[id].activo = !!si; revisar(); } },
    corriendo: function () { return corriendo; }
  };
  d.addEventListener('visibilitychange', revisar);
})(window, document);
