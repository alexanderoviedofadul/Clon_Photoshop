# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [0.4.2] - 2026-06-12

### Validado — Integración Cédula 360 (modo proxy)

- Validación end-to-end del proxy
  `cedula360.tech/api/imagen/{usage,decompose,edit,transform}` con una
  clave `c360_live_*` real (plan `despachos`). Resultados: transform
  ~1 s, **decompose 4 capas en 8.2 s** (regresión confirmada del fix
  del safety checker 0.4.1), edit 3.5 s, contador de uso incrementa
  correctamente. Gateo por plan + cuota diaria operativo
  (`ia: 120/día`, `transform: 800/día` en plan despachos).
- La alianza queda documentada en dos niveles:
  modo **directo** (`ck_live_*` server-to-server) en
  [`docs/INTEGRACION-CEDULA360.md`](docs/INTEGRACION-CEDULA360.md) y
  modo **proxy** (`c360_live_*` para usuarios externos de C360) en
  [`docs/VALIDACION-C360-IMAGEN-2026-06-12.md`](docs/VALIDACION-C360-IMAGEN-2026-06-12.md).
- La clave de prueba **no se versiona** (repo público); los docs usan
  placeholders.

## [0.4.1] - 2026-06-12

### Corregido — Decompose IA devolvía 1 capa en vez de N

- El modelo Replicate `qwen/qwen-image-layered` tiene un safety checker
  NSFW integrado que **falla con `Unable to infer channel dimension
  format`** y marca por defecto como NSFW capas completamente legítimas
  (foto neutra de Unsplash: 1 de 4 devueltas). El editor cargaba 1 capa
  en vez de las N solicitadas.
- Fix: `disable_safety_checker: true` en los 3 puntos que invocan los
  modelos (`src/lib/ai/replicate.ts`, `src/app/api/layers/decompose`,
  `src/app/api/layers/edit`). Las imágenes son entradas del propio
  usuario; el safety checker estaba además técnicamente roto.

### Validado

- API REST directa: 4 de 4 capas, `Total safe images: 4 out of 4`.
- `/api/v1/decompose` en producción: 4 capas en ~8.5 s.
- **End-to-end** en el navegador (Playwright contra producción): 0 → 5
  capas (4 IA + 1 base) tras subir imagen y "Separar Capas con IA".
- **Auditoría completa de la UI** (mismo run): toolbar (10/10),
  swap colores, TopBar Exportar, los 8 menús superiores con sus items,
  4 pestañas del Right Panel, acciones del Layers Panel (nueva,
  grupo, eliminar por fila, blend mode, opacidad). **42/42 OK,
  0 errores de consola.**

Detalle: [`docs/FIX-DECOMPOSE-SAFETY-CHECKER-2026-06-12.md`](docs/FIX-DECOMPOSE-SAFETY-CHECKER-2026-06-12.md).

## [0.4.0] - 2026-05-18

### Agregado — API pública v1 (consumible por otros proyectos)

- **Servicio API con API keys** gestionadas por administradores desde
  `/admin` → pestaña **API Keys** (SHA-256 en BD, scopes, rate-limit/min,
  cuota mensual; clave en claro mostrada una sola vez).
- **Endpoints** `/api/v1`: `health`, `capabilities` (auto-descripción),
  `usage`, `decompose` (IA capas RGBA), `edit` (IA por texto),
  `transform` (sharp: resize/rotate/flip/flop/grayscale/negate/blur/
  sharpen/tint/extend). Auth `Bearer`/`X-API-Key`, CORS habilitado.
- `src/lib/api/{keys,respond}.ts`, `src/lib/ai/replicate.ts`,
  `src/app/api/v1/*`, `src/app/api/admin/api-keys/*`.
- **Primera API key emitida para Cédula 360** (planes pagos): owner
  `cedula360.tech`, scopes `decompose,edit,transform`, 120 req/min,
  cuota ilimitada.

### Validado

- E2E: health/capabilities públicos, 401 sin clave, usage con clave,
  transform (sharp) OK, edit sin prompt → 400 (sin coste IA),
  **decompose real con la key → 3 capas en ~8 s**, contador de uso
  incrementa correctamente.

