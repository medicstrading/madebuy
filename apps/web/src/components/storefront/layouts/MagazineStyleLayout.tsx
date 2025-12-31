import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ImageIcon, TrendingUp, ArrowRight, Heart } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'
import { EtsyProductCard, RecentlyViewed } from '@/components/marketplace'
import { mapPieceToProduct } from '@/lib/productMapping'

interface MagazineStyleLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Magazine Style Layout - Modern Clean Version
 * Editorial-inspired with masonry grid and mixed content blocks
 * Creates engaging, visual-first browsing experience
 */
export function MagazineStyleLayout({ pieces, tenantSlug, tenant }: MagazineStyleLayoutProps) {
  const featuredPiece = pieces[0]
  const secondaryPieces = pieces.slice(1, 3)
  const gridPieces = pieces.slice(3)
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-12">
      {/* Editorial Hero - Featured Product */}
      {featuredPiece && (
        <section className="overflow-hidden rounded-3xl bg-gray-900">
          <div className="grid lg:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full min-h-[400px]">
              {featuredPiece.mediaIds.length > 0 && featuredPiece.primaryImage ? (
                <Image
                  src={featuredPiece.primaryImage.variants.large?.url || featuredPiece.primaryImage.variants.original.url}
                  alt={featuredPiece.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <ImageIcon className="h-24 w-24 text-gray-600" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                <TrendingUp className="h-4 w-4" />
                {layoutContent.latestBadgeText || 'Featured'}
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                {layoutContent.magazineHeroHeadline || featuredPiece.name}
              </h2>
              {featuredPiece.description && (
                <p className="mt-4 text-lg text-gray-300 leading-relaxed line-clamp-3">
                  {featuredPiece.description}
                </p>
              )}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-2xl font-semibold text-white">
                  {formatCurrency(featuredPiece.price, featuredPiece.currency)}
                </span>
                {featuredPiece.stock !== undefined && featuredPiece.stock > 0 && (
                  <span className="text-sm text-gray-400">Available Now</span>
                )}
              </div>
              <Link
                href={`/${tenantSlug}/${featuredPiece.slug}`}
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {layoutContent.discoverMoreButtonText || 'View Product'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Mixed Content Blocks - Asymmetric Grid */}
      {secondaryPieces.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-2">
          {secondaryPieces.map((piece, index) => (
            <Link
              key={piece.id}
              href={`/${tenantSlug}/${piece.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                index === 0 ? 'lg:row-span-2' : ''
              }`}
            >
              {/* Image */}
              <div className={`relative overflow-hidden bg-gray-100 ${index === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
                {piece.mediaIds.length > 0 && piece.primaryImage ? (
                  <Image
                    src={piece.primaryImage.variants.large?.url || piece.primaryImage.variants.original.url}
                    alt={piece.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <ImageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}

                {/* Wishlist Button */}
                <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
                  <Heart className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {piece.name}
                </h3>
                {piece.description && (
                  <p className="mt-2 text-gray-500 line-clamp-2">{piece.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(piece.price, piece.currency)}
                  </span>
                  {piece.stock !== undefined && piece.stock > 0 && (
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                      In Stock
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Visual Gallery Grid */}
      {gridPieces.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {layoutContent.moreCollectionTitle || 'More to Explore'}
            </h2>
            <Link
              href="#"
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {gridPieces.map((piece) => (
              <EtsyProductCard
                key={piece.id}
                product={mapPieceToProduct(piece, tenantSlug, tenant.businessName)}
                variant="compact"
              />
            ))}
          </div>
        </section>
      )}

      {pieces.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No products available at the moment.</p>
        </div>
      )}

      {/* Recently Viewed */}
      <section className="border-t border-gray-100 pt-12">
        <RecentlyViewed />
      </section>
    </div>
  )
}
