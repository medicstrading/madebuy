export default function PromotionsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-10 w-40 bg-gray-200 rounded-lg" />
      </div>

      {/* Promotions list */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-100 rounded" />
                <div className="h-4 w-64 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-20 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
