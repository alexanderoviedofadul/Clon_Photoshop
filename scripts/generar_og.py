#!/usr/bin/env python3
"""Imagen para compartir (public/og-photoclone-v1.png, 1200 × 630) a partir de las capas de la portada y el
logotipo negativo que escribe el build del manual. Uso: python3 -B scripts/generar_og.py
Si cambian las capas o el logotipo, se vuelve a generar y se cambia el nombre del archivo (las redes la guardan
por URL) en src/app/layout.tsx."""
import base64
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

R = Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME_PATH", "/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome")


def datos(p):
    return "data:image/svg+xml;base64," + base64.b64encode(p.read_bytes()).decode()


def woff(p):
    return "data:font/woff2;base64," + base64.b64encode(p.read_bytes()).decode()


capas = "".join(f'<img src="{datos(R / "public/identidad" / f"pc-portada-{n}.svg")}">'
                for n in ("fondo", "plano", "capa-fondo", "capa-figura", "capa-texto", "suelo"))
html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Inter; src: url({woff(R / 'public/marca/fuentes/inter-var.woff2')}) format('woff2'); font-weight: 100 900; }}
body {{ margin: 0; width: 1200px; height: 630px; background: #121212; font-family: Inter; overflow: hidden; position: relative; }}
.arte img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 70% 100%; }}
.txt {{ position: absolute; left: 64px; top: 72px; width: 520px; }}
.txt img {{ height: 54px; }}
h1 {{ color: #fff; font-size: 64px; line-height: 1.05; letter-spacing: -.03em; font-weight: 800; margin: 40px 0 18px; }}
h1 span {{ color: #FBBF24; }}
p {{ color: #CCCCCC; font-size: 24px; line-height: 1.4; margin: 0; }}
.pie {{ position: absolute; left: 64px; bottom: 48px; color: #A1A1AA; font-size: 20px; }}
</style></head><body><div class="arte">{capas}</div>
<div class="txt"><img src="{datos(R / 'public/marca/pc-horizontal-negativo.svg')}"><h1>Una imagen, <span>todas sus capas</span></h1>
<p>Sepárela con IA, edite cada capa y exporte.</p></div></body></html>"""
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CHROME)
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.set_content(html)
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(R / "public/og-photoclone-v1.png"))
    b.close()
print("OK → public/og-photoclone-v1.png")
