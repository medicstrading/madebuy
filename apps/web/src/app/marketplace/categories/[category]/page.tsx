import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'
import { Star, ArrowLeft } from 'lucide-react'
import { marketplace } from '@madebuy/db'
import { EtsyProductCard } from '@/components/marketplace'

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

// Map DB product to EtsyProductCard format
function mapToCardProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug || product.id,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: 'AUD',
    images: product.images || [],
    rating: product.marketplace?.avgRating || 0,
    reviewCount: product.marketplace?.totalReviews || 0,
    seller: {
      name: product.seller?.businessName || 'Seller',
      slug: product.tenantId,
    },
    badges: [] as ('bestseller' | 'freeShipping' | 'sale' | 'ad')[],
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

  // Fetch products for this category
  const filters = {
    category: params.category,
    subcategory: searchParams.subcategory || undefined,
    minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
    sortBy: (searchParams.sortBy || 'recent') as 'recent' | 'popular' | 'price_low' | 'price_high' | 'rating' | 'bestseller',
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    limit: 24,
  }

  const result = await marketplace.listMarketplaceProducts(filters)
  const { products } = result
  const total = result.pagination.total
  const pages = result.pagination.totalPages
  const sortBy = searchParams.sortBy || 'recent'
  const currentPage = filters.page

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
              <span className="font-semibold">{total}</span> products in <span className="font-semibold">{category.name}</span>
            </p>

            <select
              defaultValue={sortBy}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="recent">Recently Added</option>
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Products Grid */}
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product: any) => (
                  <EtsyProductCard
                    key={product.id}
                    product={mapToCardProduct(product)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={`/marketplace/categories/${params.category}?page=${currentPage - 1}${searchParams.subcategory ? `&subcategory=${searchParams.subcategory}` : ''}${searchParams.sortBy ? `&sortBy=${searchParams.sortBy}` : ''}`}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {pages}
                  </span>
                  {currentPage < pages && (
                    <Link
                      href={`/marketplace/categories/${params.category}?page=${currentPage + 1}${searchParams.subcategory ? `&subcategory=${searchParams.subcategory}` : ''}${searchParams.sortBy ? `&sortBy=${searchParams.sortBy}` : ''}`}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 p-12 text-center">
              <p className="text-gray-600">
                No products found in this category yet.
              </p>
              <Link
                href="/marketplace"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                Browse all products →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
