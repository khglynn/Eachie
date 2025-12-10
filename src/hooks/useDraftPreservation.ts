/**
 * Draft Preservation Hook
 *
 * Auto-saves query drafts to sessionStorage to prevent data loss on refresh.
 * Restores drafts on page load.
 *
 * Features:
 * - Debounced auto-save (500ms after typing stops)
 * - Preserves query, follow-up, attachments, model selections
 * - Clears on research completion or explicit clear
 * - Works without database (purely client-side)
 *
 * @module hooks/useDraftPreservation
 * Created: December 2024
 */

import { useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'eachie_draft_v1'
const DEBOUNCE_MS = 500

export interface DraftState {
  query: string
  followUpQuery?: string
  selectedModelIds?: string[]
  selectedOrchestratorId?: string
  // Note: We don't preserve large attachments to avoid quota issues
  // Only preserve attachment metadata for user reference
  attachmentNames?: string[]
  stage?: 'input' | 'clarifying' | 'streaming' | 'complete'
  savedAt: string
}

interface UseDraftPreservationOptions {
  /** Called when a draft is restored on mount */
  onRestore?: (draft: DraftState) => void
  /** Whether draft preservation is enabled (default: true) */
  enabled?: boolean
}

/**
 * Hook for preserving drafts across page refreshes.
 *
 * @example
 * ```tsx
 * const { saveDraft, clearDraft, hasDraft } = useDraftPreservation({
 *   onRestore: (draft) => {
 *     setQuery(draft.query)
 *     if (draft.selectedModelIds) setSelectedModels(draft.selectedModelIds)
 *   }
 * })
 *
 * // Save on change (debounced)
 * useEffect(() => {
 *   saveDraft({ query, selectedModelIds })
 * }, [query, selectedModelIds, saveDraft])
 *
 * // Clear on completion
 * const handleResearchComplete = () => {
 *   clearDraft()
 * }
 * ```
 */
export function useDraftPreservation(options: UseDraftPreservationOptions = {}) {
  const { onRestore, enabled = true } = options
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasRestoredRef = useRef(false)

  /**
   * Get the current saved draft, if any.
   */
  const getDraft = useCallback((): DraftState | null => {
    if (typeof window === 'undefined' || !enabled) return null

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      return JSON.parse(stored) as DraftState
    } catch {
      return null
    }
  }, [enabled])

  /**
   * Save a draft (debounced to avoid excessive writes).
   */
  const saveDraft = useCallback(
    (draft: Omit<DraftState, 'savedAt'>) => {
      if (typeof window === 'undefined' || !enabled) return

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Don't save empty drafts
      if (!draft.query?.trim() && !draft.followUpQuery?.trim()) {
        return
      }

      // Debounce the save
      debounceTimerRef.current = setTimeout(() => {
        try {
          const fullDraft: DraftState = {
            ...draft,
            savedAt: new Date().toISOString(),
          }
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fullDraft))
        } catch (error) {
          // Storage quota exceeded or other error - ignore
          console.warn('[DraftPreservation] Failed to save draft:', error)
        }
      }, DEBOUNCE_MS)
    },
    [enabled]
  )

  /**
   * Clear the saved draft.
   */
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore errors
    }
  }, [])

  /**
   * Force immediate save (bypasses debounce).
   */
  const saveImmediately = useCallback(
    (draft: Omit<DraftState, 'savedAt'>) => {
      if (typeof window === 'undefined' || !enabled) return

      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Don't save empty drafts
      if (!draft.query?.trim() && !draft.followUpQuery?.trim()) {
        return
      }

      try {
        const fullDraft: DraftState = {
          ...draft,
          savedAt: new Date().toISOString(),
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fullDraft))
      } catch {
        // Ignore errors
      }
    },
    [enabled]
  )

  /**
   * Check if there's a saved draft.
   */
  const hasDraft = useCallback((): boolean => {
    return getDraft() !== null
  }, [getDraft])

  // Restore draft on mount
  useEffect(() => {
    if (!enabled || hasRestoredRef.current) return

    const draft = getDraft()
    if (draft && onRestore) {
      hasRestoredRef.current = true
      // Use setTimeout to avoid issues with state updates during render
      setTimeout(() => {
        onRestore(draft)
      }, 0)
    }
  }, [enabled, getDraft, onRestore])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    saveDraft,
    saveImmediately,
    clearDraft,
    getDraft,
    hasDraft,
  }
}

export default useDraftPreservation
