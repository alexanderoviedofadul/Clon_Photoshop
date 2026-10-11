'use client'

import { useEffect, useRef } from 'react'

/**
 * Movimiento de la portada (sin librerías): el paralaje del hero —cada capa de la imagen se desplaza a su
 * velocidad según data-z, así que al bajar la imagen se separa de verdad— y el recorrido por paradas
 * (patrón ScrollWorld): en pantallas anchas la sección queda fija y cada tramo de scroll muestra una parada.
 * Sin JavaScript, con movimiento reducido o en pantallas estrechas, todo se lee como una lista normal.
 * Un solo requestAnimationFrame por evento de scroll; nada corre si la página no se mueve.
 */
export default function Recorrido({ children }: { children: React.ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (quieto.matches) return
    const capas = Array.from(document.querySelectorAll<HTMLImageElement>('[data-paralaje] [data-z]'))
    const mundo = raiz.current?.querySelector<HTMLElement>('[data-mundo]') ?? null
    const paradas = mundo ? Array.from(mundo.querySelectorAll<HTMLElement>('[data-parada]')) : []
    const ancho = window.matchMedia('(min-width: 960px)')
    let pendiente = false

    const montarMundo = () => {
      if (!mundo) return
      const vivo = ancho.matches
      mundo.classList.toggle('pc-mundo-vivo', vivo)
      mundo.style.setProperty('--paradas', String(paradas.length))
      if (!vivo) paradas.forEach((p) => p.classList.remove('activa'))
    }

    const pintar = () => {
      pendiente = false
      const y = window.scrollY
      const alto = window.innerHeight
      if (y < alto * 1.2) {
        for (const c of capas) {
          const z = Number(c.dataset.z || 0)
          c.style.transform = `translate3d(0, ${(-y * z * 0.07).toFixed(1)}px, 0)`
        }
      }
      if (mundo && mundo.classList.contains('pc-mundo-vivo')) {
        const r = mundo.getBoundingClientRect()
        const recorrido = Math.max(1, r.height - alto)
        const avance = Math.min(1, Math.max(0, -r.top / recorrido))
        const n = paradas.length
        const i = Math.min(n - 1, Math.floor(avance * n))
        paradas.forEach((p, k) => {
          p.classList.toggle('activa', k === i)
          if (k === i) p.style.setProperty('--avance', ((avance * n - i)).toFixed(3))
        })
        mundo.style.setProperty('--avance-total', avance.toFixed(3))
      }
    }
    const alMover = () => {
      if (!pendiente) {
        pendiente = true
        requestAnimationFrame(pintar)
      }
    }

    montarMundo()
    pintar()
    window.addEventListener('scroll', alMover, { passive: true })
    window.addEventListener('resize', alMover)
    ancho.addEventListener('change', () => { montarMundo(); pintar() })
    return () => {
      window.removeEventListener('scroll', alMover)
      window.removeEventListener('resize', alMover)
    }
  }, [])

  return <div ref={raiz}>{children}</div>
}
