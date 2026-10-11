# Rediseño de PhotoClone — octubre de 2026

Manual de Marca v1.0, portada inmersiva y la marca en acceso, panel y editor. Hecho el 11-oct-2026 dentro de la
actualización de los proyectos del VPS con el kit v6.0 de KANSA (vía el Manual DeepMap v1.0).

## 1. Qué había

- **Sin logotipo**: el icono `layers` de Material Symbols en `#0078D4` junto a «PhotoClone AI» en texto.
- **Título «Photoshop Clone - Editor de Imágenes con IA»** (`src/app/layout.tsx`) y «herramientas tipo Photoshop» en
  la portada: Photoshop es una marca registrada de Adobe.
- **Afirmaciones sin respaldo**: «16 modos de fusión» (el editor tiene **6**, `constants/blendModes.ts`), «100% en el
  navegador» (separar y editar con IA envía la imagen a Replicate), «Interfaz real del editor» (era un dibujo),
  «en segundos» (sin medición publicada), «Probar gratis».
- **Enlaces a `github.com/bladealex9848`** en el pie de la portada, en «Ayuda → Documentación» y en el README: es el
  nombre de usuario anterior, hoy libre (404): cualquiera podría registrarlo y servir otra cosa en esa ruta.
- **Fuentes de Google en cada visita**: Inter y **la familia entera de Material Symbols** (~4 MB por página).
- **Contraste**: `editor.text-muted` `#808080` (3,88 : 1 sobre los paneles), enlaces en `#0078D4` sobre oscuro
  (3,68 : 1) y el hover del botón principal en `#1A8CFF` con texto blanco (3,37 : 1).
- Accesibilidad: acceso y editor sin `main` ni `h1`, campos del acceso sin etiqueta asociada, controles de color,
  opacidad y modo de fusión sin nombre.

## 2. Qué hay ahora

### Manual de Marca v1.0 «Una imagen, todas sus capas» (`docs/Manual_Marca_PhotoClone/v1.0/`)

Primer manual. **Símbolo propio**: cuadro Grafito (el fondo del editor) con tres capas —FONDO, FIGURA, TEXTO—
separadas en diagonal; nombre en curvas, «PhotoClone» con «Clone» en azul. Paleta cerrada de 30 colores con origen y
contraste calculado (casi todos ya estaban en `tailwind.config.ts` o en el mockup anterior). Inter y JetBrains Mono
autoalojadas; Material Symbols como **subconjunto de 68 iconos (16 KB)**. 40 páginas A4, recorrido inmersivo,
portable sin red, `audit_v1.py` en **0 fallos** y build determinista. El audit comprueba contra el código las cifras
que publica la marca (10 herramientas, 6 modos, 7 filtros, 2–10 capas, 3 exportaciones, 3 alcances de API) y que la
IA siga yendo a Replicate.

El build escribe en la aplicación: `src/marca/` (tokens, fuentes, colores para Tailwind), `public/marca/`, favicons,
`src/app/icon.svg`, las seis capas del hero (`public/identidad/`) y los cinco pósters (`public/portada/`).

### Portada (`src/app/page.tsx`)

- **Hero en seis capas de paralaje**: la imagen plana y sus tres capas separadas, cada una a su velocidad (`data-z`):
  al bajar, la imagen se separa de verdad.
- **Recorrido de cinco paradas** (patrón ScrollWorld, sin librerías): subir, separar, editar con texto, retocar y
  exportar. En ancho ≥ 960 px la sección queda fija y cada tramo de scroll muestra una parada con su póster a pantalla
  completa y una barra de avance; en móvil, sin JS o con movimiento reducido, es una lista.
- **El editor contado** con cifras leídas del código, **privacidad** (qué se queda en el navegador y qué sale a
  Replicate), **API** para integradores, **preguntas frecuentes** (incluida la no afiliación con Adobe) y cierre.
- Sin terceros al cargar. Imagen para compartir nueva: `public/og-photoclone-v1.png` (`scripts/generar_og.py`).
- Pósters: **ilustraciones vectoriales del build**, no IA: la cuota diaria de MiniMax estaba agotada el 11-oct.

### Vistas

- **Acceso, registro y panel**: logotipo o símbolo nuevos, `main` y `h1`, etiquetas asociadas y `autocomplete`.
- **Editor**: símbolo y nombre en la barra superior; `main` y `h1` ocultos; nombres para los selectores de color, la
  opacidad y el modo de fusión. «Ayuda → Acerca de» deja de decir «tipo Photoshop» y explica qué sale a Replicate.
- Global: `text-editor-text-muted` → `#9A9A9A`; foco y enlaces en Azul Señal y subrayados; botón principal con hover
  Azul Hondo (7,10 : 1). Los enlaces a `/` llevan `prefetch={false}` (evita precargar el CSS de la portada).
- Inter **precargada** desde `layout.tsx`: sin ella el cambio de fuente movía el hero en móvil (CLS 0,199 → 0).

## 3. Medición (Lighthouse 12.6.0 móvil, producción, 3 corridas)

