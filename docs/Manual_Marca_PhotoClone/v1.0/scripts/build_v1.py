#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_v1.py — Manual de Marca PhotoClone v1.0 «Una imagen, todas sus capas».

Kit copiado del Manual de Marca DeepMap v1.0 (/root/DeepMap/docs/Manual_Marca_DeepMap/v1.0), que viene de
AuditorTecnicoIA v1.0, Pentest C360 v1.0, Isabella EA v2.0, Maloca Digital v2.0, ENKI v2.0 y KANSA v6.0.
Una sola fuente (contenido/*.json) → salidas GENERADAS:

  assets/logos/pc-*.svg|png             símbolo, logotipos y favicons (geometría única, aquí)
  index.html                            recorrido inmersivo (enlaza assets/, abre por file://)
  impresion.html                        páginas A4 apaisadas (fuente del PDF)
  PhotoClone_Inmersivo_v1.html          portable autocontenido (fuentes, CSS, JS e imágenes en línea)
  assets/data/tokens-v1.css · tokens_v1.json   tokens para la web
  ../../../src/marca/                   tokens, @font-face y colores para Tailwind que importa la aplicación
  ../../../public/marca/                woff2 y logos que sirve la web; favicons en public/ y src/app/icon.svg;
                                        capas de la portada en public/identidad/ y pósters en public/portada/

Hasta esta versión PhotoClone no tenía logotipo: el icono «layers» de Material Symbols en azul junto al nombre
en texto. La v1.0 dibuja el propio producto: un cuadro Grafito (el fondo del editor) con tres capas separadas
en diagonal —FONDO, FIGURA y TEXTO, los colores del mockup de la portada anterior—, y el nombre en una palabra,
«PhotoClone», con «Clone» en azul. Nada de la identidad de Adobe: ni iniciales en un cuadro ni sus azules.

No editar las salidas a mano. La salida es determinista (semilla fija, sin fechas).
Uso:  python3 -B docs/Manual_Marca_PhotoClone/v1.0/scripts/build_v1.py   (desde cualquier carpeta)
"""
import base64
import colorsys
import hashlib
import html
import json
import math
import random
import re
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

BASE = Path(__file__).resolve().parent.parent            # .../v1.0
REPO = BASE.parents[2]                                   # raíz del repositorio Clon_Photoshop
CONTENIDO = BASE / "contenido"
VERSION = "1.0.0"
SELLO_PIE = "PhotoClone · Manual de Marca v1.0"
PORTABLE = "PhotoClone_Inmersivo_v1.html"

# ─────────────────────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────────────────────

def leer(rel):
    return (BASE / rel).read_text(encoding="utf-8")


def esc(s):
    return html.escape(str(s), quote=True)


FUENTES = json.loads(leer("contenido/fuentes.json"))["fuentes"]
NUM_FUENTE = {f["id"]: i + 1 for i, f in enumerate(FUENTES)}
HITOS = json.loads(leer("contenido/hitos.json"))
PRODUCTO = json.loads(leer("contenido/producto.json"))


def inline(s):
    """Texto de contenido → HTML. Admite HTML en línea simple y marcas {f:id}."""
    def cita(m):
        ids = [x.strip() for x in m.group(1).split(",")]
        partes = []
        for i in ids:
            if i not in NUM_FUENTE:
                raise SystemExit(f"Fuente desconocida en el contenido: {i}")
            partes.append(f'<a href="#fuente-{i}">{NUM_FUENTE[i]}</a>')
        return '<sup class="cita">[' + ", ".join(partes) + "]</sup>"
    return re.sub(r"\{f:([a-z0-9,\- ]+)\}", cita, s)


# ─────────────────────────────────────────────────────────────────────────────
# Color: una paleta cerrada, cada color con su origen; contraste WCAG calculado
# ─────────────────────────────────────────────────────────────────────────────

PALETA = json.loads(leer("contenido/paleta.json"))
COLORES = {k: {"nombre": c["nombre"], "hex": c["hex"].upper(), "uso": c["uso"], "origen": c["origen"]}
           for k, c in PALETA["colores"].items()}
RETIRADOS = PALETA["retirados"]
ORIGENES = {"css": "CSS", "deriv": "v1.0"}
# Las capas en que la IA separa una imagen (lo que pinta el símbolo, la portada y los pósters): color + palabra +
# color del texto encima (el que llega a AA, calculado). La capa IA es la acción de separar o editar.
ELEMENTOS = [("pc-capa-fondo", "FONDO", "pc-tinta"), ("pc-capa-figura", "FIGURA", "#FFFFFF"),
             ("pc-capa-texto", "TEXTO", "pc-tinta"), ("pc-azul", "IA", "#FFFFFF")]


def hexa(i):
    return i if i.startswith("#") else COLORES[i]["hex"]


def _lum(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contraste(a, b):
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def nivel_wcag(r):
    if r >= 7: return "AAA"
    if r >= 4.5: return "AA"
    if r >= 3: return "AA grande"
    return "No apto"


def exportar_tokens():
    """Tokens para la web y para el CSS del manual. GENERADOS."""
    filas = [f"  --{k}: {c['hex']};  /* {c['nombre']} · {ORIGENES[c['origen']]} */" for k, c in COLORES.items()]
    css = ("/* GENERADO por docs/Manual_Marca_PhotoClone/v1.0/scripts/build_v1.py — no editar a mano.\n"
           f"   Paleta cerrada de PhotoClone v1.0: {len(COLORES)} colores. Los de CSS salen de la paleta editor.* de\n"
           "   tailwind.config.ts y de las clases del mockup de la portada anterior; los de la v1.0 se derivan de ellos\n"
           "   para que el texto llegue a AA, con su contraste calculado. */\n:root {\n"
           + "\n".join(filas)
           + "\n  --f-display: 'Inter', system-ui, sans-serif;\n  --f-mono: 'JetBrains Mono', ui-monospace, monospace;\n}\n")
    (BASE / "assets/data/tokens-v1.css").write_text(css, encoding="utf-8")
    datos = {"marca": "PhotoClone", "version": VERSION, "colores": COLORES,
             "elementos": {n: {"fondo": hexa(i), "texto": hexa(t)} for i, n, t in ELEMENTOS},
             "tipografia": {"display": "Inter", "texto": "Inter", "codigo": "JetBrains Mono", "iconos": "Material Symbols Outlined (subconjunto)"}}
    (BASE / "assets/data/tokens_v1.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


def tema_app_css():
    """Tipografías autoalojadas de la aplicación (Next.js + Tailwind 3). Lo importa src/app/globals.css.
    Los colores van a Tailwind por src/marca/colores-v1.json (tailwind.config.ts: bg-pc-azul, text-pc-tenue…)."""
    return ("/* GENERADO por docs/Manual_Marca_PhotoClone/v1.0/scripts/build_v1.py — no editar a mano.\n"
            "   Fuentes de la aplicación: Inter, JetBrains Mono y el subconjunto de Material Symbols del editor.\n"
            "   Lo importa src/app/globals.css. Para cambiar un color o una fuente, cambie el manual. */\n"
            "@font-face { font-family: 'Inter'; font-style: normal; font-weight: 100 900; font-display: swap;\n"
            "  src: url('/marca/fuentes/inter-var.woff2') format('woff2'); }\n"
            "@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 400; font-display: swap;\n"
            "  src: url('/marca/fuentes/jetbrainsmono-400.woff2') format('woff2'); }\n"
            "@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 700; font-display: swap;\n"
            "  src: url('/marca/fuentes/jetbrainsmono-700.woff2') format('woff2'); }\n"
            "/* Material Symbols Outlined (Apache 2.0), subconjunto con los iconos que usa src/ (lista en\n"
            "   docs/Manual_Marca_PhotoClone/v1.0/documentacion/material-symbols-iconos.txt). Un icono nuevo se ve\n"
            "   como su nombre en texto hasta regenerar el subconjunto. */\n"
            "@font-face { font-family: 'Material Symbols Outlined'; font-style: normal; font-weight: 400; font-display: block;\n"
            "  src: url('/marca/fuentes/material-symbols-pc.woff2') format('woff2'); }\n")


def colores_app_json():
    """Colores para tailwind.config.ts (theme.extend.colors.pc): {"azul": "#0078D4", …}."""
    return json.dumps({k[3:]: c["hex"] for k, c in COLORES.items()}, ensure_ascii=False, indent=1, sort_keys=True) + "\n"


# ─────────────────────────────────────────────────────────────────────────────
# Símbolo: cuadro Grafito (el fondo del editor) de 100 u con radio 22 y, dentro, tres capas cuadradas de 44 u y
# radio 8, separadas en diagonal: FONDO detrás (arriba a la izquierda), FIGURA en medio y TEXTO delante. Un filete
# de 5 u del color del cuadro separa cada capa de la que tiene detrás: se leen como hojas, no como un mosaico.
# ─────────────────────────────────────────────────────────────────────────────

LADO, RADIO, TRAZO = 100, 22, 5
CAPA, RCAPA = 44, 8
CAPAS_SIM = [(16, 16, "pc-capa-fondo"), (28, 28, "pc-capa-figura"), (40, 40, "pc-capa-texto")]
INTER = BASE / "fuentes" / "inter" / "Inter[opsz,wght].ttf"
CUADRO_PATH = (f"M{RADIO} 0H{LADO - RADIO}A{RADIO} {RADIO} 0 0 1 {LADO} {RADIO}V{LADO - RADIO}"
               f"A{RADIO} {RADIO} 0 0 1 {LADO - RADIO} {LADO}H{RADIO}A{RADIO} {RADIO} 0 0 1 0 {LADO - RADIO}V{RADIO}"
               f"A{RADIO} {RADIO} 0 0 1 {RADIO} 0Z")


def capa_rect(x, y, relleno, filete):
    """Una capa del símbolo. Es la misma cadena que dibuja src/components/marca/Logo.tsx (el audit las compara)."""
    return (f'<rect x="{x}" y="{y}" width="{CAPA}" height="{CAPA}" rx="{RCAPA}" fill="{relleno}" '
            f'stroke="{filete}" stroke-width="{TRAZO}" paint-order="stroke"/>')


@lru_cache(maxsize=None)
def _inter(peso, opsz):
    f = TTFont(INTER)
    instantiateVariableFont(f, {"wght": peso, "opsz": opsz}, inplace=True)
    return f


def texto_trazado(cad, peso, cuerpo, tracking=0.0, x0=0.0, y0=0.0, opsz=14):
    """Trazado SVG de `cad` en Inter con cuerpo `cuerpo` (u), línea base en y0. Son curvas:
    el logotipo no depende de que la fuente esté instalada."""
    f = _inter(peso, opsz)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    k = cuerpo / f["head"].unitsPerEm
    x = x0
    d = []
    for ch in cad:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x, y0)))
        d.append(pen.getCommands())
        x += gs[g].width * k + tracking
    cap = f["OS/2"].sCapHeight * k
    return " ".join(d), x - tracking - x0, cap


