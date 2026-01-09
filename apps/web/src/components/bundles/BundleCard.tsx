'use client'

import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon, Package, Percent } from 'lucide-react'
import type { BundleWithPieces } from '@madebuy/shared'

interface BundleCardProps {
  bundle: BundleWithPieces
  tenantSlug: string
  variant?: 'default' | 'compact'
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

// Memoized to prevent re-renders in grid layouts
export const BundleCard = memo(function BundleCard({
  bundle,
  tenantSlug,
  variant = 'default',
}: BundleCardProps) {
  const href = `/${tenantSlug}/bundle/${bundle.slug}`

  // Get first piece image as fallback if no bundle image
  const thumbnailUrl = bundle.pieceDetails[0]?.thumbnailUrl

  return (
    <Link
      href={href}
      className="group block bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all relative"
    >
      {/* Discount Badge */}
      {bundle.discountPercent > 0 && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
          <Percent className="h-3 w-3" />
          {bundle.discountPercent}% OFF
        </div>
      )}

      {/* Bundle Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
        <Package className="h-3 w-3" />
        Bundle
      </div>

      {/* Image */}
      <div className={`relative bg-gradient-to-br from-purple-50 to-blue-50 ${variant === 'compact' ? 'aspect-square' : 'aspect-[4/5]'}`}>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={bundle.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-16 h-16 text-purple-200" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`${variant === 'compact' ? 'p-3' : 'p-4'}`}>
        <h3 className={`font-medium text-gray-900 truncate group-hover:text-purple-600 ${variant === 'compact' ? 'text-sm' : ''}`}>
          {bundle.name}
        </h3>

        {/* Product count */}
        <p className="mt-1 text-xs text-gray-500">
          {bundle.pieceDetails.length} product{bundle.pieceDetails.length !== 1 ? 's' : ''} included
        </p>

        {/* Pricing */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`font-semibold text-gray-900 ${variant === 'compact' ? 'text-sm' : 'text-lg'}`}>
            {formatPrice(bundle.bundlePrice)}
          </span>
          {bundle.originalPrice > bundle.bundlePrice && (
            <span className={`text-gray-400 line-through ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
              {formatPrice(bundle.originalPrice)}
            </span>
          )}
        </div>

        {/* Availability */}
        {!bundle.isAvailable && (
          <p className="mt-2 text-xs text-red-500 font-medium">Out of Stock</p>
        )}
      </div>
    </Link>
  )
})

/**
 * Grid layout for displaying bundles
 */
interface BundleGridProps {
  bundles: BundleWithPieces[]
  tenantSlug: string
  title?: string
  subtitle?: string
  variant?: 'default' | 'compact'
}

export function BundleGrid({
  bundles,
  tenantSlug,
  title,
  subtitle,
  variant = 'default',
}: BundleGridProps) {
  if (bundles.length === 0) return null

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-8">
          {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
          {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {bundles.map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            tenantSlug={tenantSlug}
            variant={variant}
          />
        ))}
      </div>
    </div>
  )
}
