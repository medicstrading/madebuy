export default function LedgerLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page title skeleton */}
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="mt-2 h-4 w-64 bg-gray-100 rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg bg-white p-4 shadow">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Transactions table skeleton */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <div className="h-6 w-32 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div>
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-5 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
