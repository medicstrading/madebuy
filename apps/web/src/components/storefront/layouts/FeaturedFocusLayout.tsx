import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon, Sparkles, ArrowRight } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'
import { EtsyProductCard, MixedGrid, RecentlyViewed } from '@/components/marketplace'
import { mapPieceToProduct } from '@/lib/productMapping'

interface FeaturedFocusLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Featured Focus Layout - Modern Clean Version
 * Bold hero product showcase with staff picks section
 * Great for highlighting signature pieces
 */
export function FeaturedFocusLayout({ pieces, tenantSlug, tenant }: FeaturedFocusLayoutProps) {
  const signaturePieces = pieces.slice(0, 4)
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-20">
      {/* Featured Collection Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 lg:p-16">
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
            <Sparkles className="h-4 w-4" />
            {layoutContent.collectionBadgeText || 'Featured Collection'}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            {layoutContent.collectionBannerTitle || 'Handcrafted with Care'}
          </h2>
          <p className="mt-6 text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
            {layoutContent.collectionBannerDescription || 'Each piece tells a story. Discover our curated selection of handmade treasures.'}
          </p>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {layoutContent.ourStoryTitle || 'Our Story'}
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            {layoutContent.ourStoryContent || tenant.description || 'Every creation begins with passion and purpose. We pour our heart into each piece, ensuring that what you receive is not just a product, but a work of art.'}
          </p>
        </div>
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
          {layoutContent.ourStoryImage ? (
            <Image
              src={layoutContent.ourStoryImage}
              alt="Our story"
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-400">Story image</p>
            </div>
          )}
        </div>
      </section>

      {/* Signature Pieces - MixedGrid */}
      {signaturePieces.length > 0 && (
        <section>
          <MixedGrid
            products={signaturePieces.slice(0, 5).map(p => mapPieceToProduct(p, tenantSlug, tenant.businessName))}
            title={layoutContent.signaturePiecesTitle || 'Signature Pieces'}
            subtitle={layoutContent.signaturePiecesSubtitle || 'Our most loved creations'}
          />
        </section>
      )}

      {/* More Products Grid */}
      {pieces.length > 5 && (
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">More from this shop</h2>
              <p className="mt-1 text-gray-500">Explore our full collection</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {pieces.slice(5).map((piece) => (
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