### Documentación

- [`docs/API-PUBLICA-V1.md`](docs/API-PUBLICA-V1.md) — contrato completo
  del API v1.
- [`docs/INTEGRACION-CEDULA360.md`](docs/INTEGRACION-CEDULA360.md) — guía
  de integración para Cédula 360 (planes pagos). La API key se entrega
  fuera de banda; **no se versiona** (repo público).

## [0.3.5] - 2026-05-18

### Corregido — Duplicar generaba capas con el mismo id

- `createLayer` construye `{ id: uuid, ...partial }`; `duplicateLayer`
  pasaba `{ ...layer }`, que reinyectaba `layer.id` y **el duplicado
  heredaba el id del original** → misma entrada del store: ocultar,
  bloquear o borrar una afectaba a "ambas" (y key de React duplicada).
- Ahora se omiten `id`/`createdAt`/`modifiedAt` al duplicar (id único)
  y se copian los píxeles offscreen origen→duplicado (capas sin
  `imageUrl` ya no salen en blanco).

### Validado

- Playwright e2e: 2 filas tras duplicar, ocultar una NO afecta a la
  otra, solo una activa, borrar una conserva la otra. 4/4 OK.

## [0.3.4] - 2026-05-18

### Corregido — Herramientas del mouse no afectaban al lienzo

- **Causa raíz**: pincel/borrador dibujaban sobre el canvas visible, que
  el recompositor borra de inmediato (los trazos no persistían en ninguna
  capa); la herramienta **Mover** usaba un callback
  (`setOnTransformChange`) que **nunca se conectaba** en `CanvasContainer`.
- `createToolContext` ahora enruta el dibujo al **canvas offscreen de la
  capa activa** (los píxeles persisten y se componen); el cuentagotas
  lee del lienzo compuesto visible.
- **Mover** conectado al `transform` de la capa activa + repintado en
  vivo; pincel/borrador con repintado en vivo por trazo y
  `refreshLayer` (miniatura + historial) al soltar.
- **LayersPanel**: botón **eliminar por fila** (borra esa capa exacta,
  sin depender de cuál esté activa) — la eliminación a nivel de store
  ya funcionaba; esto resuelve la ambigüedad de UX.

### Validado

- Playwright e2e: pincel dibuja y **persiste tras recomponer**, Mover
  desplaza la capa (+217 px medidos), eliminar por fila 3→2. 4/4 OK,
  0 errores de consola.

Detalle: [`docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md`](docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md).

## [0.3.3] - 2026-05-18

### Corregido

- **Scroll bloqueado en landing y /admin**: `globals.css` aplicaba
  `body { overflow: hidden }` global (para el editor full-screen), lo
  que impedía hacer scroll en toda la app. Ahora se aplica solo a la
  ruta del editor (`body:has(.editor-shell)`) y el editor gestiona su
  propia altura (`h-screen overflow-hidden`). Validado Playwright 6/6:
  landing scrollea, `/admin` scrollea, editor sigue full-screen.

## [0.3.2] - 2026-05-18

### Cambiado — Landing rediseñada (UI/UX de producto)

- **Landing reescrita** con propuesta de valor clara: qué hace el
  producto, "Cómo funciona" (3 pasos), 6 características, badges de
  confianza, CTA dual, header sticky con navegación por anclas y footer.
