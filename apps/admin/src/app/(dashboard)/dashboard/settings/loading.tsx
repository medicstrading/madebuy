export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="h-8 w-32 bg-gray-200 rounded" />

      {/* Settings sections */}
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-6 w-40 bg-gray-100 rounded mb-4" />
            <div className="space-y-4">
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 w-1/2 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
