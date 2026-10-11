'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLayerStore } from '@/stores/useLayerStore'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { useViewStore } from '@/stores/useViewStore'
import { useEngineStore } from '@/stores/useEngineStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useToolStore } from '@/stores/useToolStore'
import { PNGExporter } from '@/lib/export/PNGExporter'
import { ZIPExporter } from '@/lib/export/ZIPExporter'
import { ProjectExporter } from '@/lib/export/ProjectExporter'
import * as ops from '@/lib/canvas/ops'
import { applyUndo, applyRedo } from '@/lib/history'

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  divider?: boolean
  disabled?: boolean
}
interface Menu {
  label: string
  items: MenuItem[]
}

// Portapapeles interno (a nivel módulo) para Copiar/Cortar/Pegar.
let clipboard: ImageData | null = null

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [helpModal, setHelpModal] = useState<null | 'shortcuts' | 'docs' | 'about'>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    getOrderedLayers, layerOrder, addLayer, setActiveLayer, activeLayerId,
    removeLayer, duplicateLayer, groupLayers, ungroupLayers, selectedLayerIds,
    clearAll, getLayer,
  } = useLayerStore()
  const { canUndo, canRedo } = useHistoryStore()
  const { zoom, setZoom, actualSize, showRulers, showGuides, showGrid,
    toggleRulers, toggleGuides, toggleGrid } = useViewStore()
  const engine = useEngineStore()
  const doc = useDocumentStore()
  const selection = useSelectionStore()
  const setTool = useToolStore((s) => s.setTool)

  const layers = getOrderedLayers()

  // ---- Helpers de píxeles sobre la capa activa ----
  const onActive = useCallback(
    (fn: (ctx: OffscreenCanvasRenderingContext2D, w: number, h: number) => void) => {
      if (!activeLayerId) { alert('Selecciona una capa primero'); return }
      const ok = engine.runOnLayer(activeLayerId, fn)
      if (!ok) alert('El lienzo aún no está listo')
    },
    [activeLayerId, engine]
  )

  // ---- Archivo ----
  const handleNewDocument = useCallback(() => {
    if (layers.length > 0 && !confirm('¿Crear documento nuevo? Se perderán los cambios no exportados.')) return
    clearAll()
    useHistoryStore.getState().clearHistory()
    selection.deselect()
  }, [layers.length, clearAll, selection])

  const handleOpenFile = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.name.endsWith('.photoclone')) {
      const result = await ProjectExporter.importProject(file)
      if (result) alert('Proyecto importado (capas restauradas como imágenes)')
    } else if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      const id = addLayer({ name: file.name.replace(/\.[^/.]+$/, ''), type: 'raster', imageUrl: url })
      const c = engine.compositor
      if (c) await c.layerEngine.loadImageToLayer(id, url)
      engine.refreshLayer(id)
      setActiveLayer(id)
    }
    e.target.value = ''
  }, [addLayer, setActiveLayer, engine])

  const handleExportPNG = useCallback(() => {
    const canvas = window.document.querySelector('canvas')
    if (canvas) PNGExporter.download(canvas, `${doc.name}.png`)
  }, [doc.name])

  const handleExportZIP = useCallback(() => {
    if (layers.length === 0) return
    const data = layers.map((l) => ({ id: l.id, name: l.name, canvas: window.document.querySelector('canvas') as HTMLCanvasElement }))
    ZIPExporter.exportLayers(data, `${doc.name}_capas.zip`)
  }, [layers, doc.name])

  const handleSaveProject = useCallback(async () => {
    const canvas = window.document.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return
    const docData = { id: 'project-1', name: doc.name, width: doc.width, height: doc.height,
      backgroundColor: '#ffffff', colorMode: 'rgb' as const, createdAt: Date.now(), modifiedAt: Date.now() }
    const map = new Map<string, HTMLCanvasElement>()
    layers.forEach((l) => map.set(l.id, canvas))
    await ProjectExporter.exportProject(docData, layers, layerOrder, map)
  }, [doc, layers, layerOrder])

  // ---- Editar ----
  const handleCopy = useCallback(() => {
    if (!activeLayerId) return
    clipboard = engine.snapshot(activeLayerId)
    if (!clipboard) alert('Nada que copiar')
  }, [activeLayerId, engine])

  const handleCut = useCallback(() => {
    handleCopy()
    onActive((ctx, w, h) => ops.clearRegion(ctx, w, h, selection.rect))
  }, [handleCopy, onActive, selection.rect])

  const handlePaste = useCallback(() => {
    if (!clipboard) { alert('Portapapeles vacío'); return }
    const id = addLayer({ name: 'Capa pegada', type: 'raster' })
    const data = clipboard
    if (engine.runOnLayer(id, (ctx) => { try { ctx.putImageData(data, 0, 0) } catch {} })) {
      setActiveLayer(id)
    }
  }, [addLayer, setActiveLayer, engine])

  // ---- Imagen ----
  const handleImageSize = useCallback(() => {
    const v = prompt(`Escala de la imagen en % (actual ${doc.width}×${doc.height}px):`, '100')
    if (!v) return
    const pct = parseFloat(v)
    if (!isFinite(pct) || pct <= 0) return
    const f = pct / 100
    layers.forEach((l) => { if (l.type === 'raster') engine.runOnLayer(l.id, (ctx, w, h) => ops.scaleContent(ctx, w, h, f)) })
    doc.setSize(doc.width * f, doc.height * f)
  }, [doc, layers, engine])

  const handleCanvasSize = useCallback(() => {
    const w = prompt('Ancho del lienzo (px):', String(doc.width))
    if (!w) return
    const h = prompt('Alto del lienzo (px):', String(doc.height))
    if (!h) return
    const nw = parseInt(w, 10), nh = parseInt(h, 10)
    if (nw > 0 && nh > 0) doc.setSize(nw, nh)
  }, [doc])

  // ---- Capa ----
  const newRasterLayer = useCallback(() => {
    const id = addLayer({ name: `Capa ${layers.length + 1}`, type: 'raster' })
    setActiveLayer(id)
  }, [addLayer, setActiveLayer, layers.length])

  const mergeDown = useCallback(() => {
    if (!activeLayerId) return
    const idx = layerOrder.indexOf(activeLayerId)
    const belowId = layerOrder[idx + 1]
    if (!belowId) { alert('No hay capa debajo'); return }
    const c = engine.compositor
    if (!c) return
    const top = c.layerEngine.getLayerCanvas(activeLayerId)
    const belowCtx = c.layerEngine.getLayerContext(belowId)
    if (belowCtx) belowCtx.drawImage(top, 0, 0)
    removeLayer(activeLayerId)
    engine.refreshLayer(belowId)
    setActiveLayer(belowId)
  }, [activeLayerId, layerOrder, engine, removeLayer, setActiveLayer])

  const flatten = useCallback(() => {
    const c = engine.compositor
    if (!c || layers.length < 2) return
    const baseId = layerOrder[layerOrder.length - 1]
    const baseCtx = c.layerEngine.getLayerContext(baseId)
    if (!baseCtx) return
    for (let i = layerOrder.length - 2; i >= 0; i--) {
      const cv = c.layerEngine.getLayerCanvas(layerOrder[i])
      baseCtx.drawImage(cv, 0, 0)
    }
    layerOrder.filter((id) => id !== baseId).forEach((id) => removeLayer(id))
    engine.refreshLayer(baseId)
    setActiveLayer(baseId)
  }, [engine, layers.length, layerOrder, removeLayer, setActiveLayer])

  // ---- Selección ----
  const sel = useSelectionStore()

  const MENUS: Menu[] = [
    {
      label: 'Archivo',
      items: [
        { label: 'Nuevo', shortcut: 'Ctrl+N', action: handleNewDocument },
        { label: 'Abrir...', shortcut: 'Ctrl+O', action: handleOpenFile },
        { divider: true, label: '' },
        { label: 'Guardar Proyecto', shortcut: 'Ctrl+S', action: handleSaveProject },
        { label: 'Guardar Como...', shortcut: 'Ctrl+Shift+S', action: handleSaveProject },
        { divider: true, label: '' },
        { label: 'Exportar PNG', shortcut: 'Ctrl+E', action: handleExportPNG },
        { label: 'Exportar Capas (ZIP)', action: handleExportZIP },
      ],
    },
    {
      label: 'Editar',
      items: [
        { label: 'Deshacer', shortcut: 'Ctrl+Z', action: applyUndo, disabled: !canUndo() },
        { label: 'Rehacer', shortcut: 'Ctrl+Shift+Z', action: applyRedo, disabled: !canRedo() },
        { divider: true, label: '' },
        { label: 'Cortar', shortcut: 'Ctrl+X', action: handleCut, disabled: !activeLayerId },
        { label: 'Copiar', shortcut: 'Ctrl+C', action: handleCopy, disabled: !activeLayerId },
        { label: 'Pegar', shortcut: 'Ctrl+V', action: handlePaste },
        { divider: true, label: '' },
        { label: 'Transformar Libre', shortcut: 'Ctrl+T', action: () => setTool('move') },
      ],
    },
    {
      label: 'Imagen',
      items: [
        { label: 'Tamaño de Imagen...', action: handleImageSize },
        { label: 'Tamaño del Lienzo...', action: handleCanvasSize },
        { divider: true, label: '' },
        { label: 'Rotar 90° Horario', action: () => onActive((c, w, h) => ops.rotate90(c, w, h, 1)) },
        { label: 'Rotar 90° Antihorario', action: () => onActive((c, w, h) => ops.rotate90(c, w, h, -1)) },
        { label: 'Voltear Horizontal', action: () => onActive((c, w, h) => ops.flip(c, w, h, 'h')) },
        { label: 'Voltear Vertical', action: () => onActive((c, w, h) => ops.flip(c, w, h, 'v')) },
      ],
    },
    {
      label: 'Capa',
      items: [
        { label: 'Nueva Capa', shortcut: 'Ctrl+Shift+N', action: newRasterLayer },
        { label: 'Duplicar Capa', shortcut: 'Ctrl+J', action: () => activeLayerId && duplicateLayer(activeLayerId), disabled: !activeLayerId },
        { label: 'Eliminar Capa', action: () => activeLayerId && removeLayer(activeLayerId), disabled: !activeLayerId || layers.length <= 1 },
        { divider: true, label: '' },
        { label: 'Agrupar Capas', shortcut: 'Ctrl+G', action: () => { const ids = selectedLayerIds.length ? selectedLayerIds : (activeLayerId ? [activeLayerId] : []); if (ids.length) groupLayers(ids) }, disabled: !activeLayerId },
        { label: 'Desagrupar', shortcut: 'Ctrl+Shift+G', action: () => activeLayerId && ungroupLayers(activeLayerId), disabled: !activeLayerId || getLayer(activeLayerId || '')?.type !== 'group' },
        { divider: true, label: '' },
        { label: 'Fusionar Hacia Abajo', shortcut: 'Ctrl+E', action: mergeDown, disabled: !activeLayerId || layers.length < 2 },
        { label: 'Aplanar Imagen', action: flatten, disabled: layers.length < 2 },
      ],
    },
    {
      label: 'Selección',
      items: [
        { label: 'Todo', shortcut: 'Ctrl+A', action: () => sel.selectAll(doc.width, doc.height) },
        { label: 'Deseleccionar', shortcut: 'Ctrl+D', action: () => sel.deselect() },
        { label: 'Invertir', shortcut: 'Ctrl+Shift+I', action: () => sel.invert(doc.width, doc.height) },
        { divider: true, label: '' },
        { label: 'Calar...', action: () => { const v = prompt('Radio de calado (px):', String(sel.feather)); if (v) sel.setFeather(parseInt(v, 10) || 0) } },
      ],
    },
    {
      label: 'Filtro',
      items: [
        { label: 'Desenfocar', action: () => onActive((c, w, h) => ops.blur(c, w, h, 3)) },
        { label: 'Enfocar', action: () => onActive((c, w, h) => ops.sharpen(c, w, h, selection.rect)) },
        { divider: true, label: '' },
        { label: 'Escala de Grises', action: () => onActive((c, w, h) => ops.grayscale(c, w, h, selection.rect)) },
        { label: 'Invertir Colores', action: () => onActive((c, w, h) => ops.invertColors(c, w, h, selection.rect)) },
      ],
    },
    {
      label: 'Vista',
      items: [
        { label: 'Acercar', shortcut: 'Ctrl+=', action: () => setZoom(zoom * 1.25) },
        { label: 'Alejar', shortcut: 'Ctrl+-', action: () => setZoom(zoom * 0.8) },
        { label: 'Ajustar a Pantalla', shortcut: 'Ctrl+0', action: () => actualSize() },
        { label: 'Tamaño Real', shortcut: 'Ctrl+1', action: () => setZoom(1) },
        { divider: true, label: '' },
        { label: `${showRulers ? '✓ ' : ''}Mostrar Reglas`, shortcut: 'Ctrl+R', action: toggleRulers },
        { label: `${showGuides ? '✓ ' : ''}Mostrar Guías`, action: toggleGuides },
        { label: `${showGrid ? '✓ ' : ''}Mostrar Cuadrícula`, action: toggleGrid },
      ],
    },
    {
      label: 'Ayuda',
      items: [
        { label: 'Atajos de Teclado', action: () => setHelpModal('shortcuts') },
        { label: 'Documentación', action: () => setHelpModal('docs') },
        { divider: true, label: '' },
        { label: 'Acerca de PhotoClone', action: () => setHelpModal('about') },
      ],
    },
  ]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,.photoclone,.json" className="hidden" onChange={handleFileSelected} />

      <div ref={menuRef} className="flex items-center">
        {MENUS.map((menu, index) => (
          <div key={menu.label} className="relative">
            <button
              className={`px-3 py-1.5 text-sm hover:bg-editor-surface-hover rounded transition-colors ${openMenu === index ? 'bg-editor-surface-hover' : ''}`}
              onClick={() => setOpenMenu(openMenu === index ? null : index)}
              onMouseEnter={() => openMenu !== null && setOpenMenu(index)}
            >
              {menu.label}
            </button>
            {openMenu === index && (
              <div className="absolute top-full left-0 mt-1 min-w-48 bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 z-50">
                {menu.items.map((item, i) =>
                  item.divider ? (
                    <div key={i} className="h-px bg-editor-border my-1" />
                  ) : (
                    <button
                      key={i}
                      className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between ${item.disabled ? 'text-editor-text-muted cursor-not-allowed' : 'hover:bg-editor-surface-hover'}`}
                      disabled={item.disabled}
                      onClick={() => { item.action?.(); setOpenMenu(null) }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="text-editor-text-muted text-xs ml-4">{item.shortcut}</span>}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {helpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setHelpModal(null)}>
          <div className="bg-editor-surface border border-editor-border rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {helpModal === 'shortcuts' && (
              <>
                <h2 className="text-lg font-semibold mb-3">Atajos de Teclado</h2>
                <div className="grid grid-cols-2 gap-1 text-sm text-editor-text">
                  {[['V', 'Mover'], ['B', 'Pincel'], ['E', 'Borrador'], ['T', 'Texto'], ['M', 'Selección'], ['L', 'Lazo'], ['I', 'Cuentagotas'], ['C', 'Recortar'], ['Z', 'Zoom'], ['H', 'Mano'], ['X', 'Intercambiar colores'], ['Ctrl+Z', 'Deshacer'], ['Ctrl+Shift+Z', 'Rehacer'], ['Ctrl+E', 'Exportar PNG'], ['Ctrl+0', 'Ajustar'], ['Ctrl+1', 'Tamaño real']].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-editor-border/40 py-1"><span className="text-editor-text-muted">{v}</span><kbd className="font-mono">{k}</kbd></div>
                  ))}
                </div>
              </>
            )}
            {helpModal === 'docs' && (
              <>
                <h2 className="text-lg font-semibold mb-3">Documentación</h2>
                <p className="text-sm text-editor-text-muted mb-3">PhotoClone — editor de imágenes por capas con separación por IA. Arrastra una imagen al lienzo o usa el panel IA para descomponerla en capas. Cada menú (Imagen, Filtro, Capa, Selección) opera sobre la capa activa.</p>
                <a href="https://github.com/alexanderoviedofadul/Clon_Photoshop#readme" target="_blank" rel="noopener noreferrer" className="text-pc-senal text-sm underline">Ver README en GitHub →</a>
              </>
            )}
            {helpModal === 'about' && (
              <>
                <h2 className="text-lg font-semibold mb-3">Acerca de PhotoClone</h2>
                <p className="text-sm text-editor-text-muted">PhotoClone · editor web de imágenes por capas. La separación y la edición con IA se ejecutan en Replicate, un servicio externo: la imagen sale de su navegador solo cuando las usa. En alianza con Cédula 360. Licencia MIT. Sin relación con Adobe.</p>
              </>
            )}
            <button className="mt-5 px-4 py-1.5 bg-pc-azul text-white text-sm rounded hover:bg-pc-azul-hondo" onClick={() => setHelpModal(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}
