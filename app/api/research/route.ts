import { NextRequest, NextResponse } from 'next/server'
import { runResearch, ResearchImage } from '@/lib/research'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const query = formData.get('query') as string
    const mode = (formData.get('mode') as string) || 'quick'

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Process images
    const images: ResearchImage[] = []
    const imageFiles = formData.getAll('images') as File[]
    
    for (const file of imageFiles) {
      if (file.size > 0) {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = file.type as ResearchImage['mimeType']
        
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) {
          images.push({ base64, mimeType })
        }
      }
    }

    const result = await runResearch({
      query,
      images: images.length > 0 ? images : undefined,
      mode: mode as 'quick' | 'deep'
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Research API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    )
  }
}
