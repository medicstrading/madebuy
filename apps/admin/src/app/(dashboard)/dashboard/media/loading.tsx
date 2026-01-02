export default function MediaLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
