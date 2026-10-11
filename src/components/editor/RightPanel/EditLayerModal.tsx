'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AvisoCuentaIA } from '@/components/editor/AvisoCuentaIA'

interface EditLayerModalProps {
  isOpen: boolean
  onClose: () => void
  layerName: string
  layerImageUrl: string | null
  onApplyEdit: (editedImageUrl: string) => void
}

export function EditLayerModal({
  isOpen,
  onClose,
  layerName,
  layerImageUrl,
  onApplyEdit,
}: EditLayerModalProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [guidance, setGuidance] = useState(4)
  const [strength, setStrength] = useState(0.9)
  const [pideCuenta, setPideCuenta] = useState(false)
  const { isAuthenticated, loading: cargandoSesion } = useAuth()

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !layerImageUrl) return
    if (!cargandoSesion && !isAuthenticated) {
      setPideCuenta(true)
      return
    }

    setIsLoading(true)
    setError(null)
    setPreviewUrl(null)

    try {
      // Determinar cómo enviar la imagen según el tipo de URL
      let requestBody: any = {
        prompt: prompt.trim(),
        guidance,
        strength,
      }

      if (layerImageUrl.startsWith('blob:')) {
        // Es una URL blob local (desarrollo), convertir a base64
        const response = await fetch(layerImageUrl)
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        requestBody.imageBase64 = base64
      } else if (layerImageUrl.startsWith('http://') || layerImageUrl.startsWith('https://')) {
        // Es una URL pública (VPS/producción), enviar la URL directamente
        requestBody.imageUrl = layerImageUrl
      } else if (layerImageUrl.startsWith('data:')) {
        // Ya es base64
        requestBody.imageBase64 = layerImageUrl
      } else {
        throw new Error('Formato de imagen no soportado')
      }

      const response = await fetch('/api/layers/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.status === 401) {
        setPideCuenta(true)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al editar la capa')
      }

      setPreviewUrl(data.editedImageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [prompt, layerImageUrl, guidance, strength, cargandoSesion, isAuthenticated])

  const handleApply = useCallback(() => {
    if (previewUrl) {
      onApplyEdit(previewUrl)
      onClose()
    }
  }, [previewUrl, onApplyEdit, onClose])

  const handleClose = useCallback(() => {
    setPrompt('')
    setPreviewUrl(null)
    setError(null)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-editor-surface border border-editor-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-editor-border">
          <div className="flex items-center gap-2 text-editor-text">
            <span className="material-symbols-outlined text-indigo-400">edit</span>
            <h2 className="font-medium text-lg">Editar capa con IA</h2>
            <span className="text-editor-text-muted text-sm">- {layerName}</span>
          </div>
          <button
            onClick={handleClose}
            className="text-editor-text-muted hover:text-editor-text transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row p-6 gap-8">
          {/* Original Image */}
          <div className="w-full lg:w-1/2 flex flex-col gap-2">
            <label className="text-sm font-medium text-editor-text-muted">Original</label>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-editor-border bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMmEyYTJhIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMyYTJhMmEiLz48L3N2Zz4=')] flex items-center justify-center">
              {layerImageUrl ? (
                <img
                  src={layerImageUrl}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-editor-text-muted">Sin imagen</span>
              )}
            </div>
          </div>

          {/* Preview / Controls */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            {previewUrl ? (
              <>
                <label className="text-sm font-medium text-editor-text-muted">Resultado</label>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-editor-border bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMmEyYTJhIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMyYTJhMmEiLz48L3N2Zz4=')] flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Editado"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <p className="text-xs text-editor-text-muted">
                  Prompt: &quot;{prompt}&quot;
                </p>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-editor-text-muted" htmlFor="prompt">
                  Describe los cambios que quieres aplicar:
                </label>
                <div className="relative">
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: Cambia el fondo a un atardecer, añade nubes..."
                    rows={5}
                    className="w-full bg-editor-bg text-editor-text border border-editor-border rounded-lg p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder-editor-text-muted"
                  />
                  <div className="absolute bottom-2 right-3">
                    <span className="text-xs text-editor-text-muted">{prompt.length} caracteres</span>
                  </div>
                </div>

                {/* Advanced Options */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 w-full p-3 rounded-lg bg-editor-bg hover:bg-editor-surface-hover border border-editor-border transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-editor-text-muted text-xl">
                    {showAdvanced ? 'expand_less' : 'settings'}
                  </span>
                  <span className="text-sm font-medium text-editor-text-muted">Opciones avanzadas</span>
                </button>

                {showAdvanced && (
                  <div className="flex flex-col gap-3 p-4 bg-editor-bg rounded-lg border border-editor-border">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-editor-text-muted">
                        Guidance (seguir prompt)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={guidance}
                          onChange={(e) => setGuidance(parseFloat(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-editor-text w-8">{guidance}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-editor-text-muted">
                        Strength (intensidad cambios)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={strength}
                          onChange={(e) => setStrength(parseFloat(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-editor-text w-8">{strength}</span>
                      </div>
                    </div>
                    <p className="text-xs text-editor-text-muted mt-1">
                      Mayor Guidance = más fiel al prompt. Mayor Strength = cambios más intensos.
                    </p>
                  </div>
                )}

                {pideCuenta && <AvisoCuentaIA className="mb-4" />}
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-editor-border flex justify-end gap-3 bg-editor-bg">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-editor-text-muted hover:bg-editor-surface-hover transition-colors"
          >
            Cancelar
          </button>

          {previewUrl ? (
            <>
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-editor-text-muted hover:bg-editor-surface-hover transition-colors"
              >
                Nuevo intento
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                Aplicar cambios
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/30"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Generando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  Generar Edición
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
