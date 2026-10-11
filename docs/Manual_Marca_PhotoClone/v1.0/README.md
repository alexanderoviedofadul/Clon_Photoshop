# Manual de Marca PhotoClone v1.0 — «Una imagen, todas sus capas»

Primer manual de marca del producto (11-oct-2026). Hasta esta versión no había logotipo: el icono «layers» de
Material Symbols junto al nombre en texto, un título que usaba el nombre de un producto de otra empresa
(«Photoshop Clone») y fuentes pedidas a Google en cada visita. Esta versión fija una identidad propia —tres capas
separadas sobre el gris del editor—, la mide y la lleva a la aplicación.

Una sola fuente (`contenido/*.json`) genera todo lo demás. **No se editan las salidas a mano.**

| Salida | Qué es |
|---|---|
| `index.html` | Recorrido inmersivo (abre por `file://`) |
| `PhotoClone_Inmersivo_v1.html` | Portable autocontenido: fuentes, CSS, GSAP y logos en línea, sin red |
| `impresion.html` → `Manual_Marca_PhotoClone_v1.pdf` | 40 páginas A4 apaisadas |
| `assets/logos/` | Símbolo, logotipos y favicons (SVG maestros + PNG) |
| `assets/data/tokens-v1.css` · `tokens_v1.json` | Paleta y capas |
| `../../../src/marca/` | `tokens-v1.css`, `tema-v1.css` (fuentes) y `colores-v1.json` (Tailwind: `bg-pc-azul`, `text-pc-tenue`…) |
| `../../../public/marca/` y `public/` | woff2 (incluido el subconjunto de Material Symbols), logos y favicons; `src/app/icon.svg` |
| `../../../public/identidad/` | Las seis capas del hero de la portada |
| `../../../public/portada/` | Los cinco pósters del recorrido |

## Flujo

```bash
python3 -B docs/Manual_Marca_PhotoClone/v1.0/scripts/fuentes_v1.py     # solo si cambian las fuentes
python3 -B docs/Manual_Marca_PhotoClone/v1.0/scripts/build_v1.py
python3 -B docs/Manual_Marca_PhotoClone/v1.0/scripts/export_pdf_v1.py
python3 -B docs/Manual_Marca_PhotoClone/v1.0/scripts/audit_v1.py       # debe terminar en 0 fallos
python3 -B scripts/generar_og.py                                         # si cambian las capas o el logotipo
```

Fuente, salidas y copias de la aplicación van **en el mismo commit**. El webhook recompila la aplicación al hacer push.

## Capítulos

00 Portada · 01 Origen y nombre · 02 Producto (con las afirmaciones corregidas) · 03 Símbolo y logotipo ·
04 Color · 05 Tipografía · 06 Interfaces · 07 Aplicaciones · 08 Tono y voz · 09 Web · 10 Gobernanza y fuentes.

## Reglas que no dan error

1. **Lo que la web usa de la marca es generado**: `src/marca/*`, `public/marca/*`, `public/identidad/*`,
   `public/portada/*`, los favicons y `src/app/icon.svg`. El audit falla si difieren del manual.
2. **El símbolo está dos veces**: en los maestros SVG y en `src/components/marca/Logo.tsx`. El audit compara las
   tres capas. `Logo.tsx` también fija la proporción del logotipo (437 × 100): si cambia el nombre o su cuerpo,
   hay que actualizarla.
3. **El producto se comprueba contra el código**: diez herramientas, seis modos de fusión, siete filtros, de 2 a 10
   capas (4), tres exportaciones y tres alcances de API. Y la IA: si el cliente deja de llamar a Replicate, el audit
   falla para que la privacidad y el capítulo 02 se actualicen.
4. **Lista negra** en `audit_v1.py`: porcentajes, «todo en el navegador», nombres de productos o empresas ajenos,
   nombres de modelos, «gratis» y tiempos. Solo pueden aparecer en bloques marcados `corrige`.
5. **Capa = color + palabra.** FONDO y TEXTO llevan texto Tinta; FIGURA e IA, blanco.
6. **Esmeralda Trazo (#34D399) es solo gráfico.**
7. **El PDF recorta en silencio**: la paginación es fija; solo `audit_v1.py` lo ve.
8. **Chromium fijado**: `CHROME_PATH` o `/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`.

Fuentes y verificación: [`documentacion/FUENTES_Y_VERIFICACION.md`](documentacion/FUENTES_Y_VERIFICACION.md).
