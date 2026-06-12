import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      imageUrl,
      imageBase64,
      prompt,
      guidance = 4,
      strength = 0.9,
      numInferenceSteps = 50,
    } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Se requiere un prompt con las instrucciones de edición' },
        { status: 400 }
      )
    }

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'Se requiere una imagen (URL o base64)' },
        { status: 400 }
      )
    }

    // Prepare image input
    let imageInput = imageUrl
    if (imageBase64) {
      imageInput = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`
    }

    console.log('Editing layer with Qwen-Image-Edit:', prompt)

    // Run Qwen-Image-Edit model (mejor para edición semántica y de apariencia)
    const output = await replicate.run('qwen/qwen-image-edit', {
      input: {
        image: imageInput,
        prompt: prompt,
        go_fast: true,
        guidance: guidance,
        strength: strength,
        image_size: 'optimize_for_quality',
        aspect_ratio: '16:9',
        output_format: 'webp',
        enhance_prompt: false,
        output_quality: 90,
        negative_prompt: ' ',
        num_inference_steps: numInferenceSteps,
        disable_safety_checker: true,
      },
    })

    // Output can be a string URL or array
    const editedImageUrl = Array.isArray(output) ? output[0] : output

    if (!editedImageUrl) {
      return NextResponse.json(
        { error: 'No se pudo generar la edición' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      editedImageUrl,
      originalPrompt: prompt,
      model: 'qwen/qwen-image-edit',
    })
  } catch (error) {
    console.error('Error editing layer:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al editar la capa' },
      { status: 500 }
    )
  }
}
