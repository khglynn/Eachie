/**
 * ResearchProgress Component
 *
 * Shows real-time progress during research:
 * - Which models have responded
 * - Which are still pending
 * - Current phase (querying vs synthesizing)
 *
 * @module components/ResearchProgress
 */

'use client'

import { ChalkProgressBar } from './ChalkProgressBar'
import { ChalkLoading, ChalkCheck, ChalkCircle, ChalkCircleFilled } from './ChalkIcons'

interface ResearchProgressProps {
  /** Models that have completed (success or error) */
  completedModels: string[]
  /** Models still waiting for response */
  pendingModels: string[]
  /** Current phase of research */
  phase: 'querying' | 'synthesizing'
  /** Whether this is a follow-up query */
  isFollowUp?: boolean
}

/**
 * Progress indicator during research.
 *
 * @example
 * <ResearchProgress
 *   completedModels={['Claude Haiku', 'Gemini Flash']}
 *   pendingModels={['DeepSeek R1']}
 *   phase="querying"
 * />
 */
export function ResearchProgress({
  completedModels,
  pendingModels,
  phase,
  isFollowUp = false,
}: ResearchProgressProps) {
  const totalModels = completedModels.length + pendingModels.length
  // Include synthesis as a step: total = models + 1
  const totalSteps = totalModels + 1
  const completedSteps = phase === 'synthesizing' ? totalModels : completedModels.length
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return (
    <div className="bg-paper-card border border-paper-accent/30 rounded-xl p-4 chalk-frame">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="animate-spin">
          <ChalkLoading size={18} className="text-paper-accent" />
        </div>
        <p className="text-sm font-medium text-paper-text">
          {phase === 'synthesizing'
            ? 'Creating summary...'
            : isFollowUp
            ? `Processing follow-up with ${totalModels} models...`
            : `Querying ${totalModels} models...`}
        </p>
      </div>

      {/* Chalk Progress Bar */}
      <div className="mb-3 flex justify-center">
        <ChalkProgressBar progress={progress} width={400} height={28} />
      </div>

      {/* Model Status Grid - always show */}
      <div className="flex flex-wrap gap-1.5">
        {/* Completed models */}
        {completedModels.map((model) => (
          <span
            key={model}
            className="px-2 py-0.5 bg-paper-success-muted/50 text-paper-success rounded text-xs inline-flex items-center gap-1"
          >
            <ChalkCheck size={12} /> {model}
          </span>
        ))}
        {/* Pending models */}
        {pendingModels.map((model) => (
          <span
            key={model}
            className="px-2 py-0.5 bg-paper-card text-paper-muted rounded text-xs animate-pulse inline-flex items-center gap-1 border border-paper-accent/20"
          >
            <ChalkCircle size={12} /> {model}
          </span>
        ))}
        {/* Synthesis step */}
        <span
          className={`px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 ${
            phase === 'synthesizing'
              ? 'bg-paper-active text-paper-accent animate-pulse'
              : 'bg-paper-card text-paper-muted border border-paper-accent/20'
          }`}
        >
          {phase === 'synthesizing' ? (
            <>
              <ChalkCircleFilled size={12} /> Summary
            </>
          ) : (
            <>
              <ChalkCircle size={12} /> Summary
            </>
          )}
        </span>
      </div>
    </div>
  )
}
