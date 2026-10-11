<!DOCTYPE html>
<!-- GENERADO por scripts/build_v1.py — no editar a mano. Fuente del PDF (export_pdf_v1.py). -->
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PhotoClone · Manual de Marca v{{VERSION}} · Impresión</title>
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/css/pc-v1-base.css">
<link rel="stylesheet" href="assets/css/pc-v1-impresion.css">
</head>
<body class="modo-impresion">
<main class="paginas" data-total="{{TOTAL}}">
{{PAGINAS}}
</main>
<script>
  /* Señal para export_pdf_v1.py y audit_v1.py: fuentes cargadas, imágenes decodificadas y maquetación estable. */
  /* En papel no hay pantalla que desplazar: las imágenes «lazy» no cargarían nunca. */
  Array.prototype.forEach.call(document.images, function (i) { i.loading = 'eager'; });
  Promise.all([
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
    Promise.all(Array.prototype.map.call(document.images, function (i) { return i.decode ? i.decode().catch(function () {}) : Promise.resolve(); }))
  ]).then(function () {
    requestAnimationFrame(function () { requestAnimationFrame(function () { window.PC_LISTO = true; }); });
  });
</script>
</body>
</html>
