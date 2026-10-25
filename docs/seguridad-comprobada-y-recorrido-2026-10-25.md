# «Seguridad comprobada» y recorrido inmersivo (25-oct-2026)

PhotoClone entra en la primera oleada del **kit «confianza y recorrido»** (`Configuraciones_Equipos/VPS_Ubuntu_Hostinger/
38-confianza-y-recorrido/`), el mismo trabajo del piloto (Cédula 360, Enki, Cartera360, PixelCV y Visores). Aquí va la
**copia** del kit: no se edita en este repo; se edita el kit y se vuelve a sincronizar.

## Qué se añadió

| Pieza | Dónde |
|---|---|
| Recorrido inmersivo: 7 capítulos (subir, separar, editar con texto, retocar, exportar, privacidad, API) en escenas, diapositivas y mapa | `public/conozca/` → **https://photoshop.cedula360.tech/conozca/** |
| Contenido (una sola fuente) | `conozca.json` (trato de **usted**, como la portada; colores y tipografía del Manual de Marca v1.0: Noche, Panel, Azul Señal, Inter) |
| Kit (motor, estilos, GSAP 3.15.0 local) | `public/kit-confianza/` (`KIT_VERSION`, `SHA256SUMS`) |
| Tipografía para páginas fuera de Next | `public/fnt/photoclone.css` (usa `/marca/fuentes/inter-var.woff2`, que ya genera el manual: sin copias) |
| «Seguridad comprobada» en la portada | `src/components/portada/SeguridadComprobada.tsx` (antes de las preguntas), colores del manual en `.pc-sc` (`portada.css`) |
| Entradas al recorrido | portada («Ver el recorrido completo» tras «Cómo funciona», que **se conserva**), pie («Recorrido», «Seguridad comprobada»), `/login` («¿Primera vez aquí?») y la ayuda del editor (menú **Ayuda → Recorrido del producto** y el diálogo «Documentación», en otra pestaña para no perder el trabajo) |

### Contenido del recorrido

- Cada afirmación sale del código o de lo que ya publica la portada (que el audit del manual contrasta con el código):
  `constants/tools.ts`, `constants/blendModes.ts`, `lib/ai/replicate.ts` (2 a 10 capas, 4 por defecto),
  `lib/export/`, `api/layers/*` (la IA exige sesión desde el 11-oct) y `lib/api/keys.ts` (alcances).
- 🔴 **Sin cifras que cambien solas**: no se escribe el número de herramientas ni de modos de fusión (la portada los
  calcula de `TOOL_ORDER` y `BLEND_MODES`); se nombran.
- Las figuras son los **pósters de «Cómo funciona»** (`public/portada/pc-parada-*.svg`, ilustraciones del manual, sin
  personas). Dos capítulos van sin figura. Ninguna captura del editor ni del panel.

### Corrección de contenido de la portada

La pregunta «¿Necesito una cuenta?» decía que la cuenta «solo hace falta para administrar». Desde el 11-oct la IA exige
sesión (`api/layers/*` responde 401 sin cuenta): ahora lo dice («Para el editor, no… Para separar o editar con IA, sí»).

### Cómo se sirve `/conozca/`

`/conozca/` es HTML estático del kit, fuera del enrutador de Next. Lo sirve **Caddy**, en el bloque de
`photoshop.cedula360.tech`:

- `/conozca` → 308 a `/conozca/`;
- `/conozca/*` → `file_server` sobre `/root/Clon_Photoshop/public` con una **CSP estricta propia** (`script-src 'self';
  style-src 'self'`, sin `'unsafe-inline'`);
- la CSP de la aplicación pasa del bloque `header {}` a un `header @csp_app` con `not path /conozca/*` (misma política).

Los enlaces a `/conozca/` son `<a href>` normales, no `<Link>`.

### Reglas

- 🔴 **Ninguna cifra a mano** en «Seguridad comprobada»: la sección lee `/salud-publica/publico.json` (lo escribe
  `/root/scripts/salud-publica-ronda.sh` con solo lo publicable). Sin nada publicable, la sección se quita sola.
- El `<Script>` del kit va **fuera** de la `<section>`: el kit puede quitar la sección del DOM.
- Regenerar: `node <kit>/generar-conozca.mjs conozca.json` (`--comprobar` dice si está al día) y
  `bash <kit>/../scripts/sincronizar-kit.sh public`.

## Medición y correcciones

| Herramienta | Antes (25-oct, 00:22 UTC) | Corrección | Después |
|---|---|---|---|
| Mozilla Observatory | B+ (80/100), 11 de 12 | El −20 de la CSP con `'unsafe-inline'` sigue (pendiente) | B+ (80/100): COOP ya cuenta, pero Observatory solo suma bonificaciones con la base ≥ 90; no se publica |
| W3C | 1 error | El `<pre aria-label>` del ejemplo de la API lleva `role="region"` | **0 errores y 0 avisos: se publica** |
| WAVE | 0 errores | — | **0 errores y 0 de contraste: se publica** (ya lo era) |
| securityheaders | A | — (la misma CSP) | A: no se publica (umbral A+) |
| websec-100 (`check-headers.sh`) | 6/8: faltaban COOP y CORP | Caddy: `Cross-Origin-Opener-Policy: same-origin-allow-popups` (no corta ventanas que abra el acceso) y `Cross-Origin-Resource-Policy: cross-origin` | 8/8 |
| `security.txt` | contacto genérico `info@alexanderoviedofadul.dev` | Caddy: `import security-txt info@cedula360.tech` (el contacto que publica el pie) | `Contact: mailto:info@cedula360.tech`, RFC 9116 |
| axe-core (a11y-100) | portada y `/login`: 0 | — | 0 (portada, `/login` y el recorrido) |
| react-doctor | 38 | — | 38 |

Medición «después»: `salud-publica-ronda.sh --solo=observatorio,w3c,wave,securityheaders` del 25-oct (00:54-01:05 UTC),
tras el despliegue y el cambio de Caddy. PageSpeed y SSL Labs los añade la ronda nocturna (`/etc/salud-publica/sitios.conf`).

## Pendiente

- **CSP sin `'unsafe-inline'`**: Next 15 necesita *nonce* por petición; Observatory y securityheaders no llegan a A+
  hasta entonces.
- **El secreto del webhook está escrito en `/root/scripts/webhook-clon-photoshop.js`** (644, fuera del repo): debería ir a
  `/etc/webhooks/clon-photoshop-webhook.env` (600) como el resto de webhooks del VPS, con rotación en GitHub (decisión
  del operador: cuentas y claves).
- `/login` tutea («Inicia sesión para gestionar tu cuenta») y la portada trata de usted.
- El diálogo «Documentación» del editor enlaza el README de GitHub.

## Pruebas

- `<kit>/pruebas/e2e-conozca.mjs` contra una vista previa (`next start` en loopback + Caddy aislado con la CSP estricta
  en `/conozca/` y la de producción en el resto): arranque sin errores de consola ni de CSP, axe WCAG 2.2 A/AA 0
  violaciones (estado final, índice, mapa, 390 px), teclado, «reducir movimiento», sin JavaScript, almacenamiento
  bloqueado, 390/360/320 px sin desplazamiento horizontal y la sección de la portada. Revisión visual de las capturas.
  `/editor` sin errores de consola.
- W3C de la vista previa (portada, `/login` y `/conozca/`): 0 errores y 0 avisos.
- `npx tsc --noEmit`: 0 errores · `audit_v1.py` del manual: 0 fallos (el proyecto no tiene pruebas automáticas).