# Proporciones de la cabecera: símbolo de 36 px, 8 px de aire y el nombre en Inter 800 a 20 px con tracking
# -0,02 em (la cabecera anterior: icono de 30 px y «PhotoClone AI» en text-xl font-bold). En unidades del símbolo.
ESC_CAB = LADO / 36
CUERPO = 20 * ESC_CAB
AIRE = 8 * ESC_CAB
TRACK = -0.02 * CUERPO
PARTES = ("Photo", "Clone")
PESO = 800


def nombre_trazado(x0, base, color_txt, color_acento):
    """Las dos partes del nombre, seguidas, con «Clone» en el color de acento."""
    x = x0
    trozos = []
    for i, p in enumerate(PARTES):
        d, w, _ = texto_trazado(p, PESO, CUERPO, TRACK, x, base)
        trozos.append(f'<path d="{d}" fill="{color_acento if i == 1 else color_txt}"/>')
        x += w + TRACK
    return "".join(trozos), x - TRACK - x0


def simbolo_cuerpo(modo, dx=0, dy=0, k=1.0):
    """modo: «color» (cuadro Grafito y capas de color), un hex (cuadro de ese color y capas de color) o
    «recorte:#hex» (una sola tinta: las capas caladas en el cuadro, con máscara)."""
    t = f' transform="translate({dx:g} {dy:g}) scale({k:g})"' if (dx or dy or k != 1) else ""
    if modo.startswith("recorte:"):
        # Una tinta: el filete de cada capa se cala y la capa delantera queda maciza; las de detrás, huecas.
        calados = "".join(f'<rect x="{x}" y="{y}" width="{CAPA}" height="{CAPA}" rx="{RCAPA}" fill="{"#000000" if n == "pc-capa-texto" else "none"}" '
                          f'stroke="#000000" stroke-width="{TRAZO}"/>' for x, y, n in CAPAS_SIM)
        return (f'<g{t}><mask id="rec" maskUnits="userSpaceOnUse" x="0" y="0" width="{LADO}" height="{LADO}">'
                f'<rect width="{LADO}" height="{LADO}" fill="#FFFFFF"/>{calados}</mask>'
                f'<rect width="{LADO}" height="{LADO}" rx="{RADIO}" fill="{modo[8:]}" mask="url(#rec)"/></g>')
    fondo = hexa("pc-grafito") if modo == "color" else modo
    capas = "".join(capa_rect(x, y, hexa(n), fondo) for x, y, n in CAPAS_SIM)
    return f'<g{t}><rect width="{LADO}" height="{LADO}" rx="{RADIO}" fill="{fondo}"/>{capas}</g>'


def svg_simbolo(modo="color", titulo="PhotoClone"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LADO} {LADO}" role="img" aria-label="{esc(titulo)}">'
            f'{simbolo_cuerpo(modo)}</svg>\n')


def svg_horizontal(modo_sim, color_txt, color_acento):
    x = LADO + AIRE
    _, _, cap = texto_trazado("P", PESO, CUERPO)
    base = LADO / 2 + cap / 2
    trozos, w = nombre_trazado(x, base, color_txt, color_acento)
    ancho = round(x + w + 3)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {LADO}" role="img" aria-label="PhotoClone">'
            f'{simbolo_cuerpo(modo_sim)}{trozos}</svg>\n'), ancho


def svg_vertical(modo_sim, color_txt, color_acento):
    _, w = nombre_trazado(0, 0, "#000", "#000")
    cap = texto_trazado("P", PESO, CUERPO)[2]
    ancho = round(max(w, LADO) + 8)
    base = LADO + 26 + cap
    alto = round(base + CUERPO * 0.26 + 3)
    x = (ancho - w) / 2
    trozos, _ = nombre_trazado(x, base, color_txt, color_acento)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" role="img" aria-label="PhotoClone">'
            f'{simbolo_cuerpo(modo_sim, (ancho - LADO) / 2)}{trozos}</svg>\n'), ancho


ANCHOS = {}


def generar_logos():
    """Maestros de la marca. Todo sale de simbolo_cuerpo() y nombre_trazado()."""
    tinta, humo, azul, senal = hexa("pc-tinta"), hexa("pc-humo"), hexa("pc-azul-hondo"), hexa("pc-senal")
    L = BASE / "assets" / "logos"
    L.mkdir(parents=True, exist_ok=True)
    archivos = {
        "pc-simbolo.svg": svg_simbolo("color"),
        "pc-simbolo-tinta.svg": svg_simbolo("recorte:" + tinta),
        "pc-simbolo-blanco.svg": svg_simbolo("recorte:#FFFFFF"),
        "pc-simbolo-negro.svg": svg_simbolo("recorte:#000000"),
    }
    for nombre, (s, t, a) in {
        "pc-horizontal.svg": ("color", tinta, azul),
        "pc-horizontal-negativo.svg": ("color", humo, senal),
        "pc-horizontal-blanco.svg": ("recorte:#FFFFFF", "#FFFFFF", "#FFFFFF"),
        "pc-horizontal-tinta.svg": ("recorte:" + tinta, tinta, tinta),
    }.items():
        archivos[nombre], ANCHOS[nombre] = svg_horizontal(s, t, a)
    for nombre, (s, t, a) in {
        "pc-vertical.svg": ("color", tinta, azul),
        "pc-vertical-negativo.svg": ("color", humo, senal),
    }.items():
        archivos[nombre], ANCHOS[nombre] = svg_vertical(s, t, a)
    for nombre, s in archivos.items():
        (L / nombre).write_text(s, encoding="utf-8")
    rsvg = shutil.which("rsvg-convert")
    if not rsvg:
        raise SystemExit("Falta rsvg-convert (paquete librsvg2-bin) para los PNG de favicon")
    for salida, px in [("favicon-16.png", 16), ("favicon-32.png", 32), ("apple-touch-icon.png", 180),
                       ("icono-192.png", 192), ("icono-512.png", 512)]:
        subprocess.run([rsvg, "-w", str(px), "-h", str(px), "-o", str(L / salida), str(L / "pc-simbolo.svg")], check=True)


_contador_svg = {"n": 0}


def svg_en_linea(nombre, extra_attr=""):
    """SVG listo para incrustar varias veces: los maestros de una tinta llevan id de máscara («rec») y dos
    copias en la misma página chocarían (trampa 26 de KANSA)."""
    _contador_svg["n"] += 1
    p = f"m{_contador_svg['n']}-"
    s = (BASE / "assets" / "logos" / nombre).read_text(encoding="utf-8")
    s = re.sub(r'id="([^"]+)"', lambda m: f'id="{p}{m.group(1)}"', s)
    s = re.sub(r"url\(#([^)]+)\)", lambda m: f"url(#{p}{m.group(1)})", s)
    s = re.sub(r'\s(role="img"|aria-label="[^"]*")', "", s)
    s = s.strip()
    return s.replace("<svg ", f'<svg width="100%" height="100%" focusable="false" aria-hidden="true" {extra_attr} ', 1)


def ratio(nombre):
    vb = re.search(r'viewBox="([\d.\- ]+)"', (BASE / "assets" / "logos" / nombre).read_text(encoding="utf-8")).group(1).split()
    return f"{float(vb[2]):g} / {float(vb[3]):g}"


def logo(nombre="pc-simbolo.svg", clase="", estilo=""):
    est = f"aspect-ratio:{ratio(nombre)};" + estilo
    return (f'<div class="logo {clase}" data-logo="{esc(nombre)}" style="{est}">' + svg_en_linea(nombre) + "</div>")


def imago(vertical=False, oscuro=False, mono=None):
    """El logotipo completo es un SVG maestro (texto en curvas), no HTML + fuente."""
    if mono:
        nombre = f"pc-horizontal-{mono}.svg"
    elif vertical:
        nombre = "pc-vertical-negativo.svg" if oscuro else "pc-vertical.svg"
    else:
        nombre = "pc-horizontal-negativo.svg" if oscuro else "pc-horizontal.svg"
    clases = "imago" + (" vertical" if vertical else "") + (" sobre-oscuro" if oscuro else "")
    return (f'<div class="{clases}" role="img" aria-label="PhotoClone">' + logo(nombre, "imago-svg") + "</div>")


IMAGENES = {}


def imagen(rel, alt, clase=""):
    """<img> a assets/; el portable las sustituye por data: URI."""
    IMAGENES[rel] = True
    return f'<img src="assets/{rel}" alt="{esc(alt)}" class="{clase}" loading="lazy" decoding="async">'


# ─────────────────────────────────────────────────────────────────────────────
# Ilustración: una imagen plana (cielo, colinas, una esfera y un rótulo sin letras) y sus capas, cada una sobre
# el damero que en todo editor significa «aquí no hay nada». Ningún texto legible, ninguna persona, ningún logo.
# Semilla 20251228: el día del primer commit (37cdb10). Salida determinista.
# ─────────────────────────────────────────────────────────────────────────────

