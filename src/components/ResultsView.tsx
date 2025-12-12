/**
 * ResultsView Component
 *
 * Displays research results including:
 * - Session cost banner
 * - Conversation thread (queries + syntheses)
 * - Expandable individual model responses
 *
 * @module components/ResultsView
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ResearchResult } from '@/types'
import {
  ChalkSearch,
  ChalkChat,
  ChalkCheck,
  ChalkX,
  ChalkChevronUp,
  ChalkChevronDown,
} from './ChalkIcons'

interface ResultsViewProps {
  /** All research rounds in this session */
  conversationHistory: ResearchResult[]
}

/** Height threshold for showing expand/collapse button (in pixels) */
const QUERY_COLLAPSE_THRESHOLD = 250
/** Minimum characters before considering collapse */
const MIN_CHARS_TO_COLLAPSE = 300

/**
 * Displays the research results.
 *
 * @example
 * <ResultsView conversationHistory={conversationHistory} />
 */
/**
 * Collapsible query display with scroll for long content
 */
function QueryDisplay({ query, roundIdx }: { query: string; roundIdx: number }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsExpansion, setNeedsExpansion] = useState(false)

  // Check if content exceeds both height AND character thresholds
  useEffect(() => {
    if (contentRef.current) {
      const exceedsHeight = contentRef.current.scrollHeight > QUERY_COLLAPSE_THRESHOLD
      const exceedsChars = query.length > MIN_CHARS_TO_COLLAPSE
      setNeedsExpansion(exceedsHeight && exceedsChars)
    }
  }, [query])

  return (
    <div className="bg-paper-surface/30 rounded-lg overflow-hidden border border-paper-accent/20">
      <div
        ref={contentRef}
        className={`px-4 py-2 text-sm text-paper-text/90 whitespace-pre-wrap break-words transition-all ${
          !isExpanded && needsExpansion ? 'max-h-24 overflow-hidden' : 'max-h-96 overflow-y-auto'
        }`}
      >
        {query}
      </div>
      {needsExpansion && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1 text-xs text-paper-accent hover:bg-paper-hover border-t border-paper-accent/20 flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChalkChevronUp size={12} /> Show less
            </>
          ) : (
            <>
              <ChalkChevronDown size={12} /> Show more
            </>
          )}
        </button>
      )}
    </div>
  )
}

export function ResultsView({ conversationHistory }: ResultsViewProps) {
  // Track which rounds have expanded individual responses
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  const toggleRoundExpansion = (roundIdx: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(roundIdx)) {
        next.delete(roundIdx)
      } else {
        next.add(roundIdx)
      }
      return next
    })
  }

  // Calculate cumulative session cost and check for estimates
  const cumulativeCost = conversationHistory.reduce((sum, r) => sum + (r.totalCost || 0), 0)
  const hasAnyEstimatedCosts = conversationHistory.some(r => r.hasEstimatedCosts)

  return (
    <div className="space-y-4">
      {/* Cost Banner */}
      {cumulativeCost > 0 && (
        <div className="bg-paper-surface/50 border border-paper-accent/30 rounded-lg px-4 py-2 text-sm">
          <span className="font-medium text-paper-muted">Session Cost: </span>
          <span
            className="text-paper-text/80"
            title={hasAnyEstimatedCosts ? 'Includes estimated costs (actual data unavailable from some models)' : undefined}
          >
            {hasAnyEstimatedCosts ? '~' : ''}${cumulativeCost.toFixed(4)}
          </span>
        </div>
      )}

      {/* Conversation Thread */}
      {conversationHistory.map((result, roundIdx) => (
        <div key={roundIdx} className="space-y-3">
          {/* Round Header */}
          <div className="flex items-center gap-2 text-xs text-paper-muted">
            <span className="font-medium flex items-center gap-1">
              {roundIdx === 0 ? (
                <>
                  <ChalkSearch size={14} /> Query
                </>
              ) : (
                <>
                  <ChalkChat size={14} /> Follow-up {roundIdx}
                </>
              )}
            </span>
            {result.timestamp && (
              <span>• {new Date(result.timestamp).toLocaleTimeString()}</span>
            )}
            {result.orchestrator && <span>• {result.orchestrator}</span>}
          </div>

          {/* Query Display - Full query with expand/collapse */}
          <QueryDisplay query={result.query} roundIdx={roundIdx} />

          {/* Synthesis Card */}
          <div className="bg-paper-card rounded-xl border border-paper-accent/30 p-4 chalk-frame">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-paper-text">
                Summary
              </h3>
              {result.totalCost !== undefined && result.totalCost > 0 && (
                <span
                  className="text-xs text-paper-success"
                  title={result.hasEstimatedCosts ? 'Includes estimated costs' : undefined}
                >
                  {result.hasEstimatedCosts ? '~' : ''}${result.totalCost.toFixed(4)}
                </span>
              )}
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-paper-text/90">
              <ReactMarkdown>{result.synthesis}</ReactMarkdown>
            </div>
          </div>

          {/* Individual Responses Accordion */}
          <div className="bg-paper-card rounded-xl border border-paper-accent/30 overflow-hidden chalk-frame-light">
            <button
              type="button"
              onClick={() => toggleRoundExpansion(roundIdx)}
              className="w-full px-4 py-2 text-sm font-medium text-paper-text/80 hover:bg-paper-hover flex items-center justify-between"
            >
              <span>
                Individual Responses ({result.successCount}/{result.modelCount})
              </span>
              <span>
                {expandedRounds.has(roundIdx) ? (
                  <ChalkChevronUp size={14} />
                ) : (
                  <ChalkChevronDown size={14} />
                )}
              </span>
            </button>

            {expandedRounds.has(roundIdx) && (
              <div className="border-t border-paper-divider p-4 space-y-4">
                {result.responses.map((response, i) => (
                  <div key={i} className="border-l-4 border-paper-accent/40 pl-4">
                    {/* Response Header */}
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-paper-text flex items-center gap-1">
                          {response.success ? (
                            <ChalkCheck size={14} className="text-paper-success" />
                          ) : (
                            <ChalkX size={14} className="text-paper-error" />
                          )}
                          {response.model}
                        </h4>
                        {response.durationMs && (
                          <span className="text-xs text-paper-muted">
                            {(response.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {response.cost !== undefined && response.cost > 0 && (
                          <span
                            className="text-xs text-paper-success"
                            title={response.isEstimatedCost ? 'Estimated - actual cost data unavailable' : undefined}
                          >
                            {response.isEstimatedCost ? '~' : ''}${response.cost.toFixed(4)}
                          </span>
                        )}
                      </div>
                      {response.usage && (
                        <span className="text-xs text-paper-muted">
                          {response.usage.totalTokens.toLocaleString()} tokens
                        </span>
                      )}
                    </div>

                    {/* Response Content */}
                    {response.success ? (
                      <div className="text-sm text-paper-text/80 prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{response.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-paper-error">Error: {response.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
