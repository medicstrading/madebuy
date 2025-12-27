import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'
import { Star, ArrowLeft } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: { category: string }
}) {
  const category = MARKETPLACE_CATEGORIES.find((c) => c.slug === params.category)

  if (!category) {
    return {
      title: 'Category Not Found - MadeBuy Marketplace',
    }
  }

  return {
    title: `${category.name} - MadeBuy Marketplace`,
    description: `Browse handmade ${category.name.toLowerCase()} from independent makers.`,
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string }
  searchParams: {
    subcategory?: string
    minPrice?: string
    maxPrice?: string
    sortBy?: string
    page?: string
  }
}) {
  const category = MARKETPLACE_CATEGORIES.find((c) => c.slug === params.category)

  if (!category) {
    notFound()
  }

  // TODO: Fetch products for this category from API
  // const filters = {
  //   category: params.category,
  //   subcategory: searchParams.subcategory,
  //   minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
  //   maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
  //   sortBy: searchParams.sortBy || 'recent',
  //   page: searchParams.page ? parseInt(searchParams.page) : 1,
  //   limit: 24
  // }

  const sortBy = searchParams.sortBy || 'recent'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
        <Link href="/marketplace" className="hover:text-blue-600">
          Home
        </Link>
        <span>/</span>
        <Link href="/marketplace/categories" className="hover:text-blue-600">
          Categories
        </Link>
        <span>/</span>
        <span className="text-gray-900">{category.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/marketplace/categories"
          className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </Link>
        <h1 className="mb-2 text-4xl font-bold text-gray-900">{category.name}</h1>
        <p className="text-gray-600">Browse handmade {category.name.toLowerCase()} from independent makers</p>
      </div>

      {/* Subcategories Filter */}
      {category.subcategories.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 font-semibold text-gray-900">Filter by Type</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/marketplace/categories/${params.category}`}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                !searchParams.subcategory
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-blue-600'
              }`}
            >
              All
            </Link>
            {category.subcategories.map((sub) => (
              <Link
                key={sub}
                href={`/marketplace/categories/${params.category}?subcategory=${sub}`}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  searchParams.subcategory === sub
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-blue-600'
                }`}
              >
                {sub.charAt(0).toUpperCase() + sub.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {/* Price Range */}
            <div>
              <h3 className="mb-2 font-medium text-gray-900">Price Range</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <h3 className="mb-2 font-medium text-gray-900">Minimum Rating</h3>
              <div className="space-y-2">
                {[5, 4, 3].map((rating) => (
                  <label key={rating} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" name="rating" value={rating} className="h-4 w-4 text-blue-600" />
                    <div className="flex items-center gap-1">
                      {Array.from({ length: rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-sm text-gray-600">& up</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Apply Filters
            </button>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              Products in <span className="font-semibold">{category.name}</span>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100"></div>
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
                </div>
              </div>
            ))}
          </div>

          {/* Placeholder message */}
          <div className="mt-8 rounded-lg bg-blue-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              <strong>Coming Soon:</strong> {category.name} products will appear here once sellers start listing in this category.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
