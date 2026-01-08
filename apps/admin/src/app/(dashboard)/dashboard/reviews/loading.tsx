export default function ReviewsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page title skeleton */}
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="mt-2 h-4 w-56 bg-gray-100 rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-8 w-16 bg-gray-100 rounded" />
              </div>
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Status filter skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg" />
        ))}
      </div>

      {/* Review cards skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-4 w-4 bg-gray-200 rounded" />
                    ))}
                  </div>
                  <div className="h-5 w-20 bg-gray-200 rounded-full" />
                </div>
                <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                <div className="h-4 w-3/4 bg-gray-100 rounded" />
              </div>
              <div className="ml-4 flex flex-col gap-2">
                <div className="h-8 w-24 bg-gray-200 rounded-lg" />
                <div className="h-8 w-24 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
