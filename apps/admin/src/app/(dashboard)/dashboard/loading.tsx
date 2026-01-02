export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Welcome banner skeleton */}
      <div className="h-40 bg-gray-200 rounded-2xl" />

      {/* Stats cards skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="h-80 bg-gray-200 rounded-2xl" />
    </div>
  )
}
