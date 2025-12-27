import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ImageIcon, Sparkles } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'

interface FeaturedFocusLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Featured Focus Layout
 * Story-driven layout: Featured banner → Brand story → Signature pieces
 * Emphasizes brand storytelling and highlights
 */
export function FeaturedFocusLayout({ pieces, tenantSlug, tenant }: FeaturedFocusLayoutProps) {
  // Get signature pieces (first 4)
  const signaturePieces = pieces.slice(0, 4)

  // Get layout content from tenant design
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-12">
      {/* Featured Collection Banner */}
      <section className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-12 text-center shadow-lg">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
            <Sparkles className="h-4 w-4" />
            <span className={!layoutContent.collectionBadgeText ? 'italic opacity-70' : ''}>
              {layoutContent.collectionBadgeText || '[Add badge text]'}
            </span>
          </div>
          <h2 className={`text-4xl font-bold font-heading ${!layoutContent.collectionBannerTitle ? 'italic text-gray-600' : 'text-gray-900'}`}>
            {layoutContent.collectionBannerTitle || '[Add collection title]'}
          </h2>
          <p className={`mx-auto mt-4 max-w-2xl text-lg font-body ${!layoutContent.collectionBannerDescription ? 'italic text-gray-500' : 'text-gray-700'}`}>
            {layoutContent.collectionBannerDescription || '[Add collection description - customize in Website Design > Content]'}
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-200/30" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-200/30" />
      </section>

      {/* Brand Story Section */}
      <section className="rounded-lg bg-white p-8 shadow-sm">
        <h2 className={`mb-4 text-2xl font-bold font-heading ${!layoutContent.ourStoryTitle ? 'italic text-gray-600' : 'text-gray-900'}`}>
          {layoutContent.ourStoryTitle || '[Add "Our Story" title]'}
        </h2>
        <div className={`prose prose-lg max-w-none font-body ${!layoutContent.ourStoryContent && !tenant.description ? 'italic text-gray-500' : 'text-gray-700'}`}>
          {layoutContent.ourStoryContent ? (
            <p>{layoutContent.ourStoryContent}</p>
          ) : tenant.description ? (
            <p>{tenant.description}</p>
          ) : (
            <p>[Add your brand story in Website Design &gt; Content or add a business description in Settings]</p>
          )}
        </div>
      </section>

      {/* Signature Pieces */}
      <section>
        <div className="mb-8">
          <h2 className={`text-3xl font-bold font-heading ${!layoutContent.signaturePiecesTitle ? 'italic text-gray-600' : 'text-gray-900'}`}>
            {layoutContent.signaturePiecesTitle || '[Add signature pieces title]'}
          </h2>
          <p className={`mt-2 font-body ${!layoutContent.signaturePiecesSubtitle ? 'italic text-gray-500' : 'text-gray-600'}`}>
            {layoutContent.signaturePiecesSubtitle || '[Add signature pieces subtitle]'}
          </p>
        </div>

        {signaturePieces.length === 0 ? (
          <div className="rounded-lg bg-white py-12 text-center shadow-sm">
            <p className="text-gray-600">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {signaturePieces.map((piece) => (
              <Link
                key={piece.id}
                href={`/${tenantSlug}/${piece.slug}`}
                className="group overflow-hidden rounded-lg bg-white shadow-lg transition-shadow hover:shadow-xl"
              >
                {/* Image with gradient overlay */}
                <div className="relative">
                  {piece.mediaIds.length > 0 && piece.primaryImage ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                      <Image
                        src={piece.primaryImage.variants.large?.url || piece.primaryImage.variants.original.url}
                        alt={piece.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Gradient overlay for featured effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                      <ImageIcon className="h-24 w-24 text-amber-300" />
                    </div>
                  )}
                  {/* Featured badge */}
                  <div className="absolute right-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    Featured
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900">{piece.name}</h3>
                  {piece.description && (
                    <p className="mt-2 text-gray-600 line-clamp-3">{piece.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(piece.price, piece.currency)}
                    </span>
                    {piece.stock !== undefined && piece.stock > 0 && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        In Stock
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pieces.length > 4 && (
          <div className="mt-8 text-center">
            <button className="rounded-lg bg-gray-900 px-8 py-3 font-semibold text-white transition-colors hover:bg-gray-800">
              View All Products ({pieces.length} items)
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
