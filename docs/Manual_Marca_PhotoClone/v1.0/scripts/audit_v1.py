#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_v1.py — Barrera de calidad del Manual de Marca PhotoClone v1.0.
Copiada del audit_v1.py de DeepMap v1.0 (← AuditorTecnicoIA v1.0 ← Pentest C360 v1.0 ← Flyn.sh v1.0 ← Isabella EA v2.0 ← Maloca v2.0 ← ENKI v2.0 ← KANSA v6.0),
sin audio. Se audita TODO:

  impresión   desborde de cada elemento (incluidos SVG) fuera del cuerpo de la
              página · logos dentro de su caja y dibujo dentro de su viewBox ·
              solape entre líneas de texto · ids duplicados · páginas = total
  ejecución   cero errores de consola, cero excepciones y cero peticiones que no
              sean file:/data: (index.html, portable e impresion.html)
  inmersivo   0 AudioContext (sin audio) · como mucho 1 bucle
              requestAnimationFrame activo · movimiento reducido = escaneo estático
              y nada sin revelar · Cmd/Ctrl+tecla no se intercepta · índice con Esc
  fuentes     document.fonts.check de cada familia + cobertura de glifos (fontTools)
  portable    ≤ 2,5 MB, sin recursos externos ni rutas a assets/ · build determinista
  datos       hitos con fuente · herramientas, modos de fusión, filtros, exportaciones, capas (2-10, 4) y
              alcances de la API = los del código · lista negra de afirmaciones retiradas · tokens del CSS = paleta ·
              copias en la aplicación (tokens, tema, colores, fuentes, logos, favicons, capas del hero, pósters)
              = las del manual · Logo.tsx dibuja las mismas capas que el maestro