def damero(pre, celda=18):
    return (f'<pattern id="{pre}dam" width="{celda * 2}" height="{celda * 2}" patternUnits="userSpaceOnUse">'
            f'<rect width="{celda * 2}" height="{celda * 2}" fill="#2A2D2E"/><rect width="{celda}" height="{celda}" fill="#333336"/>'
            f'<rect x="{celda}" y="{celda}" width="{celda}" height="{celda}" fill="#333336"/></pattern>')


def defs_imagen(pre, celda=18):
    """Degradados de la imagen de ejemplo. pre evita choques de id entre copias."""
    return (f'<linearGradient id="{pre}cie" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexa("pc-azul-hondo")}"/>'
            f'<stop offset="1" stop-color="{hexa("pc-capa-cielo")}"/></linearGradient>'
            f'<linearGradient id="{pre}esf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{hexa("pc-capa-cielo")}"/>'
            f'<stop offset="1" stop-color="{hexa("pc-capa-figura")}"/></linearGradient>'
            f'<linearGradient id="{pre}col" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexa("pc-trazo")}"/>'
            f'<stop offset="1" stop-color="{hexa("pc-capa-fondo")}"/></linearGradient>' + damero(pre, celda))


def parte_imagen(parte, w, h, pre):
    """Lo que hay en cada capa, en un marco de w × h con origen 0,0."""
    if parte == "fondo":
        return (f'<rect width="{w}" height="{h}" fill="url(#{pre}cie)"/>'
                f'<path d="M0 {h * .62:.0f} C{w * .22:.0f} {h * .48:.0f} {w * .38:.0f} {h * .7:.0f} {w * .6:.0f} {h * .58:.0f} '
                f'S{w * .9:.0f} {h * .5:.0f} {w} {h * .6:.0f} V{h} H0Z" fill="url(#{pre}col)"/>'
                f'<path d="M0 {h * .8:.0f} C{w * .3:.0f} {h * .7:.0f} {w * .62:.0f} {h * .86:.0f} {w} {h * .76:.0f} V{h} H0Z" fill="{hexa("pc-capa-fondo")}" opacity=".85"/>')
    if parte == "figura":
        r = h * .2
        return (f'<circle cx="{w * .64:.0f}" cy="{h * .42:.0f}" r="{r:.0f}" fill="url(#{pre}esf)"/>'
                f'<ellipse cx="{w * .58:.0f}" cy="{h * .34:.0f}" rx="{r * .32:.0f}" ry="{r * .2:.0f}" fill="#FFFFFF" opacity=".35"/>')
    # texto: un rótulo con barras, sin letras
    return (f'<rect x="{w * .07:.0f}" y="{h * .09:.0f}" width="{w * .36:.0f}" height="{h * .16:.0f}" rx="{h * .03:.0f}" fill="{hexa("pc-capa-texto")}"/>'
            f'<rect x="{w * .1:.0f}" y="{h * .14:.0f}" width="{w * .22:.0f}" height="{h * .025:.1f}" rx="2" fill="{hexa("pc-tinta")}" opacity=".7"/>'
            f'<rect x="{w * .1:.0f}" y="{h * .185:.0f}" width="{w * .15:.0f}" height="{h * .025:.1f}" rx="2" fill="{hexa("pc-tinta")}" opacity=".45"/>')


def imagen_plana(x, y, w, h, pre, borde=True):
    """La imagen compuesta: las tres partes, una encima de otra, recortadas al marco."""
    b = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="none" stroke="{hexa("pc-linea-clara")}" stroke-width="2"/>' if borde else ""
    return (f'<clipPath id="{pre}cl"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14"/></clipPath>'
            f'<g clip-path="url(#{pre}cl)"><g transform="translate({x} {y})">'
            + parte_imagen("fondo", w, h, pre) + parte_imagen("figura", w, h, pre) + parte_imagen("texto", w, h, pre)
            + f"</g></g>{b}")


def hoja_capa(parte, x, y, w, h, pre, k, op=1.0, color_borde=None):
    """Una capa suelta en perspectiva (inclinada como una hoja que se levanta): su parte sobre el damero."""
    cb = color_borde or hexa(dict(fondo="pc-capa-fondo", figura="pc-capa-figura", texto="pc-capa-texto")[parte])
    fondo = f'<rect width="{w}" height="{h}" rx="12" fill="url(#{pre}dam)"/>' if parte != "fondo" else ""
    return (f'<g transform="translate({x} {y}) matrix(1 -0.18 0.62 0.46 0 0)" opacity="{op}">'
            f'<clipPath id="{pre}h{k}"><rect width="{w}" height="{h}" rx="12"/></clipPath>'
            f'<g clip-path="url(#{pre}h{k})">{fondo}{parte_imagen(parte, w, h, pre)}</g>'
            f'<rect width="{w}" height="{h}" rx="12" fill="none" stroke="{cb}" stroke-width="3"/></g>')


def capas_portada():
    rng = random.Random(20251228)
    NOCHE, GRAFITO = hexa("pc-noche"), hexa("pc-grafito")
    capas = []
    # 0 · Fondo: noche, la cuadrícula de puntos del lienzo y dos resplandores azules
    capas.append(("fondo", 0,
        '<defs><pattern id="PORT-p" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.3" fill="#FFFFFF" opacity=".07"/></pattern>'
        '<linearGradient id="PORT-g" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{GRAFITO}"/><stop offset=".7" stop-color="{NOCHE}"/><stop offset="1" stop-color="{NOCHE}"/></linearGradient>'
        f'<radialGradient id="PORT-r" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{hexa("pc-azul")}" stop-opacity=".30"/>'
        f'<stop offset="1" stop-color="{NOCHE}" stop-opacity="0"/></radialGradient></defs>'
        '<rect width="1600" height="900" fill="url(#PORT-g)"/><rect width="1600" height="900" fill="url(#PORT-p)"/>'
        '<ellipse cx="1080" cy="470" rx="640" ry="330" fill="url(#PORT-r)"/>'
        '<ellipse cx="320" cy="860" rx="520" ry="260" fill="url(#PORT-r)" opacity=".6"/>'))
    # 1 · La imagen plana, detrás
    # (abajo a la izquierda: arriba a la izquierda va el texto de la portada y del hero de la web)
    capas.append(("plano", 4, f'<defs>{defs_imagen("PORT-")}</defs>' + imagen_plana(110, 680, 270, 180, "PORT-")
                  + f'<path d="M392 770 C520 770 560 720 700 720" fill="none" stroke="{hexa("pc-trazo")}" stroke-width="2.4" stroke-dasharray="2 8" stroke-linecap="round" opacity=".8"/>'))
    # 2-4 · Las tres capas que se separan (cada una en su plano de paralaje)
    pos = {"capa-fondo": ("fondo", 700, 650), "capa-figura": ("figura", 750, 480), "capa-texto": ("texto", 800, 310)}
    for z, nombre in ((3, "capa-fondo"), (2, "capa-figura"), (1, "capa-texto")):
        parte, x, y = pos[nombre]
        # guía punteada vertical hacia la capa de abajo: se leen como una pila separada
        guia = (f'<path d="M{x + 110} {y + 30} V{y + 190}" stroke="{hexa("pc-bruma")}" stroke-width="1.5" stroke-dasharray="3 7" opacity=".45"/>'
                if nombre != "capa-fondo" else "")
        capas.append((nombre, z, f'<defs>{defs_imagen(f"PORT-{nombre}-")}</defs>{guia}'
                      + hoja_capa(parte, x, y, 470, 310, f"PORT-{nombre}-", 0)))
    # 5 · Suelo: horizonte
    capas.append(("suelo", 1, f'<path d="M0 872 H1600 V900 H0 Z" fill="{NOCHE}"/>'
                              f'<path d="M0 872 H1600" stroke="{hexa("pc-bruma")}" stroke-width="1.5" opacity=".25"/>'))
    rng.random()
    return capas


_contador_port = {"n": 0}


def portada_html(en_capas=False):
    _contador_port["n"] += 1
    pre = f"p{_contador_port['n']}-"
    capas = [(n, z, c.replace("PORT-", pre)) for n, z, c in capas_portada()]
    if not en_capas:
        cuerpo = "".join(f'<g class="capa-{n}">{c}</g>' for n, _, c in capas)
        return ('<svg class="grafica" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"'
                f' width="100%" height="100%" aria-hidden="true">{cuerpo}</svg>')
    out = []
    for n, z, c in capas:
        out.append(f'<div class="capa capa-{n}" data-z="{z}" aria-hidden="true">'
                   f'<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">{c}</svg></div>')
    return '<div class="grafica-capas">' + "".join(out) + "</div>"


CAPAS_WEB = ["fondo", "plano", "capa-fondo", "capa-figura", "capa-texto", "suelo"]


def exportar_capas_web():
    """Las capas de la portada como SVG sueltos para el hero de la web (public/identidad/).
    Mismo dibujo que el manual: una sola fuente."""
    dest = FRONT / "public" / "identidad"
    dest.mkdir(parents=True, exist_ok=True)
    for n, _, c in capas_portada():
        c = c.replace("PORT-", f"{n}-")
        (dest / f"pc-portada-{n}.svg").write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">' + c + "</svg>\n",
            encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# Pósters del recorrido de la web (public/portada/pc-parada-N.svg): cinco escenas vectoriales con la paleta,
# una por parada. El sujeto va a la derecha: a la izquierda va el texto de la parada.
# (El 11-oct-2026 la cuota diaria del generador de imágenes estaba agotada; estas escenas no son IA.)
# ─────────────────────────────────────────────────────────────────────────────

