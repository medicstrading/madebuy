export default function OrdersLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded-lg" />
          <div className="h-10 w-32 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-gray-200 rounded" />
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-gray-100 rounded" />
                <div className="h-4 w-48 bg-gray-100 rounded" />
              </div>
              <div className="text-right space-y-2">
                <div className="h-5 w-20 bg-gray-100 rounded" />
                <div className="h-6 w-24 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
