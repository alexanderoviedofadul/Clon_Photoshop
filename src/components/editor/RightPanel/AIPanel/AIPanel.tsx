'use client'

import { useState, useCallback } from 'react'
import { useLayerStore } from '@/stores/useLayerStore'
import { useAuth } from '@/hooks/useAuth'
import { AvisoCuentaIA } from '@/components/editor/AvisoCuentaIA'

export function AIPanel() {
  const [layerCount, setLayerCount] = useState(4)
  const [instructions, setInstructions] = useState('')
  const [infiniteDecomposition, setInfiniteDecomposition] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pideCuenta, setPideCuenta] = useState(false)
  const { isAuthenticated, loading: cargandoSesion } = useAuth()

  const activeLayer = useLayerStore(state => state.getActiveLayer())
  const addLayer = useLayerStore(state => state.addLayer)

  const handleDecompose = useCallback(async () => {
    setError(null)
    if (!cargandoSesion && !isAuthenticated) {
      setPideCuenta(true)
      return
    }

    // Verificar que haya una capa activa con imagen
    if (!activeLayer?.imageUrl) {
      setError('No hay una capa activa con imagen. Primero arrastra una imagen al canvas.')
      return
    }

    setIsProcessing(true)

    try {
      // Determinar cómo enviar la imagen según el tipo de URL
      let requestBody: any = {
        layerCount,
        instructions: instructions || undefined,
        outputFormat: 'webp',
        outputQuality: 95,
        goFast: true,
      }

      if (activeLayer.imageUrl.startsWith('blob:')) {
        // Es una URL blob local (desarrollo), convertir a base64
        const response = await fetch(activeLayer.imageUrl)
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        requestBody.imageBase64 = base64
      } else if (activeLayer.imageUrl.startsWith('http://') || activeLayer.imageUrl.startsWith('https://')) {
        // Es una URL pública (VPS/producción), enviar la URL directamente
        requestBody.imageUrl = activeLayer.imageUrl
      } else if (activeLayer.imageUrl.startsWith('data:')) {
        // Ya es base64
        requestBody.imageBase64 = activeLayer.imageUrl
      } else {
        setError('Formato de imagen no soportado')
        setIsProcessing(false)
        return
      }

      const apiResponse = await fetch('/api/layers/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (apiResponse.status === 401) {
        setPideCuenta(true)
        setIsProcessing(false)
        return
      }

      const data = await apiResponse.json()

      if (!data.success) {
        setError(data.error || 'Error al procesar la imagen')
        setIsProcessing(false)
        return
      }

      // Crear las nuevas capas con las imágenes devueltas
      if (data.layers && Array.isArray(data.layers)) {
        for (const newLayer of data.layers) {
          addLayer({
            name: newLayer.name,
            type: 'raster',
            visible: true,
            locked: false,
            opacity: 100,
            blendMode: 'normal',
            transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
            imageUrl: newLayer.imageUrl,
            thumbnail: newLayer.imageUrl,
          })
        }
      }

      setIsProcessing(false)
    } catch (err) {
      console.error('[AIPanel] Error:', err)
      setError(err instanceof Error ? err.message : 'Error de conexión')
      setIsProcessing(false)
    }
  }, [activeLayer, layerCount, instructions, addLayer, cargandoSesion, isAuthenticated])

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-editor-accent">auto_awesome</span>
        <h3 className="font-semibold text-editor-text-bright">Separar en Capas</h3>
      </div>

      {pideCuenta && <AvisoCuentaIA className="mb-4" />}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Active Layer Info */}
      {activeLayer?.imageUrl ? (
        <div className="mb-4 p-2 bg-editor-bg rounded border border-editor-border">
          <div className="flex items-center gap-2">
            <img src={activeLayer.imageUrl} alt="" className="w-10 h-10 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-editor-text-muted truncate">Capa activa:</p>
              <p className="text-sm text-editor-text truncate">{activeLayer.name}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-xs">
          Arrastra una imagen al canvas para separarla en capas
        </div>
      )}

      {/* Layer Count */}
      <div className="mb-4">
        <label className="block text-xs text-editor-text-muted mb-2">
          Número de capas: <span className="text-editor-text-bright font-medium">{layerCount}</span>
        </label>
        <input
          type="range"
          min={2}
          max={10}
          value={layerCount}
          onChange={(e) => setLayerCount(Number(e.target.value))}
          className="w-full accent-editor-accent"
        />
        <div className="flex justify-between text-xs text-editor-text-muted mt-1">
          <span>2</span>
          <span>10</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4">
        <label className="block text-xs text-editor-text-muted mb-2">
          Instrucciones de estructura (opcional)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ej: separa persona, pelo, ropa, fondo, sombras..."
          className="input text-sm resize-none"
          rows={3}
        />
      </div>

      {/* Infinite Decomposition Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <label className="text-sm text-editor-text">Descomposición infinita</label>
          <p className="text-xs text-editor-text-muted">Permite refinar capas en subcapas</p>
        </div>
        <button
          onClick={() => setInfiniteDecomposition(!infiniteDecomposition)}
          className={`w-11 h-6 rounded-full transition-colors ${
            infiniteDecomposition ? 'bg-editor-accent' : 'bg-editor-border'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              infiniteDecomposition ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Decompose Button */}
      <button
        onClick={handleDecompose}
        disabled={isProcessing || !activeLayer?.imageUrl}
        className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Procesando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">auto_awesome</span>
            Separar Capas con IA
          </>
        )}
      </button>

      {/* Info */}
      <div className="mt-4 p-3 bg-editor-bg rounded-lg border border-editor-border">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-editor-accent text-base mt-0.5">info</span>
          <div className="text-xs text-editor-text-muted">
            <p className="mb-1">La IA analizará tu imagen y la separará en capas RGBA independientes.</p>
            <p>Cada capa tendrá transparencia real y podrás editarla individualmente.</p>
          </div>
        </div>
      </div>

      {/* Refine Selected Layer */}
      <div className="mt-4 pt-4 border-t border-editor-border">
        <button
          disabled={!infiniteDecomposition}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-editor-border rounded text-sm hover:bg-editor-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-base">layers</span>
          Refinar Capa Seleccionada
        </button>
      </div>
    </div>
  )
}
