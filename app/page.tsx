'use client'

import { useState, useRef, useCallback } from 'react'

interface ModelResponse {
  model: string
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

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  type?: 'query' | 'clarifying' | 'answers' | 'research'
}

type Stage = 'input' | 'clarifying' | 'research' | 'results'

export default function Home() {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showIndividual, setShowIndividual] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Chat flow state
  const [stage, setStage] = useState<Stage>('input')
  const [messages, setMessages] = useState<Message[]>([])
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [originalQuery, setOriginalQuery] = useState('')

  const handleImageChange = useCallback((files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files).filter(f => 
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)
    )
    
    const combined = [...images, ...newFiles].slice(0, 4)
    setImages(combined)
    
    const previews = combined.map(f => URL.createObjectURL(f))
    setImagePreviews(prev => {
      prev.forEach(url => URL.revokeObjectURL(url))
      return previews
    })
  }, [images])

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    URL.revokeObjectURL(imagePreviews[index])
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleImageChange(e.dataTransfer.files)
  }, [handleImageChange])

  // Get clarifying questions from AI
  const getClarifyingQuestions = async (userQuery: string) => {
    setIsLoading(true)
    setOriginalQuery(userQuery)
    
    setMessages(prev => [...prev, { role: 'user', content: userQuery, type: 'query' }])
    
    try {
      const response = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      })
      
      if (!response.ok) throw new Error('Failed to get clarifying questions')
      
      const data = await response.json()
      setClarifyingQuestions(data.questions)
      setAnswers(new Array(data.questions.length).fill(''))
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `To help research this better, I have a few questions:\n\n${data.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`,
        type: 'clarifying'
      }])
      
      setStage('clarifying')
    } catch (err) {
      // If clarifying fails, proceed directly to research
      await runFullResearch(userQuery)
    } finally {
      setIsLoading(false)
    }
  }

  // Run full research with or without clarifications
  const runFullResearch = async (finalQuery: string) => {
    setIsLoading(true)
    setStage('research')
    setError(null)

    const formData = new FormData()
    formData.append('query', finalQuery)
    images.forEach(img => formData.append('images', img))

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Research failed')
      }

      const data = await response.json()
      setResult(data)
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('input')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle initial submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    await getClarifyingQuestions(query.trim())
    setQuery('')
  }

  // Handle submitting clarifying answers
  const handleAnswersSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Build enhanced query with context
    const answeredQuestions = clarifyingQuestions
      .map((q, i) => answers[i] ? `Q: ${q}\nA: ${answers[i]}` : null)
      .filter(Boolean)
      .join('\n\n')
    
    const enhancedQuery = answeredQuestions 
      ? `${originalQuery}\n\n---\nAdditional context:\n${answeredQuestions}`
      : originalQuery
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: answers.filter(a => a).join('\n'),
      type: 'answers'
    }])
    
    await runFullResearch(enhancedQuery)
  }

  // Skip clarifying questions
  const skipClarifying = async () => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: '(Skipped clarifying questions)',
      type: 'answers'
    }])
    await runFullResearch(originalQuery)
  }

  const clearForm = () => {
    setQuery('')
    setImages([])
    imagePreviews.forEach(url => URL.revokeObjectURL(url))
    setImagePreviews([])
    setResult(null)
    setError(null)
    setStage('input')
    setMessages([])
    setClarifyingQuestions([])
    setAnswers([])
    setOriginalQuery('')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            🔬 Research Agent
          </h1>
          <p className="text-slate-600">
            Query multiple AI models with web search • Get synthesized insights
          </p>
        </div>

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="mb-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Initial Input Stage */}
        {stage === 'input' && (
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like to research?"
                className="w-full p-4 text-lg resize-none border-0 focus:ring-0 focus:outline-none placeholder:text-slate-400"
                rows={3}
                disabled={isLoading}
              />

              {/* Image Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-t border-slate-100 p-4"
              >
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {imagePreviews.map((preview, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={preview}
                          alt={`Upload ${i + 1}`}
                          className="h-20 w-20 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    disabled={isLoading || images.length >= 4}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {images.length > 0 ? `${images.length}/4 images` : 'Add images'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={(e) => handleImageChange(e.target.files)}
                    className="hidden"
                  />
                  <span className="text-xs text-slate-400">
                    Drop images or click to upload
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Claude Haiku • Gemini Flash • DeepSeek R1 (with web search)
                </span>
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? '⏳' : 'Research'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Clarifying Questions Stage */}
        {stage === 'clarifying' && (
          <form onSubmit={handleAnswersSubmit} className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-blue-50">
                <p className="text-sm text-blue-700">
                  💬 Answer any questions that would help get better results (all optional)
                </p>
              </div>
              
              <div className="p-4 space-y-4">
                {clarifyingQuestions.map((question, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {i + 1}. {question}
                    </label>
                    <input
                      type="text"
                      value={answers[i]}
                      onChange={(e) => {
                        const newAnswers = [...answers]
                        newAnswers[i] = e.target.value
                        setAnswers(newAnswers)
                      }}
                      placeholder="Your answer (optional)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-between items-center">
                <button
                  type="button"
                  onClick={skipClarifying}
                  className="text-sm text-slate-500 hover:text-slate-700"
                  disabled={isLoading}
                >
                  Skip questions →
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? '⏳ Researching...' : 'Run Research'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Loading State */}
        {(stage === 'research' && isLoading) && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">🔬</div>
              <p className="text-slate-600 mb-2">Querying 3 AI models with web search...</p>
              <p className="text-sm text-slate-400">This typically takes 15-30 seconds</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <p className="text-red-700">❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {stage === 'results' && result && (
          <div className="space-y-6">
            {/* Synthesis */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800">✨ Synthesis</h2>
                <span className="text-xs text-slate-500">
                  {result.successCount}/{result.modelCount} models • {(result.totalDurationMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="p-6 prose prose-slate max-w-none">
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result.synthesis) }} />
              </div>
            </div>

            {/* Individual Responses Toggle */}
            <button
              onClick={() => setShowIndividual(!showIndividual)}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
            >
              {showIndividual ? '▼ Hide' : '▶ Show'} individual model responses
            </button>

            {/* Individual Model Responses */}
            {showIndividual && (
              <div className="space-y-4">
                {result.responses.map((response, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-medium text-slate-700">{response.model}</h3>
                      {response.success ? (
                        <span className="text-xs text-green-600">
                          ✓ {((response.durationMs || 0) / 1000).toFixed(1)}s
                        </span>
                      ) : (
                        <span className="text-xs text-red-500">✗ Failed</span>
                      )}
                    </div>
                    <div className="p-4 text-sm text-slate-600 max-h-64 overflow-y-auto">
                      {response.success ? (
                        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(response.content) }} />
                      ) : (
                        <p className="text-red-500">{response.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Research Button */}
            <div className="text-center">
              <button
                onClick={clearForm}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Start new research
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-400">
          <p>Also available via Slack: @ResearchBot</p>
        </footer>
      </div>
    </main>
  )
}

// Simple markdown to HTML
function formatMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br />')
    .replace(/^/, '<p class="mb-4">')
    .replace(/$/, '</p>')
}