def _escena(cuerpo, pre, brillo=(1120, 450)):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">'
            f'<defs><pattern id="{pre}p" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.3" fill="#FFFFFF" opacity=".06"/></pattern>'
            f'<radialGradient id="{pre}r" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{hexa("pc-azul")}" stop-opacity=".34"/>'
            f'<stop offset="1" stop-color="{hexa("pc-noche")}" stop-opacity="0"/></radialGradient>{defs_imagen(pre)}</defs>'
            f'<rect width="1600" height="900" fill="{hexa("pc-noche")}"/><rect width="1600" height="900" fill="url(#{pre}p)"/>'
            f'<ellipse cx="{brillo[0]}" cy="{brillo[1]}" rx="620" ry="380" fill="url(#{pre}r)"/>{cuerpo}</svg>\n')


def posters():
    TR, BR = hexa("pc-trazo"), hexa("pc-bruma")
    out = {}
    # 1 · Sube: la zona de arrastre punteada y la imagen que entra en ella
    c = (f'<rect x="860" y="190" width="600" height="520" rx="26" fill="{hexa("pc-grafito")}" opacity=".7" stroke="{BR}" stroke-width="3" stroke-dasharray="14 12"/>'
         f'<g transform="rotate(-6 1160 420)">{imagen_plana(960, 300, 400, 270, "a", borde=True)}</g>'
         f'<path d="M1160 650 V600 M1136 624 L1160 600 L1184 624" fill="none" stroke="{hexa("pc-senal")}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
    out[1] = _escena(c, "a")
    # 2 · Separa: la imagen y sus tres capas levantadas en pila (todo dentro de los 1600 u de ancho)
    c = (imagen_plana(600, 600, 260, 175, "b")
         + f'<path d="M870 690 C930 690 940 650 990 650" fill="none" stroke="{TR}" stroke-width="2.4" stroke-dasharray="2 8" stroke-linecap="round"/>'
         + hoja_capa("fondo", 900, 650, 400, 260, "b", 1)
         + f'<path d="M1050 520 V610" stroke="{BR}" stroke-width="1.5" stroke-dasharray="3 7" opacity=".5"/>'
         + hoja_capa("figura", 950, 480, 400, 260, "b", 2)
         + f'<path d="M1100 350 V440" stroke="{BR}" stroke-width="1.5" stroke-dasharray="3 7" opacity=".5"/>'
         + hoja_capa("texto", 1000, 310, 400, 260, "b", 3))
    out[2] = _escena(c, "b", (1120, 500))
    # 3 · Edita una capa con texto: la capa FIGURA, la barra de instrucción (sin letras) y el cambio a medias
    w, h = 560, 380
    x0, y0 = 900, 300
    c = (f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="16" fill="url(#cdam)"/>'
         f'<clipPath id="ccorte1"><rect x="{x0}" y="{y0}" width="{w / 2:.0f}" height="{h}"/></clipPath>'
         f'<clipPath id="ccorte2"><rect x="{x0 + w / 2:.0f}" y="{y0}" width="{w / 2:.0f}" height="{h}"/></clipPath>'
         f'<g clip-path="url(#ccorte1)"><circle cx="{x0 + w / 2:.0f}" cy="{y0 + h / 2:.0f}" r="{h * .3:.0f}" fill="url(#cesf)"/></g>'
         f'<g clip-path="url(#ccorte2)"><circle cx="{x0 + w / 2:.0f}" cy="{y0 + h / 2:.0f}" r="{h * .3:.0f}" fill="{hexa("pc-capa-texto")}"/></g>'
         f'<path d="M{x0 + w / 2:.0f} {y0 - 10} V{y0 + h + 10}" stroke="{TR}" stroke-width="3"/>'
         f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="16" fill="none" stroke="{hexa("pc-capa-figura")}" stroke-width="3"/>'
         f'<rect x="{x0 + 40}" y="{y0 - 120}" width="{w - 80}" height="64" rx="32" fill="{hexa("pc-panel")}" stroke="{hexa("pc-linea-clara")}" stroke-width="2"/>'
         f'<rect x="{x0 + 76}" y="{y0 - 94}" width="230" height="12" rx="4" fill="{BR}" opacity=".7"/>'
         f'<rect x="{x0 + 318}" y="{y0 - 94}" width="80" height="12" rx="4" fill="{BR}" opacity=".45"/>'
         f'<circle cx="{x0 + w - 74}" cy="{y0 - 88}" r="22" fill="{hexa("pc-azul")}"/>'
         f'<path d="M{x0 + w - 74} {y0 - 100} l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4z" fill="#FFFFFF"/>')
    out[3] = _escena(c, "c")
    # 4 · Retoca: selección con hormigas, un trazo de pincel, las esquinas del recorte y el cuentagotas
    c = (imagen_plana(880, 220, 560, 400, "d")
         + f'<rect x="1010" y="300" width="260" height="220" fill="none" stroke="{TR}" stroke-width="3" stroke-dasharray="10 8"/>'
         + f'<path d="M920 560 C1000 500 1060 590 1140 540 S1300 500 1380 560" fill="none" stroke="{hexa("pc-capa-texto")}" stroke-width="16" stroke-linecap="round" opacity=".9"/>'
         + "".join(f'<path d="{d}" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="square"/>' for d in
                   ("M860 260 V200 H920", "M1400 200 H1460 V260", "M1460 580 V640 H1400", "M920 640 H860 V580"))
         + f'<circle cx="1420" cy="700" r="56" fill="{hexa("pc-panel")}" stroke="#FFFFFF" stroke-width="4"/>'
         + f'<circle cx="1420" cy="700" r="30" fill="{hexa("pc-capa-cielo")}"/>'
         + f'<path d="M1300 650 L1378 690" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>')
    out[4] = _escena(c, "d", (1160, 430))
    # 5 · Exporta: de la pila salen la imagen plana, un paquete con todas las capas y el proyecto que se reabre
    pila = "".join(f'<rect x="{760 + k * 14}" y="{380 - k * 14}" width="200" height="140" rx="12" fill="{hexa(n)}" stroke="{hexa("pc-noche")}" stroke-width="4"/>'
                   for k, n in enumerate(("pc-capa-fondo", "pc-capa-figura", "pc-capa-texto")))
    destinos = [(1150, 160), (1150, 380), (1150, 600)]
    flechas = "".join(f'<path d="M1010 420 C1080 420 1070 {y + 70} {x - 20} {y + 70} M{x - 34} {y + 58} L{x - 20} {y + 70} L{x - 34} {y + 82}" fill="none" stroke="{TR}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
                      for x, y in destinos)
    png = imagen_plana(1150, 160, 220, 140, "e")
    zip_ = ("".join(f'<rect x="{1150 + k * 10}" y="{380 + k * 10}" width="220" height="140" rx="12" fill="{hexa(n)}" stroke="{hexa("pc-noche")}" stroke-width="3"/>'
                    for k, n in enumerate(("pc-capa-fondo", "pc-capa-figura", "pc-capa-texto")))
            + f'<rect x="1150" y="436" width="250" height="26" rx="6" fill="{hexa("pc-panel")}" stroke="{BR}" stroke-width="2"/>'
            + "".join(f'<rect x="{1166 + i * 22}" y="443" width="12" height="12" rx="2" fill="{BR}"/>' for i in range(10)))
    proyecto = (f'<rect x="1150" y="600" width="220" height="140" rx="12" fill="{hexa("pc-grafito")}" stroke="{hexa("pc-azul")}" stroke-width="3"/>'
                f'<g transform="translate(1215 625) scale(.9)">{simbolo_cuerpo("color")}</g>')
    out[5] = _escena(pila + flechas + png + zip_ + proyecto, "e", (1100, 450))
    return out


def exportar_posters_web():
    dest = FRONT / "public" / "portada"
    dest.mkdir(parents=True, exist_ok=True)
    for k, svg in posters().items():
        (dest / f"pc-parada-{k}.svg").write_text(svg, encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# «Capas vivas»: respaldo estático del lienzo animado (assets/js/pc-v1-escaneo.js)
# ─────────────────────────────────────────────────────────────────────────────

_contador_er = {"n": 0}


def escaneo_respaldo_svg():
    _contador_er["n"] += 1
    pre = f"er{_contador_er['n']}-"
    return (f'<svg class="escaneo-respaldo" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">'
            f'<defs>{defs_imagen(pre, 20)}</defs>'
            f'<rect width="320" height="200" fill="{hexa("pc-noche")}"/>'
            + imagen_plana(18, 64, 104, 72, pre, borde=True).replace('rx="14"', 'rx="6"')
            + f'<g transform="translate(140 18) scale(.3)">'
            + hoja_capa("fondo", 0, 380, 420, 270, pre, 1) + hoja_capa("figura", 40, 230, 420, 270, pre, 2)
            + hoja_capa("texto", 80, 80, 420, 270, pre, 3) + "</g></svg>")


# ─────────────────────────────────────────────────────────────────────────────
# Componentes (usados por ambas salidas)
# ─────────────────────────────────────────────────────────────────────────────

def comp_indice(caps, **_):
    filas = []
    for c in caps:
        if c["num"] == "00":
            continue
        filas.append(f'<li><a href="#cap-{c["id"]}"><span class="ind-num">{c["num"]}</span>'
                     f'<span class="ind-tit">{esc(c["titulo"])}</span>'
                     f'<span class="ind-pag">{c["_pag_ini"]:02d}</span></a></li>')
    return '<ol class="indice">' + "".join(filas) + "</ol>"


def comp_portada(modo, **_):
    fondo = portada_html(en_capas=(modo == "inmersivo"))
    return (f'<div class="portada"><div class="portada-fondo">{fondo}</div>'
            '<div class="portada-texto">'
            f'<div class="portada-marca">{imago(oscuro=True)}</div>'
            '<p class="portada-lema">Una imagen, todas sus capas</p>'
            '<p class="portada-sub">Manual de Marca v1.0</p>'
            '<p class="portada-pie">Editor de imágenes por capas con IA · photoshop.cedula360.tech · Octubre de 2026</p>'
            "</div></div>")


def comp_contraportada(modo, **_):
    return ('<div class="portada contra"><div class="portada-fondo">' + portada_html() + "</div>"
            '<div class="portada-texto"><div class="contra-marca">' + imago(vertical=True) + "</div>"
            '<p class="contra-frase">La IA separa las capas; qué se edita lo decide quien edita.</p>'
            '<p class="portada-pie">PhotoClone · Manual de Marca v1.0 · Octubre de 2026 · '
            'Generado desde una sola fuente por scripts/build_v1.py</p></div></div>')


def comp_isotipo(variante="pc-simbolo.svg", fondo="claro", **_):
    return f'<figure class="fig-logo fondo-{fondo}">' + logo(variante, "logo-fig") + "</figure>"


def comp_isotipo_oscuro(**_):
    return comp_isotipo("pc-simbolo.svg", fondo="oscuro")


def comp_lema(**_):
    return ('<div class="lema"><p class="lema-txt">Una imagen, todas sus capas.</p>'
            '<p class="lema-pie">Subir · separar · editar · exportar</p></div>')


def comp_anatomia(**_):
    partes = [("1", "El cuadro · Grafito", "100 u con radio 22, del color del fondo del editor. Es el favicon y el icono."),
              ("2", "FONDO · Teal Fondo", "La capa de atrás: el paisaje, el cielo, lo que sostiene la imagen."),
              ("3", "FIGURA · Índigo Figura", "La capa del medio: el objeto principal, recortado sobre transparente."),
              ("4", "TEXTO · Ámbar Texto", "La capa de delante: rótulos y titulares. Un filete Grafito la separa de las otras."),
              ("5", "PhotoClone · el nombre", "Una palabra, Inter 800, con «Clone» en azul. Sustituye al icono «layers» de catálogo.")]
    return ('<div class="anatomia"><div class="anat-fig">' + imago(vertical=True) + "</div><ol class=\"anat-lista\">"
            + "".join(f'<li><span class="anat-n">{n}</span><div><strong>{esc(t)}</strong><p>{esc(d)}</p></div></li>' for n, t, d in partes)
            + "</ol></div>")


def comp_construccion(**_):
    """Retícula de construcción del símbolo con sus cotas."""
    tinta, borde, azul = hexa("pc-tinta"), hexa("pc-bruma"), hexa("pc-azul")
    rej = "".join(f'<path d="M{v} 0 V100 M0 {v} H100" stroke="{borde}" stroke-width=".2" opacity=".7"/>' for v in range(0, 101, 4))
    capas = "".join(f'<rect x="{x}" y="{y}" width="{CAPA}" height="{CAPA}" rx="{RCAPA}" fill="none" stroke="{azul}" stroke-width=".7"/>'
                    for x, y, _ in CAPAS_SIM)
    cotas = (f'<g font-family="JetBrains Mono, monospace" font-size="3.6" fill="{azul}">'
             '<text x="3" y="8">r 22</text><text x="17" y="13">capa 44 u · r 8</text><text x="62" y="96">paso 12 u</text></g>')
    return ('<figure class="construccion"><svg viewBox="-3 -3 106 106" width="100%" height="100%" aria-hidden="true">'
            f'{rej}<path d="{CUADRO_PATH}" fill="none" stroke="{tinta}" stroke-width=".6"/>{capas}{cotas}</svg>'
            '<figcaption>Retícula de 4 u sobre 100 × 100 · cuadro de radio 22 · tres capas de 44 u con radio 8, desplazadas 12 u en diagonal · filete de 5 u</figcaption></figure>')


VARIANTES = [("pc-simbolo.svg", "Principal", "Cuadro Grafito y las tres capas de color. Sobre claro y sobre oscuro", "claro"),
             ("pc-simbolo-tinta.svg", "Una tinta", "Tinta #18181B con las capas caladas: sellos y documentos", "claro"),
             ("pc-simbolo-blanco.svg", "Blanco", "Sobre fotografía o fondos oscuros de una sola tinta", "oscuro"),
             ("pc-simbolo-negro.svg", "100 % K", "Fotocopia, fax y grabado", "claro")]


def comp_variantes(**_):
    return ('<div class="variantes" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + "".join(
        f'<div class="var-card fondo-{f}"><div class="var-logo">{logo(n)}</div><div class="var-txt"><strong>{esc(t)}</strong><span>{esc(d)}</span></div></div>'
        for n, t, d, f in VARIANTES) + "</div>")


def comp_lockups(**_):
    return ('<div class="lockups">'
            f'<div class="lock"><div class="lock-fig">{imago()}</div><span>Horizontal sobre claro · la versión principal: documentos, PDF y este manual</span></div>'
            f'<div class="lock lock-oscuro"><div class="lock-fig">{imago(oscuro=True)}</div><span>Horizontal negativo · el editor, la portada y la imagen para compartir</span></div>'
            "</div>")


def comp_proteccion(**_):
    return ('<figure class="fig-proteccion"><div class="prot-caja">'
            '<span class="prot-x prot-x-t">X</span><span class="prot-x prot-x-b">X</span>'
            '<span class="prot-x prot-x-l">X</span><span class="prot-x prot-x-r">X</span>'
            + imago() + "</div>"
            '<figcaption>X = el radio del cuadro (33 u de 100): ese aire libre alrededor</figcaption></figure>')


def comp_minimos(**_):
    filas = [("Pantalla", "logotipo horizontal 130 px de ancho · símbolo 20 px", "height:24px"),
             ("Impresión", "logotipo horizontal 32 mm · símbolo 6 mm", "height:8mm"),
             ("Favicon 16 px", "el símbolo entero, sin el nombre", "height:16px")]
    out = ['<div class="minimos">']
    for a, b, e in filas:
        n = "pc-simbolo.svg" if "Favicon" in a else "pc-horizontal.svg"
        out.append(f'<div class="min-fila"><div class="min-logo">{logo(n, estilo=e + ";width:auto")}</div>'
                   f'<div><strong>{esc(a)}</strong><br><span class="mono">{esc(b)}</span></div></div>')
    out.append("</div>")
    return "".join(out)


def comp_incorrectos(**_):
    casos = [("transform:scaleX(1.45)", "", "No estirar ni comprimir el logotipo"),
             ("filter:hue-rotate(110deg)", "", "No cambiar los colores de las capas"),
             ("transform:rotate(-12deg)", "", "No rotar ni inclinar"),
             ("filter:drop-shadow(4px 4px 0 #18181B)", "", "No aplicar sombras duras, biseles ni 3D"),
             ("", "fondo", "No usar la versión negativa sobre claro"),
             ("", "iniciales", "No encerrar unas iniciales en un cuadro: es el lenguaje de otra marca"),
             ("", "texto", "No escribir «Photo Clone» separado ni «Photoshop»"),
             ("", "degradado", "No rellenar el nombre con degradados")]
    out = ['<div class="incorrectos">']
    for estilo, tipo, texto in casos:
        if tipo == "texto":
            fig = '<span class="inc-texto">Photo<i> Clone</i></span>'
        elif tipo == "iniciales":
            fig = ('<svg class="inc-emoji" viewBox="0 0 100 100" aria-hidden="true">'
                   f'<rect width="100" height="100" rx="18" fill="{hexa("pc-grafito")}" stroke="{hexa("pc-senal")}" stroke-width="5"/>'
                   f'<rect x="22" y="30" width="22" height="40" rx="3" fill="{hexa("pc-senal")}"/><rect x="54" y="30" width="22" height="40" rx="3" fill="{hexa("pc-senal")}"/></svg>')
        elif tipo == "degradado":
            fig = ('<span class="inc-texto inc-degradado">PhotoClone</span>')
        elif tipo == "fondo":
            fig = f'<div class="inc-logo">{logo("pc-horizontal-negativo.svg")}</div>'
        else:
            fig = f'<div class="inc-logo" style="{estilo}">{logo("pc-horizontal.svg")}</div>'
        clase = " inc-fondo" if tipo == "fondo" else ""
        out.append(f'<div class="inc-card"><div class="inc-fig{clase}">{fig}<span class="inc-x" aria-hidden="true">×</span></div><p>{esc(texto)}</p></div>')
    out.append("</div>")
    return "".join(out)


def comp_favicon(**_):
    tams = [(64, "512 · 192 (Android)"), (48, "180 (Apple)"), (32, "32"), (24, "24"), (16, "16")]
    celdas = "".join(f'<div class="fav"><div style="width:{p}px;height:{p}px">{logo("pc-simbolo.svg")}</div><span class="mono">{esc(t)}</span></div>' for p, t in tams)
    return f'<div class="favicons">{celdas}</div>'


def comp_escaneo(modo, **_):
    canvas = '<canvas class="escaneo-gl" aria-hidden="true" data-solo-inmersivo></canvas>' if modo == "inmersivo" else ""
    return f'<div class="escaneo-vivo">{canvas}{escaneo_respaldo_svg()}</div>'


def comp_paleta(ids, grande=False, **_):
    out = [f'<div class="paleta{" grande" if grande else ""}">']
    for i in ids:
        c = COLORES[i]
        h = c["hex"]
        r, g, b = (int(h[k:k + 2], 16) for k in (1, 3, 5))
        texto = "#FFFFFF" if contraste(h, "#FFFFFF") >= contraste(h, hexa("pc-noche")) else hexa("pc-noche")
        out.append(f'<button type="button" class="swatch" data-copiar="{h}" style="--sw:{h};--sw-t:{texto}">'
                   f'<span class="sw-color"><span class="sw-hex">{h}</span></span>'
                   f'<span class="sw-info"><strong>{esc(c["nombre"])} <span class="sw-origen">{ORIGENES[c["origen"]]}</span></strong><span class="mono">RGB {r} {g} {b} · --{esc(i)}</span>'
                   f'<span class="sw-rol">{esc(c["uso"])}</span></span></button>')
    out.append("</div>")
    return "".join(out)


def comp_degradados(**_):
    esc_c = "".join(f'<span style="background:{hexa(i)};color:{hexa(t)}">{n}</span>' for i, n, t in ELEMENTOS)
    return ('<div class="degradados">'
            f'<div class="grad-card"><span class="grad-barra escala-sev">{esc_c}</span>'
            '<strong>Las capas</strong><span class="mono">--pc-capa-fondo · --pc-capa-figura · --pc-capa-texto · --pc-azul</span>'
            '<p>Solo para nombrar capas y la acción de la IA. Siempre color + palabra o color + forma: nunca un color solo.</p></div>'
            f'<div class="grad-card"><span class="grad-barra" style="background:repeating-linear-gradient(90deg,{hexa("pc-trazo")} 0 6px,transparent 6px 14px),{hexa("pc-noche")}"></span>'
            f'<strong>El trazo</strong><span class="mono">Esmeralda Trazo {hexa("pc-trazo")} · solo gráfico</span>'
            '<p>La línea de selección y la guía que une una capa con su sitio. Punteada, sobre oscuro y sin texto encima.</p></div>'
            "</div>")


def comp_contraste(pares, **_):
    filas = []
    for fg, bg, uso in pares:
        fgh, bgh = hexa(fg), hexa(bg)
        r = contraste(fgh, bgh)
        n = nivel_wcag(r)
        filas.append(f'<tr><td><span class="ct-muestra" style="color:{fgh};background:{bgh}">Aa</span></td>'
                     f'<td class="mono">{fgh} / {bgh}</td><td class="mono">{r:.2f} : 1</td>'
                     f'<td><span class="ct-nivel nivel-{n.split()[0].lower()}">{n}</span></td><td>{inline(uso)}</td></tr>')
    return ('<table class="tabla compacta"><thead><tr><th>Muestra</th><th>Texto / fondo</th><th>Contraste</th>'
            '<th>WCAG 2.1</th><th>Uso</th></tr></thead><tbody>' + "".join(filas) + "</tbody></table>")


def comp_retirados(**_):
    filas = "".join(
        f'<tr><td><span class="ct-muestra" style="background:{r["hex"]};color:#fff">&nbsp;&nbsp;</span></td><td class="mono">{esc(r["hex"])}</td>'
        f'<td>{esc(r["nombre"])}</td><td>{inline(r["motivo"])}</td><td>{esc(r["sustituto"])}</td></tr>' for r in RETIRADOS)
    return ('<table class="tabla compacta"><thead><tr><th></th><th>Hex</th><th>Nombre</th><th>Por qué sale</th><th>Lo sustituye</th></tr></thead>'
            f'<tbody>{filas}</tbody></table>')


def comp_paleta_mini(**_):
    ids = ["pc-noche", "pc-grafito", "pc-azul", "pc-senal", "pc-capa-fondo", "pc-capa-figura", "pc-capa-texto", "pc-trazo"]
    return '<div class="paleta-mini" aria-hidden="true">' + "".join(
        f'<span style="background:{hexa(i)}"><em>{hexa(i)}</em></span>' for i in ids) + "</div>"


ICONOS = {  # trazos de 24 × 24 al estilo lineal (extremos redondeados)
    "subir": '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    "capas": '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    "varita": '<path d="m4 20 11-11M14 4v3M18.5 5.5l-2 2M20 10h-3M12.5 2.5l1 1"/>',
    "pincel": '<path d="M9.5 14.5 18 6a2 2 0 0 1 3 3l-8.5 8.5"/><path d="M9.5 14.5c-2-.5-4 1-4 3.5 0 1-1 2-2.5 2 3 2 7 1 7.5-2.5"/>',
    "exportar": '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    "codigo": '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    "escudo": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    "web": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    "ok": '<path d="M20 6 9 17l-5-5"/>',
}


def ico(n):
    return f'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONOS[n]}</svg>'


def comp_fondos(**_):
    casos = [("#FFFFFF", "pc-horizontal.svg", "Blanco: documentos, PDF y este manual"),
             (hexa("pc-niebla"), "pc-horizontal.svg", "Niebla #F4F4F5: secciones atenuadas"),
             (hexa("pc-grafito"), "pc-horizontal-negativo.svg", "Grafito #1E1E1E: el editor, la portada y el recorrido"),
             (hexa("pc-azul"), "pc-horizontal-blanco.svg", "Sobre el Azul Lienzo: solo la versión blanca")]
    return '<div class="fondos">' + "".join(
        f'<div class="fondo-card"><div class="fondo-muestra" style="background:{bg}">{logo(n)}</div><p>{esc(t)}</p></div>'
        for bg, n, t in casos) + "</div>"


def comp_especimen(familia, rol, muestra, pesos, **_):
    clases = {"Inter": "ff-display", "JetBrains Mono": "ff-mono"}
    return (f'<div class="especimen"><div class="esp-cab"><strong>{esc(familia)}</strong><span>{esc(rol)}</span></div>'
            f'<div class="esp-muestra {clases[familia]}">{esc(muestra)}</div>'
            f'<div class="esp-abc {clases[familia]}">Aa Bb Cc Ññ Áé 0123456789 ¿? «»</div>'
            f'<div class="esp-pesos mono">{esc(pesos)}</div></div>')


def comp_escala(**_):
    filas = [("Portada", "ff-display", "Inter 800", "56 px", "Una imagen, todas sus capas", "font-size:2.2em;font-weight:800;letter-spacing:-.02em"),
             ("H2", "ff-display", "Inter 700", "36 px", "La IA la separa en capas", "font-size:1.5em;font-weight:700"),
             ("H3", "ff-display", "Inter 600", "18 px", "Capa 2 · Figura", "font-size:1.1em;font-weight:600"),
             ("Cuerpo", "ff-sans", "Inter 400", "16 px / 1,6", "Cada capa se edita, se oculta o se exporta por separado.", "font-size:.95em;font-weight:400"),
             ("Código", "ff-mono", "JetBrains Mono 400", "14 px / 1,5", "POST /api/v1/decompose · layerCount 4", "font-size:.86em"),
             ("Dato", "ff-sans", "Inter 600 tabular", "14 px", "4 capas · 1024 × 768", "font-size:.88em;font-weight:600;font-variant-numeric:tabular-nums")]
    return ('<table class="tabla escala"><thead><tr><th>Nivel</th><th>Familia</th><th>Tamaño</th><th>Muestra</th></tr></thead><tbody>'
            + "".join(f'<tr><td>{a}</td><td class="mono">{c}</td><td class="mono">{d}</td><td class="{b}" style="{s};color:var(--pc-tinta)">{esc(e)}</td></tr>' for a, b, c, d, e, s in filas)
            + "</tbody></table>")


def comp_tipo_mini(**_):
    return ('<div class="tipo-mini" aria-hidden="true"><span class="ff-display" style="font-weight:800">Aa</span><span class="ff-display" style="font-weight:400">Aa</span>'
            '<span class="ff-mono" style="font-weight:700">.png</span><span class="ff-mono" style="font-weight:400">4×</span></div>')


def comp_tokens(**_):
    grupos = [("MARCA", ["pc-azul", "pc-azul-hondo", "pc-senal", "pc-seleccion", "pc-trazo"]),
              ("EDITOR", ["pc-noche", "pc-grafito", "pc-panel", "pc-linea", "pc-texto", "pc-tenue"]),
              ("CAPAS", [i for i, _, _ in ELEMENTOS[:3]])]
    lineas = []
    for g, ids in grupos:
        lineas.append(f'<span class="c-com">/* {g} */</span>')
        for i in ids:
            lineas.append(f'<span class="c-var">--{i}</span>: {hexa(i)};')
    return '<pre class="codigo">' + "\n".join(lineas) + "</pre>"


def comp_pantalla(**_):
    return ('<div class="pantalla" aria-label="Arquitectura de pantalla del editor">'
            '<div class="pt-logo">PhotoClone</div><div class="pt-nav">Archivo · Editar · Imagen · Capa · Filtro · Vista</div>'
            '<div class="pt-side">Mover<br>Selección<br>Lazo<br>Pincel<br>Borrador<br>Texto<br>Recortar<br>Cuentagotas<br>Zoom<br>Mano</div>'
            '<div class="pt-main"><div>Lienzo: la imagen con todas sus capas visibles</div>'
            '<div class="pt-kpis"><span>Capas</span><span>IA</span><span>Historial</span><span>Exportar</span></div>'
            '<div>Panel de capas: visibilidad, opacidad, modo de fusión y orden</div><div>.png · .zip · .photoclone</div></div></div>')


def comp_componentes(**_):
    cs = "".join(f'<span class="sev-demo" style="background:{hexa(i)};color:{hexa(t)}">{n}</span>' for i, n, t in ELEMENTOS)
    return ('<div class="comp-fila"><span class="btn-demo btn-marca">' + ico("capas") + ' Separar en capas</span><small>.btn-marca · Azul Lienzo, texto blanco</small>'
            '<span class="btn-demo btn-claro">Exportar PNG</span><small>.btn-claro</small>'
            '<span class="btn-demo btn-outline">Abrir el editor</span><small>.btn-outline</small></div>'
            f'<div class="comp-fila">{cs}<small>Capa: color + palabra</small></div>'
            '<div class="tarjeta card3d card-viva"><div class="c3-cab">Capa 2 · Figura <span class="muted-oscuro">(ejemplo)</span></div><div class="c3-cuerpo">'
            f'<p class="small mono" style="margin:0 0 .4em">{ico("varita")} Editar con IA · «cambia el color a ámbar»</p>'
            '<p class="small muted" style="margin:0">La instrucción viaja con la capa al modelo de edición; lo que vuelve es otra capa, que se acepta o se descarta.</p></div></div>')


def comp_pilares(**_):
    return ('<div class="suite">' + "".join(
        f'<div class="suite-mod"><span class="suite-ico">{ico(c["icono"])}</span><strong>{esc(c["titulo"])}</strong>'
        f'<p>{inline(esc(c["texto"]) + " {f:" + c["fuente"] + "}")}</p></div>' for c in PRODUCTO["etapas"]) + "</div>")


def comp_formatos(**_):
    """Lo que se exporta (src/lib/export/): imagen plana, paquete con todas las capas y proyecto reeditable."""
    return ('<div class="capas-op">' + "".join(
        f'<div class="capa-op" style="--capa:{hexa(t["color"])};--capa-t:{"#FFFFFF" if contraste(hexa(t["color"]), "#FFFFFF") >= 4.5 else hexa("pc-tinta")}"><span class="capa-letra ext">{esc(t["ext"])}</span>'
        f'<div><strong>{esc(t["nombre"])}</strong>'
        f'<p>{inline(esc(t["texto"]) + " {f:" + t["fuente"] + "}")}</p></div></div>' for t in PRODUCTO["formatos"]) + "</div>")


def comp_entregables(**_):
    return ('<div class="modulos-op dos">' + "".join(
        f'<div class="mod-op"><strong>{ico(e["icono"])} {esc(e["nombre"])}</strong><span class="mono">{esc(e["id"])}</span><p>{inline(esc(e["texto"]) + " {f:" + e["fuente"] + "}")}</p></div>'
        for e in PRODUCTO["canales"]) + "</div>")


def comp_elementos(**_):
    return ('<div class="conceptos-op">' + "".join(
        f'<div class="concepto-op"><span class="sev-demo" style="background:{hexa(c["color"])};color:{hexa(c["texto"])}">{esc(c["id"])}</span>'
        f'<p>{inline(esc(c["x"]) + " {f:" + c["fuente"] + "}")}</p></div>' for c in PRODUCTO["elementos"]) + "</div>")


def comp_campos(**_):
    return ('<p class="campos mono" data-revelar>' + " · ".join(esc(c) for c in PRODUCTO["campos"]) + "</p>")


def comp_cronologia(modo, **_):
    hitos = HITOS["hitos"]
    celdas = "".join(
        f'<div class="cr-hito{" creacion" if h["papel"] == "marca" else ""}"><span class="cr-fecha">{esc(h["fecha"])}</span>'
        f'<span class="cr-acto">{esc(h["acto"])}</span><p>{inline(h["resumen"] + " {f:" + h["fuente"] + "}")}</p></div>'
        for h in hitos)
    n = len(hitos) if modo == "inmersivo" else 5
    crono = f'<div class="crono" style="--n:{n};min-width:{len(hitos) * 11 if modo == "inmersivo" else 0}em">{celdas}</div>'
    if modo == "inmersivo":
        crono = f'<div class="crono-scroll" tabindex="0" role="region" aria-label="Cronología de PhotoClone, desplazable">{crono}</div>'
    ley = ('<p class="crono-ley"><span><i style="background:var(--pc-trazo)"></i>Hito de marca</span>'
           '<span><i style="background:var(--pc-tinta)"></i>Hito de producto</span></p>')
    return crono + ley


def comp_og(**_):
    return ('<div class="og-tarjeta"><div class="og-cab">' + imago(oscuro=True) + '</div>'
            '<p class="og-tit">Una imagen, todas sus capas</p>'
            '<p class="og-sub">Separe una imagen en capas con IA, edite cada una con una instrucción y exporte en PNG, ZIP o proyecto.</p>'
            '<p class="og-pie"><span>FONDO</span><span>FIGURA</span><span>TEXTO</span><b>photoshop.cedula360.tech</b></p></div>')


def comp_cabecera_informe(**_):
    return ('<div class="cab-informe"><span class="ci-firma"></span><div class="ci-cuerpo">' + imago(oscuro=True)
            + '<p class="ci-tit">Proyecto · [nombre del archivo].photoclone</p><p class="ci-meta mono">[ancho] × [alto] · [n] capas · [fecha]</p>'
            + "".join(f'<span class="sev-demo" style="background:{hexa(i)};color:{hexa(t)}">{n}</span>' for i, n, t in ELEMENTOS[:3])
            + "</div></div>")


def comp_kpis(items, **_):
    return '<div class="kpis">' + "".join(
        f'<div class="kpi"><span class="kpi-v">{esc(i["v"])}</span><span class="kpi-l">{inline(esc(i["l"]))}</span></div>' for i in items) + "</div>"


def comp_bibliografia(desde=0, hasta=None, **_):
    out = ['<ol class="biblio" start="' + str(desde + 1) + '">']
    for f in FUENTES[desde:hasta]:
        url = f'<span class="mono biblio-url">{esc(f["url"])}</span>' if f.get("url") else ""
        out.append(f'<li id="fuente-{f["id"]}"><strong>{esc(f["autor"])}</strong>. <em>{esc(f["titulo"])}</em>. {esc(f["detalle"])}. {url}</li>')
    out.append("</ol>")
    return "".join(out)


COMPONENTES = {
    "portada": comp_portada, "contraportada": comp_contraportada, "indice": comp_indice,
    "isotipo": comp_isotipo, "isotipo-oscuro": comp_isotipo_oscuro, "lema": comp_lema,
    "anatomia": comp_anatomia, "construccion": comp_construccion, "variantes": comp_variantes,
    "lockups": comp_lockups, "proteccion": comp_proteccion, "minimos": comp_minimos,
    "incorrectos": comp_incorrectos, "favicon": comp_favicon, "escaneo": comp_escaneo,
    "paleta": comp_paleta, "degradados": comp_degradados, "contraste": comp_contraste, "retirados": comp_retirados,
    "paleta-mini": comp_paleta_mini, "fondos": comp_fondos,
    "especimen": comp_especimen, "escala": comp_escala, "tipo-mini": comp_tipo_mini, "tokens": comp_tokens,
    "pantalla": comp_pantalla, "componentes": comp_componentes, "pilares": comp_pilares,
    "formatos": comp_formatos, "entregables": comp_entregables, "elementos": comp_elementos, "campos": comp_campos,
    "cronologia": comp_cronologia, "og": comp_og, "cabecera-informe": comp_cabecera_informe, "kpis": comp_kpis,
    "bibliografia": comp_bibliografia,
}

# ─────────────────────────────────────────────────────────────────────────────
# Bloques de contenido (mismo vocabulario que KANSA v6, ENKI v2, Maloca v2, Isabella v2, Flyn v1 y Pentest v1)
# ─────────────────────────────────────────────────────────────────────────────


def bloque(b, ctx):
    t = b["t"]
    if t == "eyebrow":
        return f'<p class="eyebrow">{inline(b["x"])}</p>'
    if t in ("h2", "h3"):
        return f'<{t} data-revelar>{inline(b["x"])}</{t}>'
    if t == "p":
        return f'<p class="{b.get("c", "")}" data-revelar>{inline(b["x"])}</p>'
    if t == "lista":
        tag = "ol" if b.get("c") == "num" else "ul"
        return f'<{tag} class="lista {b.get("c", "")}" data-revelar>' + "".join(f"<li>{inline(i)}</li>" for i in b["items"]) + f"</{tag}>"
    if t == "nota":
        tit = f'<strong class="nota-tit">{inline(b["titulo"])}</strong>' if b.get("titulo") else ""
        return f'<aside class="nota nota-{b.get("tono", "azul")}" data-revelar>{tit}<p>{inline(b["x"])}</p></aside>'
    if t == "tabla":
        cab = "".join(f"<th>{inline(c)}</th>" for c in b["cab"])
        filas = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in f) + "</tr>" for f in b["filas"])
        return f'<table class="tabla {b.get("c", "")}" data-revelar><thead><tr>{cab}</tr></thead><tbody>{filas}</tbody></table>'
    if t == "cols":
        cols = "".join(f'<div class="col">{"".join(bloque(x, ctx) for x in c)}</div>' for c in b["cols"])
        return f'<div class="cols" style="--cols:{b.get("r", "1fr 1fr")}">{cols}</div>'
    if t == "grid":
        items = "".join(
            (bloque(it, ctx) if isinstance(it, dict) else
             '<div class="celda">' + "".join(bloque(x, ctx) for x in it) + "</div>")
            for it in b["items"])
        return f'<div class="grid g{b.get("n", 3)}">{items}</div>'
    if t == "tarjeta":
        sub = f'<span class="tar-sub">{inline(b["sub"])}</span>' if b.get("sub") else ""
        viva = " card-viva" if ctx["modo"] == "inmersivo" else ""
        return (f'<div class="tarjeta tono-{b.get("tono", "neutro")}{viva}" data-revelar><strong class="tar-tit">{inline(b["titulo"])}</strong>'
                f'{sub}<p>{inline(b["x"])}</p></div>')
    if t == "comp":
        args = {k: v for k, v in b.items() if k not in ("t", "n")}
        return COMPONENTES[b["n"]](modo=ctx["modo"], caps=ctx["caps"], **args)
    if t == "sep":
        return '<hr class="sep">'
    raise SystemExit(f"Tipo de bloque desconocido: {t}")


