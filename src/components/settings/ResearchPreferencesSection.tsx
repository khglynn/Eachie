/**
 * ResearchPreferencesSection Component
 *
 * Research configuration for the settings page.
 * Migrated from SettingsModal - handles orchestrator, prompt, and model visibility.
 *
 * These settings are stored in localStorage (client-side only).
 *
 * @module components/settings/ResearchPreferencesSection
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChalkCheck } from '@/components/ChalkIcons'
import {
  MODEL_OPTIONS,
  ORCHESTRATOR_OPTIONS,
  DEFAULT_ORCHESTRATOR_PROMPT,
} from '@/config/models'
import type { Settings } from '@/types'

interface ResearchPreferencesSectionProps {
  /** Current settings from localStorage */
  settings: Settings
  /** Callback when settings change */
  onSave: (updates: Partial<Settings>) => void
}

/**
 * Research preferences section.
 */
export function ResearchPreferencesSection({
  settings,
  onSave,
}: ResearchPreferencesSectionProps) {
  // Show "Saved" notification briefly after changes
  const [showSaved, setShowSaved] = useState(false)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  // Wrap onSave to show notification
  const handleSave = useCallback(
    (newSettings: Partial<Settings>) => {
      onSave(newSettings)
      setShowSaved(true)

      // Clear any existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }

      // Hide after 1.5 seconds
      const timeout = setTimeout(() => setShowSaved(false), 1500)
      setSaveTimeout(timeout)
    },
    [onSave, saveTimeout]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
    }
  }, [saveTimeout])

  return (
    <div className="space-y-6">
      {/* Saved Notification */}
      {showSaved && (
        <div className="flex items-center gap-2 text-xs text-paper-success bg-paper-success-muted/50 px-3 py-2 rounded animate-pulse">
          <ChalkCheck size={14} /> Settings saved
        </div>
      )}

      {/* Summary Model Section */}
      <div>
        <h3 className="text-sm font-semibold text-paper-text mb-2">
          Summary Model
        </h3>
        <p className="text-xs text-paper-muted mb-3">
          Which model combines all responses into a unified synthesis.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ORCHESTRATOR_OPTIONS.map((orch) => {
            // Format cost: per 200K tokens, rounded to nearest $0.05
            const costPer200K = orch.blendedCost / 5
            const roundedCost = Math.round(costPer200K / 0.05) * 0.05
            const costDisplay = `$${roundedCost.toFixed(2)}`

            return (
              <button
                key={orch.id}
                type="button"
                onClick={() => handleSave({ orchestrator: orch.id })}
                className={`text-left p-2 rounded-lg text-sm transition-colors ${
                  settings.orchestrator === orch.id
                    ? 'bg-paper-active border-2 border-paper-accent'
                    : 'bg-paper-bg border border-paper-accent/30 hover:border-paper-accent/60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-paper-text">{orch.name}</span>
                  <span className="text-xs text-paper-muted">{costDisplay} / 200K</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Prompt Section */}
      <div>
        <h3 className="text-sm font-semibold text-paper-text mb-2">
          Summary Prompt
        </h3>
        <p className="text-xs text-paper-muted mb-3">
          Instructions for how the orchestrator should summarize responses.
        </p>
        <textarea
          value={settings.orchestratorPrompt ?? DEFAULT_ORCHESTRATOR_PROMPT}
          onChange={(e) => handleSave({ orchestratorPrompt: e.target.value })}
          rows={5}
          className="w-full px-3 py-2 text-sm border border-paper-accent/30 rounded-lg
            bg-paper-bg text-paper-text font-mono resize-y placeholder:text-paper-muted"
          placeholder={DEFAULT_ORCHESTRATOR_PROMPT}
        />
        {settings.orchestratorPrompt &&
          settings.orchestratorPrompt !== DEFAULT_ORCHESTRATOR_PROMPT && (
            <button
              type="button"
              onClick={() => handleSave({ orchestratorPrompt: '' })}
              className="mt-2 text-xs text-paper-accent hover:underline"
            >
              Reset to default
            </button>
          )}
      </div>

      {/* Model Visibility Section */}
      <div>
        <h3 className="text-sm font-semibold text-paper-text mb-2">
          Available Models
        </h3>
        <p className="text-xs text-paper-muted mb-3">
          Uncheck models to hide them from the model selector.
        </p>
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-2">
          {MODEL_OPTIONS.map((model) => (
            <label
              key={model.id}
              className="flex items-center gap-2 p-1.5 rounded text-sm cursor-pointer
                hover:bg-paper-hover transition-colors"
            >
              <input
                type="checkbox"
                checked={!settings.hiddenModels.includes(model.id)}
                onChange={(e) => {
                  const hidden = e.target.checked
                    ? settings.hiddenModels.filter((id) => id !== model.id)
                    : [...settings.hiddenModels, model.id]
                  handleSave({ hiddenModels: hidden })
                }}
                className="rounded text-paper-accent w-3.5 h-3.5"
              />
              <span className="text-paper-text/80 truncate text-xs">
                {model.name}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => handleSave({ hiddenModels: [] })}
            className="text-xs text-paper-accent hover:underline"
          >
            Show all
          </button>
          <span className="text-paper-muted">|</span>
          <button
            type="button"
            onClick={() =>
              handleSave({ hiddenModels: MODEL_OPTIONS.map((m) => m.id) })
            }
            className="text-xs text-paper-accent hover:underline"
          >
            Hide all
          </button>
        </div>
      </div>
    </div>
  )
}