| Vista | Antes (rend. · acces. · prácticas · SEO) | Después |
|---|---|---|
| `/` | 92–93 · 90 · 100 · 100 · LCP 2,6–2,7 s · **4,1 MB** | **99–100 · 100 · 100 · 100** · LCP 1,8–2,1 s · CLS 0 · **313 KiB** |
| `/login` | 87–95 · 91 · 100 · 100 · 4,6 MB | 83–93 · **100** · 100 · 100 · 697 KiB (TBT 320–670 ms: reCAPTCHA, que ya estaba) |
| `/editor` | 85–88 · 91 · 96 · 100 · CLS 0,155 · 4,1 MB | **90–92** · **100** · 96 · 100 · 244 KiB (una corrida de 69 con TBT 2,5 s: ruido del servidor, otros procesos midiendo) |

Producción, Playwright a 1440 y 390 px en `/`, `/login`, `/register`, `/editor` y `/admin`: **axe 0** en todas, sin
desborde horizontal, sin terceros al cargar (salvo reCAPTCHA en `/login`). Consola: 0 en portada, acceso y registro;
en editor y panel queda el **401 esperado** de `/api/auth/me` sin sesión (es como saben que no hay sesión; por eso
«Buenas prácticas» del editor sigue en 96). Editor probado abriendo una imagen local: capa creada, iconos de menús y
paneles con su glifo (ninguno se ve como texto). La CSP propuesta (§5) se probó inyectada en las cinco vistas: 0
violaciones.

## 4. Despliegue (cómo es de verdad)

`clon-photoshop.service` sirve **este árbol** con `npm run start`. El webhook (`/root/scripts/webhook-clon-photoshop.js`,
puerto 3025) haría `git reset --hard` + `npm install` + build + reinicio, pero **GitHub no lo tiene registrado**: su
log no ha recibido una sola entrega desde julio. Este rediseño se desplegó a mano: `npm run build` +
`systemctl restart clon-photoshop`. Copia del `.next` anterior: `/var/backups/clon-photoshop-next-pre-rediseno-20261011`.

## 5. Caddy — aplicado el 11-oct-2026

**Aplicado por el operador** (copia `/etc/caddy/Caddyfile.bak.pre-photoclone-rediseno-20261011_145208`, `caddy
validate`, `systemctl reload caddy`), con `Strict-Transport-Security` explícito dentro del bloque `header` (uno propio
puede tapar el del snippet `bloquear-sensibles`). Comprobado: la CSP sale en `/`; HSTS, `nosniff` y `Referrer-Policy`
también; Playwright en `/`, `/login` (con reCAPTCHA al escribir) y `/editor` a 1440 y 390 px con consola 0 (salvo el
401 esperado de `/api/auth/me`).

Lo que se pidió:

El bloque `photoshop.cedula360.tech` ya comprime (`encode gzip zstd`). **No envía ninguna CSP**. Propuesta, probada
inyectándola con Playwright en `/`, `/login` (con reCAPTCHA), `/register`, `/editor` y `/admin`, 0 violaciones:

```caddy
	header {
		Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://replicate.delivery; font-src 'self'; connect-src 'self' https://replicate.delivery https://www.google.com; frame-src https://www.google.com; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
	}
```

(`'unsafe-inline'` en scripts es por los scripts en línea que Next.js inyecta en cada página; quitarlo exige nonces en
el middleware. `replicate.delivery` es de donde el editor carga y descarga las capas que devuelve la IA. Las capas
reales de la IA no se probaron con esta CSP: hacerlo gasta crédito.)

## 6. Seguridad (no corregido aquí; decisiones del dueño)

- 🔴 **La IA pública no tiene límite**: `POST /api/layers/decompose` y `/api/layers/edit` responden sin cuenta ni
  límite por IP y reenvían a Replicate. Cualquiera puede gastar el crédito de Replicate. (La API v1 sí exige clave.)
- 🔴 **`disable_safety_checker: true`** en las dos llamadas a Replicate (`lib/ai/replicate.ts`): se puso para el fallo
  de 0.4.1 (devolvía 1 capa), pero también desactiva el filtro de contenido del modelo de **edición** en una ruta pública.
- ~~**Webhook sin firma obligatoria**~~ — **corregido el 11-oct-2026**: `verifySignature` ya no acepta peticiones sin
  cabecera (401 sin firma y con firma falsa, probado desde fuera; copia `webhook-clon-photoshop.js.pre-firma-20261011`).
  Sigue **sin registrar en GitHub** (el despliegue es manual) y el secreto está escrito en el script: al registrarlo,
  generar uno nuevo y ponerlo en los dos sitios.
- **Dominio**: `photoshop.cedula360.tech` contiene la marca de Adobe. Recomendación: un subdominio propio
  (p. ej. `photoclone.cedula360.tech`) con 301 desde el actual. La portada lleva el aviso de no afiliación.
- `POST /api/v1/transform` descarga en el servidor la URL que se le pase (con clave): conviene limitar destinos
  (IPs privadas) para evitar SSRF.

## 7. Trampas que dejó

- **Subconjunto de Material Symbols**: un icono nuevo se ve como su nombre en texto hasta regenerar el woff2.
- En flex, `order: -1` cambia también el **orden de pintado**: el texto de la parada quedaba bajo el póster absoluto;
  lleva `z-index: 1`.
- `Logo.tsx` fija la proporción del logotipo (437 × 100) para no mover el diseño: si el build cambia el ancho, hay que
  actualizarla.
- El ensayo se hizo en una copia (`npm ci` propio) en otro puerto: el build en el árbol servido publica al instante.
