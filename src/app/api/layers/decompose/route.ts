import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth/session'
import Replicate from 'replicate'
import type { AIDecomposeRequest, AIDecomposeResponse, AILayer } from '@/types'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    // 2026-10-11 (decisión del dueño): la IA exige sesión. Sin cuenta, 401 y no se llama a Replicate.
    let usuario
    try {
      usuario = await currentUser(request)
    } catch {
      return NextResponse.json({ success: false, error: 'Sesión no disponible' }, { status: 503 })
    }
    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Inicie sesión para usar la IA', login: '/login?next=/editor' }, { status: 401 })
    }
    // Validate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'API token not configured' },
        { status: 500 }
      )
    }

    const body: AIDecomposeRequest = await request.json()

    // Validate request - accept both imageUrl and imageBase64
    const imageSource = body.imageUrl || body.imageBase64
    if (!imageSource) {
      return NextResponse.json(
        { success: false, error: 'Image is required (imageUrl or imageBase64)' },
        { status: 400 }
      )
    }

    const layerCount = Math.max(2, Math.min(10, body.layerCount || 4))

    // Prepare image URL or base64
    let imageInput: string
    if (imageSource.startsWith('data:')) {
      // Already a data URI
      imageInput = imageSource
    } else if (imageSource.startsWith('http')) {
      // URL format
      imageInput = imageSource
    } else {
      // Assume raw base64, add data URI prefix
      imageInput = `data:image/png;base64,${imageSource}`
    }

    console.log(`[AI Decompose] Starting with ${layerCount} layers...`)
    const startTime = Date.now()

    // Call Replicate API
    const output = await replicate.run(
      "qwen/qwen-image-layered",
      {
        input: {
          image: imageInput,
          num_layers: layerCount,
          description: body.instructions || 'auto',
          go_fast: true,
          output_format: body.outputFormat || 'webp',
          output_quality: body.outputQuality || 95,
          // 2026-10-11: filtro de contenido reactivado (decisión del dueño). En jun-2026 este filtro
          // descartaba capas legítimas («Unable to infer channel dimension format» → 1 de N capas):
          // ver docs/FIX-DECOMPOSE-SAFETY-CHECKER-2026-06-12.md. Si vuelve a pasar, se ve aquí.
          disable_safety_checker: false,
        },
      }
    )

    const processingTime = Date.now() - startTime
    console.log(`[AI Decompose] Completed in ${processingTime}ms`)

    // Process output - Replicate returns an array of file outputs
    if (!output || !Array.isArray(output)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response from AI' },
        { status: 500 }
      )
    }

    const layers: AILayer[] = await Promise.all(
      output.map(async (item: any, index: number) => {
        let imageUrl: string

        // Handle different output formats from Replicate
        if (typeof item === 'string') {
          imageUrl = item
        } else if (item && typeof item.url === 'function') {
          imageUrl = item.url()
        } else if (item && item.url) {
          imageUrl = item.url
        } else {
          console.warn(`[AI Decompose] Unknown output format for layer ${index}:`, typeof item)
          imageUrl = String(item)
        }

        return {
          name: `Capa ${index + 1}`,
          imageUrl,
          order: index,
        }
      })
    )

    const response: AIDecomposeResponse = {
      success: true,
      layers,
      processingTime,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[AI Decompose] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// Rate limiting could be added here
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout
