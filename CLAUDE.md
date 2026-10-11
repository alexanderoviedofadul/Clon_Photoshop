# CLAUDE.md — PhotoClone

Lo que no se deduce leyendo el código, y las trampas que no dan error.

## Qué es

Editor de imágenes por capas en el navegador (Next.js 15, React 19, Canvas 2D, Zustand). La IA separa una imagen
en capas y edita una capa con una instrucción (Replicate). Editor **público**, sin cuenta; la cuenta (MariaDB o
«Continuar con Cédula 360») solo da acceso a `/admin`. API v1 con claves para otros sistemas.

## Despliegue

| Pieza | Detalle |
|---|---|
| Dominio | `photoshop.cedula360.tech` (Caddy → `127.0.0.1:3024`, `/webhook*` → `:3025`, `request_body` 50 MB) |
| Servicio | `clon-photoshop.service`: `npm run start` en **este árbol** (`/root/Clon_Photoshop`) con `EnvironmentFile=/root/.clon_photoshop_env` |
| Webhook | `clon-photoshop-webhook.service` (`/root/scripts/webhook-clon-photoshop.js`, fuera del repo). **GitHub no tiene el webhook registrado**: el log no ha recibido ninguna entrega. Despliegue manual |
| Desplegar | `git push` y luego `npm run build && systemctl restart clon-photoshop` en el árbol. Copia de `.next` antes si el cambio es grande |

🔴 **El build se hace en el árbol que se sirve**: `npm run build` sustituye `.next` mientras el servicio corre. Para
ensayar, copie el repo fuera (sin enlazar `node_modules`) y arranque `next start` en otro puerto.

## Marca (Manual de Marca v1.0, desde el 11-oct-2026)

- 🔴 **La marca es generada**: `src/marca/*` (tokens, `tema-v1.css` con las fuentes, `colores-v1.json` para
  Tailwind), `public/marca/*`, `public/identidad/*` (capas del hero), `public/portada/*` (pósters), los favicons de
  `public/` y `src/app/icon.svg` los escribe `docs/Manual_Marca_PhotoClone/v1.0/scripts/build_v1.py`. Editarlos a
  mano no da error: el audit del manual lo detecta. Flujo: build → `export_pdf_v1.py` → `audit_v1.py` (0 fallos) y
  todo en el mismo commit.
- **Nada de «Photoshop» ni de Adobe** en la marca, los textos ni los metadatos: es marca registrada de otra empresa.
  El dominio actual lo contiene (decisión pendiente del dueño). La portada lleva el aviso de no afiliación.
- **Material Symbols es un subconjunto** (`public/marca/fuentes/material-symbols-pc.woff2`, 16 KB). Un icono nuevo
  se ve **como su nombre en texto** hasta regenerar el subconjunto (receta en
  `docs/Manual_Marca_PhotoClone/v1.0/documentacion/FUENTES_Y_VERIFICACION.md`).
- `Logo.tsx` repite la geometría del símbolo (el audit la compara) y fija la proporción del logotipo (437 × 100).
- Texto secundario: `text-editor-text-muted` vale ahora `#9A9A9A` (el `#808080` anterior no llegaba a AA). Enlaces
  sobre oscuro en `text-pc-senal` y subrayados; `text-editor-accent` (#0078D4) no sirve como color de texto.
- Los enlaces a `/` desde acceso, panel y editor llevan `prefetch={false}`: si no, Next precarga el CSS de la portada
  y la consola avisa de una hoja «precargada y no usada».

## Portada (`src/app/page.tsx`)

- Las cifras salen del código (`TOOL_ORDER`, `BLEND_MODES`); el resto de afirmaciones las comprueba el audit del
  manual contra `replicate.ts`, `ops.ts`, `export/` y `keys.ts`. No publicar tiempos ni porcentajes.
- Movimiento sin librerías (`src/components/portada/Recorrido.tsx`): paralaje por `data-z` y recorrido por paradas
  solo con ancho ≥ 960 px y sin movimiento reducido. Sin JS, todo se lee como lista.
- En el modo vivo el texto de la parada lleva `z-index: 1`: con `order: -1` en flex se pintaba **debajo** del póster.
- Privacidad: la separación y la edición reenvían la imagen a Replicate y **no se guarda** en el servidor
  (`api/layers/*`). Si eso cambia, hay que cambiar la portada y el capítulo 02 del manual.

## Seguridad conocida (ver `docs/rediseno-2026-10/README.md`)

- 🔴 **La IA exige sesión** desde el 11-oct-2026: `/api/layers/*` devuelven 401 sin sesión y el editor muestra
  `AvisoCuentaIA`. `/api/auth/me` sin sesión responde 200 `{user: null}` (no 401): no volver a cambiarlo o la consola
  del editor vuelve a tener un error.
- Filtro de contenido de Replicate **activo** (`disable_safety_checker: false`). En jun-2026 rompía la separación
  (1 de N capas): si una separación devuelve una sola capa, es eso.
- El webhook acepta peticiones sin firma (`if (!signature) return true`) y tiene el secreto escrito en el script.
- No hay cabecera CSP en Caddy para este host.
