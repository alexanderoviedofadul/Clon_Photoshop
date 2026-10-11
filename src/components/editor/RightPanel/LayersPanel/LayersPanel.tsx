'use client'

import { useCallback, useState } from 'react'
import { useLayerStore } from '@/stores/useLayerStore'
import { useEngineStore } from '@/stores/useEngineStore'
import { EditLayerModal } from '../EditLayerModal'

export function LayersPanel() {
  const layers = useLayerStore(state => state.getOrderedLayers())
  const activeLayerId = useLayerStore(state => state.activeLayerId)
  const setActiveLayer = useLayerStore(state => state.setActiveLayer)
  const toggleVisibility = useLayerStore(state => state.toggleVisibility)
  const toggleLock = useLayerStore(state => state.toggleLock)
  const addLayer = useLayerStore(state => state.addLayer)
  const removeLayer = useLayerStore(state => state.removeLayer)
  const duplicateLayer = useLayerStore(state => state.duplicateLayer)
  const updateLayer = useLayerStore(state => state.updateLayer)
  const groupLayers = useLayerStore(state => state.groupLayers)
  const reorderLayers = useLayerStore(state => state.reorderLayers)
  const selectedLayerIds = useLayerStore(state => state.selectedLayerIds)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [layerToEdit, setLayerToEdit] = useState<typeof layers[0] | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const handleCreateGroup = () => {
    const ids = selectedLayerIds.length > 0 ? selectedLayerIds : (activeLayerId ? [activeLayerId] : [])
    if (ids.length > 0) groupLayers(ids)
  }

  const handleAddNewLayer = () => {
    addLayer({
      name: `Capa ${layers.length + 1}`,
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
    })
  }

  const handleDeleteLayer = () => {
    if (activeLayerId) {
      removeLayer(activeLayerId)
    }
  }

  const handleDuplicateLayer = () => {
    if (!activeLayerId) return
    const sourceId = activeLayerId
    const newId = duplicateLayer(sourceId)
    if (!newId) return
    // Copiar los píxeles del canvas offscreen origen al duplicado
    // (capas pintadas/filtradas sin imageUrl no se recargan solas).
    const comp = useEngineStore.getState().compositor
    if (comp) {
      comp.layerEngine.duplicateLayer(sourceId, newId)
      useEngineStore.getState().refreshLayer(newId)
    }
  }

  const openEditModal = (layer: typeof layers[0]) => {
    setLayerToEdit(layer)
    setEditModalOpen(true)
  }

  const handleApplyEdit = useCallback((editedImageUrl: string) => {
    if (!layerToEdit) return

    // Update the layer with the edited image URL
    updateLayer(layerToEdit.id, {
      imageUrl: editedImageUrl,
      thumbnail: editedImageUrl,
    })
  }, [layerToEdit, updateLayer])

  const activeLayer = layers.find(l => l.id === activeLayerId)

  return (
    <div className="flex flex-col h-full">
      {/* Blend Mode & Opacity */}
      <div className="p-3 border-b border-editor-border">
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="capa-fusion" className="text-xs text-editor-text-muted w-16">Fusión:</label>
          <select
            id="capa-fusion"
            className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1 text-xs"
            value={activeLayer?.blendMode || 'normal'}
            onChange={(e) => activeLayerId && updateLayer(activeLayerId, { blendMode: e.target.value as any })}
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiplicar</option>
            <option value="screen">Trama</option>
            <option value="overlay">Superponer</option>
            <option value="darken">Oscurecer</option>
            <option value="lighten">Aclarar</option>
            <option value="color-dodge">Subexposición de color</option>
            <option value="color-burn">Sobreexposición de color</option>
            <option value="hard-light">Luz fuerte</option>
            <option value="soft-light">Luz suave</option>
            <option value="difference">Diferencia</option>
            <option value="exclusion">Exclusión</option>
            <option value="hue">Tono</option>
            <option value="saturation">Saturación</option>
            <option value="color">Color</option>
            <option value="luminosity">Luminosidad</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="capa-opacidad" className="text-xs text-editor-text-muted w-16">Opacidad:</label>
          <input
            id="capa-opacidad"
            type="range"
            min="0"
            max="100"
            value={activeLayer?.opacity || 100}
            onChange={(e) => activeLayerId && updateLayer(activeLayerId, { opacity: parseInt(e.target.value) })}
            className="flex-1 accent-editor-accent h-1"
          />
          <span className="text-xs text-editor-text w-8 text-right">{activeLayer?.opacity || 100}%</span>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIndex !== null && dragIndex !== index) reorderLayers(dragIndex, index)
              setDragIndex(null)
            }}
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-editor-border/50 ${
              activeLayerId === layer.id ? 'bg-editor-active' : 'hover:bg-editor-surface-hover'
            } ${dragIndex === index ? 'opacity-50' : ''}`}
            onClick={() => setActiveLayer(layer.id)}
          >
            {/* Visibility */}
            <button
              className="p-0.5 hover:bg-editor-surface-hover rounded"
              onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
            >
              <span className="material-symbols-outlined text-base">
                {layer.visible ? 'visibility' : 'visibility_off'}
              </span>
            </button>

            {/* Lock */}
            <button
              className="p-0.5 hover:bg-editor-surface-hover rounded"
              onClick={(e) => { e.stopPropagation(); toggleLock(layer.id); }}
            >
              <span className={`material-symbols-outlined text-base ${layer.locked ? 'text-editor-accent' : 'text-editor-text-muted'}`}>
                {layer.locked ? 'lock' : 'lock_open'}
              </span>
            </button>

            {/* Thumbnail */}
            <div className="w-10 h-10 bg-white rounded border border-editor-border flex-shrink-0 overflow-hidden">
              {layer.thumbnail || layer.imageUrl ? (
                <img
                  src={layer.thumbnail || layer.imageUrl}
                  alt={layer.name}
                  className="w-full h-full object-cover"
                />
              ) : layer.type === 'text' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-editor-text-muted">text_fields</span>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
              )}
            </div>

            {/* Name */}
            <span className="flex-1 text-sm truncate">{layer.name}</span>

            {/* Edit with AI Button */}
            {layer.type === 'raster' && !layer.locked && layer.imageUrl && (
              <button
                className="p-1 hover:bg-indigo-600/20 rounded transition-colors group"
                onClick={(e) => { e.stopPropagation(); openEditModal(layer); }}
                title="Editar con IA"
              >
                <span className="material-symbols-outlined text-base text-indigo-400 group-hover:text-indigo-300">
                  auto_fix_high
                </span>
              </button>
            )}

            {/* Delete this specific layer */}
            <button
              className="p-1 hover:bg-red-600/20 rounded transition-colors group disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
              title="Eliminar esta capa"
              disabled={layers.length <= 1}
            >
              <span className="material-symbols-outlined text-base text-editor-text-muted group-hover:text-red-400">
                delete
              </span>
            </button>

            {/* Layer Type Icon */}
            {layer.type === 'group' && (
              <span className="material-symbols-outlined text-base text-editor-text-muted">folder</span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-1 p-2 border-t border-editor-border">
        <button
          className="p-1.5 hover:bg-editor-surface-hover rounded transition-colors"
          onClick={handleAddNewLayer}
          title="Nueva capa"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
        <button
          className="p-1.5 hover:bg-editor-surface-hover rounded transition-colors"
          title="Crear grupo"
          onClick={handleCreateGroup}
          disabled={!activeLayerId}
        >
          <span className="material-symbols-outlined text-lg">create_new_folder</span>
        </button>
        <button
          className="p-1.5 hover:bg-editor-surface-hover rounded transition-colors"
          onClick={handleDuplicateLayer}
          title="Duplicar capa"
          disabled={!activeLayerId}
        >
          <span className="material-symbols-outlined text-lg">content_copy</span>
        </button>
        <button
          className="p-1.5 hover:bg-indigo-600/20 rounded transition-colors group"
          onClick={() => activeLayer && openEditModal(activeLayer)}
          title="Editar capa con IA"
          disabled={!activeLayer || activeLayer.locked || !activeLayer.imageUrl}
        >
          <span className={`material-symbols-outlined text-lg group-hover:text-indigo-300 ${activeLayer?.imageUrl ? 'text-indigo-400' : 'text-editor-text-muted'}`}>
            auto_fix_high
          </span>
        </button>
        <button
          className="p-1.5 hover:bg-editor-surface-hover rounded transition-colors"
          onClick={handleDeleteLayer}
          title="Eliminar capa"
          disabled={!activeLayerId || layers.length <= 1}
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </div>

      {/* Edit Layer Modal */}
      <EditLayerModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setLayerToEdit(null)
        }}
        layerName={layerToEdit?.name || ''}
        layerImageUrl={layerToEdit?.imageUrl || null}
        onApplyEdit={handleApplyEdit}
      />
    </div>
  )
}
