import Link from 'next/link'
import type { Metadata } from 'next'
import { Logo, Simbolo } from '@/components/marca/Logo'
import Recorrido from '@/components/portada/Recorrido'
import { TOOLS, TOOL_ORDER } from '@/constants/tools'
import { BLEND_MODES } from '@/constants/blendModes'
import './portada.css'

/*
 * Portada pública (rediseño de octubre de 2026, Manual de Marca v1.0).
 * Las cifras salen del código: herramientas (constants/tools.ts), modos de fusión (constants/blendModes.ts),
 * capas (lib/ai/replicate.ts: 2 a 10, 4 por defecto) y exportaciones (lib/export/). Nada de tiempos ni porcentajes.
 * Las capas del hero y los pósters los escribe el build del manual en public/identidad y public/portada.
 */

export const metadata: Metadata = {
  title: 'PhotoClone · Una imagen, todas sus capas',
  description:
    'Editor de imágenes por capas en el navegador. Separe una imagen en capas con IA, edite cada una con una instrucción de texto y exporte en PNG, ZIP o proyecto. Sin cuenta.',
  alternates: { canonical: '/' },
}

const CAPAS_HERO = [
  { n: 'fondo', z: 0 },
  { n: 'plano', z: 4 },
  { n: 'capa-fondo', z: 3 },
  { n: 'capa-figura', z: 2 },
  { n: 'capa-texto', z: 1 },
  { n: 'suelo', z: 1 },
]

const PARADAS = [
  {
    t: 'Sube la imagen',
    d: 'Cualquier imagen que abra su navegador, o un proyecto .photoclone para seguir donde lo dejó.',
    alt: 'Una imagen con cielo, colinas, una esfera y un rótulo entra en una zona de arrastre punteada.',
  },
  {
    t: 'La IA la separa en capas',
    d: 'Entre 2 y 10 capas, 4 si no dice otra cosa. Cada una sobre transparente, lista para moverse sola.',
    alt: 'La misma imagen y, a su lado, sus tres capas levantadas en pila: el fondo, la esfera y el rótulo.',
  },
  {
    t: 'Edita una capa con texto',
    d: 'Escriba el cambio. La capa y la instrucción van al modelo de edición y vuelve una capa nueva, que usted acepta o descarta.',
    alt: 'Una capa con una esfera que cambia de color a la mitad, bajo una barra de instrucción.',
  },
  {
    t: 'Retoca a mano',
    d: `${TOOL_ORDER.length} herramientas, ${BLEND_MODES.length} modos de fusión, opacidad por capa y filtros sobre la capa activa o la selección.`,
    alt: 'La imagen con una selección punteada, un trazo de pincel, las esquinas del recorte y el cuentagotas.',
  },
  {
    t: 'Exporta',
    d: 'La imagen plana en PNG, todas las capas en un ZIP o el proyecto entero para reabrirlo en el editor.',
    alt: 'De una pila de capas salen una imagen, un paquete con todas las capas y un archivo de proyecto.',
  },
]

const FILTROS = ['Invertir', 'Escala de grises', 'Desenfocar', 'Enfocar', 'Rotar 90°', 'Voltear', 'Escalar']

const PREGUNTAS = [
  {
    p: '¿Necesito una cuenta?',
    r: 'No. El editor es público y se usa sin registrarse. La cuenta, local o con Cédula 360, solo hace falta para administrar.',
  },
  {
    p: '¿Qué pasa con mi imagen?',
    r: 'Dibujar, aplicar filtros y exportar ocurre en su navegador. Cuando pide separar o editar con IA, la imagen pasa por el servidor de PhotoClone hacia Replicate, el servicio que ejecuta los modelos, y vuelve como capas. PhotoClone no guarda la imagen en su servidor.',
  },
  {
    p: '¿En cuántas capas la separa?',
    r: 'Entre 2 y 10; si no elige, 4. El resultado depende de la imagen: revise las capas antes de seguir.',
  },
  {
    p: '¿Puedo seguir otro día?',
    r: 'Sí: exporte el proyecto como .photoclone y vuelva a abrirlo desde el menú Archivo. Guarda las capas y su orden.',
  },
  {
    p: '¿Se puede usar desde otro sistema?',
    r: 'Sí, con la API v1: separar, editar y transformar, con una clave y sus alcances. Los clientes de Cédula 360 llegan por su propia API.',
  },
  {
    p: '¿Tiene relación con Adobe Photoshop?',
    r: 'No. PhotoClone es un editor independiente; no está afiliado, patrocinado ni respaldado por Adobe. Photoshop es una marca registrada de Adobe.',
  },
]

