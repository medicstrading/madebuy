'use client'

import type { PieceWithMedia } from '@madebuy/shared'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { SectionProps } from './SectionRenderer'
import { formatCurrency } from '@/lib/utils'

const COLUMNS_MAP = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
}

export function ProductGrid({
  settings,
  tenant,
  tenantSlug,
  pieces,
}: SectionProps) {
  const title = settings.title || 'Our Products'
  const subtitle = settings.subtitle
  const columns = (settings.columns || 4) as 2 | 3 | 4 | 5
  const limit = settings.limit || 12
  const showCategories = settings.showCategories ?? false
  const showPrices = settings.showPrices ?? true
  const filterByCategory = settings.filterByCategory

  // Filter and limit pieces
  let displayPieces = pieces || []

  // Filter by category if specified
  if (filterByCategory) {
    displayPieces = displayPieces.filter(
      (piece) =>
        piece.category?.toLowerCase() === filterByCategory.toLowerCase(),
    )
  }

  // Only show available pieces (not sold)
  displayPieces = displayPieces.filter((piece) => piece.status !== 'sold')

  // Limit the number of pieces
  displayPieces = displayPieces.slice(0, limit)

  if (displayPieces.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No products available at the moment.</p>
          <Link
            href={`/${tenantSlug}/shop`}
            className="mt-4 inline-block text-sm font-medium hover:underline"
            style={{ color: tenant.primaryColor }}
          >
            View all products →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Section header */}
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      {/* Product grid */}
      <div className={`grid ${COLUMNS_MAP[columns]} gap-6 md:gap-8`}>
        {displayPieces.map((piece) => (
          <ProductCard
            key={piece.id}
            piece={piece}
            tenantSlug={tenantSlug}
            tenant={tenant}
            showCategory={showCategories}
            showPrice={showPrices}
          />
        ))}
      </div>

      {/* View all link */}
      <div className="text-center mt-12">
        <Link
          href={`/${tenantSlug}/shop`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
        >
          View All Products <span className="ml-2">→</span>
        </Link>
      </div>
    </div>
  )
}

interface ProductCardProps {
  piece: PieceWithMedia
  tenantSlug: string
  tenant: { primaryColor: string; accentColor: string }
  showCategory?: boolean
  showPrice?: boolean
}

function ProductCard({
  piece,
  tenantSlug,
  tenant,
  showCategory,
  showPrice,
}: ProductCardProps) {
  // Get primary image URL from PieceWithMedia
  const primaryMedia = piece.primaryImage || piece.allImages?.[0]
  const imageUrl =
    primaryMedia?.variants?.large?.url || primaryMedia?.variants?.original?.url

  const href = `/${tenantSlug}/${piece.websiteSlug || piece.id}`

  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Image */}
        <div className="aspect-square bg-gray-50 relative overflow-hidden">
          {piece.isFeatured && (
            <span
              className="absolute top-4 left-4 z-10 px-3 py-1 text-xs font-medium rounded-full text-white"
              style={{ backgroundColor: tenant.accentColor || '#f59e0b' }}
            >
              Featured
            </span>
          )}

          {showCategory && piece.category && !piece.isFeatured && (
            <span className="absolute top-4 right-4 bg-white/90 text-gray-600 text-xs px-3 py-1 rounded-full z-10">
              {piece.category}
            </span>
          )}

          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={piece.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="w-12 h-12 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-primary transition-colors truncate">
            {piece.name}
          </h3>

          {/* Materials info */}
          {(piece.metals?.length || piece.stones?.length) && (
            <p className="text-sm text-gray-500 mb-3 truncate">
              {piece.metals &&
              piece.metals.length > 0 &&
              piece.stones &&
              piece.stones.length > 0
                ? `${piece.metals.join(', ')} • ${piece.stones.join(', ')}`
                : piece.metals?.join(', ') || piece.stones?.join(', ')}
            </p>
          )}

          {/* Price */}
          {showPrice && (
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">
                {piece.price ? (
                  formatCurrency(piece.price)
                ) : (
                  <span className="text-sm font-normal text-gray-500">
                    Price on request
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
