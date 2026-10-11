#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fuentes_v1.py — Recorta e instancia las TTF variables de fuentes/ (SIL OFL 1.1)
a woff2 para el manual y la web de PhotoClone.

  Inter            wght 400–800, opsz 14–32 (variable)  titulares, texto, botones y datos
  JetBrains Mono   400 y 700 (estáticas)                código, antetítulos y cotas
  Inter era la fuente de la aplicación, pedida a Google Fonts.

Subconjunto: latín básico y extendido A, puntuación, flechas, operadores y los
glifos del semáforo (✓ ✕ ⚠ ℹ ◷). audit_v1.py comprueba que cubre el texto.
Uso: python3 docs/Manual_Marca_PhotoClone/v1.0/scripts/fuentes_v1.py
"""
import sys
import tempfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

BASE = Path(__file__).resolve().parent.parent
ORIGEN = BASE / "fuentes"
DESTINO = BASE / "assets" / "fonts"
UNICODES = ("U+0020-007E,U+00A0-017F,U+0192,U+02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,"
            "U+2190-2199,U+2212,U+2215,U+2248,U+2260,U+2264-2265,U+2713,U+2715,U+25A4,U+25F7,U+26A0,U+2139")
TRABAJOS = [
    ("inter/Inter[opsz,wght].ttf", "inter-var.woff2", {"wght": (400, 800), "opsz": (14, 32)}),
    ("jetbrainsmono/JetBrainsMono-Regular.ttf", "jetbrainsmono-400.woff2", None),
    ("jetbrainsmono/JetBrainsMono-Bold.ttf", "jetbrainsmono-700.woff2", None),
]


def main():
    for src, dst, ejes in TRABAJOS:
        f = TTFont(ORIGEN / src)
        if ejes:
            f = instancer.instantiateVariableFont(f, ejes)
        with tempfile.NamedTemporaryFile(suffix=".ttf") as tmp:
            f.save(tmp.name)
            fo = TTFont(tmp.name)
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["kern", "liga", "calt", "tnum", "lnum", "case", "ccmp", "locl", "mark", "mkmk"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        s = subset.Subsetter(opts)
        s.populate(unicodes=subset.parse_unicodes(UNICODES))
        s.subset(fo)
        fo.flavor = "woff2"
        fo.save(DESTINO / dst)
        print(f"{dst:26s} {(DESTINO / dst).stat().st_size / 1024:6.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
