<!DOCTYPE html>
<!-- GENERADO por scripts/build_v1.py desde contenido/ + plantillas/ + assets/ — no editar a mano. -->
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>PhotoClone · Manual de Marca v{{VERSION}}</title>
<meta name="description" content="Manual de Marca PhotoClone v1.0 «Una imagen, todas sus capas»: origen, producto, símbolo, color, tipografía, interfaces, aplicaciones, tono, web y gobernanza, con cada afirmación respaldada por su fuente.">
<link rel="icon" href="assets/logos/pc-simbolo.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/css/pc-v1-base.css">
<link rel="stylesheet" href="assets/css/pc-v1-inmersivo.css">
</head>
<body class="modo-inmersivo">
<a class="saltar" href="#principal">Saltar al contenido</a>

<header class="cab" role="banner">
  <a class="cab-marca" href="#cap-portada" data-ir="cap-portada" aria-label="PhotoClone, volver a la portada">
    <span class="cab-iso" aria-hidden="true">{{ISOTIPO_CAB}}</span>
    <span class="cab-txt">Photo<i>Clone</i> <small>Manual de Marca v1.0</small></span>
  </a>
  <p class="cab-escena" aria-live="polite"><span data-escena-num>00</span> · <span data-escena-tit>Portada</span></p>
  <nav class="cab-acciones" aria-label="Acciones">
    <button type="button" class="btn-cab" data-abrir-indice aria-haspopup="dialog" aria-controls="indice">Índice <kbd>I</kbd></button>
    <a class="btn-cab" href="impresion.html" target="_blank" rel="noopener">PDF</a>
  </nav>
  <div class="progreso" aria-hidden="true"><span data-progreso></span></div>
</header>

<nav class="rail" aria-label="Capítulos">
  <ol>{{NAV}}</ol>
</nav>

<div class="indice-modal" id="indice" role="dialog" aria-modal="true" aria-labelledby="indice-tit" hidden>
  <div class="indice-caja">
    <div class="indice-cab">
      <h2 id="indice-tit">Índice</h2>
      <button type="button" class="btn-cab" data-cerrar-indice aria-label="Cerrar índice">Cerrar <kbd>Esc</kbd></button>
    </div>
    <ol class="indice-lista">{{NAV}}</ol>
    <p class="indice-ayuda muted">Atajos: <kbd>I</kbd> índice · <kbd>J</kbd>/<kbd>K</kbd> capítulo siguiente o anterior · <kbd>Esc</kbd> cerrar. Ninguno actúa con Cmd, Ctrl o Alt.</p>
  </div>
</div>

<div class="viewport" id="k6-viewport">
  <main id="principal" tabindex="-1">
{{ESCENAS}}
  </main>
  <footer class="pie-inmersivo">
    <p>PhotoClone · Manual de Marca v{{VERSION}} · {{TOTAL}} páginas en el PDF · Generado desde una sola fuente.</p>
  </footer>
</div>

<div class="toast" role="status" aria-live="polite" hidden></div>

{{SCRIPTS}}
</body>
</html>
