export default function InventoryLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="h-10 w-64 bg-gray-100 rounded" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-100 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