function Ico({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="pc-ico" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
  )
}
const I = {
  subir: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  capas: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  varita: '<path d="m4 20 11-11M14 4v3M18.5 5.5l-2 2M20 10h-3M12.5 2.5l1 1"/>',
  pincel: '<path d="M9.5 14.5 18 6a2 2 0 0 1 3 3l-8.5 8.5"/><path d="M9.5 14.5c-2-.5-4 1-4 3.5 0 1-1 2-2.5 2 3 2 7 1 7.5-2.5"/>',
  exportar: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  navegador: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  nube: '<path d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
  codigo: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
}
const ICONOS_PARADA = [I.subir, I.capas, I.varita, I.pincel, I.exportar]

export default function PortadaPage() {
  return (
    <div className="pc-portada">
      <a href="#contenido" className="pc-saltar">Saltar al contenido</a>
      <header className="pc-cab">
        <nav className="pc-cab-nav" aria-label="Principal">
          <Link href="/" className="pc-cab-marca" aria-label="PhotoClone, inicio">
            <Logo alto={30} />
          </Link>
          <div className="pc-cab-enlaces">
            <a href="#recorrido">Cómo funciona</a>
            <a href="#editor">El editor</a>
            <a href="#privacidad">Privacidad</a>
            <a href="#api">API</a>
          </div>
          <div className="pc-cab-acciones">
            <Link href="/login" className="pc-enlace-acceso">Acceso</Link>
            <Link href="/editor" className="pc-btn pc-btn-primario">Abrir el editor</Link>
          </div>
        </nav>
      </header>

      <main id="contenido">
        <section className="pc-hero" aria-labelledby="hero-titulo">
          <div className="pc-hero-arte" data-paralaje aria-hidden="true">
            {CAPAS_HERO.map((c, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={c.n}
                src={`/identidad/pc-portada-${c.n}.svg`}
                alt=""
                data-z={c.z}
                className={`pc-hero-capa pc-hero-capa-${c.n}`}
                width={1600}
                height={900}
                fetchPriority={i < 2 ? 'high' : 'auto'}
              />
            ))}
          </div>
          <div className="pc-hero-texto">
            <p className="pc-antetitulo">Editor de imágenes por capas, con IA</p>
            <h1 id="hero-titulo">Una imagen, <span>todas sus capas</span></h1>
            <p className="pc-hero-lead">
              Suba una imagen, deje que la IA la separe en capas y edite cada una por su cuenta: a mano, con
              {' '}{TOOL_ORDER.length} herramientas, o pidiendo el cambio por escrito. Sin instalar nada y sin cuenta.
            </p>
            <div className="pc-hero-cta">
              <Link href="/editor" className="pc-btn pc-btn-primario pc-btn-grande">Abrir el editor</Link>
              <a href="#recorrido" className="pc-btn pc-btn-secundario pc-btn-grande">Ver cómo funciona</a>
            </div>
            <p className="pc-hero-nota">
              Al separar o editar con IA, la imagen se envía a un servicio externo. <a href="#privacidad">Qué sale y adónde</a>.
            </p>
          </div>
        </section>

        <Recorrido>
          <section id="recorrido" className="pc-mundo" aria-labelledby="recorrido-titulo" data-mundo>
            <div className="pc-mundo-cab">
              <p className="pc-antetitulo">Cómo funciona</p>
              <h2 id="recorrido-titulo">Cinco pasos, una imagen editable</h2>
            </div>
            <ol className="pc-paradas">
              {PARADAS.map((p, i) => (
                <li key={p.t} className="pc-parada" data-parada={i}>
                  <figure className="pc-parada-poster">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/portada/pc-parada-${i + 1}.svg`} alt={p.alt} width={1600} height={900} loading="lazy" decoding="async" />
                  </figure>
                  <div className="pc-parada-texto">
                    <span className="pc-parada-num" aria-hidden="true">
                      <Ico d={ICONOS_PARADA[i]} /> {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3>{p.t}</h3>
                    <p>{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Recorrido>

        <section id="editor" className="pc-seccion" aria-labelledby="editor-titulo">
          <p className="pc-antetitulo">El editor</p>
          <h2 id="editor-titulo">Lo que hay dentro, contado</h2>
          <div className="pc-rejilla">
            <article className="pc-tarjeta">
              <h3><Ico d={I.pincel} /> {TOOL_ORDER.length} herramientas</h3>
              <p>{TOOL_ORDER.map((t) => TOOLS[t].name).join(' · ')}. Cada una con su atajo de teclado.</p>
            </article>
            <article className="pc-tarjeta">
              <h3><Ico d={I.capas} /> Capas</h3>
              <p>Visibilidad, opacidad, orden, duplicar, fusionar y aplanar. {BLEND_MODES.length} modos de fusión: {BLEND_MODES.map((b) => b.label.toLowerCase()).join(', ')}.</p>
            </article>
            <article className="pc-tarjeta">
              <h3><Ico d={I.varita} /> Filtros</h3>
              <p>{FILTROS.join(' · ')}, sobre la capa activa o la selección. Con deshacer y rehacer.</p>
            </article>
            <article className="pc-tarjeta">
              <h3><Ico d={I.exportar} /> Tres salidas</h3>
              <ul className="pc-salidas">
                <li><span className="pc-mono">.png</span> la imagen plana</li>
                <li><span className="pc-mono">.zip</span> un PNG por capa y sus datos</li>
                <li><span className="pc-mono">.photoclone</span> el proyecto, para reabrirlo</li>
              </ul>
            </article>
          </div>
          <ul className="pc-capas-leyenda" aria-label="Las capas en la marca">
            <li><span className="pc-chip pc-chip-fondo">FONDO</span> lo que sostiene la imagen</li>
            <li><span className="pc-chip pc-chip-figura">FIGURA</span> el objeto principal</li>
            <li><span className="pc-chip pc-chip-texto">TEXTO</span> rótulos y titulares</li>
          </ul>
        </section>

        <section id="privacidad" className="pc-seccion pc-seccion-panel" aria-labelledby="privacidad-titulo">
          <p className="pc-antetitulo">Privacidad</p>
          <h2 id="privacidad-titulo">Qué sale de su navegador, y adónde</h2>
          <div className="pc-dos">
            <div className="pc-tarjeta">
              <h3><Ico d={I.navegador} /> Se queda en su navegador</h3>
              <p>Abrir la imagen, dibujar, seleccionar, aplicar filtros, ordenar capas y exportar. Nada de eso se envía a ningún servidor.</p>
            </div>
            <div className="pc-tarjeta">
              <h3><Ico d={I.nube} /> Sale, solo si usted lo pide</h3>
              <p>
                Separar en capas y editar con IA: la imagen pasa por el servidor de PhotoClone hacia <strong>Replicate</strong>,
                el servicio externo que ejecuta los modelos, y vuelve como capas. PhotoClone no la guarda en su servidor.
                Si la imagen es confidencial, no use la IA.
              </p>
            </div>
          </div>
        </section>

        <section id="api" className="pc-seccion" aria-labelledby="api-titulo">
          <div className="pc-dos pc-dos-api">
            <div>
              <p className="pc-antetitulo">Para quien integra</p>
              <h2 id="api-titulo">La misma separación, por API</h2>
              <p>
                La API v1 separa, edita y transforma imágenes desde otro sistema. Cada clave tiene sus alcances
                (<span className="pc-mono">decompose</span>, <span className="pc-mono">edit</span>, <span className="pc-mono">transform</span>) y
                la emite un administrador. Los clientes de Cédula 360 llegan por <span className="pc-mono">cedula360.tech/api/imagen</span>.
              </p>
              <p><a className="pc-enlace" href="/api/v1/capabilities">Ver los métodos (JSON)</a></p>
            </div>
            <pre className="pc-codigo" aria-label="Ejemplo de llamada a la API" tabIndex={0}>
{`POST /api/v1/decompose
Authorization: Bearer <su clave>

{ "image": "https://…/foto.png",
  "layerCount": 4 }

→ { "ok": true,
    "layers": [ { "name": "Capa 1",
                  "imageUrl": "…" }, … ] }`}
            </pre>
          </div>
        </section>

        <section id="preguntas" className="pc-seccion" aria-labelledby="preguntas-titulo">
          <p className="pc-antetitulo">Preguntas frecuentes</p>
          <h2 id="preguntas-titulo">Antes de empezar</h2>
          <div className="pc-preguntas">
            {PREGUNTAS.map((q) => (
              <details key={q.p} className="pc-pregunta">
                <summary>{q.p}</summary>
                <p>{q.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pc-cierre" aria-labelledby="cierre-titulo">
          <Simbolo className="pc-cierre-simbolo" />
          <h2 id="cierre-titulo">Abra una imagen y sepárela</h2>
          <p>El editor es público: no pide cuenta ni instalación.</p>
          <Link href="/editor" className="pc-btn pc-btn-primario pc-btn-grande">Abrir el editor</Link>
        </section>
      </main>

      <footer className="pc-pie">
        <div className="pc-pie-dentro">
          <Logo alto={26} />
          <p>
            En alianza con <a href="https://cedula360.tech" rel="noopener">Cédula 360</a> ·{' '}
            <a href="mailto:info@cedula360.tech">info@cedula360.tech</a>
          </p>
          <p className="pc-pie-enlaces">
            <Link href="/login">Acceso</Link>
            <a href="/api/v1/capabilities">API</a>
            <a href="#preguntas">Preguntas</a>
          </p>
          <p className="pc-pie-legal">PhotoClone es un editor independiente, sin relación con Adobe. Photoshop es una marca registrada de Adobe.</p>
        </div>
      </footer>
    </div>
  )
}
