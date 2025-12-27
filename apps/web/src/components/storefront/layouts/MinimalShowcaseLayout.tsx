import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ImageIcon } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'

interface MinimalShowcaseLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Minimal Showcase Layout
 * Clean, spacious layout: Large hero → Featured products only
 * Ideal for artisan brands with curated collections
 */
export function MinimalShowcaseLayout({ pieces, tenantSlug, tenant }: MinimalShowcaseLayoutProps) {
  // Show only first 6 products for minimal, curated feel
  const featuredPieces = pieces.slice(0, 6)

  // Get layout content from tenant design
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-16">
      {/* Large Brand Story Section */}
      <section className="mx-auto max-w-3xl text-center">
        <h2 className={`text-4xl font-bold ${!layoutContent.minimalHeroHeadline ? 'italic text-gray-600' : 'text-gray-900'}`}>
          {layoutContent.minimalHeroHeadline || (tenant.businessName || '[Add hero headline]')}
        </h2>
        {tenant.description && (
          <p className="mt-6 text-lg leading-relaxed text-gray-600">{tenant.description}</p>
        )}
        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </section>

      {/* Featured Collection */}
      <section>
        <h2 className={`mb-8 text-center text-2xl font-bold ${!layoutContent.featuredCollectionTitle ? 'italic text-gray-600' : 'text-gray-900'}`}>
          {layoutContent.featuredCollectionTitle || '[Add featured collection title]'}
        </h2>
        {featuredPieces.length === 0 ? (
          <div className="rounded-lg bg-white py-16 text-center shadow-sm">
            <p className="text-gray-600">No products available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {featuredPieces.map((piece, index) => (
              <Link
                key={piece.id}
                href={`/${tenantSlug}/${piece.slug}`}
                className="group block"
              >
                <div className={`flex flex-col gap-8 lg:flex-row ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                  {/* Image */}
                  {piece.mediaIds.length > 0 && piece.primaryImage ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100 lg:w-1/2">
                      <Image
                        src={piece.primaryImage.variants.large?.url || piece.primaryImage.variants.original.url}
                        alt={piece.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-gray-100 lg:w-1/2">
                      <ImageIcon className="h-24 w-24 text-gray-300" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex flex-col justify-center lg:w-1/2">
                    <h3 className="text-3xl font-bold text-gray-900">{piece.name}</h3>
                    {piece.description && (
                      <p className="mt-4 text-lg leading-relaxed text-gray-600">{piece.description}</p>
                    )}
                    <div className="mt-6 flex items-center gap-4">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(piece.price, piece.currency)}
                      </span>
                      {piece.stock !== undefined && piece.stock > 0 && (
                        <span className="text-sm font-medium text-green-600">In Stock</span>
                      )}
                    </div>
                    <div className="mt-6">
                      <span className={`inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-gray-800 ${!layoutContent.viewDetailsButtonText ? 'italic opacity-90' : ''}`}>
                        {layoutContent.viewDetailsButtonText || '[Add button text]'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pieces.length > 6 && (
          <div className="mt-12 text-center">
            <p className="text-gray-600">
              Showing {featuredPieces.length} of {pieces.length} items
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
