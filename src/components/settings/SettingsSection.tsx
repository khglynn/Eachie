/**
 * SettingsSection Component
 *
 * Reusable container for settings page sections.
 * Follows the chalk design system.
 *
 * @module components/settings/SettingsSection
 */

'use client'

import type { ReactNode } from 'react'

interface SettingsSectionProps {
  /** Section title */
  title: string
  /** Optional icon to display next to title */
  icon?: ReactNode
  /** Optional description below title */
  description?: string
  /** Section content */
  children: ReactNode
  /** Optional badge (e.g., "BYOK" or "Coming Soon") */
  badge?: string
  /** Badge variant for styling */
  badgeVariant?: 'default' | 'warning' | 'info'
}

/**
 * Settings section container with consistent styling.
 *
 * @example
 * <SettingsSection
 *   title="Account"
 *   icon={<ChalkUser size={20} />}
 *   description="Manage your account settings"
 * >
 *   <AccountSection />
 * </SettingsSection>
 */
export function SettingsSection({
  title,
  icon,
  description,
  children,
  badge,
  badgeVariant = 'default',
}: SettingsSectionProps) {
  const badgeStyles = {
    default: 'bg-paper-surface text-paper-muted',
    warning: 'bg-paper-warning/20 text-paper-warning',
    info: 'bg-paper-accent/20 text-paper-accent',
  }

  return (
    <section className="chalk-frame rounded-xl bg-paper-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        {icon && <span className="text-paper-accent">{icon}</span>}
        <h2 className="text-lg font-semibold text-paper-text">{title}</h2>
        {badge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${badgeStyles[badgeVariant]}`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-paper-muted mb-4">{description}</p>
      )}

      {/* Content */}
      <div className="space-y-4">{children}</div>
    </section>
  )
}
