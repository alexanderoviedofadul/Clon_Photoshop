'use client'

import { useState } from 'react'
import { LayersPanel } from './LayersPanel/LayersPanel'
import { AIPanel } from './AIPanel/AIPanel'
import { useLayerStore } from '@/stores/useLayerStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { applyJump } from '@/lib/history'

type Tab = 'layers' | 'properties' | 'history' | 'ai'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'layers', label: 'Capas', icon: 'layers' },
  { id: 'properties', label: 'Propiedades', icon: 'tune' },
  { id: 'history', label: 'Historial', icon: 'history' },
  { id: 'ai', label: 'IA', icon: 'auto_awesome' },
]

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('layers')

  return (
    <div className="w-72 bg-editor-surface border-l border-editor-border flex flex-col">
      <div className="flex border-b border-editor-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
              activeTab === tab.id
                ? 'bg-editor-bg text-editor-text-bright border-b-2 border-editor-accent'
                : 'text-editor-text-muted hover:text-editor-text hover:bg-editor-surface-hover'
            }`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            <span className="hidden xl:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'layers' && <LayersPanel />}
        {activeTab === 'properties' && <PropertiesPanel />}
        {activeTab === 'history' && <HistoryPanel />}
        {activeTab === 'ai' && <AIPanel />}
      </div>
    </div>
  )
}

function PropertiesPanel() {
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const layer = useLayerStore((s) => (s.activeLayerId ? s.layers[s.activeLayerId] : undefined))
  const updateLayer = useLayerStore((s) => s.updateLayer)
  const doc = useDocumentStore()

  const setTransform = (k: 'x' | 'y', v: number) => {
    if (!activeLayerId || !layer) return
    updateLayer(activeLayerId, { transform: { ...layer.transform, [k]: v } })
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase mb-2">Transformar capa</h3>
        {!layer && <p className="text-xs text-editor-text-muted mb-2">Sin capa activa</p>}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-editor-text-muted">X</label>
            <input type="number" className="input text-xs py-1" disabled={!layer}
              value={layer?.transform.x ?? 0}
              onChange={(e) => setTransform('x', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-xs text-editor-text-muted">Y</label>
            <input type="number" className="input text-xs py-1" disabled={!layer}
              value={layer?.transform.y ?? 0}
              onChange={(e) => setTransform('y', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase mb-2">Documento</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-editor-text-muted">Ancho</label>
            <input type="number" className="input text-xs py-1" value={doc.width}
              onChange={(e) => doc.setSize(parseInt(e.target.value, 10) || doc.width, doc.height)} />
          </div>
          <div>
            <label className="text-xs text-editor-text-muted">Alto</label>
            <input type="number" className="input text-xs py-1" value={doc.height}
              onChange={(e) => doc.setSize(doc.width, parseInt(e.target.value, 10) || doc.height)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase mb-2">Opacidad</h3>
        <div className="flex items-center gap-2">
          <input type="range" min="0" max="100" disabled={!layer} aria-label="Opacidad de la capa activa"
            value={layer?.opacity ?? 100}
            onChange={(e) => activeLayerId && updateLayer(activeLayerId, { opacity: parseInt(e.target.value, 10) })}
            className="flex-1 accent-editor-accent" />
          <span className="text-xs text-editor-text w-8 text-right">{layer?.opacity ?? 100}%</span>
        </div>
      </div>
    </div>
  )
}

function HistoryPanel() {
  const actions = useHistoryStore((s) => s.actions)
  const currentIndex = useHistoryStore((s) => s.currentIndex)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {actions.length === 0 && (
          <p className="text-xs text-editor-text-muted p-3">Sin historial todavía</p>
        )}
        {actions.map((item, index) => (
          <button
            key={item.id}
            onClick={() => applyJump(index)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-editor-surface-hover ${
              index === currentIndex ? 'bg-editor-active' : index > currentIndex ? 'opacity-40' : ''
            }`}
          >
            <span className="material-symbols-outlined text-base text-editor-text-muted">
              {item.type === 'init' ? 'flag' : item.name.includes('Eliminar') ? 'delete' : item.name.includes('Nueva') ? 'add' : 'edit'}
            </span>
            <span className="text-sm flex-1 truncate">{item.name}</span>
            <span className="text-[10px] text-editor-text-muted">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
