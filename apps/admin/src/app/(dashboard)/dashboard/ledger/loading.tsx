export default function LedgerLoading() {
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

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Transactions table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 w-40 bg-gray-100 rounded" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-48 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-5 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
