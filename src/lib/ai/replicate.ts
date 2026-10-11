/** Núcleo IA (Replicate) reutilizable por el API v1. */
import Replicate from 'replicate'

function client(): Replicate | null {
  if (!process.env.REPLICATE_API_TOKEN) return null
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
}

function toImageInput(src: string): string {
  if (src.startsWith('data:') || src.startsWith('http')) return src
  return `data:image/png;base64,${src}`
}

export interface DecomposeOpts {
  image: string
  layerCount?: number
  instructions?: string
  outputFormat?: string
  outputQuality?: number
}

export async function decomposeImage(opts: DecomposeOpts) {
  const replicate = client()
  if (!replicate) throw new Error('REPLICATE_API_TOKEN no configurado')
  const layerCount = Math.max(2, Math.min(10, opts.layerCount || 4))
  const started = Date.now()
  // 2026-10-11: filtro de contenido reactivado (decisión del dueño). En jun-2026 fallaba con
  // `Unable to infer channel dimension format` y devolvía 1 de N capas
  // (docs/FIX-DECOMPOSE-SAFETY-CHECKER-2026-06-12.md); si reaparece, se ve en el número de capas.
  const output = await replicate.run('qwen/qwen-image-layered', {
    input: {
      image: toImageInput(opts.image),
      num_layers: layerCount,
      description: opts.instructions || 'auto',
      go_fast: true,
      output_format: opts.outputFormat || 'webp',
      output_quality: opts.outputQuality ?? 95,
      disable_safety_checker: false,
    },
  })
  if (!output || !Array.isArray(output)) throw new Error('Respuesta inválida de la IA')
  const layers = output.map((item: any, index: number) => {
    let url: string
    if (typeof item === 'string') url = item
    else if (item && typeof item.url === 'function') url = item.url()
    else if (item && item.url) url = item.url
    else url = String(item)
    return { name: `Capa ${index + 1}`, imageUrl: url, order: index }
  })
  return { layers, processingTimeMs: Date.now() - started }
}

export interface EditOpts {
  image: string
  prompt: string
  guidance?: number
  strength?: number
  numInferenceSteps?: number
  aspectRatio?: string
}

export async function editImage(opts: EditOpts) {
  const replicate = client()
  if (!replicate) throw new Error('REPLICATE_API_TOKEN no configurado')
  if (!opts.prompt) throw new Error('Falta prompt')
  const started = Date.now()
  const output = await replicate.run('qwen/qwen-image-edit', {
    input: {
      image: toImageInput(opts.image),
      prompt: opts.prompt,
      go_fast: true,
      guidance: opts.guidance ?? 4,
      strength: opts.strength ?? 0.9,
      image_size: 'optimize_for_quality',
      aspect_ratio: opts.aspectRatio || '16:9',
      output_format: 'webp',
      enhance_prompt: false,
      output_quality: 90,
      negative_prompt: ' ',
      num_inference_steps: opts.numInferenceSteps ?? 50,
      disable_safety_checker: false,
    },
  })
  const editedImageUrl = Array.isArray(output) ? output[0] : output
  if (!editedImageUrl) throw new Error('No se pudo generar la edición')
  return { editedImageUrl: String(editedImageUrl), processingTimeMs: Date.now() - started }
}