Sale con código 1 si algo falla. Uso: python3 docs/Manual_Marca_PhotoClone/v1.0/scripts/audit_v1.py
"""
import hashlib
import os
import json
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
REPO = BASE.parents[2]
CHROME = os.environ.get("CHROME_PATH", '/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')
FALLOS, AVISOS = [], []


def fallo(m):
    FALLOS.append(m)
    print("  ✗", m)


def ok(m):
    print("  ✓", m)


JS_PAGINAS = r"""() => {
  const out = { desbordes: [], logos: [], solapes: [], paginas: 0 };
  const T = 1.5;
  const fuera = (r, c) => Math.max(r.bottom - c.bottom, r.right - c.right, c.left - r.left, c.top - r.top);
  const recortados = '.inc-fig, .portada-fondo, .escaneo-vivo, .paleta-mini, .captura, .pantalla, .bn-fondo';
  document.querySelectorAll('section.page').forEach(pg => {
    out.paginas++;
    const n = pg.dataset.pagina;
    const cuerpo = (pg.querySelector('.pg-cuerpo') || pg).getBoundingClientRect();
    const limite = pg.classList.contains('plantilla-portada') ? pg.getBoundingClientRect() : cuerpo;
    pg.querySelectorAll('.pg-cuerpo *').forEach(el => {
      if (el.closest(recortados) && !el.matches(recortados)) return;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const o = fuera(r, limite);
      if (o > T) out.desbordes.push(`p${n} ${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]} sale ${o.toFixed(1)}px: «${(el.textContent || '').trim().slice(0, 40)}»`);
    });
    pg.querySelectorAll('[data-logo]').forEach(caja => {
      const svg = caja.querySelector('svg'); if (!svg) return;
      const rs = svg.getBoundingClientRect(), rc = caja.getBoundingClientRect();
      if (!caja.closest('.inc-fig') && fuera(rs, rc) > T) out.logos.push(`p${n} ${caja.dataset.logo}: el svg sale de su caja`);
      const vb = svg.viewBox.baseVal, bb = svg.getBBox();
      if (bb.x < vb.x - .5 || bb.y < vb.y - .5 || bb.x + bb.width > vb.x + vb.width + .5 || bb.y + bb.height > vb.y + vb.height + .5)
        out.logos.push(`p${n} ${caja.dataset.logo}: dibujo fuera del viewBox (${bb.x.toFixed(0)},${bb.y.toFixed(0)},${(bb.x + bb.width).toFixed(0)},${(bb.y + bb.height).toFixed(0)})`);
      const tarjeta = caja.closest('.var-card, .fondo-card, .lock, .fav, .min-fila, .anat-fig, .evolucion figure');
      if (tarjeta && fuera(rs, tarjeta.getBoundingClientRect()) > T) out.logos.push(`p${n} ${caja.dataset.logo}: el logo se sale de su tarjeta`);
      if (rs.width < 8 || rs.height < 6) out.logos.push(`p${n} ${caja.dataset.logo}: tamaño ${rs.width.toFixed(0)}×${rs.height.toFixed(0)} px demasiado pequeño`);
    });
    // Solapes entre líneas de texto de nodos distintos
    const lineas = [];
    const w = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const t = w.currentNode;
      if (!t.textContent.trim() || t.parentElement.closest('svg, .inc-fig, [aria-hidden="true"]')) continue;
      const rg = document.createRange(); rg.selectNodeContents(t);
      for (const r of rg.getClientRects()) if (r.width > 1 && r.height > 1) lineas.push({ r, t });
    }
    for (let i = 0; i < lineas.length; i++) for (let j = i + 1; j < lineas.length; j++) {
      const a = lineas[i], b = lineas[j];
      if (a.t === b.t) continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ix > 2 && iy > Math.min(a.r.height, b.r.height) * 0.45)
        out.solapes.push(`p${n} «${a.t.textContent.trim().slice(0, 28)}» × «${b.t.textContent.trim().slice(0, 28)}»`);
    }
  });
  const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; });
  out.duplicados = Object.entries(ids).filter(([, c]) => c > 1).map(([k, c]) => `${k}×${c}`);
  return out;
}"""

JS_FUENTES = """() => ['800 20px Inter', '400 16px Inter', '400 14px "JetBrains Mono"',
  '700 14px "JetBrains Mono"'].map(f => [f, document.fonts.check(f)])"""

SONDA = """
(() => {
  window.__e2 = { ctx: 0, porFn: new Map(), contar: false };
  for (const n of ['AudioContext', 'webkitAudioContext']) {
    const O = window[n]; if (!O) continue;
    window[n] = function (...a) { window.__e2.ctx++; return new O(...a); };
    window[n].prototype = O.prototype;
  }
  /* Un «bucle» es una función que se vuelve a programar fotograma tras fotograma:
     se cuenta cuántas veces se programa cada función durante la ventana. */
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (fn) {
    if (window.__e2.contar) window.__e2.porFn.set(fn, (window.__e2.porFn.get(fn) || 0) + 1);
    return raf(fn);
  };
  /* _rafBugFix: bucle interno de ScrollTrigger (sortea un fallo de Chrome); no es de la app. */
  window.__e2bucles = () => [...window.__e2.porFn.entries()].filter(([f, n]) => n >= 20 && f.name !== '_rafBugFix').length;
})();
"""


def abrir(nav, url, movimiento="no-preference", viewport=(1440, 900)):
    ctx = nav.new_context(viewport={"width": viewport[0], "height": viewport[1]}, reduced_motion=movimiento)
    pag = ctx.new_page()
    errores, externas = [], []
    pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pag.on("pageerror", lambda e: errores.append(str(e)))

    def filtro(route):
        if route.request.url.startswith(("file:", "data:")):
            route.continue_()
        else:
            externas.append(route.request.url)
            route.abort()
    pag.route("**/*", filtro)
    pag.add_init_script(SONDA)
    pag.goto(url)
    return ctx, pag, errores, externas


def auditar_impresion(nav):
    print("\n▸ Impresión (impresion.html)")
    html = (BASE / "impresion.html").read_text(encoding="utf-8")
    total = int(re.search(r'data-total="(\d+)"', html).group(1))
    ctx, pag, errores, externas = abrir(nav, (BASE / "impresion.html").as_uri(), viewport=(1200, 900))
    pag.wait_for_function("window.PC_LISTO === true", timeout=30000)
    pag.emulate_media(media="print")
    r = pag.evaluate(JS_PAGINAS)
    (ok if r["paginas"] == total else fallo)(f"páginas: {r['paginas']} de {total}")
    for k, nombre in [("desbordes", "desbordes"), ("logos", "logos fuera de caja/viewBox"), ("solapes", "solapes de texto"), ("duplicados", "ids duplicados")]:
        if r[k]:
            fallo(f"{nombre}: {len(r[k])}")
            for x in r[k][:25]:
                print("      ·", x)
        else:
            ok(f"{nombre}: 0")
    for f, v in pag.evaluate(JS_FUENTES):
        (ok if v else fallo)(f"fuente {f}: {'cargada' if v else 'NO cargada'}")
    (fallo if errores else ok)(f"errores de consola: {len(errores)} {errores[:3]}")
    (fallo if externas else ok)(f"peticiones externas: {len(externas)} {externas[:3]}")
    ctx.close()


def auditar_inmersivo(nav, archivo):
    print(f"\n▸ Inmersivo ({archivo})")
    url = (BASE / archivo).as_uri()
    ctx, pag, errores, externas = abrir(nav, url)
    pag.wait_for_function("window.PC_V1 && window.PC_V1.listo === true", timeout=30000)
    pag.wait_for_timeout(1200)
    pag.mouse.wheel(0, 2400); pag.wait_for_timeout(600)
    (ok if pag.evaluate("window.__e2.ctx") == 0 else fallo)(f"AudioContext antes del gesto: {pag.evaluate('window.__e2.ctx')}")
    # Bucle único: como mucho 1 rAF en vuelo, medido mientras el escaneo vivo está visible
    pag.evaluate("document.querySelector('.escaneo-vivo').scrollIntoView()"); pag.wait_for_timeout(900)
    pag.evaluate("window.__e2.porFn.clear(); window.__e2.contar = true"); pag.wait_for_timeout(1500)
    raf = pag.evaluate("window.__e2.contar = false, window.__e2bucles()")
    animado = pag.evaluate("document.documentElement.dataset.escaneo")
    (ok if raf <= 1 else fallo)(f"bucles de animación activos con el escaneo visible ({animado}): {raf}")
    # Atajos: Cmd/Ctrl + tecla no deben interceptarse
    prevenido = pag.evaluate("""() => { const e = new KeyboardEvent('keydown', {key: 'i', metaKey: true, ctrlKey: true, bubbles: true, cancelable: true});
                                document.body.dispatchEvent(e); return e.defaultPrevented; }""")
    (fallo if prevenido else ok)(f"Cmd/Ctrl+I interceptado: {prevenido}")
    abierto = pag.evaluate("!document.querySelector('#indice').hidden")
    (fallo if abierto else ok)(f"el índice NO se abre con Cmd/Ctrl+I: {not abierto}")
    pag.keyboard.press("i"); pag.wait_for_timeout(250)
    abierto = pag.evaluate("!document.querySelector('#indice').hidden")
    foco_dentro = pag.evaluate("document.querySelector('#indice').contains(document.activeElement)")
    (ok if abierto and foco_dentro else fallo)(f"tecla I abre el índice con el foco dentro: {abierto and foco_dentro}")
    pag.keyboard.press("Escape"); pag.wait_for_timeout(250)
    (ok if pag.evaluate("document.querySelector('#indice').hidden") else fallo)("Esc cierra el índice")
    pag.keyboard.press("m"); pag.wait_for_timeout(300)
    n = pag.evaluate("window.__e2.ctx")
    (ok if n == 0 else fallo)(f"AudioContext tras pulsar M (no debe haber audio): {n}")
    for f, v in pag.evaluate(JS_FUENTES):
        (ok if v else fallo)(f"fuente {f}")
    ids = pag.evaluate("() => { const c = {}; document.querySelectorAll('[id]').forEach(e => c[e.id] = (c[e.id] || 0) + 1); return Object.entries(c).filter(([, n]) => n > 1).map(([k]) => k); }")
    (fallo if ids else ok)(f"ids duplicados: {ids[:8]}")
    (fallo if errores else ok)(f"errores de consola: {len(errores)} {errores[:3]}")
    (fallo if externas else ok)(f"peticiones externas: {len(externas)} {externas[:3]}")
    ctx.close()
    # Movimiento reducido: escaneo estático y contenido visible sin animar
    ctx, pag, errores, _ = abrir(nav, url, movimiento="reduce")
    pag.wait_for_function("window.PC_V1 && window.PC_V1.listo === true", timeout=30000)
    estado = pag.evaluate("document.documentElement.dataset.escaneo")
    (ok if estado == "estatico" else fallo)(f"movimiento reducido → escaneo {estado}")
    ocultos = pag.evaluate("[...document.querySelectorAll('[data-revelar]')].filter(e => getComputedStyle(e).opacity < .99).length")
    (ok if ocultos == 0 else fallo)(f"movimiento reducido → elementos sin revelar: {ocultos}")
    (fallo if errores else ok)(f"errores (movimiento reducido): {len(errores)}")
    ctx.close()


def auditar_portable():
    print("\n▸ Portable y determinismo")
    p = BASE / "PhotoClone_Inmersivo_v1.html"
    s = p.read_text(encoding="utf-8")
    mb = p.stat().st_size / 1024 / 1024
    (ok if mb <= 2.5 else fallo)(f"tamaño del portable: {mb:.2f} MB (≤ 2,5)")
    externos = re.findall(r'(?:src|href)="(?:https?:)?//[^"]+"', s)
    (fallo if externos else ok)(f"recursos externos en el portable: {externos[:3]}")
    rutas = re.findall(r'(?:src|href)="assets/[^"]+"', s)
    (fallo if rutas else ok)(f"rutas a assets/ en el portable: {rutas[:3]}")
    salidas = ("index.html", "impresion.html", "PhotoClone_Inmersivo_v1.html", "assets/data/tokens-v1.css", "assets/data/tokens_v1.json",
               "assets/logos/pc-simbolo.svg", "assets/logos/pc-horizontal.svg", "assets/logos/pc-vertical.svg")
    antes = {n: hashlib.sha256((BASE / n).read_bytes()).hexdigest() for n in salidas}
    subprocess.run([sys.executable, "-B", str(BASE / "scripts" / "build_v1.py")], check=True, capture_output=True)
    despues = {n: hashlib.sha256((BASE / n).read_bytes()).hexdigest() for n in antes}
    (ok if antes == despues else fallo)("build determinista (dos ejecuciones = mismos bytes)")


def auditar_datos():
    print("\n▸ Datos y lista negra")
    h = json.loads((BASE / "contenido" / "hitos.json").read_text(encoding="utf-8"))["hitos"]
    fuentes = {f["id"] for f in json.loads((BASE / "contenido" / "fuentes.json").read_text(encoding="utf-8"))["fuentes"]}
    sin = [x["acto"] for x in h if x["fuente"] not in fuentes]
    (fallo if sin else ok)(f"hitos de la cronología con fuente: {len(h) - len(sin)} de {len(h)}")
    # Producto: lo que el manual dice del código, comprobado en el código
    prod = json.loads((BASE / "contenido" / "producto.json").read_text(encoding="utf-8"))
    src = REPO / "src"
    tools = (src / "constants/tools.ts").read_text(encoding="utf-8")
    blend = (src / "constants/blendModes.ts").read_text(encoding="utf-8")
    ops = (src / "lib/canvas/ops.ts").read_text(encoding="utf-8")
    rep = (src / "lib/ai/replicate.ts").read_text(encoding="utf-8")
    keys = (src / "lib/api/keys.ts").read_text(encoding="utf-8")
    proyecto = (src / "lib/export/ProjectExporter.ts").read_text(encoding="utf-8")
    zipx = (src / "lib/export/ZIPExporter.ts").read_text(encoding="utf-8")
    menu = (src / "components/editor/TopBar/MenuBar.tsx").read_text(encoding="utf-8")
    orden = re.search(r"TOOL_ORDER[^=]*=\s*\[(.*?)\]", tools, re.S).group(1)
    n_tools = len(re.findall(r"'[a-z]+'", orden))
    n_blend = len(re.findall(r"\{ value: '", blend))
    etapas = " ".join(e["texto"] for e in prod["etapas"])
    reglas = [(f"diez herramientas (TOOL_ORDER: {n_tools})", n_tools == 10 and "Diez herramientas" in etapas),
              (f"seis modos de fusión (blendModes.ts: {n_blend})", n_blend == 6 and "seis modos de fusión" in etapas),
              ("filtros del manual = funciones de ops.ts", all(f in ops for f in ("invertColors", "grayscale", "blur", "sharpen", "rotate90", "flip", "scaleContent")) and len(prod["campos"]) == 7),
              ("de 2 a 10 capas, 4 por defecto (replicate.ts)", "Math.max(2, Math.min(10, opts.layerCount || 4))" in rep and "Entre 2 y 10 capas, 4" in etapas),
              ("exportaciones .png, .zip (un PNG por capa + metadata.json) y .photoclone", sorted(f["ext"] for f in prod["formatos"]) == [".photoclone", ".png", ".zip"]
               and "'.photoclone'" in proyecto and "metadata.json" in zipx and ".photoclone" in menu),
              ("alcances de la API = decompose, edit, transform (keys.ts)", "['decompose', 'edit', 'transform']" in keys),
              ("el editor sigue usando Replicate para la IA (si cambia, actualizar privacidad y capítulo 02)", "replicate.run(" in rep)]
    for txt, v in reglas:
        (ok if v else fallo)(txt)
    # Copias en la aplicación: idénticas a las del manual (las escribe build_v1.py)
    front = REPO
    pares = [(BASE / "assets/data/tokens-v1.css", front / "src/marca/tokens-v1.css"),
             (BASE / "assets/logos/pc-simbolo.svg", front / "src/app/icon.svg")] + [
        (BASE / "assets/fonts" / f, front / "public/marca/fuentes" / f) for f in ("inter-var.woff2", "jetbrainsmono-400.woff2", "jetbrainsmono-700.woff2", "material-symbols-pc.woff2")] + [
        (BASE / "assets/logos" / f, front / "public/marca" / f) for f in ("pc-simbolo.svg", "pc-horizontal.svg", "pc-horizontal-negativo.svg", "pc-simbolo-blanco.svg")] + [
        (BASE / "assets/logos" / f, front / "public" / f) for f in ("favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "icono-192.png", "icono-512.png")]
    distintas = [b.name for a, b in pares if not b.exists() or a.read_bytes() != b.read_bytes()]
    (fallo if distintas else ok)(f"tokens, fuentes, logos y favicons de la aplicación = los del manual: {distintas or 'ok'}")
    capas = sorted(p.name for p in (front / "public/identidad").glob("pc-portada-*.svg"))
    esperadas = sorted(f"pc-portada-{n}.svg" for n in ("fondo", "plano", "capa-fondo", "capa-figura", "capa-texto", "suelo"))
    (ok if capas == esperadas else fallo)(f"capas del hero en public/identidad: {capas}")
    posters = sorted(p.name for p in (front / "public/portada").glob("pc-parada-*.svg"))
    (ok if posters == [f"pc-parada-{k}.svg" for k in range(1, 6)] else fallo)(f"pósters del recorrido en public/portada: {posters}")
    logo_tsx = (front / "src/components/marca/Logo.tsx").read_text(encoding="utf-8")
    sim = (BASE / "assets/logos/pc-simbolo.svg").read_text(encoding="utf-8")
    rects = re.findall(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="(\d+)"', sim)
    (ok if len(rects) == 3 and all(f"x={{{x}}} y={{{y}}} width={{{w}}} height={{{h}}} rx={{{r}}}" in logo_tsx for x, y, w, h, r in rects) else fallo)(
        "Logo.tsx dibuja las mismas tres capas que el maestro")
    colores_app = json.loads((front / "src/marca/colores-v1.json").read_text(encoding="utf-8"))
    tok = dict(re.findall(r"--pc-([a-z0-9-]+): (#[0-9A-F]{6});", (BASE / "assets/data/tokens-v1.css").read_text(encoding="utf-8")))
    (ok if colores_app == tok else fallo)("src/marca/colores-v1.json = paleta")
    tema = (front / "src/marca/tema-v1.css")
    (ok if tema.exists() and "GENERADO por docs/Manual_Marca_PhotoClone" in tema.read_text(encoding="utf-8") else fallo)("src/marca/tema-v1.css generado por el build")
    glob_css = (front / "src/app/globals.css").read_text(encoding="utf-8")
    (ok if "../marca/tema-v1.css" in glob_css and "fonts.googleapis" not in glob_css else fallo)("globals.css importa el tema del manual y no pide fuentes a Google")
    tw = (front / "tailwind.config.ts").read_text(encoding="utf-8")
    (ok if "colores-v1.json" in tw and "'text-muted': '#9A9A9A'" in tw else fallo)("tailwind.config.ts lee la paleta y el texto tenue llega a AA")
    try:
        from PIL import Image
        mal = []
        for nombre, px in [("favicon-16.png", 16), ("favicon-32.png", 32), ("apple-touch-icon.png", 180), ("icono-192.png", 192), ("icono-512.png", 512)]:
            tam = Image.open(BASE / "assets/logos" / nombre).size
            if tam != (px, px):
                mal.append(f"{nombre} {tam}")
        (fallo if mal else ok)(f"favicons e iconos con su tamaño: {mal or 'ok'}")
    except ImportError:
        AVISOS.append("Pillow no disponible: favicons sin medir")
    def sin_notas(o):
        if isinstance(o, dict):
            return {k: sin_notas(v) for k, v in o.items() if not k.startswith("_")}
        if isinstance(o, list):
            return [sin_notas(v) for v in o]
        return o
    def cadenas(o):
        if isinstance(o, dict):
            if o.get("corrige") or (o.get("t") == "tabla" and any("v1.0" in c for c in o.get("cab", []))):
                return  # bloques que citan la v1.0 para corregirla
            for v in o.values(): yield from cadenas(v)
        elif isinstance(o, list):
            for v in o: yield from cadenas(v)
        elif isinstance(o, str):
            yield o
    # Las frases que citan la v1.0 para corregirla (llevan «v1.0» o van en las tablas de
    # corrección de los capítulos 01 y 11) se excluyen.
    excluidos = {"paleta.json", "fuentes.json"}  # documentan lo retirado y de dónde sale
    textos = []
    for pth in (BASE / "contenido").glob("*.json"):
        if pth.name in excluidos:
            continue
        datos = sin_notas(json.loads(pth.read_text(encoding="utf-8")))
        for c in cadenas(datos):
            if True:
                textos.append(c)
    textos = "\n".join(textos)
    negra = {r"\b(9[05]|100) ?%|riesgo 0": "sin porcentajes de acierto ni promesas totales (salvo «100 % K», la tinta de impresión)",
             r"todo en el navegador|en el navegador al 100|offline|sin conexi[oó]n": "la IA envía la imagen a un servicio externo: no se promete lo contrario",
             r"photoshop(?!\.cedula360)|\bAdobe\b(?! Trademarks)": "la marca no usa nombres de productos ni de empresas ajenas (salvo para corregir o citar la fuente)",
             r"qwen|flux|stable diffusion|sdxl": "la marca no nombra modelos",
             r"\bgratis\b|\bgratuito": "no es un compromiso comercial documentado",
             r"16 modos|en segundos|tiempo real|sin latencia|al instante": "promesas sin medición",
             r"fonts\.googleapis": "fuentes autoalojadas", r"Lorem|ipsum": "sin relleno"}
    textos = re.sub(r"100 % K", "", textos)
    for mal, bien in negra.items():
        (fallo if re.search(mal, textos, re.I) else ok)(f"/{mal}/ ausente (→ {bien})")
    html_ = (BASE / "index.html").read_text(encoding="utf-8")
    (fallo if "fonts.googleapis" in html_ or "fonts.gstatic" in html_ else ok)("sin Google Fonts en el recorrido")
    imgs = sorted(p.name for p in (BASE / "assets" / "img").glob("*") if p.name != "favicon-original.svg")  # copia de referencia: la compara el bloque del símbolo
    usadas = sorted(set(re.findall(r'src="assets/img/([^"]+)"', html_)))
    (ok if imgs == usadas else fallo)(f"imágenes en assets/img = imágenes usadas ({len(imgs)}): {set(imgs) ^ set(usadas) or 'ok'}")
    # Tokens: el :root del CSS base debe coincidir con la paleta generada
    tokens = dict(re.findall(r"--([a-z0-9-]+): (#[0-9A-F]{6});", (BASE / "assets/data/tokens-v1.css").read_text(encoding="utf-8")))
    raiz_css = re.search(r":root \{(.*?)\n\}", (BASE / "assets/css/pc-v1-base.css").read_text(encoding="utf-8"), re.S).group(1)
    css = {k: v.upper() for k, v in re.findall(r"--([a-z0-9-]+): (#[0-9A-Fa-f]{6});", raiz_css)}
    dif = [k for k, v in css.items() if k in tokens and tokens[k] != v] + [k for k in css if k not in tokens and k != "blanco"] + [k for k in tokens if k not in css]
    (fallo if dif else ok)(f"tokens del CSS base = paleta ({len(tokens)}): {dif or 'ok'}")


def auditar_vendor():
    print("\n▸ Copias del kit (GSAP de KANSA v6.0 vía Pentest C360 v1.0, VENDOR.sha256)")
    for linea in (BASE / "documentacion" / "VENDOR.sha256").read_text(encoding="utf-8").splitlines():
        if not linea or linea.startswith("#"):
            continue
        h, ruta = linea.split(None, 2)[:2]
        actual = hashlib.sha256((BASE / ruta).read_bytes()).hexdigest()
        (ok if actual == h else fallo)(f"{ruta} idéntico al registrado")


def auditar_glifos():
    print("\n▸ Cobertura de glifos")
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        AVISOS.append("fontTools no disponible"); return
    texto = (BASE / "impresion.html").read_text(encoding="utf-8")
    texto = re.sub(r"<style.*?</style>|<script.*?</script>|<svg.*?</svg>|<[^>]+>", " ", texto, flags=re.S)
    usados = {c for c in texto if ord(c) > 32}
    cubiertos = set()
    for f in (BASE / "assets" / "fonts").glob("*.woff2"):
        cubiertos |= set(TTFont(f).getBestCmap().keys())
    faltan = sorted(c for c in usados if ord(c) not in cubiertos and not c.isspace())
    (fallo if faltan else ok)(f"caracteres sin glifo en ninguna fuente: {''.join(faltan) or 'ninguno'}")


def main():
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=CHROME)
        auditar_impresion(nav)
        for archivo in ("index.html", "PhotoClone_Inmersivo_v1.html"):
            auditar_inmersivo(nav, archivo)
        nav.close()
    auditar_portable()
    auditar_datos()
    auditar_vendor()
    auditar_glifos()
    print(f"\n{'✗' if FALLOS else '✓'} {len(FALLOS)} fallo(s).")
    return 1 if FALLOS else 0


if __name__ == "__main__":
    sys.exit(main())
