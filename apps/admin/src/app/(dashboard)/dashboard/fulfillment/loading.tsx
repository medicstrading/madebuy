export default function FulfillmentLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Orders list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 w-48 bg-gray-100 rounded" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-5 w-5 bg-gray-100 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-100 rounded" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-24 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
