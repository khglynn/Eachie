import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'nodejs'

interface ModelResponse {
  model: string
  modelId: string
  content: string
  success: boolean
  durationMs?: number
}

interface ResearchResult {
  query: string
  responses: ModelResponse[]
  synthesis: string
  totalDurationMs: number
  modelCount: number
  successCount: number
}

export async function POST(request: NextRequest) {
  try {
    const result: ResearchResult = await request.json()
    
    const zip = new JSZip()
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayName = dayNames[now.getDay()]
    
    const cleanQuery = result.query
      .slice(0, 50)
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    
    const folderName = `${dateStr} ${dayName} ${cleanQuery}`
    
    // Summary with frontmatter
    const summaryContent = `---
tags:
  - ai-research
date: ${dateStr}
question: "${result.query.slice(0, 200).replace(/"/g, '\\"')}"
models: [${result.responses.filter(r => r.success).map(r => `"${r.model}"`).join(', ')}]
duration: ${(result.totalDurationMs / 1000).toFixed(1)}s
status: completed
---

# Research: ${result.query.slice(0, 100)}

## Synthesis

${result.synthesis}

## Model Responses

${result.responses.filter(r => r.success).map((r, i) => `- [[${String(i + 1).padStart(2, '0')}-${r.model.toLowerCase().replace(/\s+/g, '-')}|${r.model}]]`).join('\n')}

---
*Generated ${now.toLocaleString()}*`

    zip.file(`${folderName}/00-summary.md`, summaryContent)
    
    // Individual model files
    result.responses.forEach((response, i) => {
      if (!response.success) return
      
      const modelSlug = response.model.toLowerCase().replace(/\s+/g, '-')
      const filename = `${String(i + 1).padStart(2, '0')}-${modelSlug}.md`
      
      const content = `---
model: ${response.model}
duration: ${((response.durationMs || 0) / 1000).toFixed(1)}s
date: ${dateStr}
---

# ${response.model}

${response.content}`
      
      zip.file(`${folderName}/${filename}`, content)
    })
    
    // Generate as Uint8Array instead of nodebuffer for Next.js compatibility
    const zipData = await zip.generateAsync({ type: 'uint8array' })
    
    return new NextResponse(zipData, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folderName}.zip"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Failed to create download' }, { status: 500 })
  }
}
