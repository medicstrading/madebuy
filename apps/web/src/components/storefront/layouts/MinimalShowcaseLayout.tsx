import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ImageIcon, ArrowRight } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'
import { ProductCard, RecentlyViewed } from '@/components/storefront/ProductCard'
import { mapPieceToProduct } from '@/lib/productMapping'

interface MinimalShowcaseLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Minimal Showcase Layout - Modern Clean Version
 * Elegant, spacious layout with generous whitespace
 * Large hero text → Featured products with alternating layout
 */
export function MinimalShowcaseLayout({ pieces, tenantSlug, tenant }: MinimalShowcaseLayoutProps) {
  // Show only first 6 products for minimal, curated feel
  const featuredPieces = pieces.slice(0, 6)
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-24">
      {/* Large Brand Statement */}
      <section className="text-center py-12">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight max-w-4xl mx-auto leading-tight">
          {layoutContent.minimalHeroHeadline || tenant.businessName}
        </h1>
        {tenant.description && (
          <p className="mt-8 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {tenant.description}
          </p>
        )}
        <div className="mt-12 flex justify-center">
          <div className="h-px w-24 bg-gray-200" />
        </div>
      </section>

      {/* Featured Collection */}
      <section>
        <div className="text-center mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Collection
          </h2>
          <p className="text-2xl font-medium text-gray-900">
            {layoutContent.featuredCollectionTitle || 'Featured Pieces'}
          </p>
        </div>

        {featuredPieces.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No products available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-24">
            {featuredPieces.map((piece, index) => (
              <Link
                key={piece.id}
                href={`/${tenantSlug}/${piece.slug}`}
                className="group block"
              >
                <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${index % 2 === 1 ? 'lg:[direction:rtl]' : ''}`}>
                  {/* Image */}
                  <div className="lg:[direction:ltr]">
                    {piece.mediaIds.length > 0 && piece.primaryImage ? (
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
                        <Image
                          src={piece.primaryImage.variants.large?.url || piece.primaryImage.variants.original.url}
                          alt={piece.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                        <ImageIcon className="h-20 w-20 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="lg:[direction:ltr] space-y-6">
                    <h3 className="text-3xl font-bold text-gray-900 group-hover:text-gray-600 transition-colors">
                      {piece.name}
                    </h3>
                    {piece.description && (
                      <p className="text-lg text-gray-500 leading-relaxed line-clamp-3">
                        {piece.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(piece.price, piece.currency)}
                      </span>
                      {piece.stock !== undefined && piece.stock > 0 && (
                        <span className="text-sm text-gray-400">In Stock</span>
                      )}
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-2 text-gray-900 font-medium group-hover:gap-3 transition-all">
                        {layoutContent.viewDetailsButtonText || 'View Details'}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Additional Products Grid */}
        {pieces.length > 6 && (
          <div className="mt-20">
            <div className="text-center mb-12">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
                More Items
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {pieces.slice(6).map((piece) => (
                <ProductCard
                  key={piece.id}
                  product={mapPieceToProduct(piece, tenantSlug, tenant.businessName)}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Recently Viewed */}
      <section className="border-t border-gray-100 pt-12">
        <RecentlyViewed />
      </section>
    </div>
  )
}
