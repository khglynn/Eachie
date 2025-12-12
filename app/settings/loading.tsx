/**
 * Settings Page Loading Skeleton
 *
 * Shows while settings data is being fetched.
 */

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-paper-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-6 h-6 bg-paper-surface rounded animate-pulse" />
          <div className="w-32 h-7 bg-paper-surface rounded animate-pulse" />
        </div>

        {/* Section skeletons */}
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="chalk-frame rounded-xl bg-paper-card p-6"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 bg-paper-surface rounded animate-pulse" />
                <div className="w-24 h-5 bg-paper-surface rounded animate-pulse" />
              </div>
              {/* Section content */}
              <div className="space-y-3">
                <div className="w-full h-10 bg-paper-surface rounded animate-pulse" />
                <div className="w-3/4 h-10 bg-paper-surface rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
