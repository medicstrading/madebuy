export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 bg-gray-200 rounded-xl" />
        <div className="h-80 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}
