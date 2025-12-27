import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ImageIcon, TrendingUp } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'

interface MagazineStyleLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Magazine Style Layout
 * Editorial layout: Featured hero → Mixed content blocks → Visual gallery
 * Creates engaging browsing experience with varied block sizes
 */
export function MagazineStyleLayout({ pieces, tenantSlug, tenant }: MagazineStyleLayoutProps) {
  const featuredPiece = pieces[0]
  const secondaryPieces = pieces.slice(1, 3)
  const gridPieces = pieces.slice(3)

  // Get layout content from tenant design
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-8">
      {/* Editorial Hero - Featured Product */}
      {featuredPiece && (
        <section className="overflow-hidden rounded-lg bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 shadow-lg">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Image */}
            {featuredPiece.mediaIds.length > 0 && featuredPiece.primaryImage ? (
              <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:h-full">
                <Image
                  src={featuredPiece.primaryImage.variants.large?.url || featuredPiece.primaryImage.variants.original.url}
                  alt={featuredPiece.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-purple-100 lg:aspect-auto lg:h-full">
                <ImageIcon className="h-32 w-32 text-purple-300" />
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white">
                <TrendingUp className="h-4 w-4" />
                <span className={!layoutContent.latestBadgeText ? 'italic opacity-90' : ''}>
                  {layoutContent.latestBadgeText || '[Add badge text]'}
                </span>
              </div>
              <h2 className={`text-4xl font-bold lg:text-5xl ${!layoutContent.magazineHeroHeadline ? 'italic text-gray-600' : 'text-gray-900'}`}>
                {layoutContent.magazineHeroHeadline || (featuredPiece.name || '[Add hero headline]')}
              </h2>
              {featuredPiece.description && (
                <p className="mt-4 text-lg leading-relaxed text-gray-700">{featuredPiece.description}</p>
              )}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(featuredPiece.price, featuredPiece.currency)}
                </span>
                {featuredPiece.stock !== undefined && featuredPiece.stock > 0 && (
                  <span className="text-sm font-medium text-green-600">Available Now</span>
                )}
              </div>
              <Link
                href={`/${tenantSlug}/${featuredPiece.slug}`}
                className={`mt-8 inline-flex w-fit items-center justify-center rounded-lg bg-gray-900 px-8 py-4 font-semibold text-white transition-colors hover:bg-gray-800 ${!layoutContent.discoverMoreButtonText ? 'italic opacity-90' : ''}`}
              >
                {layoutContent.discoverMoreButtonText || '[Add button text]'}
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
              className={`group overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-xl ${
                index === 0 ? 'lg:row-span-2' : ''
              }`}
            >
              {/* Image */}
              {piece.mediaIds.length > 0 && piece.primaryImage ? (
                <div className={`relative overflow-hidden bg-gray-100 ${index === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
                  <Image
                    src={piece.primaryImage.variants.large?.url || piece.primaryImage.variants.original.url}
                    alt={piece.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className={`flex items-center justify-center bg-gray-100 ${index === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
                  <ImageIcon className="h-20 w-20 text-gray-300" />
                </div>
              )}

              {/* Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900">{piece.name}</h3>
                {piece.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{piece.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(piece.price, piece.currency)}
                  </span>
                  {piece.stock !== undefined && piece.stock > 0 && (
                    <span className="text-xs font-medium text-green-600">In Stock</span>
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
          <h2 className={`mb-6 text-2xl font-bold ${!layoutContent.moreCollectionTitle ? 'italic text-gray-600' : 'text-gray-900'}`}>
            {layoutContent.moreCollectionTitle || '[Add collection title]'}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {gridPieces.map((piece) => (
              <Link
                key={piece.id}
                href={`/${tenantSlug}/${piece.slug}`}
                className="group relative overflow-hidden rounded-lg shadow-md transition-shadow hover:shadow-lg"
              >
                {/* Image */}
                {piece.mediaIds.length > 0 && piece.primaryImage ? (
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <Image
                      src={piece.primaryImage.variants.thumb?.url || piece.primaryImage.variants.original.url}
                      alt={piece.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 translate-y-full p-3 transition-transform group-hover:translate-y-0">
                      <p className="text-sm font-semibold text-white">{piece.name}</p>
                      <p className="text-xs font-medium text-white">
                        {formatCurrency(piece.price, piece.currency)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-gray-200">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {pieces.length === 0 && (
        <div className="rounded-lg bg-white py-16 text-center shadow-sm">
          <p className="text-gray-600">No products available at the moment.</p>
        </div>
      )}
    </div>
  )
}
