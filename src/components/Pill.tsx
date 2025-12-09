/**
 * Pill Component
 *
 * A rounded button used for toolbar actions like Image and Voice.
 * Changes appearance based on active/recording state.
 *
 * @module components/Pill
 */

'use client'

interface PillProps {
  /** Icon to display (emoji, text, or React component) */
  icon: React.ReactNode
  /** Button label */
  label: string
  /** Click handler */
  onClick: () => void
  /** Whether the pill is in active state (e.g., images attached) */
  active?: boolean
  /** Whether currently recording (shows red pulsing state) */
  recording?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
}

/**
 * Pill button for toolbar actions.
 *
 * @example
 * <Pill
 *   icon="📷"
 *   label={images.length > 0 ? `${images.length}/4` : 'Image'}
 *   active={images.length > 0}
 *   onClick={() => fileInputRef.current?.click()}
 * />
 */
export function Pill({ icon, label, onClick, active, recording, disabled }: PillProps) {
  // Determine style based on state
  let className =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border'

  if (recording) {
    // Recording state: red pulsing
    className += ' bg-paper-error-muted border-paper-error/50 text-paper-error animate-pulse'
  } else if (active) {
    // Active state: accent highlight
    className += ' bg-paper-active border-paper-accent/50 text-paper-accent'
  } else {
    // Default state: cream text for enabled look
    className +=
      ' bg-paper-card border-paper-accent/30 text-paper-text/80 hover:bg-paper-hover hover:text-paper-text hover:border-paper-accent/50'
  }

  if (disabled) {
    className += ' opacity-50 cursor-not-allowed'
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