# ─────────────────────────────────────────────────────────────────────────────
# Capítulos y páginas
# ─────────────────────────────────────────────────────────────────────────────

def cargar_capitulos():
    caps = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(CONTENIDO.glob("[0-9][0-9]_*.json"))]
    pag = 1
    for c in caps:
        c["_pag_ini"] = pag
        pag += len(c["paginas"])
    return caps, pag - 1


def portadilla(c, pg, ctx):
    fig = ""
    if pg.get("fig"):
        fig = f'<div class="porta-fig">{bloque({"t": "comp", "n": pg["fig"]}, ctx)}</div>'
    lead = f'<p class="porta-lead">{inline(c["lead"])}</p>' if c.get("lead") else ""
    extra = "".join(bloque(b, ctx) for b in pg.get("bloques", []))
    return (f'<div class="porta"><div class="porta-texto"><p class="porta-num">{esc(c["num"])}</p>'
            f'<p class="eyebrow">{esc(c["kicker"])}</p><h2 class="porta-tit" data-titulo>{esc(c["titulo"])}</h2>'
            f'{lead}{extra}</div>{fig}</div>')


def render_impresion(caps, total):
    ctx = {"modo": "impresion", "caps": caps}
    out = []
    n = 0
    for c in caps:
        for i, pg in enumerate(c["paginas"]):
            n += 1
            plantilla_ = pg.get("plantilla", "libre")
            tono = pg.get("tono", "claro" if plantilla_ == "libre" else "noche")
            ancla = f' id="cap-{c["id"]}"' if i == 0 else ""
            cuerpo = portadilla(c, pg, ctx) if plantilla_ == "portadilla" else "".join(bloque(b, ctx) for b in pg["bloques"])
            cabecera = ("" if plantilla_ == "portada" else
                        f'<header class="pg-cab"><span>{SELLO_PIE}</span>'
                        f'<span>{esc(c["num"])} · {esc(c["corto"])}</span></header>')
            pie = "" if plantilla_ == "portada" else f'<footer class="pg-pie"><span class="pg-n">{n:02d}</span></footer>'
            densa = " densa" if pg.get("densa") else (" amplia" if pg.get("amplia") else "")
            out.append(f'<section class="page plantilla-{plantilla_} sup-{tono}{densa}"{ancla} data-pagina="{n}">'
                       f'{cabecera}<div class="pg-cuerpo">{cuerpo}</div>{pie}</section>')
    assert n == total
    return "\n".join(out)


