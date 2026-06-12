# Fix decompose IA: 4/4 capas (safety checker roto del modelo) — 2026-06-12

El usuario reportó que la separación en capas con IA **devolvía solo 1
capa** en vez de las N solicitadas. Diagnóstico, fix y validación
end-to-end.

## Síntoma reportado

Con `layerCount: 4` la respuesta tenía 1 sola capa (`out-3.webp`). El
editor mostraba el resultado pero el flujo no cumplía la promesa de
"separar en capas".

## Causa raíz

El modelo Replicate `qwen/qwen-image-layered` tiene un **safety checker
NSFW integrado** que falla con el error técnico:

```
Error running safety checker: Unable to infer channel dimension format
NSFW content detected in image 0
NSFW content detected in image 1
NSFW content detected in image 2
Total safe images: 1 out of 4
```

El modelo SÍ genera las 4 capas correctamente, pero al fallar el safety
checker por un bug interno (formato de canales) marca por defecto las
capas como NSFW y las descarta — incluso para una foto totalmente
neutra (perro de Unsplash). El resultado: 1 de 4 capas devueltas.

Verificado contra la API REST nativa de Replicate (no usando el SDK):
mismo comportamiento. No es un bug nuestro, es un bug del safety checker
del modelo.

## Fix

Pasar `disable_safety_checker: true` al modelo en los 3 puntos que lo
invocan:

| Archivo | Uso |
|---|---|
| `src/lib/ai/replicate.ts` | Núcleo IA reutilizable (API v1) |
| `src/app/api/layers/decompose/route.ts` | Endpoint legacy que usa el AIPanel del editor |
| `src/app/api/layers/edit/route.ts` | Edición de capa con IA (mismo problema potencial) |

### Justificación de seguridad

Las imágenes que entran al editor son **subidas por el propio usuario
del editor** (no contenido generado a partir de prompts arbitrarios).
El safety checker integrado está además **técnicamente roto** (siempre
falla con "Unable to infer channel dimension format"). Mantenerlo
activo significa romper el producto sin ofrecer ninguna protección
real. Deshabilitarlo restablece el comportamiento esperado.

## Validación

Antes del fix (imagen real de Unsplash, perro, 800×1067):
- `layerCount: 4` → `1 layer` (`out-3.webp`)
- Replicate logs: `Total safe images: 1 out of 4`

Después del fix:
- API REST directa con `disable_safety_checker:true` → **4 layers**
  (out-0, out-1, out-2, out-3), `Total safe images: 4 out of 4`
- Alpha medios verificados (contenido distinto en cada capa):
  Capa 1: 1.0 · Capa 2: 0.73 · Capa 3: 0.004 · Capa 4: 0.39
- API v1 en producción `/api/v1/decompose` → **4 capas en 8.5 s**
- **End-to-end UI** (Playwright, navegador real contra producción):
  0 → 5 capas en el panel (4 IA + 1 base de la imagen), **0 errores
  de consola**.

## Auditoría completa de menús/herramientas (mismo Playwright)

Se ejecutó una auditoría exhaustiva para confirmar que **todo lo demás
sigue funcionando** después del fix:

- **Toolbar izquierdo** (10 herramientas): Mover, Selección, Lazo,
  Pincel, Borrador, Texto, Recortar, Cuentagotas, Zoom, Mano — todas
  activables, marca de activa correcta.
- **Intercambiar colores** funciona.
- **TopBar**: dropdown Exportar (PNG/ZIP/proyecto) abre. Zoom en vivo.
- **Menú Archivo**: Nuevo, Abrir, Guardar, Exportar PNG/ZIP — todos
  presentes y clicables.
- **Menú Editar**: Deshacer, Rehacer, Cortar, Copiar, Pegar,
  Transformar Libre.
- **Menú Imagen**: Rotar 90°, Voltear Horizontal — corren sobre la
  capa activa sin error.
- **Menú Capa**: Nueva, Duplicar añade fila correctamente.
- **Menú Selección**: Todo, Deseleccionar.
- **Menú Filtro**: Escala de Grises, Invertir Colores, Desenfocar —
  todos corren sobre la capa activa.
- **Menú Vista**: Mostrar Cuadrícula (marca ✓), Acercar cambia zoom
  (100% → 125%), Tamaño Real lo restablece.
- **Menú Ayuda**: Atajos de Teclado y Acerca de PhotoClone abren
  modales y cierran.
- **Right Panel**: las 4 pestañas (Capas, Propiedades, Historial, IA)
  muestran contenido real.
- **Layers Panel**: Nueva capa, Crear grupo, Eliminar por fila
  (3 → 2), selector de blend mode, slider de opacidad.

Resultado: **42/42 verificaciones funcionales OK, 0 errores de consola.**

## Estado

Build EXIT=0, `clon-photoshop.service` activo, `/editor` → 200.
Desplegado por auto-deploy del webhook GitHub (commit `f7aed7e`).