- **Preview del editor**: el placeholder vacío ("Vista previa del
  editor") se reemplazó por un **mockup fiel** del editor real
  (TopBar + Toolbar + lienzo con composición de ejemplo + panel de
  capas con edición IA) — ahora sí muestra qué es el producto.
- `metadata` SEO (title/description) en la landing.

### Agregado — Navegación desde /admin

- El logo de `/admin` ahora enlaza a `/` y se añadió enlace **"Inicio"**
  (antes no había forma de volver a la landing desde el panel).

### Validado

- Playwright e2e: 13/13 OK, 0 errores de consola (contenido de la
  landing, mockup presente, anclas, `/admin` → landing).

Detalle: [`docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md`](docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md).

## [0.3.1] - 2026-05-18

### Agregado — Navegación y sesión en el editor

- **Logo → landing**: el logo "PhotoClone" del TopBar ahora es un enlace
  a `/` (antes no navegaba a ningún sitio).
- **Indicador de sesión** en el TopBar del editor:
  - Sin sesión → botón "Iniciar sesión" (`/login`).
  - Con sesión → avatar + nombre y menú desplegable con datos del usuario
    (nombre, email, rol), enlace al **Panel administrativo** (`/admin`)
    y "Cerrar sesión".
- Resuelve "no se sabe quién inició sesión" y la falta de retorno a la
  landing / acceso al área administrativa desde el editor.

### Validado

- Playwright e2e (anónimo + autenticado): logo navega a la landing,
  "Iniciar sesión" visible sin sesión, panel de cuenta con enlace
  `/admin` y logout con sesión activa.

Detalle: [`docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md`](docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md).

## [0.3.0] - 2026-05-17

### Agregado / Corregido — Editor 100% funcional

- **Bug raíz**: `Toolbar` usaba estado local en vez de `useToolStore` —
  cambiar de herramienta no tenía efecto. Conectado al store (incl.
  selectores de color FG/BG nativos y swap).
- **Stores nuevos**: `useEngineStore` (puente UI↔motor de canvas),
  `useDocumentStore` (tamaño/nombre doc), `useSelectionStore` (selección
  bbox). `lib/canvas/ops.ts` (filtros/transformaciones de píxeles),
  `lib/history.ts` (undo/redo/jump reales sobre estructura de capas).
- **Todos los menús cableados**: Archivo, Editar (copiar/cortar/pegar,
  deshacer/rehacer), Imagen (rotar/voltear/tamaño), Capa (duplicar/
  eliminar/agrupar/desagrupar/fusionar/aplanar), Selección, Filtro
  (blur/sharpen/grayscale/invert), Vista (reglas/guías/cuadrícula con
  overlay real + marca ✓), Ayuda (modales).
- **TopBar**: botón Exportar con menú (PNG/ZIP/.photoclone) + zoom en
  vivo clicable.
- **Paneles**: Propiedades enlazado en vivo (X/Y capa, W/H documento,
  opacidad); Historial real con `jumpToAction`; Capas con "Crear grupo"
  + reordenar drag & drop.
- **CanvasContainer**: registra el motor, tamaño dinámico con
  preservación de píxeles, reglas/guías/cuadrícula reactivas.

### Validado

- **Playwright e2e sobre build de producción: 22/22 verificaciones
  funcionales OK, 0 errores de consola.**

### Limitaciones documentadas

- Historial = estructura de capas (no píxeles de pincel/filtro).
- Selección = bbox rectangular (no máscara freeform).

Detalle: [`docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md`](docs/EDITOR-FUNCIONAL-COMPLETO-2026-05-17.md).

## [0.2.2] - 2026-05-17

### Corregido

- **IA de capas operativa**: `/api/layers/decompose` devolvía `500`
  porque faltaba `REPLICATE_API_TOKEN` en el entorno (la ruta aborta si
  no está). Token configurado server-side; desbloquea también
  `/api/layers/edit`. Corrida real validada: `success:true`, 3 capas en
  7.4 s desde `qwen/qwen-image-layered`.
- **`favicon.ico 404`**: añadido `src/app/icon.svg` (marca "Ps" tema
  Photoshop) — Next.js App Router lo sirve como favicon.
- **Aviso `Canvas2D willReadFrequently`**: `{ willReadFrequently: true }`
  en los 3 contextos que hacen `getImageData` repetido (`LayerEngine`,
  `CompositeRenderer.renderSingleLayer`, `CanvasContainer`). Acelera
  eyedropper/composición sin perder GPU en los contextos de dibujo puro.

### Notas

- **Ollama Cloud descartado para separación de capas**: ningún modelo de
  Ollama Cloud genera imágenes ni hace segmentación/decomposición (son
  LLM/visión-lenguaje, salida solo texto). La vía correcta es Replicate
  (`qwen/qwen-image-layered` / `qwen/qwen-image-edit`).

### Validado

- **Webhook auto-deploy probado end-to-end**: POST firmado HMAC SHA256 →
  `200 {"status":"Deploy iniciado"}` → pipeline completo
  (`git reset --hard` + `npm install` + `npm run build` + restart) en
  ~22 s, servicio `active`, endpoints `200`. Firma inválida → `401`
  correcto. Único pendiente: registrar el webhook en GitHub
  (Settings → Webhooks).

Detalle: [`docs/FIX-IA-DECOMPOSE-Y-EDITOR-2026-05-17.md`](docs/FIX-IA-DECOMPOSE-Y-EDITOR-2026-05-17.md).

## [0.2.1] - 2026-05-17

### Corregido

- **Build**: declaración ambiente para `bcryptjs` (`9463a77`) — `tsc`
  fallaba en `next build`. Con el fix el build completa y la app
  despliega.

### Validado — DESPLEGADO Y SIRVIENDO

- Servicios `clon-photoshop` y `clon-photoshop-webhook` **activos**.
- `https://photoshop.cedula360.tech/` → **200**; `/admin` → **200**.
- Alianza con credenciales falsas → **401 real** desde el backend
  Cédula 360 `:3081` (no el stub `:9091`).
- MariaDB `clon_photoshop`: tablas `users`, `sessions` creadas.

### Pendientes

- **Operador — registrar el webhook de GitHub**
  (`https://photoshop.cedula360.tech/webhook`, HMAC SHA256). El secreto
  vive server-side en el script/entorno del webhook — **no documentado
  aquí**. Hasta registrarlo, `git push` no dispara auto-deploy.
- **Operador — reCAPTCHA**: añadir `photoshop.cedula360.tech` a los
  dominios de la llave reCAPTCHA de Cédula 360 en la consola de Google
  (mitigado por fail-open `0.3`).
- **Admin inicial** `bladealex@gmail.com`; contraseña server-side en
  `/root/.clon_photoshop_env` (no documentada). Cambiar tras 1er acceso.
- **Infra compartida (transversal)**: serializar deploys por webhook /
  nice-cgroup tras el incidente de carga del VPS (contenido; producción
  saludable).

Detalle: [`docs/DESPLIEGUE-VPS-2026-05-16.md`](docs/DESPLIEGUE-VPS-2026-05-16.md).

## [0.2.0] - 2026-05-16

### Agregado — Plataforma + alianza "Login con Cédula 360"

- **Autenticación local MariaDB** (reemplaza Supabase): tablas `users` y
  `sessions` creadas idempotentemente vía `ensureSchema()`; bcrypt; cookie
  de sesión httponly `clon_ps_session` (30 días, secure+lax).
- **API routes Next.js** (`runtime=nodejs`, `force-dynamic`):
  - `/api/auth/{login,logout,me,config}` — login local + sesión.
  - `/api/auth/cedula360/{login,challenge,verify}` — alianza Cédula 360
    server-to-server contra el backend REAL `http://localhost:3081`
    (NUNCA :9091). Reenvío de IP real (`X-Forwarded-For`/`X-Real-IP`) en
    cada llamada por el rate-limit 10/min por IP. Soporta MFA inline
    (`totp|email_otp|sms_otp|whatsapp_otp|push|backup_code`).
  - `/api/admin/{users,users/[id],profile,sessions}` — CRUD usuarios
    (RBAC admin), perfil propio, sesiones.
- **reCAPTCHA v3** (claves Cédula 360, umbral 0.3, fail-open) en logins.
- **Panel `/admin`**: SPA con tabs Usuarios (admin), Mi perfil, Sesiones.
- **Login** con botón "Continuar con Cédula 360" + 2FA inline; el editor
  permanece **público** (transformación aditiva, sin gating del editor).
- **Marca de alianza**: footer/landing "en alianza con Cédula 360" +
  enlace cedula360.tech + contacto info@cedula360.tech.
- Despliegue VPS: `clon-photoshop.service` (Next.js, 127.0.0.1:3024) +
  `clon-photoshop-webhook.service` (auto-deploy GitHub, 127.0.0.1:3025).
  Doc: `docs/DESPLIEGUE-VPS-2026-05-16.md`.

### Cambiado

- Supabase neutralizado a stubs de compatibilidad (sin OAuth). `middleware`
  ya no fuerza login en `/editor`; sólo redirige sesiones a `/admin`.
- Registro abierto retirado: acceso vía Cédula 360 o credenciales emitidas
  por un administrador.

Detalle: [`docs/DESPLIEGUE-VPS-2026-05-16.md`](docs/DESPLIEGUE-VPS-2026-05-16.md).

## [0.1.0] - 2025-12-28

### Agregado

#### Core
- Setup inicial del proyecto con Next.js 15.5.9 y React 19
- Configuración de Tailwind CSS con tema oscuro estilo Photoshop
- Sistema de tipos TypeScript completo para capas, herramientas y editor
- Constantes centralizadas para herramientas, blend modes y atajos

#### Autenticación
- Integración completa con Supabase Auth
- Login/registro con email y contraseña
- OAuth con Google y GitHub
- Middleware de protección de rutas
- Callback handler para OAuth

#### Editor
- Layout de 4 zonas: TopBar, Toolbar, Canvas, RightPanel
- TopBar con menús desplegables (Archivo, Editar, Imagen, Capa, Selección, Filtro, Vista, Ayuda)
- Toolbar con 10 herramientas y selector de colores
- Canvas con zoom, pan y reglas
- RightPanel con pestañas para Capas e IA

#### Motor Canvas
- LayerEngine para gestión de OffscreenCanvas por capa
- CompositeRenderer para composición con blend modes
- Soporte para 16 modos de mezcla (normal, multiply, screen, overlay, etc.)

#### Herramientas
- Pincel (brush) con tamaño, dureza, opacidad y flujo
- Borrador (eraser) con configuración similar al pincel
- Mover (move) para desplazar capas
- Cuentagotas (eyedropper) para seleccionar colores
- Texto (text) para añadir texto
- Selección rectangular (selection)
- Zoom para acercar/alejar
- Mano (hand) para pan del canvas
- Recortar (crop) para recortar imagen
- Lazo (lasso) para selección libre

#### Estado (Zustand)
- useLayerStore: gestión de capas, orden, visibilidad, opacidad, blend modes
- useToolStore: herramienta activa, configuraciones, colores primario/secundario
- useViewStore: zoom, pan, guías, reglas, cuadrícula
- useHistoryStore: undo/redo con snapshots
- useAIStore: estado de descomposición IA

#### Panel de Capas
- Lista de capas con miniaturas
- Toggle de visibilidad y bloqueo
- Control de opacidad por capa
- Selector de blend mode
- Reordenamiento drag & drop
- Botones para nueva capa y eliminar

#### Historial
- Sistema completo de undo/redo
- Snapshots del estado de capas
- Límite configurable de historial

#### Atajos de Teclado
- Hook useKeyboardShortcuts
- Soporte para herramientas (V, B, E, T, Z, etc.)
- Soporte para acciones (Ctrl+Z, Ctrl+S, etc.)
- Soporte para zoom (Ctrl++, Ctrl+-)

#### Integración IA
- API route `/api/layers/decompose`
- Integración con Replicate (qwen/qwen-image-layered)
- Panel de IA con upload de imagen
- Selector de cantidad de capas
- Campo de instrucciones opcional

#### Exportación
- PNGExporter: exportar canvas a PNG
- ZIPExporter: exportar capas como PNGs en ZIP
- ProjectExporter: formato .photoclone (JSON + imágenes)
- Importación de proyectos .photoclone

#### UI/UX
- Tema oscuro consistente con Photoshop
- Iconos Material Symbols Outlined
- Menús desplegables con atajos visibles
- Barra de estado con información del documento
- Landing page con hero y features

### Técnico
- TypeScript strict mode
- ESLint configurado
- Build optimizado para producción
- Compatibilidad con VPS (Next.js 15.5.9)