def render_inmersivo(caps):
    ctx = {"modo": "inmersivo", "caps": caps}
    out = []
    for c in caps:
        laminas = []
        for pg in c["paginas"]:
            plantilla_ = pg.get("plantilla", "libre")
            tono = pg.get("tono", "claro" if plantilla_ == "libre" else "noche")
            cuerpo = portadilla(c, pg, ctx) if plantilla_ == "portadilla" else "".join(bloque(b, ctx) for b in pg["bloques"])
            laminas.append(f'<div class="lamina plantilla-{plantilla_} sup-{tono}">{cuerpo}</div>')
        out.append(f'<section class="escena" id="cap-{c["id"]}" data-escena="{esc(c["num"])}"'
                   f' data-titulo-escena="{esc(c["corto"])}" aria-label="{esc(c["num"])} · {esc(c["titulo"])}">'
                   + "".join(laminas) + "</section>")
    return "\n".join(out)


def nav_items(caps):
    return "".join(
        f'<li><a href="#cap-{c["id"]}" data-ir="cap-{c["id"]}"><span class="rail-num">{esc(c["num"])}</span>'
        f'<span class="rail-tit">{esc(c["corto"])}</span></a></li>' for c in caps)


# ─────────────────────────────────────────────────────────────────────────────
# Ensamblado de salidas
# ─────────────────────────────────────────────────────────────────────────────

