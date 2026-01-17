import { media, pieces } from '@madebuy/db'
import { Search } from 'lucide-react'
import type { Metadata } from 'next'
import { MixedGrid } from '@/components/storefront/ProductCard'
import { Footer } from '@/components/storefront/shared/Footer'
import { Header } from '@/components/storefront/shared/Header'
import { populatePiecesWithMedia } from '@/lib/pieces'
import { mapPieceToProduct } from '@/lib/productMapping'
import { requireTenant } from '@/lib/tenant'

interface SearchPageProps {
  params: { tenant: string }
  searchParams: { q?: string; category?: string }
}

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const tenant = await requireTenant(params.tenant)
  const query = searchParams.q

  return {
    title: query
      ? `Search: "${query}" - ${tenant.businessName}`
      : `Search Products - ${tenant.businessName}`,
    description: query
      ? `Search results for "${query}" at ${tenant.businessName}`
      : `Browse and search products at ${tenant.businessName}`,
    robots: { index: false }, // Don't index search pages
  }
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const tenant = await requireTenant(params.tenant)
  const query = searchParams.q?.trim() || ''
  const category = searchParams.category

  // Fetch logo if exists
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Get navigation pages for header
  const pages = tenant.websiteDesign?.pages || []
  const navPages = pages
    .filter((p) => p.enabled && p.showInNavigation)
    .sort((a, b) => a.navigationOrder - b.navigationOrder)

  // Search for products
  let rawPieces: Awaited<ReturnType<typeof pieces.searchPieces>> = []

  if (query) {
    rawPieces = await pieces.searchPieces(tenant.id, query, {
      limit: 50,
      category: category || undefined,
    })
  }

  // Populate with media
  const piecesWithMedia = await populatePiecesWithMedia(rawPieces)

  // Map to CardProduct format
  const products = piecesWithMedia.map((piece) =>
    mapPieceToProduct(piece, params.tenant, tenant.businessName),
  )

  return (
    <div className="min-h-screen bg-white tenant-theme">
      <Header
        tenant={tenant}
        tenantSlug={params.tenant}
        headerConfig={tenant.websiteDesign?.header}
        logoUrl={logoUrl || undefined}
        pages={navPages}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="mb-8">
          <form
            action={`/${params.tenant}/search`}
            method="GET"
            className="max-w-xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
          </form>
        </div>

        {/* Results */}
        {query ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {products.length > 0
                  ? `${products.length} result${products.length !== 1 ? 's' : ''} for "${query}"`
                  : `No results for "${query}"`}
              </h1>
              {category && <p className="text-gray-500 mt-1">in {category}</p>}
            </div>

            {products.length > 0 ? (
              <MixedGrid products={products} />
            ) : (
              <div className="text-center py-16">
                <Search className="mx-auto h-12 w-12 text-gray-300" />
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  No products found
                </h2>
                <p className="mt-2 text-gray-500">
                  Try adjusting your search terms or browse our full collection.
                </p>
                <a
                  href={`/${params.tenant}`}
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                >
                  Browse All Products
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Search className="mx-auto h-12 w-12 text-gray-300" />
            <h1 className="mt-4 text-lg font-medium text-gray-900">
              Search Products
            </h1>
            <p className="mt-2 text-gray-500">
              Enter a search term above to find products.
            </p>
          </div>
        )}
      </main>

      <Footer
        tenant={tenant}
        tenantSlug={params.tenant}
        footerConfig={tenant.websiteDesign?.footer}
        pages={navPages}
      />
    </div>
  )
}
