# Fuentes y verificación — Manual de Marca PhotoClone v1.0

La bibliografía completa está en `contenido/fuentes.json` y se imprime en el capítulo 10.
Aquí, cómo se comprobó cada tipo de dato el 11-oct-2026.

| Dato | Cómo se verificó |
|---|---|
| Identidad anterior | `src/app/page.tsx` (commit 8ca9f8b): icono `layers` de Material Symbols en `text-editor-accent` y «PhotoClone AI» en `text-xl font-bold`; `src/app/layout.tsx`: título «Photoshop Clone - Editor de Imágenes con IA» |
| Colores «CSS» | La paleta `editor.*` de `tailwind.config.ts` y las clases del mockup de la portada anterior (amber-400, sky-400, indigo-500, emerald-400, teal-600), convertidas a su hexadecimal |
| Contrastes | Calculados por `build_v1.py` con la fórmula de WCAG 2.1 (y comprobados aparte los que cita `paleta.json`) |
| Herramientas | `TOOL_ORDER` de `src/constants/tools.ts`: diez. El audit las cuenta |
| Modos de fusión | `BLEND_MODES` de `src/constants/blendModes.ts`: seis (la portada anterior decía 16). El audit los cuenta |
| Filtros | Funciones de `src/lib/canvas/ops.ts`; el audit las busca |
| Capas | `src/lib/ai/replicate.ts`: `Math.max(2, Math.min(10, opts.layerCount \|\| 4))`; el audit busca la expresión |
| Exportaciones | `src/lib/export/`: PNG, ZIP con `metadata.json` y `.photoclone`; el `accept` de `MenuBar.tsx` reabre `.photoclone` |
| Adónde va la imagen | `src/app/api/layers/{decompose,edit}/route.ts` reenvían a Replicate y no escriben en disco ni en base de datos; el audit falla si el cliente deja de llamar a `replicate.run(` |
| API | `src/app/api/v1/capabilities/route.ts` y `ALL_SCOPES` de `src/lib/api/keys.ts` |
| Fechas | `git log --date=short` y `CHANGELOG.md` |
| Iconos del editor | Nombres extraídos del código (`material-symbols-iconos.txt`) cruzados con los codepoints oficiales de Material Symbols; subconjunto pedido a Google Fonts con `icon_names=` y servido desde el dominio |
| Licencias de fuentes | `fuentes/*/OFL.txt`; Material Symbols, Apache 2.0 |

## Retirado por falta de fuente o por falso

«16 modos de fusión» (son seis), «100% en el navegador» (la IA envía la imagen a Replicate), «Interfaz real del
editor» (era un dibujo), «herramientas tipo Photoshop» y el título «Photoshop Clone» (marca registrada de Adobe),
«en segundos» (sin medición publicada), «Probar gratis» (no hay un compromiso comercial documentado) y el enlace a
`github.com/bladealex9848` (nombre de usuario anterior, ya libre: cualquiera podría registrarlo).

## Cómo regenerar el subconjunto de Material Symbols

```bash
# 1. nombres usados en src/ (ver cómo se extrajeron en docs/rediseno-2026-10/README.md) → documentacion/material-symbols-iconos.txt
# 2. pedir el subconjunto (orden alfabético, separados por comas):
curl -A 'Mozilla/5.0 Chrome/120' "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&icon_names=$(paste -sd, documentacion/material-symbols-iconos.txt)&display=block"
# 3. descargar el woff2 de la respuesta a assets/fonts/material-symbols-pc.woff2 y volver a ejecutar build_v1.py
```
