import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { BrowseFilters } from '@/components/marketplace/BrowseFilters'
import { ActiveFilters } from '@/components/marketplace'

export const metadata = {
  title: 'Browse Products - MadeBuy Marketplace',
  description: 'Browse all handmade products from independent makers and creators.',
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: {
    category?: string
    subcategory?: string
    minPrice?: string
    maxPrice?: string
    minRating?: string
    sortBy?: string
    page?: string
  }
}) {
  // TODO: Fetch products from API with filters
  // const filters = {
  //   category: searchParams.category,
  //   subcategory: searchParams.subcategory,
  //   minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
  //   maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
  //   minRating: searchParams.minRating ? parseFloat(searchParams.minRating) : undefined,
  //   sortBy: searchParams.sortBy || 'recent',
  //   page: searchParams.page ? parseInt(searchParams.page) : 1,
  //   limit: 24
  // }
  //
  // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marketplace/products?${new URLSearchParams(filters)}`)
  // const data = await response.json()

  // For now, show placeholder
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1
  const sortBy = searchParams.sortBy || 'recent'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Browse Products</h1>
        <p className="text-gray-600">
          Discover unique handmade items from talented creators
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <BrowseFilters />
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Active Filters */}
          <ActiveFilters />

          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              Showing <span className="font-semibold">1-24</span> of{' '}
              <span className="font-semibold">1,000+</span> products
            </p>

            <select
              value={sortBy}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="recent">Recently Added</option>
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Products Grid - Placeholder */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200"></div>
                <div className="p-4">
                  <div className="mb-2 h-5 w-3/4 rounded bg-gray-200"></div>
                  <div className="mb-3 h-4 w-1/2 rounded bg-gray-100"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-20 rounded bg-gray-200"></div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">4.8</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200"></div>
                    <div className="h-3 w-24 rounded bg-gray-100"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            {[1, 2, 3, 4, 5].map((page) => (
              <Link
                key={page}
                href={`/marketplace/browse?page=${page}`}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </Link>
            ))}

            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Next
            </button>
          </div>

          {/* Placeholder message */}
          <div className="mt-8 rounded-lg bg-blue-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              <strong>Coming Soon:</strong> Browse functionality will be connected to the marketplace API. Products will display here once the migration is complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
