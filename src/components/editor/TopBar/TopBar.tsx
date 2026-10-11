'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Simbolo } from '@/components/marca/Logo'
import { MenuBar } from './MenuBar'
import { useAuth } from '@/hooks/useAuth'
import { useViewStore } from '@/stores/useViewStore'
import { useLayerStore } from '@/stores/useLayerStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { PNGExporter } from '@/lib/export/PNGExporter'
import { ZIPExporter } from '@/lib/export/ZIPExporter'
import { ProjectExporter } from '@/lib/export/ProjectExporter'

export function TopBar() {
  const zoom = useViewStore((s) => s.zoom)
  const setZoom = useViewStore((s) => s.setZoom)
  const docName = useDocumentStore((s) => s.name)
  const docW = useDocumentStore((s) => s.width)
  const docH = useDocumentStore((s) => s.height)
  const [open, setOpen] = useState(false)
  const [acctOpen, setAcctOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const acctRef = useRef<HTMLDivElement>(null)
  const { user, loading, signOut, isAuthenticated } = useAuth()

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const exportPNG = () => {
    const c = window.document.querySelector('canvas')
    if (c) PNGExporter.download(c, `${docName}.png`)
    setOpen(false)
  }
  const exportZIP = () => {
    const layers = useLayerStore.getState().getOrderedLayers()
    if (layers.length === 0) return
    const c = window.document.querySelector('canvas') as HTMLCanvasElement
    ZIPExporter.exportLayers(layers.map((l) => ({ id: l.id, name: l.name, canvas: c })), `${docName}_capas.zip`)
    setOpen(false)
  }
  const exportProject = async () => {
    const c = window.document.querySelector('canvas') as HTMLCanvasElement
    if (!c) return
    const ls = useLayerStore.getState()
    const layers = ls.getOrderedLayers()
    const map = new Map<string, HTMLCanvasElement>()
    layers.forEach((l) => map.set(l.id, c))
    await ProjectExporter.exportProject(
      { id: 'project-1', name: docName, width: docW, height: docH, backgroundColor: '#ffffff', colorMode: 'rgb' as const, createdAt: Date.now(), modifiedAt: Date.now() },
      layers, ls.layerOrder, map
    )
    setOpen(false)
  }

  return (
    <div className="h-12 bg-editor-surface border-b border-editor-border flex items-center px-2">
      <Link
        href="/"
        prefetch={false}
        className="flex items-center gap-2 px-3 mr-4 rounded hover:bg-editor-surface-hover transition-colors py-1"
        title="Volver a la página de inicio"
      >
        <Simbolo className="w-6 h-6" />
        <span className="text-sm font-bold text-editor-text-bright">Photo<span className="text-pc-senal">Clone</span></span>
      </Link>

      <MenuBar />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Cuenta / sesión */}
        <div ref={acctRef} className="relative">
          {loading ? (
            <span className="text-xs text-editor-text-muted px-2">…</span>
          ) : isAuthenticated ? (
            <>
              <button
                className="flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-editor-surface-hover transition-colors"
                onClick={() => setAcctOpen((o) => !o)}
                title="Cuenta"
              >
                <span className="w-6 h-6 rounded-full bg-editor-accent text-white text-xs flex items-center justify-center font-semibold">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[140px] truncate">{user?.name || user?.email}</span>
                <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
              {acctOpen && (
                <div className="absolute top-full right-0 mt-1 min-w-56 bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-editor-border">
                    <p className="text-sm text-editor-text-bright truncate">{user?.name}</p>
                    <p className="text-xs text-editor-text-muted truncate">{user?.email}</p>
                    <p className="text-[10px] text-editor-text-muted mt-0.5 uppercase">{user?.role}</p>
                  </div>
                  <Link href="/admin" className="block w-full px-4 py-2 text-sm text-left hover:bg-editor-surface-hover">
                    Panel administrativo
                  </Link>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-editor-surface-hover text-red-400" onClick={signOut}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-editor-border hover:bg-editor-surface-hover transition-colors">
              <span className="material-symbols-outlined text-base">login</span>
              Iniciar sesión
            </Link>
          )}
        </div>

        <button
          className="text-xs text-editor-text-muted px-2 hover:text-editor-text"
          onClick={() => setZoom(1)}
          title="Restablecer zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>

        <div ref={ref} className="relative">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pc-azul text-white text-sm rounded hover:bg-pc-azul-hondo transition-colors"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-base">download</span>
            Exportar
          </button>
          {open && (
            <div className="absolute top-full right-0 mt-1 min-w-52 bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 z-50">
              <button className="w-full px-4 py-2 text-sm text-left hover:bg-editor-surface-hover" onClick={exportPNG}>Exportar PNG</button>
              <button className="w-full px-4 py-2 text-sm text-left hover:bg-editor-surface-hover" onClick={exportZIP}>Exportar Capas (ZIP)</button>
              <button className="w-full px-4 py-2 text-sm text-left hover:bg-editor-surface-hover" onClick={exportProject}>Guardar Proyecto (.photoclone)</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
