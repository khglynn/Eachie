'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface ModelOption {
  id: string
  name: string
  category: string
  cost: number
}

interface ModelResponse {
  model: string
  modelId: string
  content: string
  success: boolean
  error?: string
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

type Stage = 'input' | 'clarifying' | 'research' | 'results'

// Model options grouped by category
const MODEL_OPTIONS: ModelOption[] = [
  // Flagships
  { id: 'anthropic/claude-4-sonnet-20250522:online', name: 'Claude Sonnet 4', category: '🏆 Flagship', cost: 3 },
  { id: 'anthropic/claude-opus-4.5:online', name: 'Claude Opus 4.5', category: '🏆 Flagship', cost: 5 },
  { id: 'openai/gpt-5.1:online', name: 'GPT-5.1', category: '🏆 Flagship', cost: 4 },
  { id: 'google/gemini-3-pro-preview:online', name: 'Gemini 3 Pro', category: '🏆 Flagship', cost: 3 },
  // Fast
  { id: 'anthropic/claude-haiku-4.5:online', name: 'Claude Haiku 4.5', category: '⚡ Fast', cost: 1 },
  { id: 'google/gemini-2.5-flash-preview-05-20:online', name: 'Gemini Flash', category: '⚡ Fast', cost: 1 },
  { id: 'meta-llama/llama-4-maverick:online', name: 'Llama 4 Maverick', category: '⚡ Fast', cost: 0 },
  // Reasoning
  { id: 'deepseek/deepseek-r1:online', name: 'DeepSeek R1', category: '🧠 Reasoning', cost: 1 },
  { id: 'moonshotai/kimi-k2-thinking:online', name: 'Kimi K2', category: '🧠 Reasoning', cost: 2 },
  { id: 'perplexity/sonar-deep-research', name: 'Perplexity Deep', category: '🧠 Reasoning', cost: 3 },
  // Grounding
  { id: 'openai/gpt-5.1-codex:online', name: 'GPT-5.1 Codex', category: '🎯 Grounding', cost: 4 },
  { id: 'x-ai/grok-4.1:online', name: 'Grok 4.1', category: '🎯 Grounding', cost: 2 },
  // Search
  { id: 'perplexity/sonar-pro', name: 'Perplexity Sonar', category: '🔍 Search', cost: 2 },
]

const DEFAULT_QUICK = ['anthropic/claude-haiku-4.5:online', 'google/gemini-2.5-flash-preview-05-20:online', 'deepseek/deepseek-r1:online']
const DEFAULT_DEEP = ['anthropic/claude-4-sonnet-20250522:online', 'openai/gpt-5.1:online', 'google/gemini-3-pro-preview:online', 'deepseek/deepseek-r1:online', 'perplexity/sonar-deep-research']

export default function Home() {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showIndividual, setShowIndividual] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Model selection
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_QUICK)
  const [isDeepMode, setIsDeepMode] = useState(false)
  
  // Chat state
  const [stage, setStage] = useState<Stage>('input')
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [originalQuery, setOriginalQuery] = useState('')
  
  // Follow-up
  const [followUpQuery, setFollowUpQuery] = useState('')
  const [conversationHistory, setConversationHistory] = useState<ResearchResult[]>([])

  // Update default models when mode changes
  useEffect(() => {
    if (!showModelSelector) {
      setSelectedModels(isDeepMode ? DEFAULT_DEEP : DEFAULT_QUICK)
    }
  }, [isDeepMode, showModelSelector])

  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(id => id !== modelId))
    } else if (selectedModels.length < 5) {
      setSelectedModels([...selectedModels, modelId])
    }
  }

  const handleImageChange = useCallback((files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f => 
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)
    )
    const combined = [...images, ...newFiles].slice(0, 4)
    setImages(combined)
    setImagePreviews(prev => {
      prev.forEach(url => URL.revokeObjectURL(url))
      return combined.map(f => URL.createObjectURL(f))
    })
  }, [images])

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    URL.revokeObjectURL(imagePreviews[index])
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  // Compact context for follow-ups
  const compactContext = (history: ResearchResult[]): string => {
    if (history.length === 0) return ''
    const recent = history.slice(-2)
    return recent.map((r, i) => {
      const short = r.synthesis.split(' ').slice(0, 400).join(' ')
      return `Research ${i + 1}: "${r.query.slice(0, 80)}"\nFindings: ${short}`
    }).join('\n\n---\n\n')
  }

  // Get clarifying questions
  const getClarifyingQuestions = async (userQuery: string) => {
    setIsLoading(true)
    setOriginalQuery(userQuery)
    
    try {
      const response = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.questions?.length > 0) {
          setClarifyingQuestions(data.questions)
          setAnswers(new Array(data.questions.length).fill(''))
          setStage('clarifying')
          setIsLoading(false)
          return
        }
      }
    } catch {}
    
    await runFullResearch(userQuery)
  }

  // Run research
  const runFullResearch = async (finalQuery: string, isFollowUp = false) => {
    setIsLoading(true)
    setStage('research')
    setError(null)

    let enhancedQuery = finalQuery
    if (isFollowUp && conversationHistory.length > 0) {
      const context = compactContext(conversationHistory)
      enhancedQuery = `${finalQuery}\n\n---\nContext from previous research:\n${context}`
    }

    const formData = new FormData()
    formData.append('query', enhancedQuery)
    formData.append('mode', isDeepMode ? 'deep' : 'quick')
    formData.append('modelIds', JSON.stringify(selectedModels))
    images.forEach(img => formData.append('images', img))

    try {
      const response = await fetch('/api/research', { method: 'POST', body: formData })
      if (!response.ok) throw new Error((await response.json()).error || 'Research failed')

      const data = await response.json()
      setResult(data)
      setConversationHistory(prev => [...prev, data])
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('results')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    await getClarifyingQuestions(query.trim())
    setQuery('')
  }

  const handleAnswersSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const answeredQuestions = clarifyingQuestions
      .map((q, i) => answers[i] ? `Q: ${q}\nA: ${answers[i]}` : null)
      .filter(Boolean).join('\n\n')
    
    const enhancedQuery = answeredQuestions 
      ? `${originalQuery}\n\n---\nContext:\n${answeredQuestions}`
      : originalQuery
    
    await runFullResearch(enhancedQuery)
  }

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!followUpQuery.trim()) return
    await runFullResearch(followUpQuery.trim(), true)
    setFollowUpQuery('')
  }

  // Download as Obsidian-formatted zip
  const downloadZip = async () => {
    if (!result) return
    
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `research-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const clearAll = () => {
    setQuery('')
    setImages([])
    imagePreviews.forEach(url => URL.revokeObjectURL(url))
    setImagePreviews([])
    setResult(null)
    setError(null)
    setStage('input')
    setClarifyingQuestions([])
    setAnswers([])
    setOriginalQuery('')
    setFollowUpQuery('')
    setConversationHistory([])
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-safe">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">🔬 Research Agent</h1>
          <p className="text-sm text-slate-500">Multi-model AI research with web search</p>
        </div>

        {/* Input Stage */}
        {stage === 'input' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like to research?"
                className="w-full p-4 text-base sm:text-lg resize-none border-0 focus:ring-0 focus:outline-none placeholder:text-slate-400 min-h-[100px]"
                disabled={isLoading}
              />

              {/* Images */}
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="relative">
                      <img src={preview} alt="" className="h-16 w-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="border-t border-slate-100 p-3 bg-slate-50 space-y-3">
                {/* Mode & Images Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1">
                      <span>📷</span>
                      <span className="hidden sm:inline">{images.length > 0 ? `${images.length}/4` : 'Images'}</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple
                      onChange={(e) => handleImageChange(e.target.files)} className="hidden" />
                    
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={isDeepMode} onChange={(e) => setIsDeepMode(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4" />
                      <span className="text-slate-600">Deep mode</span>
                    </label>
                  </div>
                  
                  <button type="submit" disabled={isLoading || !query.trim()}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base">
                    {isLoading ? '⏳' : 'Research'}
                  </button>
                </div>

                {/* Model Selector */}
                <div>
                  <button type="button" onClick={() => setShowModelSelector(!showModelSelector)}
                    className="text-xs text-slate-500 hover:text-slate-700">
                    {showModelSelector ? '▼' : '▶'} Models ({selectedModels.length}/5)
                  </button>
                  
                  {showModelSelector && (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {MODEL_OPTIONS.map(model => (
                        <label key={model.id} className={`flex items-center gap-1.5 p-1.5 rounded text-xs cursor-pointer
                          ${selectedModels.includes(model.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}>
                          <input type="checkbox" checked={selectedModels.includes(model.id)}
                            onChange={() => toggleModel(model.id)}
                            disabled={!selectedModels.includes(model.id) && selectedModels.length >= 5}
                            className="rounded text-blue-600 w-3 h-3" />
                          <span className="truncate">{model.name}</span>
                          <span className="text-slate-400">{'$'.repeat(model.cost) || '∅'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Clarifying Questions */}
        {stage === 'clarifying' && (
          <form onSubmit={handleAnswersSubmit} className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-3 bg-blue-50 border-b border-blue-100">
                <p className="text-sm text-blue-700">💬 Quick context for better results (optional)</p>
              </div>
              <div className="p-4 space-y-3">
                {clarifyingQuestions.map((q, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{i + 1}. {q}</label>
                    <input type="text" value={answers[i]}
                      onChange={(e) => { const a = [...answers]; a[i] = e.target.value; setAnswers(a) }}
                      placeholder="Optional" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              <div className="border-t p-3 bg-slate-50 flex justify-between">
                <button type="button" onClick={() => runFullResearch(originalQuery)} className="text-sm text-slate-500">Skip →</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                  {isLoading ? '⏳' : 'Research'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Loading */}
        {stage === 'research' && isLoading && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-3">🔬</div>
              <p className="text-slate-600">Querying {selectedModels.length} models...</p>
              <p className="text-sm text-slate-400 mt-1">{isDeepMode ? '~60 sec' : '~20 sec'}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {stage === 'results' && result && (
          <div className="space-y-4">
            {/* Synthesis */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 text-sm sm:text-base">✨ Synthesis</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {result.successCount}/{result.modelCount} • {(result.totalDurationMs / 1000).toFixed(0)}s
                  </span>
                  <button onClick={downloadZip} className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                    📥 Download
                  </button>
                </div>
              </div>
              <div className="p-4 prose prose-sm prose-slate max-w-none">
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result.synthesis) }} />
              </div>
            </div>

            {/* Individual Responses */}
            <button onClick={() => setShowIndividual(!showIndividual)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700 py-2">
              {showIndividual ? '▼ Hide' : '▶ Show'} individual responses
            </button>

            {showIndividual && (
              <div className="space-y-3">
                {result.responses.map((r, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-2 bg-slate-50 border-b flex justify-between items-center">
                      <span className="font-medium text-slate-700 text-sm">{r.model}</span>
                      <span className={`text-xs ${r.success ? 'text-green-600' : 'text-red-500'}`}>
                        {r.success ? `✓ ${((r.durationMs || 0) / 1000).toFixed(1)}s` : '✗'}
                      </span>
                    </div>
                    <div className="p-3 text-sm text-slate-600 max-h-48 overflow-y-auto">
                      {r.success ? (
                        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(r.content) }} />
                      ) : <p className="text-red-500">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Follow-up */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <form onSubmit={handleFollowUp} className="p-3">
                <input type="text" value={followUpQuery} onChange={(e) => setFollowUpQuery(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-2" disabled={isLoading} />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Uses context from previous research</span>
                  <button type="submit" disabled={isLoading || !followUpQuery.trim()}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {isLoading ? '⏳' : 'Research'}
                  </button>
                </div>
              </form>
            </div>

            <div className="text-center">
              <button onClick={clearAll} className="text-blue-600 hover:text-blue-700 text-sm">← New research</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function formatMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />')
    .replace(/^/, '<p class="mb-2">')
    .replace(/$/, '</p>')
}
