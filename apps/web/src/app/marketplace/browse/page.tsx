import Link from 'next/link'
import { BrowseFilters } from '@/components/marketplace/BrowseFilters'
import { ActiveFilters, EtsyProductCard, RecentlyViewed } from '@/components/marketplace'
import { mapMarketplaceProduct } from '@/lib/productMapping'
import { unstable_cache } from 'next/cache'

// Allow ISR with 60 second revalidation for browse results
export const revalidate = 60

export const metadata = {
  title: 'Browse Products - MadeBuy Marketplace',
  description: 'Browse all handmade products from independent makers and creators.',
}

// Cached browse results with dynamic key based on filters
const getBrowseProducts = unstable_cache(
  async (category: string | undefined, sortBy: string, page: number) => {
    const { marketplace, tenants } = await import('@madebuy/db')

    const result = await marketplace.listMarketplaceProducts({
      category,
      sortBy: sortBy as 'recent' | 'popular' | 'rating' | 'price_low' | 'price_high',
      limit: 24,
      page,
    })

    // Batch fetch all tenant info
    const tenantIds = result.products.map((p: any) => p.tenantId)
    const tenantMap = await tenants.getTenantsByIds(tenantIds)

    const products = result.products.map((product: any) => ({
      ...product,
      rating: product.marketplace?.avgRating || 0,
      seller: {
        tenantId: product.tenantId,
        businessName: tenantMap.get(product.tenantId)?.businessName || 'Unknown Seller',
      },
    }))

    return { products, pagination: result.pagination }
  },
  ['browse-products'],
  { revalidate: 60, tags: ['marketplace'] }
)

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
    search?: string
  }
}) {
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1
  const sortBy = searchParams.sortBy || 'recent'

  const { products, pagination } = await getBrowseProducts(
    searchParams.category,
    sortBy,
    currentPage
  )

  const productCards = products.map(mapMarketplaceProduct)
  const totalProducts = pagination.total
  const totalPages = pagination.totalPages
  const limit = pagination.limit

  const startItem = (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, totalProducts)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-mb-slate">Browse Products</h1>
        <p className="text-mb-slate-light">
          Discover unique handmade items from talented creators
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 self-start">
          <BrowseFilters />
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Active Filters */}
          <ActiveFilters />

          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-mb-slate-light">
              {totalProducts > 0 ? (
                <>
                  Showing <span className="font-semibold text-mb-slate">{startItem}-{endItem}</span> of{' '}
                  <span className="font-semibold text-mb-slate">{totalProducts.toLocaleString()}</span> products
                </>
              ) : (
                'No products found'
              )}
            </p>

            <select
              defaultValue={sortBy}
              className="rounded-lg border border-mb-sand px-3 py-2 text-sm text-mb-slate focus:border-mb-blue focus:outline-none focus:ring-1 focus:ring-mb-blue"
            >
              <option value="recent">Recently Added</option>
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Products Grid */}
          {productCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {productCards.map((product) => (
                <EtsyProductCard
                  key={product.id}
                  product={product}
                  variant="default"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-mb-sand bg-mb-cream py-20 text-center">
              <p className="text-lg font-medium text-mb-slate">No products found</p>
              <p className="mt-2 text-mb-slate-light">Try adjusting your filters or search terms</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Link
                href={currentPage > 1 ? `/marketplace/browse?page=${currentPage - 1}` : '#'}
                className={`rounded-lg border border-mb-sand px-4 py-2 text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'cursor-not-allowed opacity-50 text-mb-slate-light'
                    : 'text-mb-slate hover:bg-mb-cream hover:border-mb-blue'
                }`}
              >
                Previous
              </Link>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={`/marketplace/browse?page=${page}`}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-mb-blue text-white'
                      : 'border border-mb-sand text-mb-slate hover:bg-mb-cream hover:border-mb-blue'
                  }`}
                >
                  {page}
                </Link>
              ))}

              <Link
                href={currentPage < totalPages ? `/marketplace/browse?page=${currentPage + 1}` : '#'}
                className={`rounded-lg border border-mb-sand px-4 py-2 text-sm font-medium transition-colors ${
                  currentPage >= totalPages
                    ? 'cursor-not-allowed opacity-50 text-mb-slate-light'
                    : 'text-mb-slate hover:bg-mb-cream hover:border-mb-blue'
                }`}
              >
                Next
              </Link>
            </div>
          )}

          {/* Recently Viewed */}
          <section className="mt-12 border-t border-mb-sand pt-8">
            <RecentlyViewed />
          </section>
        </div>
      </div>
    </div>
  )
}
