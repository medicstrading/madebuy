export default function MaterialsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 bg-gray-200 rounded" />
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Materials grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-5 w-32 bg-gray-100 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