SCRIPTS_INMERSIVO = [
    "assets/js/vendor/gsap.min.js", "assets/js/vendor/ScrollTrigger.min.js",
    "assets/js/vendor/ScrollToPlugin.min.js", "assets/js/vendor/SplitText.min.js",
    "assets/js/pc-v1-bucle.js", "assets/js/pc-v1-escaneo.js", "assets/js/pc-v1-nucleo.js",
]
TIPOS_IMG = {".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp"}


def css_con_fuentes_inline(css_rel, dir_fuentes):
    css = leer(css_rel)

    def rep(m):
        b64 = base64.b64encode((BASE / dir_fuentes / m.group(1)).read_bytes()).decode("ascii")
        return f"url(data:font/woff2;base64,{b64}) format('woff2')"
    return re.sub(r"url\('([^']+\.woff2)'\)\s*format\('woff2'\)", rep, css)


def js_seguro(s):
    return s.replace("</script", "<\\/script")


def plantilla(nombre, **vals):
    s = leer(f"plantillas/{nombre}")
    for k, v in vals.items():
        s = s.replace("{{" + k + "}}", v)
    resto = re.findall(r"\{\{[A-Z_]+\}\}", s)
    if resto:
        raise SystemExit(f"Marcadores sin rellenar en {nombre}: {resto}")
    return s


