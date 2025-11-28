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
  type?: 'query' | 'clarifying' | 'answers' | 'research' | 'followup'
  result?: ResearchResult
}

type Stage = 'input' | 'clarifying' | 'research' | 'results'
type ResearchMode = 'quick' | 'deep'

export default function Home() {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showIndividual, setShowIndividual] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Chat/conversation state
  const [stage, setStage] = useState<Stage>('input')
  const [messages, setMessages] = useState<Message[]>([])
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [originalQuery, setOriginalQuery] = useState('')
  
  // Follow-up state
  const [followUpQuery, setFollowUpQuery] = useState('')
  const [followUpMode, setFollowUpMode] = useState<ResearchMode>('quick')
  const [conversationHistory, setConversationHistory] = useState<ResearchResult[]>([])

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

  // Compact context for follow-ups (keeps it under ~2000 tokens)
  const compactContext = (history: ResearchResult[]): string => {
    if (history.length === 0) return ''
    
    // Take last 2 results max, use only synthesis
    const recent = history.slice(-2)
    const parts = recent.map((r, i) => {
      // Truncate synthesis to ~500 words
      const shortSynthesis = r.synthesis.split(' ').slice(0, 500).join(' ')
      return `Previous research ${i + 1}: "${r.query.slice(0, 100)}"\nKey findings: ${shortSynthesis}`
    })
    
    return parts.join('\n\n---\n\n')
  }

  // Get clarifying questions
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
      
      if (!response.ok) throw new Error('Failed')
      
      const data = await response.json()
      
      if (data.questions && data.questions.length > 0) {
        setClarifyingQuestions(data.questions)
        setAnswers(new Array(data.questions.length).fill(''))
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `To get better results, could you clarify:\n\n${data.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`,
          type: 'clarifying'
        }])
        setStage('clarifying')
        setIsLoading(false)
        return
      }
    } catch {
      // If clarifying fails, proceed directly
    }
    
    await runFullResearch(userQuery)
  }

  // Run research
  const runFullResearch = async (finalQuery: string, mode: ResearchMode = 'quick', isFollowUp = false) => {
    setIsLoading(true)
    setStage('research')
    setError(null)

    // Add context from previous research if follow-up
    let enhancedQuery = finalQuery
    if (isFollowUp && conversationHistory.length > 0) {
      const context = compactContext(conversationHistory)
      enhancedQuery = `${finalQuery}\n\n---\nContext from previous research:\n${context}`
    }

    const formData = new FormData()
    formData.append('query', enhancedQuery)
    formData.append('mode', mode)
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
      setConversationHistory(prev => [...prev, data])
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.synthesis, 
        type: 'research',
        result: data
      }])
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('results')
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

  // Handle clarifying answers
  const handleAnswersSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const answeredQuestions = clarifyingQuestions
      .map((q, i) => answers[i] ? `Q: ${q}\nA: ${answers[i]}` : null)
      .filter(Boolean)
      .join('\n\n')
    
    const enhancedQuery = answeredQuestions 
      ? `${originalQuery}\n\n---\nContext:\n${answeredQuestions}`
      : originalQuery
    
    setMessages(prev => [...prev, { role: 'user', content: answers.filter(a => a).join('; '), type: 'answers' }])
    await runFullResearch(enhancedQuery)
  }

  const skipClarifying = async () => {
    await runFullResearch(originalQuery)
  }

  // Handle follow-up
  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!followUpQuery.trim()) return
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: `${followUpQuery} [${followUpMode === 'deep' ? 'Deep' : 'Quick'} mode]`, 
      type: 'followup' 
    }])
    
    await runFullResearch(followUpQuery.trim(), followUpMode, true)
    setFollowUpQuery('')
  }

  const clearAll = () => {
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
    setFollowUpQuery('')
    setConversationHistory([])
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
            Multi-model AI research with web search
          </p>
        </div>

        {/* Conversation History */}
        {messages.length > 0 && stage !== 'input' && (
          <div className="mb-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{msg.content.slice(0, 500)}{msg.content.length > 500 ? '...' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Initial Input */}
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

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-t border-slate-100 p-4"
              >
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {imagePreviews.map((preview, i) => (
                      <div key={i} className="relative group">
                        <img src={preview} alt={`Upload ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                    disabled={isLoading || images.length >= 4}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {images.length > 0 ? `${images.length}/4` : 'Images'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={(e) => handleImageChange(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  3 models with web search
                </span>
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳' : 'Research'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Clarifying Questions */}
        {stage === 'clarifying' && (
          <form onSubmit={handleAnswersSubmit} className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-blue-50">
                <p className="text-sm text-blue-700">💬 Optional: add context for better results</p>
              </div>
              
              <div className="p-4 space-y-4">
                {clarifyingQuestions.map((question, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{i + 1}. {question}</label>
                    <input
                      type="text"
                      value={answers[i]}
                      onChange={(e) => {
                        const newAnswers = [...answers]
                        newAnswers[i] = e.target.value
                        setAnswers(newAnswers)
                      }}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-between">
                <button type="button" onClick={skipClarifying} className="text-sm text-slate-500 hover:text-slate-700" disabled={isLoading}>
                  Skip →
                </button>
                <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {isLoading ? '⏳' : 'Research'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Loading */}
        {stage === 'research' && isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">🔬</div>
              <p className="text-slate-600 mb-2">Querying AI models with web search...</p>
              <p className="text-sm text-slate-400">15-30 seconds</p>
            </div>
          </div>
        )}

        {/* Error */}
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

            {/* Individual Responses */}
            <button
              onClick={() => setShowIndividual(!showIndividual)}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
            >
              {showIndividual ? '▼ Hide' : '▶ Show'} individual responses
            </button>

            {showIndividual && (
              <div className="space-y-4">
                {result.responses.map((response, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-medium text-slate-700">{response.model}</h3>
                      <span className={`text-xs ${response.success ? 'text-green-600' : 'text-red-500'}`}>
                        {response.success ? `✓ ${((response.durationMs || 0) / 1000).toFixed(1)}s` : '✗ Failed'}
                      </span>
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

            {/* Follow-up Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-medium text-slate-800">🔄 Follow-up Research</h3>
              </div>
              <form onSubmit={handleFollowUp} className="p-4">
                <textarea
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2}
                  disabled={isLoading}
                />
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="mode"
                        checked={followUpMode === 'quick'}
                        onChange={() => setFollowUpMode('quick')}
                        className="text-blue-600"
                      />
                      <span className="text-slate-600">Quick (3 models)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="mode"
                        checked={followUpMode === 'deep'}
                        onChange={() => setFollowUpMode('deep')}
                        className="text-blue-600"
                      />
                      <span className="text-slate-600">Deep (7 models)</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !followUpQuery.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '⏳' : 'Research'}
                  </button>
                </div>
              </form>
            </div>

            {/* Start Over */}
            <div className="text-center">
              <button onClick={clearAll} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                ← Start new research
              </button>
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-sm text-slate-400">
          <p>Also available via Slack: @ResearchBot</p>
        </footer>
      </div>
    </main>
  )
}

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
