/* PhotoClone · Manual de Marca v1.0 — «Capas vivas»: la metáfora de la marca en movimiento.
   Lienzo 2D (sin librerías): una imagen plana a la izquierda y, a la derecha, sus tres capas (FONDO, FIGURA y
   TEXTO) que se levantan, se separan en pila sobre el damero de la transparencia, se sostienen y vuelven a
   juntarse. Un ciclo dura 6 s. Usa el bucle ÚNICO (PC.bucle) y solo corre mientras se ve. Movimiento reducido o
   sin lienzo → html[data-escaneo="estatico"] y queda el respaldo SVG del build.
   El lienzo es decorativo: aria-hidden y sin eventos propios. No representa una separación real. */
(function (w, d) {
  'use strict';
  var K = w.PC = w.PC || {};
  var raiz = d.documentElement;
  var NOCHE = '#121212', DAMERO_A = '#2A2D2E', DAMERO_B = '#333336';
  var CIELO_A = '#005A9E', CIELO_B = '#38BDF8', COLINA_A = '#34D399', COLINA_B = '#0D9488';
  var FIGURA = '#4F46E5', TEXTO = '#FBBF24', TINTA = '#18181B', LINEA = '#454545';
  var BORDES = { fondo: '#0D9488', figura: '#4F46E5', texto: '#FBBF24' };
  var CICLO = 6000;

  function estatico(motivo) { raiz.dataset.escaneo = 'estatico'; raiz.dataset.escaneoMotivo = motivo; }

  function suave(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

  function montar(lienzo, id) {
    var ctx = lienzo.getContext('2d');
    if (!ctx) { return false; }
    var ancho = 0, alto = 0, dpr = Math.min(w.devicePixelRatio || 1, 2);
    function medir() {
      var r = lienzo.getBoundingClientRect();
      ancho = r.width; alto = r.height;
      lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function caja(x, y, wd, h, rad) {
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x, y, wd, h, rad); } else { ctx.rect(x, y, wd, h); }
    }
    /* Las partes de la imagen en un marco de wd × h con origen en 0,0 (mismo dibujo que el build). */
    function parte(nombre, wd, h) {
      var g;
      if (nombre === 'fondo') {
        g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, CIELO_A); g.addColorStop(1, CIELO_B);
        ctx.fillStyle = g; ctx.fillRect(0, 0, wd, h);
        g = ctx.createLinearGradient(0, h * 0.5, 0, h); g.addColorStop(0, COLINA_A); g.addColorStop(1, COLINA_B);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, h * 0.62);
        ctx.bezierCurveTo(wd * 0.22, h * 0.48, wd * 0.38, h * 0.7, wd * 0.6, h * 0.58);
        ctx.bezierCurveTo(wd * 0.8, h * 0.5, wd * 0.9, h * 0.5, wd, h * 0.6);
        ctx.lineTo(wd, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      } else if (nombre === 'figura') {
        g = ctx.createLinearGradient(wd * 0.5, h * 0.2, wd * 0.8, h * 0.6); g.addColorStop(0, CIELO_B); g.addColorStop(1, FIGURA);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wd * 0.64, h * 0.42, h * 0.2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = TEXTO; caja(wd * 0.07, h * 0.09, wd * 0.36, h * 0.16, h * 0.03); ctx.fill();
        ctx.fillStyle = 'rgba(24, 24, 27, .7)'; ctx.fillRect(wd * 0.1, h * 0.14, wd * 0.22, h * 0.025);
        ctx.fillStyle = 'rgba(24, 24, 27, .45)'; ctx.fillRect(wd * 0.1, h * 0.185, wd * 0.15, h * 0.025);
      }
    }
    function damero(wd, h, celda) {
      ctx.fillStyle = DAMERO_A; ctx.fillRect(0, 0, wd, h);
      ctx.fillStyle = DAMERO_B;
      for (var y = 0; y < h; y += celda) {
        for (var x = ((y / celda) % 2) * celda; x < wd; x += celda * 2) { ctx.fillRect(x, y, celda, celda); }
      }
    }
    function pintar(ms) {
      ctx.fillStyle = NOCHE; ctx.fillRect(0, 0, ancho, alto);
      /* Imagen plana a la izquierda */
      var pw = ancho * 0.32, ph = pw * 0.68, px = ancho * 0.06, py = (alto - ph) / 2;
      ctx.save(); caja(px, py, pw, ph, 6); ctx.clip(); ctx.translate(px, py);
      parte('fondo', pw, ph); parte('figura', pw, ph); parte('texto', pw, ph); ctx.restore();
      ctx.strokeStyle = LINEA; ctx.lineWidth = 1.5; caja(px, py, pw, ph, 6); ctx.stroke();
      /* Las capas: suben 0-1,8 s, se sostienen hasta 4,2 s y bajan hasta 6 s */
      var t = ms % CICLO, s = t < 1800 ? suave(t / 1800) : t < 4200 ? 1 : 1 - suave((t - 4200) / 1800);
      var cw = ancho * 0.42, ch = cw * 0.62, cx = ancho * 0.5, base = alto * 0.62;
      ['fondo', 'figura', 'texto'].forEach(function (nombre, i) {
        var y = base - i * s * alto * 0.2;
        ctx.save();
        ctx.translate(cx + i * s * ancho * 0.03, y);
        ctx.transform(1, -0.18, 0.62, 0.46, 0, 0);
        caja(0, 0, cw, ch, 8); ctx.save(); ctx.clip();
        if (nombre !== 'fondo') { damero(cw, ch, Math.max(6, cw / 24)); }
        parte(nombre, cw, ch); ctx.restore();
        ctx.strokeStyle = BORDES[nombre]; ctx.lineWidth = 2.5; caja(0, 0, cw, ch, 8); ctx.stroke();
        ctx.restore();
      });
      ctx.fillStyle = TINTA;
    }
    medir();
    w.addEventListener('resize', medir);
    K.bucle.registrar(id, pintar);
    if ('IntersectionObserver' in w) {
      new IntersectionObserver(function (es) { es.forEach(function (en) { K.bucle.activar(id, en.isIntersecting); }); }).observe(lienzo);
    } else { K.bucle.activar(id, true); }
    return true;
  }

  K.escaneo = {
    iniciar: function () {
      if (w.matchMedia('(prefers-reduced-motion: reduce)').matches) { return estatico('movimiento-reducido'); }
      if (!K.bucle) { return estatico('sin-bucle'); }
      var lienzos = d.querySelectorAll('canvas.escaneo-gl'), n = 0;
      Array.prototype.forEach.call(lienzos, function (c, i) { if (montar(c, 'escaneo-' + i)) { n++; } });
      if (n) { raiz.dataset.escaneo = 'animado'; } else { estatico('sin-lienzo'); }
    }
  };
})(window, document);
