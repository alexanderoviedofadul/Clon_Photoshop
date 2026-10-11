'use client'

import { useRef } from 'react'
import { TOOLS, TOOL_ORDER } from '@/constants'
import { useToolStore } from '@/stores/useToolStore'

export function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool)
  const setTool = useToolStore((s) => s.setTool)
  const primaryColor = useToolStore((s) => s.primaryColor)
  const secondaryColor = useToolStore((s) => s.secondaryColor)
  const setPrimaryColor = useToolStore((s) => s.setPrimaryColor)
  const setSecondaryColor = useToolStore((s) => s.setSecondaryColor)
  const swapColors = useToolStore((s) => s.swapColors)

  const fgRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)

  return (
    <div className="w-12 bg-editor-surface border-r border-editor-border flex flex-col items-center py-2">
      {TOOL_ORDER.map((toolType) => {
        const tool = TOOLS[toolType]
        return (
          <button
            key={toolType}
            className={`tool-btn ${activeTool === toolType ? 'active' : ''}`}
            onClick={() => setTool(toolType)}
            title={`${tool.name} (${tool.shortcut})`}
          >
            <span className="material-symbols-outlined text-xl">{tool.icon}</span>
          </button>
        )
      })}

      {/* Divider */}
      <div className="w-8 h-px bg-editor-border my-3" />

      {/* Color Swatches */}
      <div className="relative w-10 h-10">
        <input
          ref={bgRef}
          type="color"
          aria-label="Color secundario"
          className="sr-only"
          value={secondaryColor}
          onChange={(e) => setSecondaryColor(e.target.value)}
        />
        <input
          ref={fgRef}
          type="color"
          aria-label="Color principal"
          className="sr-only"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
        />
        {/* Background Color */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 rounded border border-editor-border cursor-pointer"
          style={{ backgroundColor: secondaryColor }}
          title="Color de fondo"
          onClick={() => bgRef.current?.click()}
        />
        {/* Foreground Color */}
        <div
          className="absolute top-0 left-0 w-6 h-6 rounded border border-editor-border cursor-pointer"
          style={{ backgroundColor: primaryColor }}
          title="Color de primer plano"
          onClick={() => fgRef.current?.click()}
        />
        {/* Swap Icon */}
        <button
          className="absolute -top-1 -right-1 w-4 h-4 bg-editor-surface rounded-full flex items-center justify-center hover:bg-editor-surface-hover"
          title="Intercambiar colores (X)"
          onClick={swapColors}
        >
          <span className="material-symbols-outlined text-xs">swap_horiz</span>
        </button>
      </div>
    </div>
  )
}
