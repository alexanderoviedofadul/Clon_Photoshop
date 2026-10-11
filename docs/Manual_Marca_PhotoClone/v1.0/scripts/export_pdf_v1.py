#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_pdf_v1.py — impresion.html → Manual_Marca_PhotoClone_v1.pdf (A4 apaisado).
Copiado de export_pdf_v2.py del Manual Isabella EA v2.0 (← KANSA v6.0).

Tres garantías:
  · rutas desde BASE (funciona desde cualquier carpeta);
  · bloquea toda petición que no sea file:/data: (el PDF no depende de la red);
  · espera a document.fonts.ready + window.PC_LISTO en vez de un tiempo fijo.
Al final verifica con pdfinfo el número de páginas y su tamaño.

Uso: python3 docs/Manual_Marca_PhotoClone/v1.0/scripts/export_pdf_v1.py
"""
import os
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
HTML = BASE / "impresion.html"
PDF = BASE / "Manual_Marca_PhotoClone_v1.pdf"
# Chromium fijado: la versión de Playwright de Python cambió y su navegador por defecto no está instalado.
CHROME = os.environ.get("CHROME_PATH", '/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')


def main():
    total = int(re.search(r'data-total="(\d+)"', HTML.read_text(encoding="utf-8")).group(1))
    externas = []
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=CHROME)
        pag = nav.new_page()

        def filtro(route):
            if route.request.url.startswith(("file:", "data:")):
                route.continue_()
            else:
                externas.append(route.request.url)
                route.abort()
        pag.route("**/*", filtro)
        pag.goto(HTML.as_uri())
        pag.wait_for_function("window.PC_LISTO === true", timeout=30000)
        pag.emulate_media(media="print")
        pag.pdf(path=str(PDF), prefer_css_page_size=True, print_background=True,
                margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        nav.close()

    info = subprocess.run(["pdfinfo", str(PDF)], capture_output=True, text=True).stdout
    paginas = int(re.search(r"Pages:\s+(\d+)", info).group(1))
    tam = re.search(r"Page size:\s+([\d.]+) x ([\d.]+)", info)
    ancho, alto = float(tam.group(1)), float(tam.group(2))
    print(f"PDF → {PDF.name}  {PDF.stat().st_size / 1024:.0f} KB · {paginas} páginas · {ancho:.1f} × {alto:.1f} pt")
    errores = []
    if externas:
        errores.append(f"peticiones externas bloqueadas: {externas}")
    if paginas != total:
        errores.append(f"se esperaban {total} páginas y hay {paginas}")
    if abs(ancho - 841.89) > 2 or abs(alto - 595.28) > 2:
        errores.append("el tamaño no es A4 apaisado (841,89 × 595,28 pt)")
    for e in errores:
        print("ERROR:", e, file=sys.stderr)
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