FRONT = REPO  # la aplicación Next.js vive en la raíz del repositorio


def exportar_web():
    """Lo que la aplicación usa de la marca, copiado desde aquí (no editar allí):
    tokens, fuentes y colores (src/marca/), woff2 y logos (public/marca/) y favicons (public/ y src/app/icon.svg)."""
    (FRONT / "src" / "marca").mkdir(parents=True, exist_ok=True)
    (FRONT / "public" / "marca" / "fuentes").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(BASE / "assets/data/tokens-v1.css", FRONT / "src/marca/tokens-v1.css")
    (FRONT / "src/marca/tema-v1.css").write_text(tema_app_css(), encoding="utf-8")
    (FRONT / "src/marca/colores-v1.json").write_text(colores_app_json(), encoding="utf-8")
    for f in FUENTES_WEB:
        shutil.copyfile(BASE / "assets/fonts" / f, FRONT / "public/marca/fuentes" / f)
    for f in LOGOS_WEB:
        shutil.copyfile(BASE / "assets/logos" / f, FRONT / "public/marca" / f)
    for f in FAVICONS:
        shutil.copyfile(BASE / "assets/logos" / f, FRONT / "public" / f)
    shutil.copyfile(BASE / "assets/logos/pc-simbolo.svg", FRONT / "src/app/icon.svg")


FUENTES_WEB = ("inter-var.woff2", "jetbrainsmono-400.woff2", "jetbrainsmono-700.woff2", "material-symbols-pc.woff2")
LOGOS_WEB = ("pc-simbolo.svg", "pc-horizontal.svg", "pc-horizontal-negativo.svg", "pc-simbolo-blanco.svg")
FAVICONS = ("favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "icono-192.png", "icono-512.png")


def raiz_css():
    """El :root del CSS base se reescribe desde la paleta: el audit lo compara con los tokens."""
    p = BASE / "assets/css/pc-v1-base.css"
    css = p.read_text(encoding="utf-8")
    ids = list(COLORES)
    lineas = []
    for i in range(0, len(ids), 4):
        lineas.append("  " + " ".join(f"--{k}: {COLORES[k]['hex']};" for k in ids[i:i + 4]))
    bloque_ = "  /* Paleta cerrada: contenido/paleta.json (la escribe build_v1.py). */\n" + "\n".join(lineas) + "\n"
    nuevo = re.sub(r"(:root \{\n)(.*?)(  --blanco: #FFFFFF;)", lambda m: m.group(1) + bloque_ + m.group(3), css, count=1, flags=re.S)
    if nuevo != css:
        p.write_text(nuevo, encoding="utf-8")


def main():
    generar_logos()
    exportar_tokens()
    raiz_css()
    exportar_web()
    exportar_capas_web()
    exportar_posters_web()
    caps, total = cargar_capitulos()

    _contador_svg["n"] = _contador_port["n"] = _contador_er["n"] = 0
    imp = plantilla("impresion.html.tpl", PAGINAS=render_impresion(caps, total), TOTAL=str(total), VERSION=VERSION)
    (BASE / "impresion.html").write_text(imp, encoding="utf-8")

    _contador_svg["n"] = _contador_port["n"] = _contador_er["n"] = 0
    escenas = render_inmersivo(caps)
    scripts = "\n".join(f'<script src="{s}"></script>' for s in SCRIPTS_INMERSIVO)
    idx = plantilla("inmersivo.html.tpl", ESCENAS=escenas, NAV=nav_items(caps), SCRIPTS=scripts,
                    ISOTIPO_CAB=svg_en_linea("pc-simbolo.svg"), VERSION=VERSION, TOTAL=str(total))
    (BASE / "index.html").write_text(idx, encoding="utf-8")

    port = idx.replace('<link rel="stylesheet" href="assets/fonts/fonts.css">',
                       "<style>\n" + css_con_fuentes_inline("assets/fonts/fonts.css", "assets/fonts") + "\n</style>")
    for css in ["assets/css/pc-v1-base.css", "assets/css/pc-v1-inmersivo.css"]:
        etiqueta = f'<link rel="stylesheet" href="{css}">'
        if etiqueta not in port:
            raise SystemExit(f"Falta {etiqueta} en la plantilla")
        port = port.replace(etiqueta, "<style>\n" + leer(css) + "\n</style>")
    for s in SCRIPTS_INMERSIVO:
        port = port.replace(f'<script src="{s}"></script>', "<script>\n" + js_seguro(leer(s)) + "\n</script>")
    for rel in sorted(IMAGENES):
        datos = base64.b64encode((BASE / "assets" / rel).read_bytes()).decode("ascii")
        port = port.replace(f'src="assets/{rel}"', f'src="data:{TIPOS_IMG[Path(rel).suffix]};base64,{datos}"')
    port = re.sub(r'\s*<link rel="icon"[^>]*>', "", port)
    port = port.replace('href="impresion.html"', 'href="Manual_Marca_PhotoClone_v1.pdf"')
    sello = ("<!-- ═══ PhotoClone v1.0 · PORTABLE AUTOCONTENIDO ═══\n"
             "     GENERADO por scripts/build_v1.py desde contenido/ + plantillas/ + assets/.\n"
             "     No editar a mano. Tipografías, estilos, librerías (GSAP), logos e imágenes incrustados. -->\n")
    port = port.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + sello, 1)
    (BASE / PORTABLE).write_text(port, encoding="utf-8")

    for n in ("impresion.html", "index.html", PORTABLE, "assets/data/tokens-v1.css", "assets/logos/pc-simbolo.svg"):
        p = BASE / n
        print(f"OK → {n:38s} {p.stat().st_size / 1024:8.1f} KB  sha256 {hashlib.sha256(p.read_bytes()).hexdigest()[:12]}")
    print(f"Páginas: {total} · Capítulos: {len(caps)} · Colores: {len(COLORES)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
